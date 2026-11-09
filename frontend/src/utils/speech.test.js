import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mocks that are executed before vi.mock gets hoisted
const { mockIsNative, mockGetSupportedVoices, mockSpeak, mockStop } = vi.hoisted(() => {
  return {
    mockIsNative: vi.fn(() => false),
    mockGetSupportedVoices: vi.fn(),
    mockSpeak: vi.fn(),
    mockStop: vi.fn(),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNative(),
  },
}));

vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    getSupportedVoices: () => mockGetSupportedVoices(),
    speak: (opts) => mockSpeak(opts),
    stop: () => mockStop(),
  },
}));

vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    available: vi.fn(),
    requestPermissions: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

describe('Speech Utility', () => {
  beforeEach(() => {
    vi.resetModules(); // Reset module cache so fresh imports read updated mocks
    vi.clearAllMocks();
    
    // Set up default browser globals in Node global context
    global.window = {
      speechSynthesis: {
        getVoices: vi.fn(() => []),
        cancel: vi.fn(),
        speak: vi.fn(),
      },
    };
    
    global.SpeechSynthesisUtterance = class MockUtterance {
      constructor(text) {
        this.text = text;
      }
    };
  });

  describe('loadVoices', () => {
    it('should load, filter, deduplicate, and sort voices on Native platform', async () => {
      mockIsNative.mockReturnValue(true);
      const { loadVoices } = await import('./speech');
      
      const mockRawVoices = [
        { voiceURI: 'en-US-google', name: 'Google US English', lang: 'en-US' }, // Google voice (Priority 3)
        { voiceURI: 'es-ES-voice', name: 'Spanish Voice', lang: 'es-ES' },       // Non-English (Filtered)
        { voiceURI: 'en-GB-dup', name: 'Google US English', lang: 'en-GB' },    // Duplicate name (Deduplicated)
        { voiceURI: 'en-AU-natural', name: 'AU Natural Voice', lang: 'en-AU' },  // Natural voice (Priority 2)
        { voiceURI: 'en-IN-local', name: 'IN Local Voice', lang: 'en-IN' },      // Local voice (Priority 1)
        { voiceURI: 'en-US-basic', name: 'Basic Voice', lang: 'en-US' },         // Basic voice (Priority 0)
      ];
      mockGetSupportedVoices.mockResolvedValue({ voices: mockRawVoices });

      const voices = await loadVoices();

      // Expected behavior:
      // 1. Non-English (es-ES-voice) filtered out.
      // 2. Duplicate name "Google US English" deduplicated (retaining the first one).
      // 3. Keep original indices:
      //    - Google US English (0)
      //    - AU Natural Voice (3)
      //    - IN Local Voice (4)
      //    - Basic Voice (5)
      // 4. Sorted: Priority Google (3) > Natural (2) > Local (1) > Basic (0).
      expect(voices).toHaveLength(4);

      expect(voices[0].name).toBe('Google US English');
      expect(voices[0].originalIndex).toBe(0);

      expect(voices[1].name).toBe('AU Natural Voice');
      expect(voices[1].originalIndex).toBe(3);

      expect(voices[2].name).toBe('IN Local Voice');
      expect(voices[2].originalIndex).toBe(4);

      expect(voices[3].name).toBe('Basic Voice');
      expect(voices[3].originalIndex).toBe(5);
    });

    it('should load, filter, deduplicate, and sort voices on Web platform', async () => {
      mockIsNative.mockReturnValue(false);
      const { loadVoices } = await import('./speech');

      const mockWebVoices = [
        { voiceURI: 'Google US English', name: 'Google US English', lang: 'en-US' },
        { voiceURI: 'Spanish', name: 'Spanish Voice', lang: 'es-ES' },
        { voiceURI: 'Duplicate', name: 'Google US English', lang: 'en-GB' },
        { voiceURI: 'Natural', name: 'Natural Voice', lang: 'en-AU' },
      ];
      global.window.speechSynthesis.getVoices.mockReturnValue(mockWebVoices);

      const voices = await loadVoices();

      expect(voices).toHaveLength(2);
      expect(voices[0].name).toBe('Google US English');
      expect(voices[1].name).toBe('Natural Voice');
    });
  });

  describe('speak', () => {
    it('should call native TextToSpeech.speak with correct originalIndex, lang, and queueStrategy', async () => {
      mockIsNative.mockReturnValue(true);
      const { loadVoices, speak } = await import('./speech');

      const mockRawVoices = [
        { voiceURI: 'en-US-1', name: 'Google US English 1', lang: 'en-US' },
        { voiceURI: 'en-GB-1', name: 'British Voice', lang: 'en-GB' },
      ];
      mockGetSupportedVoices.mockResolvedValue({ voices: mockRawVoices });
      await loadVoices(); // Populates internal nativeVoices array

      mockSpeak.mockResolvedValue({});
      mockStop.mockResolvedValue({});

      // Speak using British Voice (which has originalIndex 1 and lang en-GB)
      await speak('Hello', { voiceURI: 'en-GB-1' });

      expect(mockStop).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalledWith({
        text: 'Hello',
        lang: 'en-GB', // Lang matched to selected voice locale
        rate: 0.88,
        pitch: 1,
        queueStrategy: 1, // Stop previous and speak immediately
        voice: 1, // Correct original index passed to native plugin
      });
    });

    it('should default to en-US and omit voice index if voice is not found on Native', async () => {
      mockIsNative.mockReturnValue(true);
      const { loadVoices, speak } = await import('./speech');
      
      mockGetSupportedVoices.mockResolvedValue({ voices: [] });
      await loadVoices();

      await speak('Hello', { voiceURI: 'non-existent' });

      expect(mockSpeak).toHaveBeenCalledWith({
        text: 'Hello',
        lang: 'en-US',
        rate: 0.88,
        pitch: 1,
        queueStrategy: 1,
      });
    });
  });
});
