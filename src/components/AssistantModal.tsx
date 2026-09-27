import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'cormo_assistant_chat_history_v1';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Salut! Sunt asistentul tău. Îți pot răspunde la orice întrebare: despre calendarul patrulei, evenimente sau dacă o zi este liberă, despre Cercetașii Munților, sau despre orice alt subiect. Cu ce te pot ajuta?',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save conversation locally per device
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages, loading]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Eroare server (${res.status})`);
      }

      const data = await res.json();
      const assistantReply = data.reply || 'Nu am primit un răspuns.';

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Eroare asistent:', err);
      setError(err?.message || 'Nu am putut conecta asistentul. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to format basic markdown (bold, bullet points, links)
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bullet list item
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Parse bold **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const parsedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-white">
              {part.substring(2, part.length - 2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 my-0.5 leading-relaxed">
            {parsedParts}
          </li>
        );
      }

      if (line.trim().length === 0) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed text-slate-200">
          {parsedParts}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fereastră Asistent"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl h-[92vh] sm:h-[85vh] bg-[#0c1017] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header: Just "Asistent" as title, no icons/emojis, no subtitle, just close button */}
        <header className="px-5 py-4 border-b border-slate-800/80 bg-[#0e131d]/90 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Asistent
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Închide fereastra asistentului"
            aria-label="Închide fereastra asistentului"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Messages Scroll Area: compact, natural, no timestamps, no side avatars */}
        <main
          tabIndex={0}
          aria-label="Istoric mesaje asistent"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 focus:outline-none"
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`w-fit max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-normal shadow-md leading-relaxed ${
                    isUser
                      ? 'bg-emerald-900/90 text-white rounded-tr-sm border border-emerald-700/60'
                      : 'bg-slate-900/95 text-slate-100 rounded-tl-sm border border-slate-800'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-line">{m.content}</p>
                  ) : (
                    <div>{renderMessageContent(m.content)}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {loading && (
            <div className="flex w-full justify-start">
              <div className="w-fit px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-800 text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Bar: empty placeholder, no suggestions, no footer helper text */}
        <footer className="p-3 sm:p-4 border-t border-slate-800 bg-[#0e131d]/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 focus-within:border-emerald-600 rounded-2xl px-3 py-1.5 shadow-inner transition-colors"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder-transparent focus:outline-none resize-none py-1.5 max-h-28"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Trimite mesajul"
              aria-label="Trimite mesajul"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};
