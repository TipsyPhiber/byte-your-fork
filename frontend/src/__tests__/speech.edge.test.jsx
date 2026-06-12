// src/__tests__/speech.edge.test.jsx
/**
 * Edge‑case tests for the speech utilities.
 * Covers scenarios not exercised by the basic test suite:
 *   • loadVoices returns an empty array (no voices available)
 *   • loadVoices throws an error (e.g., permission denied)
 *   • ttsSpeak is called with a missing/invalid voiceURI
 *   • speak falls back to the default language when the requested voice is absent
 *   • native TextToSpeech.speak rejects (simulating a runtime error)
 */

import { loadVoices, ttsSpeak, speak } from "../utils/speech";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

jest.mock("@capacitor-community/text-to-speech", () => {
  return {
    getSupportedVoices: jest.fn(() => Promise.resolve({ voices: [] })),
    speak: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  };
});

describe("utils/speech – edge cases", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loadVoices resolves to empty array when platform provides none", async () => {
    // Mock native getSupportedVoices to return an empty list
    (TextToSpeech.getSupportedVoices as jest.Mock).mockResolvedValueOnce({ voices: [] });
    const result = await loadVoices();
    expect(result).toEqual([]);
  });

  test("loadVoices propagates error when underlying call fails", async () => {
    const error = new Error("permission denied");
    (TextToSpeech.getSupportedVoices as jest.Mock).mockRejectedValueOnce(error);
    await expect(loadVoices()).rejects.toThrow("permission denied");
  });

  test("ttsSpeak falls back gracefully when voiceURI is missing", async () => {
    const text = "fallback test";
    await ttsSpeak(text, { voiceURI: "" }); // empty string should use default voice
    expect(TextToSpeech.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text })
    );
  });

  test("speak uses default en‑US when requested voice is not found", async () => {
    // Mock native getSupportedVoices to return a single voice with a different lang
    (TextToSpeech.getSupportedVoices as jest.Mock).mockResolvedValueOnce({
      voices: [{ voiceURI: "some-voice", name: "Some Voice", lang: "fr-FR" }],
    });
    await speak("hello", { voiceURI: "non‑existent" });
    // The function should resolve without throwing and use default en‑US fallback internally
    expect(TextToSpeech.speak).toHaveBeenCalled();
  });

  test("native speak error is caught and re‑thrown as a readable error", async () => {
    const nativeError = new Error("Native failure");
    (TextToSpeech.speak as jest.Mock).mockRejectedValueOnce(nativeError);
    await expect(speak("oops", { voiceURI: "any" })).rejects.toThrow("Native failure");
  });
});
