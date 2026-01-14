import { useCallback, useRef, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Strip HTML tags from text before speaking
 * Uses DOMParser for safe HTML parsing
 */
function stripHtmlForSpeech(html: string): string {
  if (!html) return "";

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const text = doc.body.textContent || "";
    return text.trim();
  } catch (error) {
    // Fallback: simple regex stripping
    return html.replace(/<[^>]*>/g, "").trim();
  }
}

/**
 * Custom hook for Text-to-Speech functionality
 * Supports HTML input (strips tags before speaking)
 *
 * @returns { speak, stop, isSupported, isSpeaking }
 */
export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Check if browser supports Speech Synthesis API
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices on mount
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    // Load voices immediately
    loadVoices();

    // Listen for voices changed event (some browsers load voices async)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  /**
   * Get preferred English voice (US or UK)
   */
  const getEnglishVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!isSupported) return null;

    const voices = window.speechSynthesis.getVoices();

    // If no voices loaded yet, return null
    if (voices.length === 0) return null;

    // Priority 1: English (US)
    let voice = voices.find((v) => v.lang === "en-US");
    if (voice) return voice;

    // Priority 2: English (UK)
    voice = voices.find((v) => v.lang === "en-GB");
    if (voice) return voice;

    // Priority 3: Any English voice
    voice = voices.find((v) => v.lang.startsWith("en-"));
    if (voice) return voice;

    // Fallback: Default voice
    return voices[0] || null;
  }, [isSupported]);

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    if (!isSupported) return;

    try {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    } catch (error) {
      console.error("Failed to stop speech:", error);
    }
  }, [isSupported]);

  /**
   * Speak text with Text-to-Speech
   * Automatically strips HTML tags before speaking
   *
   * @param htmlText - HTML string or plain text
   * @param lang - Language code (default: 'en-US')
   */
  const speak = useCallback(
    (htmlText: string, lang: string = "en-US") => {
      if (!isSupported) {
        toast.error("Trình duyệt của bạn không hỗ trợ Text-to-Speech");
        return;
      }

      if (!htmlText) {
        return;
      }

      try {
        // Cancel any ongoing speech
        stop();

        // Strip HTML tags to get plain text
        const plainText = stripHtmlForSpeech(htmlText);

        if (!plainText) {
          toast.warning("Không có nội dung để đọc");
          return;
        }

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(plainText);
        utteranceRef.current = utterance;

        // Set voice
        const voice = getEnglishVoice();
        if (voice) {
          utterance.voice = voice;
        }
        utterance.lang = lang;

        // Set speech parameters
        utterance.rate = 0.9; // Slightly slower for learning
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Event handlers
        utterance.onstart = () => {
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          isSpeakingRef.current = false;
        };

        utterance.onerror = (event) => {
          isSpeakingRef.current = false;

          // Only log and show error for actual errors, not interruptions
          if (event.error !== "interrupted" && event.error !== "cancelled") {
            console.error("Speech synthesis error:", event.error);
            toast.error("Lỗi khi phát âm thanh");
          }
        };

        // Speak
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Failed to speak:", error);
        toast.error("Không thể phát âm thanh");
        isSpeakingRef.current = false;
      }
    },
    [isSupported, stop, getEnglishVoice]
  );

  return {
    speak,
    stop,
    isSupported,
    voicesLoaded,
    get isSpeaking() {
      return isSpeakingRef.current;
    },
  };
}
