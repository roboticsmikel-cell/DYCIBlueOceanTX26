import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function SpeakingAssistantPanel({ collectionId }) {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(
    typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  async function sendMessage(text) {
    if (!text.trim()) return;

    setMessages((m) => [...m, { role: "user", text }]);

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
      const replyText = data.speech || data.reply || "";

      setMessages((m) => [
        ...m,
        { role: "assistant", text: replyText || "No response received." },
      ]);

      if (replyText) {
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.lang = "en-US";
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error(error);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Connection error. Unable to reach assistant.",
        },
      ]);
    }
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      alert(
        "Speech recognition is not supported on this device. Please use typing instead."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript.trim()) {
        sendMessage(transcript);
      }
      setListening(false);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
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
                {m.role === "user" ? "You" : "TUKLAS"}
              </div>
              <div>{m.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-cyan-400/20 pt-2">
        <div className="flex flex-col">
          <span className="text-xs text-cyan-400">
            {listening ? "Microphone active" : "Ready"}
          </span>
          {!voiceSupported && (
            <span className="mt-1 text-[10px] text-red-400">
              Voice input not supported on this device
            </span>
          )}
        </div>

        <button
          onClick={startListening}
          className="rounded border border-cyan-400 px-3 py-1 text-cyan-300 transition hover:bg-cyan-400/10"
        >
          {listening ? "Listening..." : "Talk"}
        </button>
      </div>
    </div>
  );
}