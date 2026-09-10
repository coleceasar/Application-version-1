/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiPacketLog, NetworkType, Message } from '../types';

export class NetworkManager {
  private networkType: NetworkType = '5G';
  private packetListeners: ((logs: ApiPacketLog[]) => void)[] = [];
  private outboxQueue: Message[] = [];
  private logs: ApiPacketLog[] = [];

  constructor() {
    this.seedInitialLogs();
  }

  private seedInitialLogs() {
    this.addLog({
      protocol: 'REST',
      methodOrEvent: 'POST /auth/login',
      endpoint: 'https://api.cipherdroid.internal/v1/auth/login',
      status: 200,
      latencyMs: 142,
      payloadSize: '1.2 KB',
      summary: 'Biometric challenge verified via Android Keystore client key. Session issued.',
      metadataMinimized: true,
    });
    this.addLog({
      protocol: 'REST',
      methodOrEvent: 'GET /keys/user/elena',
      endpoint: 'https://api.cipherdroid.internal/v1/keys/user/contact_elena',
      status: 200,
      latencyMs: 98,
      payloadSize: '840 B',
      summary: 'Fetched ephemeral ECDH P-256 pre-keys & signed identity key.',
      metadataMinimized: true,
    });
    this.addLog({
      protocol: 'WSS',
      methodOrEvent: 'EVENT: ws_handshake',
      endpoint: 'wss://api.cipherdroid.internal/ws/messages',
      status: 'OK',
      latencyMs: 38,
      payloadSize: '256 B',
      summary: 'WebSocket authenticated via TLS 1.3 with SPKI Certificate Pinning.',
      metadataMinimized: true,
    });
  }

  public getNetworkType(): NetworkType {
    return this.networkType;
  }

  public setNetworkType(type: NetworkType): void {
    const oldType = this.networkType;
    this.networkType = type;

    this.addLog({
      protocol: 'REST',
      methodOrEvent: `CONN: ${oldType} -> ${type}`,
      endpoint: 'Android ConnectivityManager',
      status: type === 'OFFLINE' ? 'QUEUED' : 'OK',
      latencyMs: 12,
      payloadSize: '64 B',
      summary: type === 'OFFLINE' 
        ? 'Network lost. Outbox queueing enabled in Room DB.'
        : `Network switch to ${type}. Auto-reconnecting WebSocket channel...`,
      metadataMinimized: true,
    });
  }

  public isOnline(): boolean {
    return this.networkType !== 'OFFLINE';
  }

  public getLatency(): number {
    switch (this.networkType) {
      case 'WIFI':
        return 28 + Math.floor(Math.random() * 20);
      case '5G':
        return 45 + Math.floor(Math.random() * 35);
      case '4G':
        return 120 + Math.floor(Math.random() * 80);
      case 'OFFLINE':
        return 0;
    }
  }

  public queueMessage(msg: Message): void {
    this.outboxQueue.push(msg);
    this.addLog({
      protocol: 'REST',
      methodOrEvent: 'ROOM_DB: OutboxEnqueue',
      endpoint: 'room://messages_outbox',
      status: 'QUEUED',
      latencyMs: 8,
      payloadSize: `${Math.round(msg.cipherPayload.ciphertextHex.length / 2)} B`,
      summary: `Message ${msg.id.substring(0, 10)} staged in local Room DB outbox table.`,
      metadataMinimized: true,
    });
  }

  public getQueuedMessages(): Message[] {
    return [...this.outboxQueue];
  }

  public clearQueuedMessages(): Message[] {
    const flushed = [...this.outboxQueue];
    this.outboxQueue = [];
    return flushed;
  }

  public addLog(log: Omit<ApiPacketLog, 'id' | 'timestamp'>): void {
    const newLog: ApiPacketLog = {
      ...log,
      id: 'pkt_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    this.logs = [newLog, ...this.logs.slice(0, 49)];
    this.notifyListeners();
  }

  public getLogs(): ApiPacketLog[] {
    return [...this.logs];
  }

  public subscribeLogs(callback: (logs: ApiPacketLog[]) => void): () => void {
    this.packetListeners.push(callback);
    callback([...this.logs]);
    return () => {
      this.packetListeners = this.packetListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const current = [...this.logs];
    this.packetListeners.forEach((cb) => cb(current));
  }
}

export const networkService = new NetworkManager();
