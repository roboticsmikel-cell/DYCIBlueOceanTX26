import { useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function SpeakingAssistantPanel({ collectionId }) {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  async function sendMessage(text) {
    if (!text.trim()) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setStatusText("Sending...");

    try {
      const res = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: collectionId,
          message: text,
        }),
      });

      const data = await res.json();
      const replyText = data.speech || data.reply || "No response received.";
      const source = data.source || data.type || "assistant";

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: replyText,
          source,
        },
      ]);

      if (replyText && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.lang = "en-US";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

      setStatusText("Ready");
    } catch (error) {
      console.error("Assistant fetch error:", error);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Connection error. Unable to reach assistant.",
          source: "error",
        },
      ]);

      setStatusText("Connection error");
    }
  }

  function stopListeningCleanup() {
    setListening(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    recognitionRef.current = null;
  }

  function startListening() {
    if (!SpeechRecognition) {
      setStatusText("Voice input not supported");
      alert("Speech recognition is not supported on this device/browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setListening(true);
      setStatusText("Starting microphone...");

      timeoutRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {}
        setStatusText("No speech detected");
        stopListeningCleanup();
      }, 8000);

      recognition.onstart = () => {
        setStatusText("Listening...");
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        console.log("Transcript:", transcript);

        if (transcript.trim()) {
          sendMessage(transcript);
        } else {
          setStatusText("No speech detected");
        }

        stopListeningCleanup();
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        const errorMap = {
          "not-allowed": "Microphone permission blocked",
          "service-not-allowed": "Speech service blocked",
          network: "Network error",
          "no-speech": "No speech detected",
          "audio-capture": "Microphone not found",
          aborted: "Listening cancelled",
        };

        const message = errorMap[event.error] || `Voice error: ${event.error}`;
        setStatusText(message);
        stopListeningCleanup();
      };

      recognition.onend = () => {
        setStatusText((prev) =>
          prev === "Listening..." || prev === "Starting microphone..."
            ? "Ready"
            : prev
        );
        stopListeningCleanup();
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition start failed:", error);
      setStatusText("Could not start microphone");
      stopListeningCleanup();
      alert("Could not start microphone on this device.");
    }
  }

  function formatSourceLabel(source) {
    if (!source) return "TUKLAS";

    const normalized = String(source).toLowerCase();

    if (normalized === "gemini") return "TUKLAS • GEMINI";
    if (normalized === "fallback") return "TUKLAS • FALLBACK";
    if (normalized === "image_analysis") return "TUKLAS • IMAGE ANALYSIS";
    if (normalized === "image_analysis_fallback") return "TUKLAS • ANALYSIS FALLBACK";
    if (normalized === "chat") return "TUKLAS • CHAT";
    if (normalized === "chat_fallback") return "TUKLAS • CHAT FALLBACK";
    if (normalized === "error") return "TUKLAS • ERROR";

    return `TUKLAS • ${String(source).toUpperCase()}`;
  }

  return (
    <div
      className="flex h-full min-h-[200px] w-full flex-col rounded-xl border border-cyan-400/40
                 bg-[#020a13]/90 p-3 text-cyan-100 shadow-[0_0_25px_rgba(0,229,255,0.15)]"
    >
      <div className="mb-2 flex items-center justify-between border-b border-cyan-400/20 pb-2">
        <span className="text-xs uppercase tracking-widest text-cyan-400">
          {listening ? "Listening..." : "T.U.K.L.A.S. A.I."}
        </span>

        <span
          className={`h-2 w-2 rounded-full ${
            listening ? "bg-red-400" : "bg-cyan-400"
          }`}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-cyan-400/70">
            Say something to start the conversation.
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "ml-auto border border-cyan-400/30 bg-cyan-400/10 text-right text-cyan-300"
                  : "mr-auto border border-white/10 bg-white/5 text-left text-white"
              }`}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">
                {m.role === "user" ? "You" : formatSourceLabel(m.source)}
              </div>
              <div>{m.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-cyan-400/20 pt-2">
        <span className="text-xs text-cyan-400">{statusText}</span>

        <button
          onClick={startListening}
          disabled={listening}
          className="rounded border border-cyan-400 px-3 py-1 text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-60"
        >
          {listening ? "Listening..." : "Talk"}
        </button>
      </div>
    </div>
  );
}