import { Bot, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenders } from '../context/TenderContext';
import { executeAssistantActions } from '../services/assistantActions';
import { buildAssistantContext } from '../services/assistantContext';
import {
  clearChatHistory, loadChatHistory, QUICK_PROMPTS, saveChatHistory,
  sendAssistantMessage, type ChatMessage,
} from '../services/assistantService';

function formatContent(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i} className="block">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          ),
        )}
      </span>
    );
  });
}

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AssistantPanel({ open, onClose }: AssistantPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { allTenders, stats, dataSource, refreshTenders, openTender, selectedTender } = useTenders();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>('ai');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildAssistantContext(
        allTenders, stats, dataSource, location.pathname, selectedTender,
      );
      const res = await sendAssistantMessage(trimmed, messages, context);
      setMode(res.mode);

      if (res.actions.length > 0) {
        const actionResults = await executeAssistantActions(res.actions, {
          navigate, openTender, refreshTenders, allTenders,
        });
        const suffix = actionResults.length ? `\n\n✅ ${actionResults.join(' · ')}` : '';
        res.reply += suffix;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
          mode: res.mode,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `Entschuldigung, ich konnte nicht antworten. ${err instanceof Error ? err.message : ''}\n\nTipp: OPENAI_API_KEY in Vercel setzen für volle KI – lokales Briefing funktioniert auch ohne.`,
          timestamp: new Date().toISOString(),
          mode: 'error',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [allTenders, stats, dataSource, location.pathname, selectedTender, messages, loading, navigate, openTender, refreshTenders]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="Schließen" />
      <aside className="relative w-full sm:max-w-md h-full bg-dark-900 sm:border-l border-dark-500/60 flex flex-col shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-dark-500/50 bg-dark-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pht-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">SOPHIE</h2>
              <p className="text-[10px] text-slate-500 truncate">KI-Assistentin · GF-Sekretariat PHT</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${mode === 'ai' ? 'bg-violet-500/20 text-violet-300' : 'bg-dark-600 text-slate-500'}`}>
              {mode === 'ai' ? 'KI' : 'Lokal'}
            </span>
            <button type="button" onClick={() => { clearChatHistory(); setMessages([]); }} className="p-2 text-slate-500 hover:text-white rounded-lg" title="Verlauf löschen">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300">Guten Tag! Ich bin SOPHIE.</p>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                Ihre Assistentin für Ausschreibungen, Fristen, Prioritäten, E-Mails und Marktführer-Strategie.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-pht-600 text-white'
                  : 'bg-dark-700 text-slate-300 border border-dark-500/50'
              }`}>
                {m.role === 'assistant' ? formatContent(m.content) : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> SOPHIE denkt nach…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-dark-500/50 bg-dark-800/50">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={loading}
                onClick={() => send(q.prompt)}
                className="text-[10px] px-2 py-1 rounded-full border border-dark-500 text-slate-400 hover:text-violet-300 hover:border-violet-500/40 disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fragen Sie SOPHIE…"
              disabled={loading}
              className="flex-1 px-3 py-2.5 rounded-lg border border-dark-500 bg-dark-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

export function AssistantFAB({ onClick, showAboveNav = false }: { onClick: () => void; showAboveNav?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-4 z-30 flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-pht-600 text-white shadow-lg shadow-violet-500/25 active:scale-95 transition-transform ${
        showAboveNav
          ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] w-12 h-12'
          : 'bottom-6 gap-2 pl-4 pr-5 py-3 hover:scale-105'
      }`}
      title="SOPHIE – KI-Assistentin"
      aria-label="SOPHIE öffnen"
    >
      <Bot className="w-5 h-5" />
      {!showAboveNav && <span className="text-sm font-medium hidden sm:inline">SOPHIE</span>}
    </button>
  );
}
