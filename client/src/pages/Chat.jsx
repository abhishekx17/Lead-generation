import { useEffect, useRef, useState } from 'react';
import { getCampaigns, sendChatMessage } from '../api';
import MarkdownMessage from '../components/MarkdownMessage';

const SUGGESTIONS = [
  'How many leads do I have?',
  'Show leads from Delhi',
  'Which campaign has the most leads?',
  'List all Gmail addresses',
];

export default function Chat() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getCampaigns().then(setCampaigns).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const question = text.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const { answer } = await sendChatMessage(question, campaignId || undefined);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Chat</h2>
          <p className="text-slate-400">Ask questions about your leads in plain English</p>
        </div>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            Ask a question about your leads to get started.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.error
                    ? 'border border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border border-slate-700 bg-slate-800 text-slate-200'
              }`}
            >
              {msg.role === 'assistant' && !msg.error ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your leads…"
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
