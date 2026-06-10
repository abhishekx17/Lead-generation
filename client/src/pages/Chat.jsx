import { useEffect, useRef, useState } from 'react';
import {
  Message,
  MagicStar,
  Send,
  MessageText,
} from 'iconsax-reactjs';
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
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-hairline pb-4">
        <div className="flex-1">
          <PageHeader
            eyebrow="AI Assistant"
            title="Ask about your leads"
            description="Query campaigns, locations, and contact data in plain English."
          />
        </div>
        <div className="shrink-0 sm:pt-0 pt-2">
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
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="group rounded-full border border-hairline bg-surface-soft px-4 py-2 text-xs font-semibold text-ink transition-all duration-200 hover:border-brand-lavender/50 hover:bg-surface-strong/50 disabled:opacity-50 active:scale-[0.97] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <MagicStar size={12} variant="Bulk" color="var(--color-brand-lavender)" />
              {q}
            </span>
          </button>
        ))}
      </div>

      {/* Chat container */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-hairline bg-canvas">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-lavender/15 text-brand-lavender">
                  <Message size={36} variant="Bulk" color="var(--color-brand-lavender)" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-peach text-[#0a0a0a]">
                  <MagicStar size={14} variant="Bulk" color="#0a0a0a" />
                </div>
              </div>
              <p className="text-lg font-semibold text-ink">Start a conversation</p>
              <p className="mt-1 max-w-sm text-sm text-muted leading-relaxed">
                Ask a question about your leads or try one of the suggestions above.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white dark:text-[#0f0f0e]">
                  <MessageText size={18} variant="Bulk" color="var(--color-on-dark)" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary'
                    : msg.error
                      ? 'border border-error/20 bg-error/5 text-error'
                      : 'border border-hairline bg-surface-soft text-body'
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

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white dark:text-[#0f0f0e]">
                <MessageText size={18} variant="Bulk" color="var(--color-on-dark)" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface-soft px-5 py-4">
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
          className="flex gap-3 border-t border-hairline bg-surface-soft p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your leads…"
            disabled={loading}
            className="h-11 flex-1 rounded-xl border border-hairline bg-canvas px-4 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-ink focus:outline-none disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            icon={Send}
            className="shrink-0"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
