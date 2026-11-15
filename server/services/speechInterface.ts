import { getGeminiClient } from './geminiClient.ts';

export type SupportedLanguage = 'en' | 'te' | 'hi' | 'kn';

export interface SpeechToTextResult {
  transcript: string;
  language: SupportedLanguage;
  provider: 'gemini-3.5-transcribe' | 'bhashini-ulca' | 'whisper' | 'demo-fallback';
  isDemoMode: boolean;
}

export interface TextToSpeechResult {
  audioBase64: string | null;
  mimeType: string | null;
  scriptText: string;
  language: SupportedLanguage;
  provider: 'gemini-3.8-flash-lite-tts' | 'bhashini-tts' | 'demo-browser-speech';
  isDemoMode: boolean;
  notice?: string;
}

export interface SpeechToTextProvider {
  name: string;
  isConfigured(): boolean;
  transcribe(audioBase64: string, mimeType: string, language: SupportedLanguage): Promise<SpeechToTextResult>;
}

export interface TextToSpeechProvider {
  name: string;
  isConfigured(): boolean;
  synthesize(text: string, language: SupportedLanguage): Promise<TextToSpeechResult>;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
  kn: 'Kannada',
};

export class GeminiSpeechToTextProvider implements SpeechToTextProvider {
  name = 'gemini-3.5-transcribe';

  isConfigured(): boolean {
    return getGeminiClient() !== null;
  }

  async transcribe(
    audioBase64: string,
    mimeType: string,
    language: SupportedLanguage
  ): Promise<SpeechToTextResult> {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        transcript: '',
        language,
        provider: 'demo-fallback',
        isDemoMode: true,
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this spoken Self-Help Group order or production update accurately. Expected language: ${LANGUAGE_LABELS[language]} (or regional Indian English). Return only the transcribed text.`,
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      return {
        transcript,
        language,
        provider: 'gemini-3.5-transcribe',
        isDemoMode: false,
      };
    } catch (err) {
      console.error('Gemini transcription error:', err);
      return {
        transcript: '',
        language,
        provider: 'demo-fallback',
        isDemoMode: true,
      };
    }
  }
}

export class GeminiTextToSpeechProvider implements TextToSpeechProvider {
  name = 'gemini-3.8-flash-lite-tts';

  isConfigured(): boolean {
    return getGeminiClient() !== null;
  }

  async synthesize(text: string, language: SupportedLanguage): Promise<TextToSpeechResult> {
    const ai = getGeminiClient();
    if (!ai) {
      return {
        audioBase64: null,
        mimeType: null,
        scriptText: text,
        language,
        provider: 'demo-browser-speech',
        isDemoMode: true,
        notice: 'Gemini TTS key not active; using readable text + browser speech demo fallback.',
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: `Warm, respectful, clear female community assistant speaking ${LANGUAGE_LABELS[language]} slowly and clearly`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return {
          audioBase64: null,
          mimeType: null,
          scriptText: text,
          language,
          provider: 'demo-browser-speech',
          isDemoMode: true,
          notice: 'Audio stream unavailable; showing readable text & browser speech synthesis fallback.',
        };
      }

      return {
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        scriptText: text,
        language,
        provider: 'gemini-3.8-flash-lite-tts',
        isDemoMode: false,
      };
    } catch (err) {
      console.error('Gemini TTS error:', err);
      return {
        audioBase64: null,
        mimeType: null,
        scriptText: text,
        language,
        provider: 'demo-browser-speech',
        isDemoMode: true,
        notice: 'Using browser speech synthesis & readable script fallback.',
      };
    }
  }
}

// Modular interface stubs showing where Bhashini ULCA or Whisper credentials plug in.
export class BhashiniSpeechAdapter implements SpeechToTextProvider {
  name = 'bhashini-ulca';

  isConfigured(): boolean {
    return Boolean(process.env.BHASHINI_API_KEY && process.env.BHASHINI_USER_ID);
  }

  async transcribe(
    _audioBase64: string,
    _mimeType: string,
    language: SupportedLanguage
  ): Promise<SpeechToTextResult> {
    return {
      transcript: '',
      language,
      provider: 'demo-fallback',
      isDemoMode: true,
    };
  }
}

export const speechToTextService: SpeechToTextProvider = new GeminiSpeechToTextProvider();
export const textToSpeechService: TextToSpeechProvider = new GeminiTextToSpeechProvider();
export const bhashiniAdapter = new BhashiniSpeechAdapter();

export function getSpeechProviderStatus() {
  return {
    stt: {
      activeProvider: speechToTextService.isConfigured() ? 'gemini-3.5-transcribe' : 'demo-fallback',
      bhashiniConfigured: bhashiniAdapter.isConfigured(),
      whisperConfigured: Boolean(process.env.OPENAI_WHISPER_API_KEY),
      geminiConfigured: speechToTextService.isConfigured(),
    },
    tts: {
      activeProvider: textToSpeechService.isConfigured() ? 'gemini-3.8-flash-lite-tts' : 'demo-browser-speech',
      geminiConfigured: textToSpeechService.isConfigured(),
      bhashiniConfigured: bhashiniAdapter.isConfigured(),
    },
  };
}
