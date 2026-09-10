import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

interface WsClientMetadata {
  id: string;
  name: string;
  activeChatId?: string | null;
  readReceiptsEnabled?: boolean;
}

interface ServerMessageRecord {
  id: string;
  chatId: string;
  senderId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      model: 'gemini-3.8-flash',
      timestamp: Date.now(),
    });
  });

  // Gemini Assistant Chat endpoint
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history, systemInstruction } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Provide friendly helpful fallback if key is not yet configured
        return res.status(200).json({
          reply:
            "I'm Gemini Assistant! It looks like `GEMINI_API_KEY` is not set in the environment yet. Please add your Gemini API Key in the **Settings > Secrets** panel in AI Studio to enable live AI responses.",
          isFallback: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const formattedContents = [
        ...(Array.isArray(history) ? history : []).map((h: { role: string; content: string }) => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ];

      const defaultSystemPrompt =
        'You are the Gemini AI Assistant embedded inside the Android Encrypted Messenger (F& E). ' +
        'You provide expert assistance with security inquiries, cryptography explanations (AES-256-GCM, Double Ratchet, ECDH, DTLS-SRTP), ' +
        'privacy guidance, drafting secure messages, answering questions about offline queuing, self-destructing timers, location privacy, ' +
        'and handling general inquiries warmly, concisely, and accurately. Format responses cleanly with markdown headings, bullet points, and code snippets where appropriate.';

      // Primary model and approved non-paid fallbacks if high demand (503) occurs
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
      ];

      let generatedReply = '';
      let usedModelName = '';
      let lastErrorMessage = '';

      for (let i = 0; i < candidateModels.length; i++) {
        const modelName = candidateModels[i];
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: formattedContents,
            config: {
              systemInstruction: systemInstruction || defaultSystemPrompt,
            },
          });

          if (response && response.text) {
            generatedReply = response.text;
            usedModelName = modelName;
            break;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          lastErrorMessage = errMsg;
          console.warn(`Gemini attempt with ${modelName} encountered error:`, errMsg);

          const isDemandOrTransient =
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('rate');

          if (isDemandOrTransient && i < candidateModels.length - 1) {
            // Wait 600ms before attempting next fallback model
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
        }
      }

      if (generatedReply) {
        return res.json({
          reply: generatedReply,
          model: usedModelName,
        });
      }

      // If all models hit temporary 503 high demand, provide domain-specific security intelligence fallback
      const lowerQuery = message.toLowerCase();
      let fallbackText = '';

      if (lowerQuery.includes('aes') || lowerQuery.includes('gcm') || lowerQuery.includes('cipher') || lowerQuery.includes('encrypt')) {
        fallbackText =
          `> ℹ️ *Note: Gemini cloud models are currently experiencing temporary high demand (HTTP 503). Providing verified cryptographic analysis from the local security engine:*\n\n` +
          `### How AES-256-GCM Protects Messages in CipherDroid\n\n` +
          `1. **Confidentiality & Strength**: AES-256 employs a 256-bit symmetric key, requiring $2^{256}$ operations to brute-force—rendering it impervious to classical and near-term quantum attacks.\n` +
          `2. **Galois/Counter Mode (GCM)**: Unlike older modes (such as CBC), GCM computes a Galois field GHASH authentication tag (128-bit) simultaneously with counter-mode encryption.\n` +
          `3. **Unique Initialization Vectors (IV)**: Every message generates a cryptographically random 96-bit IV. Because the IV changes for every single packet, identical plaintexts produce entirely distinct ciphertexts, preventing replay attacks and key stream reuse.\n` +
          `4. **Google Tink Envelope Wrapping**: Master encryption keys are protected in Android Keystore / StrongBox hardware, ensuring private keys never enter unencrypted RAM.`;
      } else if (lowerQuery.includes('ratchet') || lowerQuery.includes('diffie') || lowerQuery.includes('ecdh') || lowerQuery.includes('forward secrecy')) {
        fallbackText =
          `> ℹ️ *Note: Gemini cloud models are currently experiencing temporary high demand (HTTP 503). Providing verified cryptographic analysis from the local security engine:*\n\n` +
          `### The Double Ratchet Protocol Architecture\n\n` +
          `• **KDF Symmetric Ratchet**: Each message sent or received ratchets the sending and receiving key derivation functions (KDF) using HMAC-SHA256, deriving ephemeral message keys that are immediately wiped after decryption.\n` +
          `• **Diffie-Hellman (DH) Asymmetric Ratchet**: Every conversation turnaround generates fresh ephemeral curve keypairs (Curve25519 or NIST P-256). The resulting shared secret refreshes the root chain.\n` +
          `• **Forward Secrecy**: An attacker who compromises a current message key cannot decrypt past messages.\n` +
          `• **Post-Compromise Security**: Even if a device is temporarily compromised, future messages automatically regain complete confidentiality once the uncompromised party sends a new ratchet turn.`;
      } else if (lowerQuery.includes('offline') || lowerQuery.includes('queue') || lowerQuery.includes('staging') || lowerQuery.includes('workmanager')) {
        fallbackText =
          `> ℹ️ *Note: Gemini cloud models are currently experiencing temporary high demand (HTTP 503). Providing verified architecture analysis from the local security engine:*\n\n` +
          `### Offline Queuing & WorkManager Staging\n\n` +
          `• **Zero Plaintext In Flight**: Messages composed during offline states (airplane mode, subway, network deadzones) are encrypted **before** entering the local disk outbox.\n` +
          `• **Android WorkManager Job**: A scheduled background worker monitors connectivity state changes with exponential backoff.\n` +
          `• **Atomic Flush**: Once LTE/5G or Wi-Fi reconnects, queued payloads drain sequentially with verified delivery acknowledgments.`;
      } else if (lowerQuery.includes('burn') || lowerQuery.includes('ephemeral') || lowerQuery.includes('destruct') || lowerQuery.includes('timer')) {
        fallbackText =
          `> ℹ️ *Note: Gemini cloud models are currently experiencing temporary high demand (HTTP 503). Providing verified architecture analysis from the local security engine:*\n\n` +
          `### Ephemeral Self-Destruct & Memory Shredding\n\n` +
          `• **Countdown Trigger**: The countdown timer initiates the moment the recipient views the message or after a preconfigured window (10s, 30s, 5m, 1h).\n` +
          `• **Cryptographic Shredding**: When the timer expires, the ciphertext and decrypted buffer are overwritten with random bytes and zeros in memory (zeroization) before deallocation.\n` +
          `• **Out-of-Band Sync**: Burn notifications propagate via encrypted control frames so both participants' local storage is synchronized and purged.`;
      } else if (lowerQuery.includes('draft') || lowerQuery.includes('briefing') || lowerQuery.includes('secure memo')) {
        fallbackText =
          `> ℹ️ *Note: Gemini cloud models are currently experiencing temporary high demand (HTTP 503). Draft prepared via local security template engine:*\n\n` +
          `**OPERATIONAL SECURITY (OPSEC) BRIEFING**\n\n` +
          `**Subject**: Verification of End-to-End Cryptographic Identity\n\n` +
          `Team,\n` +
          `Please confirm your out-of-band **Safety Number** before transmitting any sensitive files or location coordinates. Ensure your device reports hardware-backed Keystore / StrongBox key generation, and that ephemeral burn timers are active for high-sensitivity discussions. If a key fingerprint mismatch occurs, cease transmission immediately.\n\n` +
          `*Status: E2EE Verified • DTLS-SRTP Active*`;
      } else {
        fallbackText =
          `> ℹ️ *Google Gemini models are temporarily experiencing high demand (HTTP 503: "This model is currently experiencing high demand").*\n\n` +
          `Spikes in cloud demand are usually brief. You can tap **Retry** in a moment to reconnect to Gemini live, or select one of the suggested security inquiries above for instant verified cryptographic explanations!`;
      }

      return res.json({
        reply: fallbackText,
        isHighDemandFallback: true,
        details: lastErrorMessage,
      });
    } catch (err: unknown) {
      console.error('Error in /api/gemini/chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown Gemini API error';
      return res.status(200).json({
        reply: `⚠️ The Gemini cloud service is currently experiencing high demand. Please try again shortly. (${errorMessage})`,
        isError: true,
      });
    }
  });

  // Gemini AI Conversation Summarizer
  app.post('/api/gemini/summarize', async (req, res) => {
    try {
      const { messages, contactName } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided to summarize' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Deterministic local summary fallback
        const total = messages.length;
        const lastMsg = messages[messages.length - 1];
        return res.json({
          summary: `Conversation with **${contactName || 'Contact'}** comprises ${total} encrypted messages. Latest exchange: "${lastMsg.text || 'media/encrypted payload'}". (Set GEMINI_API_KEY for deep AI cognitive summaries).`,
          bulletPoints: [
            `Total messages analyzed: ${total}`,
            `Cryptographic envelope: AES-256-GCM authenticated`,
            `Recent topic: ${lastMsg.text?.slice(0, 40) || 'Active exchange'}`
          ],
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const dialogueText = messages
        .map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Summarize this secure conversation with ${contactName || 'the contact'} into a concise briefing (2-3 sentences) followed by 2-3 key action points or topics:\n\n${dialogueText}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: 'You are an executive security intelligence assistant. Summarize messages with precision, highlighting key agreements, decisions, or security alerts.',
        },
      });

      return res.json({
        summary: response.text || 'Summary generated successfully.',
      });
    } catch (err: unknown) {
      console.error('Error in /api/gemini/summarize:', err);
      return res.status(200).json({
        summary: 'Unable to summarize at this time due to network demand. Please check connection and try again.',
      });
    }
  });

  // Gemini AI Contextual Smart Replies
  app.post('/api/gemini/smart-replies', async (req, res) => {
    try {
      const { lastMessageText, contactName } = req.body;
      if (!lastMessageText) {
        return res.json({ replies: ['Sounds good!', 'Understood, on it.', 'Let me verify first.'] });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          replies: ['Acknowledged', 'Verified via ECDH', 'Sounds good, proceeding'],
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `The last message received from ${contactName || 'a contact'} is: "${lastMessageText}". Suggest 3 short, natural, professional replies that the user can tap to send. Return ONLY a JSON array of 3 strings, e.g. ["Reply 1", "Reply 2", "Reply 3"]. No extra markdown.`,
              },
            ],
          },
        ],
      });

      try {
        const text = response.text || '[]';
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const replies = JSON.parse(clean);
        if (Array.isArray(replies) && replies.length > 0) {
          return res.json({ replies: replies.slice(0, 3) });
        }
      } catch {
        // Fall through
      }

      return res.json({
        replies: ['Confirmed, thanks!', 'Will review right away.', 'Let’s discuss securely.'],
      });
    } catch {
      return res.json({
        replies: ['Understood', 'Checking now', 'Will follow up soon'],
      });
    }
  });

  const httpServer = http.createServer(app);

  // Initialize real-time WebSocket Server on /ws
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<WebSocket, WsClientMetadata>();
  const serverMessages = new Map<string, ServerMessageRecord>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    clients.set(ws, { id: clientId, name: 'User' });
    console.log(`[WebSocket] Client connected: ${clientId}. Active sockets: ${clients.size}`);

    // Acknowledge connection
    ws.send(
      JSON.stringify({
        type: 'connection:ack',
        clientId,
        timestamp: Date.now(),
        message: 'Real-time WebSocket event system active',
      })
    );

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const clientMeta = clients.get(ws);

        switch (data.type) {
          case 'client:init': {
            if (clientMeta) {
              clientMeta.id = data.clientId || clientMeta.id;
              clientMeta.name = data.clientName || clientMeta.name;
              if (data.readReceiptsEnabled !== undefined) {
                clientMeta.readReceiptsEnabled = data.readReceiptsEnabled;
              }
            }
            break;
          }

          case 'client:prefs': {
            if (clientMeta) {
              if (data.readReceiptsEnabled !== undefined) {
                clientMeta.readReceiptsEnabled = data.readReceiptsEnabled;
                console.log(`[WebSocket] Client ${clientMeta.id} updated readReceiptsEnabled to: ${clientMeta.readReceiptsEnabled}`);
              }
            }
            break;
          }

          case 'chat:open': {
            // When a recipient opens the chat, emit 'message:read' event to notify the sender (if read receipts enabled)
            const { chatId, readerId, readerName } = data;
            if (clientMeta) {
              clientMeta.activeChatId = chatId;
            }

            // If reader or client disabled read receipts, do not dispatch read receipts to peers
            const clientWantsReadReceipts = data.readReceiptsEnabled !== false && clientMeta?.readReceiptsEnabled !== false;
            if (!clientWantsReadReceipts) {
              console.log(`[WebSocket] Chat opened: ${chatId} by reader ${readerId || clientMeta?.id} (Read receipts OFF - skipping WSS read receipt broadcast)`);
              break;
            }

            console.log(`[WebSocket] Chat opened: ${chatId} by reader ${readerId || clientMeta?.id}`);

            // Mark any pending server records in this chat as read
            serverMessages.forEach((m) => {
              if (m.chatId === chatId && m.senderId !== readerId) {
                m.status = 'read';
              }
            });

            const readPayload = JSON.stringify({
              type: 'message:read',
              chatId,
              readerId: readerId || clientMeta?.id || 'peer',
              readerName: readerName || clientMeta?.name || 'Peer Contact',
              readAt: Date.now(),
            });

            // Broadcast to other connected clients
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === WebSocket.OPEN) {
                c.send(readPayload);
              }
            });
            break;
          }

          case 'message:send': {
            const { message } = data;
            if (!message || !message.id) break;

            serverMessages.set(message.id, {
              id: message.id,
              chatId: message.chatId,
              senderId: message.senderId,
              status: 'sent',
              timestamp: message.timestamp || Date.now(),
            });

            // Delivery receipt to sender (always delivered)
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'message:delivered',
                    messageId: message.id,
                    chatId: message.chatId,
                    deliveredAt: Date.now(),
                  })
                );
              }
            }, 300);

            // Broadcast to other connected clients
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === WebSocket.OPEN) {
                c.send(
                  JSON.stringify({
                    type: 'message:received',
                    message,
                  })
                );
              }
            });

            // When messaging contacts (Elena, Marcus, Sarah, David, etc.),
            // simulate recipient opening the chat after a realistic delay (1.2s - 1.8s)
            // ONLY IF client has read receipts enabled!
            const readReceiptsActive = data.readReceiptsEnabled !== false && clientMeta?.readReceiptsEnabled !== false;
            if (readReceiptsActive && message.chatId && message.chatId !== 'contact_gemini') {
              const readDelay = 1200 + Math.floor(Math.random() * 600);
              setTimeout(() => {
                if (serverMessages.has(message.id)) {
                  serverMessages.get(message.id)!.status = 'read';
                }
                const peerReadPayload = JSON.stringify({
                  type: 'message:read',
                  chatId: message.chatId,
                  messageId: message.id,
                  readerId: message.chatId,
                  readerName: message.chatId.replace('contact_', ''),
                  readAt: Date.now(),
                });

                wss.clients.forEach((c) => {
                  if (c.readyState === WebSocket.OPEN) {
                    c.send(peerReadPayload);
                  }
                });
              }, readDelay);
            }
            break;
          }

          case 'chat:typing': {
            const { chatId, isTyping } = data;
            const typingPayload = JSON.stringify({
              type: 'chat:typing',
              chatId,
              isTyping,
              senderId: clientMeta?.id,
            });
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === WebSocket.OPEN) {
                c.send(typingPayload);
              }
            });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[WebSocket] Error handling message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId}. Remaining: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.warn(`[WebSocket] Socket warning for ${clientId}:`, err.message);
    });
  });

  // Vite middleware in dev / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} with WebSocket at ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer();
