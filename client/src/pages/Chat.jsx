import { useEffect, useRef, useState } from 'react';
import { MessageText1, Send2, Cpu, MagicStar } from 'iconsax-reactjs';
import { getCampaigns, sendChatMessage } from '../api';
import MarkdownMessage from '../components/MarkdownMessage';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';

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
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="AI Assistant"
          title="Ask about your leads"
          description="Query campaigns, locations, and contact data in plain English."
        />
        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="min-w-[200px]"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Suggestion chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="group rounded-full border border-hairline bg-surface-card px-4 py-2 text-xs font-medium text-body transition-all duration-200 hover:border-brand-lavender/40 hover:bg-surface-card hover:text-ink hover:shadow-[0_2px_8px_-2px_rgba(184,164,237,0.2)] disabled:opacity-50 active:scale-[0.97]"
          >
            <span className="flex items-center gap-1.5">
              <MagicStar size={12} variant="Bold" className="text-brand-lavender opacity-0 transition-opacity group-hover:opacity-100" />
              {q}
            </span>
          </button>
        ))}
      </div>

      {/* Chat container */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_1px_3px_rgba(10,10,10,0.03)]">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center animate-fade-in">
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-lavender/20">
                  <MessageText1 size={36} variant="Bold" className="text-brand-lavender" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-peach shadow-[0_2px_8px_-2px_rgba(255,176,132,0.5)]">
                  <MagicStar size={14} variant="Bold" className="text-ink" />
                </div>
              </div>
              <p className="text-lg font-medium text-ink">Start a conversation</p>
              <p className="mt-1.5 max-w-sm text-sm text-muted leading-relaxed">
                Ask a question about your leads or try one of the suggestions above.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`animate-fade-in-up flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-on-dark shadow-[0_2px_8px_-2px_rgba(26,58,58,0.3)]">
                  <Cpu size={18} variant="Bold" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary shadow-[0_2px_8px_-2px_rgba(10,10,10,0.2)]'
                    : msg.error
                      ? 'border border-error/25 bg-error/5 text-error'
                      : 'border border-hairline bg-surface-soft/80 text-body shadow-[0_1px_3px_rgba(10,10,10,0.03)]'
                }`}
              >
                {msg.role === 'assistant' && !msg.error ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator with bouncing dots */}
          {loading && (
            <div className="animate-fade-in flex justify-start">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-on-dark shadow-[0_2px_8px_-2px_rgba(26,58,58,0.3)]">
                <Cpu size={18} variant="Bold" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface-soft/80 px-5 py-4 shadow-[0_1px_3px_rgba(10,10,10,0.03)]">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 border-t border-hairline bg-surface-soft/60 p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your leads…"
            disabled={loading}
            className="h-11 flex-1 rounded-xl border border-hairline bg-canvas px-4 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-brand-lavender focus:ring-2 focus:ring-brand-lavender/20 focus:outline-none disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            icon={Send2}
            className="shrink-0"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
