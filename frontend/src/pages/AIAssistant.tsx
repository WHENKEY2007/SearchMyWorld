import React, { useState } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  FileText,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { api } from '../api/client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: Array<{
    filename: string;
    path: string;
    pages?: number[];
    page_number?: number;
    file_id: string;
  }>;
}

const PROMPT_SUGGESTIONS = [
  'What are the main components of my AI project?',
  'Where did I write about Support Vector Machines?',
  'What decisions did we make regarding the database?',
  'Which tasks were planned but remain unfinished?',
];

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your local digital memory assistant. Ask me anything to quickly locate your documents and files.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Perform grounded query via backend Assistant engine
      const res = await api.chatWithMemory(q);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        sources: res.citations && res.citations.length > 0 ? res.citations : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'An error occurred while accessing local memory. Please ensure the backend is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (fileId: string) => {
    try {
      setOpeningId(fileId);
      await api.openFile(fileId);
    } catch (e: any) {
      alert(`Could not open file: ${e.message}`);
    } finally {
      setTimeout(() => setOpeningId(null), 1500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="text-center space-y-2 pb-4 border-b border-alabaster dark:border-white/10 flex-shrink-0">
        <h1 className="text-3xl font-serif text-charcoal dark:text-white tracking-tight">
          Personal AI <span className="italic font-normal">Memory Assistant.</span>
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Grounded strictly in retrieved personal files. Never hallucinating or fabricating memories.
        </p>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-onyx text-white dark:bg-white dark:text-onyx rounded-br-sm shadow-sm'
                  : 'glass-card border border-alabaster dark:border-white/10 text-charcoal dark:text-porcelain-100 rounded-bl-sm shadow-soft'
              }`}
            >
              <p className="whitespace-pre-line text-sm font-medium">{msg.text}</p>

              {/* Matching Files Cards */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-alabaster dark:border-white/10 space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {msg.sources.map((src, i) => {
                      const pagesStr =
                        src.pages && src.pages.length > 0
                          ? `Page ${src.pages.join(', ')}`
                          : src.page_number
                          ? `Page ${src.page_number}`
                          : null;

                      const isOpening = openingId === src.file_id;

                      return (
                        <div
                          key={i}
                          onClick={() => handleOpenFile(src.file_id)}
                          className="p-3 rounded-xl bg-porcelain-100/90 dark:bg-white/5 border border-alabaster dark:border-white/10 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/10 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all cursor-pointer group"
                          title="Click to open file in default application"
                        >
                          <div className="flex items-center gap-3 truncate flex-1">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-pastel-lilac text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 flex-shrink-0 group-hover:scale-105 transition-transform">
                              {src.filename.split('.').pop() || 'FILE'}
                            </span>
                            <div className="truncate flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-charcoal dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 group-hover:underline truncate transition-colors">
                                  {src.filename}
                                </span>
                                {pagesStr && (
                                  <span className="text-[10px] bg-porcelain-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex-shrink-0">
                                    {pagesStr}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 truncate max-w-lg mt-0.5">
                                {src.path}
                              </p>
                            </div>
                          </div>

                          {isOpening && (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 animate-pulse">
                              Opening...
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-porcelain-200 dark:bg-white/10 text-charcoal dark:text-white flex items-center justify-center flex-shrink-0 mt-1">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
            <Sparkles size={14} className="animate-spin text-purple-600" />
            <span>Consulting personal memory store...</span>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 flex-shrink-0">
        <span className="text-[11px] text-slate-400 whitespace-nowrap">Suggestions:</span>
        {PROMPT_SUGGESTIONS.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-onyx dark:hover:text-white transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 flex-shrink-0"
      >
        <div className="glass-card rounded-full p-2 pl-5 shadow-soft flex items-center border border-alabaster dark:border-white/10 focus-within:ring-2 focus-within:ring-onyx dark:focus-within:ring-white transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your digital memory anything..."
            className="w-full bg-transparent border-none outline-none text-charcoal dark:text-white placeholder:text-slate-400 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-full bg-onyx text-white dark:bg-white dark:text-onyx hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};
