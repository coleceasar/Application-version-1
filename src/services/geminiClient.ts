import { GeminiChatMessage } from '../types';

export interface GeminiInquiryOption {
  id: string;
  category: 'Security' | 'Privacy' | 'Protocol' | 'Compose' | 'Android';
  label: string;
  prompt: string;
}

export const SUGGESTED_INQUIRIES: GeminiInquiryOption[] = [
  {
    id: 'e2ee-explain',
    category: 'Security',
    label: 'How does AES-256-GCM protect my data?',
    prompt:
      'Explain how AES-256-GCM encryption with Tink envelopes and 96-bit random IVs ensures confidentiality and authenticity for our messages.',
  },
  {
    id: 'double-ratchet',
    category: 'Protocol',
    label: 'What is the Double Ratchet algorithm?',
    prompt:
      'Explain the Double Ratchet protocol (Diffie-Hellman ratchet + symmetric KDF ratchet) and how it guarantees forward secrecy and post-compromise security.',
  },
  {
    id: 'offline-staging',
    category: 'Android',
    label: 'How does offline queue & staging work?',
    prompt:
      'How does the Android WorkManager queue encrypted messages when disconnected and reliably drain them upon network reconnection?',
  },
  {
    id: 'ephemeral-burn',
    category: 'Privacy',
    label: 'How do self-destructing messages work?',
    prompt:
      'How do burn-on-read timers and cryptographic memory zeroization prevent leaked message histories on Android devices?',
  },
  {
    id: 'draft-secure',
    category: 'Compose',
    label: 'Draft an operational security briefing',
    prompt:
      'Draft a concise, professional operational security briefing message instructing a team member to verify out-of-band safety numbers before transferring sensitive files.',
  },
  {
    id: 'gps-privacy',
    category: 'Privacy',
    label: 'How is live GPS location secured?',
    prompt:
      'How are real-time coordinates encrypted client-side with AES-256-GCM so intermediate relays cannot inspect the user location?',
  },
];

export async function sendGeminiChat(
  message: string,
  history: GeminiChatMessage[] = []
): Promise<{ reply: string; error?: string; model?: string; isHighDemandFallback?: boolean }> {
  try {
    const formattedHistory = history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: formattedHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        reply: '',
        error:
          errorData.details ||
          errorData.error ||
          `Server returned error HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.isError) {
      return {
        reply: data.reply || '',
        error: data.reply || 'Temporary high demand on Gemini API',
      };
    }

    return {
      reply: data.reply || 'No response generated.',
      model: data.model,
      isHighDemandFallback: data.isHighDemandFallback,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      reply: '',
      error: `Connection error: ${msg}. Check network status or server logs.`,
    };
  }
}
