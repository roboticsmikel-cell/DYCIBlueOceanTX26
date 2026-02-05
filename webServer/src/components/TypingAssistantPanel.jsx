import { useState } from "react";

export default function TypingAssistantPanel({ collectionId }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages(m => [...m, userMsg]);
    setInput("");

    const res = await fetch("http://127.0.0.1:8000/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collectionId,
        message: userMsg.text
      })
    });

    const data = await res.json();

    setMessages(m => [...m, { role: "assistant", text: data.reply }]);
  }

  return (
    <div className="absolute bottom-20 right-6 z-20
                    w-80 h-72
                    rounded-xl border border-cyan-400/40
                    bg-[#020a13]/90 px-3 py-3
                    shadow-[0_0_25px_rgba(0,229,255,0.15)]
                    backdrop-blur-md
                    flex flex-col">

      {/* Messages (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-right text-cyan-300"
                : "text-left text-white"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-2 h-px bg-cyan-400/20" />

      {/* Input area (FIXED) */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-black/40 border border-cyan-400/30
                     rounded px-2 py-1 text-cyan-100
                     focus:outline-none focus:ring-1 focus:ring-cyan-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask the AI assistant…"
        />

        <button
          onClick={sendMessage}
          className="border border-cyan-400 px-3 rounded
                     text-cyan-300 hover:bg-cyan-400/10"
        >
          Send
        </button>
      </div>
    </div>
  );
}
