/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Message, WsMessageReadPayload } from '../types';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface WsMessageDeliveredPayload {
  type: 'message:delivered';
  messageId: string;
  chatId: string;
  deliveredAt: number;
}

export interface WsChatTypingPayload {
  type: 'chat:typing';
  chatId: string;
  isTyping: boolean;
  senderId?: string;
}

type ReadListener = (payload: WsMessageReadPayload) => void;
type DeliveredListener = (payload: WsMessageDeliveredPayload) => void;
type MessageReceivedListener = (message: Message) => void;
type TypingListener = (payload: WsChatTypingPayload) => void;
type ConnectionListener = (status: ConnectionStatus) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private clientId: string = 'user_self_' + Math.random().toString(36).substring(2, 7);
  private readReceiptsEnabled: boolean = true;

  private readListeners = new Set<ReadListener>();
  private deliveredListeners = new Set<DeliveredListener>();
  private messageReceivedListeners = new Set<MessageReceivedListener>();
  private typingListeners = new Set<TypingListener>();
  private connectionListeners = new Set<ConnectionListener>();

  constructor() {
    // Load stored read receipts preference (defaults to true)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fe_read_receipts');
        if (saved !== null) {
          this.readReceiptsEnabled = saved === 'true';
        }
      } catch {
        this.readReceiptsEnabled = true;
      }
      this.connect();
    }
  }

  public setReadReceiptsEnabled(enabled: boolean): void {
    this.readReceiptsEnabled = enabled;
    try {
      localStorage.setItem('fe_read_receipts', String(enabled));
    } catch (e) {
      console.warn('[WebSocketService] Failed to persist read receipts preference', e);
    }
    // Update active connection on the server
    this.send({
      type: 'client:prefs',
      readReceiptsEnabled: enabled,
    });
  }

  public getReadReceiptsEnabled(): boolean {
    return this.readReceiptsEnabled;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        console.log('[WebSocketService] Connected to real-time event server at', wsUrl);

        // Register client identity
        this.send({
          type: 'client:init',
          clientId: this.clientId,
          clientName: 'You (Security Lead)',
          readReceiptsEnabled: this.readReceiptsEnabled,
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingEvent(data);
        } catch (e) {
          console.error('[WebSocketService] Failed to parse event', e);
        }
      };

      this.socket.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocketService] WebSocket error:', err);
        this.socket?.close();
      };
    } catch (e) {
      console.warn('[WebSocketService] Could not establish WebSocket connection', e);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private handleIncomingEvent(data: Record<string, unknown>): void {
    switch (data.type) {
      case 'message:read': {
        // If read receipts are turned off by user preference, do not process read ticks
        if (!this.readReceiptsEnabled) {
          return;
        }
        const payload = data as unknown as WsMessageReadPayload;
        this.readListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('[WebSocketService] Error in readListener', e);
          }
        });
        break;
      }

      case 'message:delivered': {
        const payload = data as unknown as WsMessageDeliveredPayload;
        this.deliveredListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('[WebSocketService] Error in deliveredListener', e);
          }
        });
        break;
      }

      case 'message:received': {
        if (data.message) {
          const message = data.message as Message;
          this.messageReceivedListeners.forEach((listener) => {
            try {
              listener(message);
            } catch (e) {
              console.error('[WebSocketService] Error in messageReceivedListener', e);
            }
          });
        }
        break;
      }

      case 'chat:typing': {
        const payload = data as unknown as WsChatTypingPayload;
        this.typingListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('[WebSocketService] Error in typingListener', e);
          }
        });
        break;
      }

      default:
        break;
    }
  }

  /**
   * Notifies server and peers via WebSocket that recipient opened a chat.
   * This triggers 'read' receipts for the sender only if read receipts are enabled.
   */
  public sendChatOpen(chatId: string, readerId?: string, readerName?: string): void {
    if (!this.readReceiptsEnabled) {
      console.log(`[WebSocketService] Read receipts disabled: suppressing chat:open broadcast for ${chatId}`);
      return;
    }
    this.send({
      type: 'chat:open',
      chatId,
      readerId: readerId || this.clientId,
      readerName: readerName || 'You',
      readReceiptsEnabled: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Sends explicit message read confirmation if read receipts are enabled
   */
  public sendReadReceipt(chatId: string, messageId?: string): void {
    if (!this.readReceiptsEnabled) {
      return;
    }
    this.send({
      type: 'message:read',
      chatId,
      messageId,
      readerId: this.clientId,
      readAt: Date.now(),
    });
  }

  /**
   * Sends an outgoing encrypted message event over WebSocket
   */
  public sendMessage(message: Message): void {
    this.send({
      type: 'message:send',
      message,
      readReceiptsEnabled: this.readReceiptsEnabled,
    });
  }

  /**
   * Sends typing status over WebSocket
   */
  public sendTyping(chatId: string, isTyping: boolean): void {
    this.send({
      type: 'chat:typing',
      chatId,
      isTyping,
    });
  }

  private send(data: Record<string, unknown>): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus;
    this.connectionListeners.forEach((l) => l(newStatus));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onMessageRead(listener: ReadListener): () => void {
    this.readListeners.add(listener);
    return () => this.readListeners.delete(listener);
  }

  public onMessageDelivered(listener: DeliveredListener): () => void {
    this.deliveredListeners.add(listener);
    return () => this.deliveredListeners.delete(listener);
  }

  public onMessageReceived(listener: MessageReceivedListener): () => void {
    this.messageReceivedListeners.add(listener);
    return () => this.messageReceivedListeners.delete(listener);
  }

  public onTyping(listener: TypingListener): () => void {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.status);
    return () => this.connectionListeners.delete(listener);
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }
}

export const websocketService = new WebSocketService();
