'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function ChatThread() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !isConnected || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SHERPA_API_BASE ?? ''}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          address,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response ?? 'No response received.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-sherpa-surface2 px-4 py-3">
        <span className="text-sm font-semibold tracking-[-0.02em] text-sherpa-blue">Sherpa</span>
        <span className="text-xs text-sherpa-muted">Mini App</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-sherpa-muted">
              {isConnected
                ? 'Type a message to get started.'
                : 'Connect your wallet to start.'}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'ml-auto bg-sherpa-blue text-white'
                  : 'bg-sherpa-surface text-sherpa-fg'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isSending && (
            <div className="max-w-[85%] rounded-2xl bg-sherpa-surface px-4 py-3 text-sm text-sherpa-muted">
              Thinking…
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-sherpa-surface2 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? 'Ask Sherpa…' : 'Connect wallet first'}
            disabled={!isConnected}
            className="flex-1 rounded-xl border border-sherpa-surface2 bg-sherpa-surface px-4 py-3 text-sm text-sherpa-fg placeholder-sherpa-muted outline-none focus:border-sherpa-blue disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim() || isSending}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-sherpa-blue px-4 py-3 text-sm font-medium text-white transition hover:bg-sherpa-blue/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
