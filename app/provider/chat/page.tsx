'use client';

import { useState, useEffect } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [motherId, setMotherId] = useState<number | null>(null);
  const [motherName, setMotherName] = useState('Unknown');

  // Fetch first mother on mount
  useEffect(() => {
    async function fetchMother() {
      const res = await fetch('/api/mother/first');
      const data = await res.json();
      setMotherId(data.id ?? null);
      setMotherName(data.name ?? "Unknown");

      if (data.id) {
        const msgRes = await fetch(`/api/chat/lastMessage?motherId=${data.id}`);
        const msgData = await msgRes.json();
        if (msgData.content) {
          setMessages([{ sender: 'bot', text: msgData.content }]);
        }
      }
    }
    fetchMother();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !motherId) return;

    const userMessage = input;
    setInput('');

    // Immediately show user message in UI
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);

    try {
      // Save message to DB
      const res = await fetch('/api/chat/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motherId, content: userMessage }),
      });

      const data = await res.json();

      // Append bot response
      if (data?.content) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.content }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <main className="h-dvh relative isolate flex flex-col">
      {/* dark canvas + radial glow */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 pointer-events-none
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      {/* header */}
      <header className="p-4 bg-purple-600/26 hover:bg-purple-600/40 backdrop-blur-[1px] transition-colors shadow-sm">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 text-center">
          Chat with {motherName}
        </h1>
      </header>

      {/* chat messages */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[70%] px-4 py-2 rounded-2xl break-words ${
              msg.sender === 'user'
                ? 'bg-blue-500 text-white self-end rounded-br-none shadow'
                : 'bg-gray-800/60 text-neutral-50 self-start rounded-bl-none shadow'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </main>

      {/* input */}
      <div className="p-4 bg-neutral-900/20 backdrop-blur-sm shadow-sm flex justify-center">
        <div className="flex w-3/4 max-w-2xl items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-3 rounded-full border border-neutral-700
                       bg-neutral-800/40 text-neutral-50
                       focus:outline-none focus:ring-2 focus:ring-purple-400
                       shadow-sm transition"
          />
          <button
            onClick={handleSend}
            className="bg-purple-600 hover:bg-purple-700 text-neutral-50 px-6 py-3 rounded-full font-semibold shadow transition"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
