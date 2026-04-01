import { useState } from "react";

export default function SpeakingAssistantPanel({ collectionId }) {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);

  async function sendMessage(text) {
    if (!text.trim()) return;

    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: collectionId,
          message: text,
        }),
      });

      const data = await res.json();
      const replyText = data.speech || data.reply || "";

      setMessages((m) => [...m, { role: "assistant", text: replyText }]);

      if (replyText) {
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.lang = "en-US";
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error(error);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Connection error. Unable to reach assistant." },
      ]);
    }
  }

  function startListening() {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }

  return (
    <div className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-[#00e5ff]/20 bg-[#111316]/90 p-4 text-[#e2e2e6] shadow-[0_0_24px_rgba(0,229,255,0.08)] backdrop-blur-md">
      {/* scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(195,245,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

      {/* corner accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[#c3f5ff]/70" />
      </div>

      {/* glow lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-40" />

      <div className="relative z-10 flex h-full flex-col">
        {/* header */}
        <div className="mb-3 flex items-center justify-between border-b border-[#c3f5ff]/10 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bac9cc]">
              Audio Interface
            </p>
            <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-[#ffd799]">
              Voice Assistant
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full shadow-[0_0_12px_rgba(0,229,255,0.8)] ${
                listening ? "bg-red-400" : "bg-[#00e5ff]"
              }`}
            />
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                listening ? "text-red-400" : "text-[#00e5ff]"
              }`}
            >
              {listening ? "Listening" : "Standby"}
            </span>
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3 shadow-[inset_0_0_18px_rgba(0,229,255,0.04)]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex items-end gap-1 opacity-70">
                <div className="h-3 w-1 animate-pulse bg-[#ffd799]" />
                <div className="h-5 w-1 animate-pulse bg-[#ffd799]" />
                <div className="h-7 w-1 animate-pulse bg-[#ffd799]" />
                <div className="h-4 w-1 animate-pulse bg-[#ffd799]" />
                <div className="h-6 w-1 animate-pulse bg-[#ffd799]" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Awaiting voice input
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-right text-[#c3f5ff]"
                    : "mr-auto border border-[#ffd799]/20 bg-[#ffd799]/10 text-left text-[#e2e2e6]"
                }`}
              >
                <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">
                  {m.role === "user" ? "User" : "Assistant"}
                </div>
                <div>{m.text}</div>
              </div>
            ))
          )}
        </div>

        {/* footer controls */}
        <div className="mt-3 flex items-center justify-between border-t border-[#c3f5ff]/10 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bac9cc]">
            {listening ? "Microphone active" : "Voice channel ready"}
          </span>

          <button
            onClick={startListening}
            className="rounded-xl border border-[#c3f5ff]/40 bg-[#111316]/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[#c3f5ff] shadow-[0_0_20px_rgba(0,229,255,0.12)] transition hover:bg-[#00e5ff]/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.22)]"
          >
            {listening ? "Listening..." : "Talk"}
          </button>
        </div>
      </div>
    </div>
  );
}