import { useState } from "react";

export default function SpeakingAssistantPanel({ collectionId }) {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);

  async function sendMessage(text) {
    if (!text.trim()) return;

    // show user message
    setMessages(m => [...m, { role: "user", text }]);

    const res = await fetch("http://127.0.0.1:8000/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_id: collectionId,
        message: text
      })
    });

    const data = await res.json();

    // 🔹 support structured backend response
    const replyText = data.speech || data.reply || "";

    // show assistant reply
    setMessages(m => [...m, { role: "assistant", text: replyText }]);

    // 🔊 SPEAK AI REPLY
    if (replyText) {
      const utterance = new SpeechSynthesisUtterance(replyText);
      utterance.lang = "en-US";
      speechSynthesis.speak(utterance);
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

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
      setListening(false);  
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }

  return (
    <div className="absolute bottom-20 right-6 w-80 h-72 z-20 flex flex-col rounded-xl border border-cyan-400/40
                    bg-[#020a13]/90 p-3 text-cyan-100">

      <div className="flex-1 overflow-y-auto space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user"
              ? "text-right text-cyan-300"
              : "text-left text-white"}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-cyan-400">
          {listening ? "Listening…" : "Voice Assistant"}
        </span>

        <button
          onClick={startListening}
          className="border border-cyan-400 px-3 py-1 rounded
                     text-cyan-300 hover:bg-cyan-400/10"
        >
          Talk
        </button>
      </div>
    </div>
  );
}
