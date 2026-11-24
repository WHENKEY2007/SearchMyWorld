import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  MessageSquare,
  X,
  FileCode,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Paperclip,
  Clock,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, ConversationItem } from '../api/client';

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
  created_at?: string;
}

const GLOBAL_SUGGESTIONS = [
  'What are the main components of my AI projects?',
  'Where did I write about Support Vector Machines?',
  'What decisions did we make regarding the database?',
  'Find any unpaid invoices or approval letters.',
];

const DOCUMENT_SUGGESTIONS = [
  'Summarize this document thoroughly',
  'What are the key takeaways and decisions?',
  'List any dates, deadlines, or action items mentioned',
  'Who are the people or entities mentioned in this file?',
];

export const AIAssistant: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileIdParam = searchParams.get('fileId');
  const fileNameParam = searchParams.get('fileName');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [focusedFile, setFocusedFile] = useState<{ id: string; name: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [switchingChat, setSwitchingChat] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Failed to load conversations', err);
      return [];
    }
  };

  useEffect(() => {
    loadConversations().then((convs) => {
      // If focused file is passed in URL params, set it up
      if (fileIdParam && fileNameParam) {
        setFocusedFile({ id: fileIdParam, name: fileNameParam });
        // Create or select conversation for this document
        startNewChat(fileNameParam ? `Doc: ${fileNameParam}` : 'Document Analysis', fileIdParam);
      } else if (convs.length > 0 && !currentConvId) {
        selectConversation(convs[0].id);
      } else if (convs.length === 0) {
        startNewChat('General Memory Assistant');
      }
    });
  }, [fileIdParam, fileNameParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const selectConversation = async (convId: string) => {
    setCurrentConvId(convId);
    setSwitchingChat(true);

    // Sync focused document with the selected conversation
    const conv = conversations.find((c) => c.id === convId);
    if (conv?.focused_file_id && conv?.focused_filename) {
      setFocusedFile({ id: conv.focused_file_id, name: conv.focused_filename });
    } else {
      setFocusedFile(null);
    }

    try {
      const res = await api.getConversationHistory(convId);
      if (res && res.messages && res.messages.length > 0) {
        setMessages(
          res.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            sources: Array.isArray(m.sources) ? m.sources : [],
            created_at: m.created_at,
          }))
        );
      } else {
        setMessages([
          {
            id: 'welcome',
            sender: 'assistant',
            text: conv?.focused_filename
              ? `Ready to analyze **${conv.focused_filename}**. What would you like to know or summarize about this document?`
              : 'Hello! I am your personal digital memory assistant. Ask me anything to quickly locate, summarize, or cross-reference your personal documents and screenshots.',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load thread history', err);
    } finally {
      setSwitchingChat(false);
    }
  };

  const startNewChat = async (title: string = 'New Chat', focusedFileId?: string) => {
    try {
      const newConv = await api.createConversation(title, focusedFileId);
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setCurrentConvId(newConv.id);
      if (focusedFileId && focusedFile) {
        setFocusedFile({ id: focusedFileId, name: focusedFile.name });
      } else {
        setFocusedFile(null);
      }
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: focusedFileId && focusedFile
            ? `Ready to analyze **${focusedFile.name}**. What would you like to know or summarize about this document?`
            : 'Hello! I am your personal digital memory assistant. Ask me anything to quickly locate, summarize, or cross-reference your personal documents and screenshots.',
        },
      ]);
    } catch (err) {
      console.error('Failed to create new conversation', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (currentConvId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatWithMemory(
        q,
        currentConvId || undefined,
        focusedFile?.id || undefined
      );

      if (res.conversation_id && res.conversation_id !== currentConvId) {
        setCurrentConvId(res.conversation_id);
      }

      const botMsg: Message = {
        id: res.message?.id || (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        sources: res.citations && res.citations.length > 0 ? res.citations : undefined,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      loadConversations();
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
      setTimeout(() => setOpeningId(null), 1200);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const clearFocusedFile = () => {
    setFocusedFile(null);
    searchParams.delete('fileId');
    searchParams.delete('fileName');
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 flex gap-4 h-[calc(100vh-5.5rem)]">
      {/* Sidebar: Persistent Chat Threads */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0 -ml-4 overflow-hidden opacity-0'
        } transition-all duration-300 flex-shrink-0 flex flex-col glass-card rounded-3xl p-3 border border-alabaster dark:border-white/10 shadow-soft`}
      >
        <div className="flex items-center justify-between pb-3 px-2 border-b border-alabaster dark:border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare size={17} className="text-purple-600 dark:text-purple-400" />
            <span className="font-serif font-bold text-sm text-charcoal dark:text-white">Conversations</span>
          </div>
          <button
            onClick={() => startNewChat()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx text-xs font-medium hover:opacity-90 transition-opacity"
            title="Start new conversation"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No past conversations</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-2xl cursor-pointer text-xs transition-all ${
                  currentConvId === c.id
                    ? 'bg-purple-100/70 dark:bg-purple-950/60 font-semibold text-purple-900 dark:text-purple-200 shadow-sm border border-purple-200 dark:border-purple-800/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="truncate flex-1 pr-2">
                  <p className="truncate text-charcoal dark:text-slate-200">{c.title || 'Untitled Chat'}</p>
                  {c.focused_filename && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-mono truncate">
                      📄 {c.focused_filename}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1"
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl p-5 border border-alabaster dark:border-white/10 shadow-soft min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-3 border-b border-alabaster dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl border border-alabaster dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Open conversations'}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <div>
              <h1 className="text-xl font-serif font-bold text-charcoal dark:text-white flex items-center gap-2">
                Personal AI Memory Partner
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  Grounded 100% Offline
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Focused Document Mode Banner */}
        {focusedFile && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-transparent border border-purple-300 dark:border-purple-800/50 flex items-center justify-between gap-3 text-xs flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 truncate">
              <span className="px-2 py-1 rounded-xl bg-purple-600 text-white font-bold font-mono text-[10px] uppercase">
                Document Chat Mode
              </span>
              <span className="font-semibold text-charcoal dark:text-white truncate">
                Focused on: <span className="font-mono text-purple-700 dark:text-purple-300">{focusedFile.name}</span>
              </span>
            </div>
            <button
              onClick={clearFocusedFile}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition-colors"
              title="Return to global memory mode"
            >
              <X size={13} />
              <span>Clear Focus</span>
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-2">
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
                className={`max-w-2xl rounded-2xl px-5 py-3.5 space-y-2 relative group transition-all ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-none ml-12 shadow-sm'
                    : 'bg-porcelain-100 dark:bg-white/5 text-charcoal dark:text-white border border-alabaster dark:border-white/10 rounded-tl-none mr-12'
                }`}
              >
                {/* Message Header & Copy */}
                <div className="flex items-center justify-between text-[11px] opacity-80 mb-1">
                  <span className="font-semibold">{msg.sender === 'user' ? 'You' : 'SearchMyWorld Assistant'}</span>
                  <button
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-0.5 rounded text-current hover:bg-black/10 dark:hover:bg-white/10"
                    title="Copy message text"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Text Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans break-words">
                  {msg.text}
                </div>

                {/* Grounded Document Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-3 border-t border-alabaster dark:border-white/10 space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-purple-600 dark:text-purple-400" />
                      Grounded in Personal Files:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          onClick={() => handleOpenFile(src.file_id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-onyx-card border border-alabaster dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer text-xs transition-all shadow-sm group/cite"
                          title={`Click to open ${src.filename}`}
                        >
                          <FileText size={13} className="text-purple-600 dark:text-purple-400" />
                          <span className="font-medium text-charcoal dark:text-white group-hover/cite:text-purple-700 dark:group-hover/cite:text-purple-300 truncate max-w-xs">
                            {src.filename}
                          </span>
                          {src.pages && src.pages.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono">
                              p.{Array.isArray(src.pages) ? src.pages.join(',') : src.pages}
                            </span>
                          )}
                          <ExternalLink size={11} className="opacity-40 group-hover/cite:opacity-100 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-porcelain-300 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-1 text-slate-600 dark:text-slate-300">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3.5 items-center text-slate-400 text-xs py-2 pl-2 animate-pulse">
              <Bot size={16} />
              <span>Analyzing local document chunks and synthesizing grounded answer...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="py-2 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          {(focusedFile ? DOCUMENT_SUGGESTIONS : GLOBAL_SUGGESTIONS).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-full bg-porcelain-200/80 dark:bg-white/5 border border-alabaster dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 hover:text-charcoal dark:hover:text-white hover:border-purple-300 dark:hover:border-purple-600 transition-all whitespace-nowrap flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2 pt-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              focusedFile
                ? `Ask anything about ${focusedFile.name}...`
                : 'Ask anything about your notes, documents, or screenshots...'
            }
            className="flex-1 pl-4 pr-12 py-3 rounded-2xl bg-porcelain-100 dark:bg-white/5 border border-alabaster dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-charcoal dark:text-white transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-3.5 w-8 h-8 rounded-xl bg-onyx text-white dark:bg-white dark:text-onyx flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
