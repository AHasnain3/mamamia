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
      const res = await fetch('/api/mother/first'); // optional API route to get first mother ID
      const data = await res.json();
      setMotherId(data.id ?? null);
      setMotherName(data.name ?? "Unknown");

      if (data.id) {
        // Load last message from mother
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

    // Add user message to UI
    setMessages(prev => [...prev, { sender: 'user', text: input }]);

    // Save message to DB
    const res = await fetch('/api/chat/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motherId, content: input }),
    });

    const data = await res.json();

    // Display bot reply (here echoing the same message)
    setMessages(prev => [...prev, { sender: 'bot', text: data.content }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">Chat with {motherName}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[70%] px-4 py-2 rounded-2xl break-words ${
              msg.sender === 'user'
                ? 'bg-blue-500 text-white self-end rounded-br-none'
                : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </main>

      <div className="p-4 bg-white shadow-md flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-blue-600 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
