import React, { useEffect, useRef, useState } from 'react';
import { ChefHat, Send, ShoppingCart, Check, ArrowUpRight, RotateCcw } from 'lucide-react';
import { api } from '../api';
import { showToast } from '../utils/toast';

const GREETING = {
  role: 'assistant',
  content: "Hi! Tell me what you have in the kitchen or what you're in the mood for, and I'll find recipes that fit your diet.",
};

const SUGGESTIONS = [
  'What can I make with chicken, rice, and spinach?',
  'Something quick under 30 minutes',
  'Pick 3 dinners for this week from my favorite cuisines',
];

const TOOL_LABELS = {
  get_my_preferences: 'your preferences',
  search_recipes: 'recipe search',
  find_recipes_with_ingredients: 'ingredient match',
  get_recipe_details: 'recipe details',
  propose_shopping_list_add: 'shopping list',
};

const STORAGE_KEY = 'byf:assistant-chat';

function loadChat() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* storage blocked or corrupt: start fresh */ }
  return [GREETING];
}

// Renders **bold** and [recipe:42] links inside one line of text.
function InlineText({ text, onOpen }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[recipe:\d+\])/g);
  return parts.map((part, i) => {
    const recipe = part.match(/^\[recipe:(\d+)\]$/);
    if (recipe) {
      return (
        <button key={i} className="assistant-recipe-link" onClick={() => onOpen(Number(recipe[1]))}>
          View <ArrowUpRight size={12} />
        </button>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// Plain paragraphs plus "- item" / "1. item" lists. No HTML is ever injected.
function MessageText({ text, onOpen }) {
  const blocks = [];
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (item) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') last.items.push(item[1]);
      else blocks.push({ type: 'list', items: [item[1]] });
    } else if (line.trim()) {
      blocks.push({ type: 'p', text: line });
    }
  }
  return blocks.map((b, i) =>
    b.type === 'list' ? (
      <ul key={i}>{b.items.map((t, j) => <li key={j}><InlineText text={t} onOpen={onOpen} /></li>)}</ul>
    ) : (
      <p key={i}><InlineText text={b.text} onOpen={onOpen} /></p>
    )
  );
}

function ProposalCard({ proposal, onDone }) {
  const [state, setState] = useState(proposal.added ? 'done' : 'idle');

  const add = async () => {
    setState('saving');
    let added = 0;
    let failed = 0;
    for (const r of proposal.recipes) {
      try {
        const res = await api.post(`/shopping-list/from-recipe/${r.id}`);
        added += res.data.count || 0;
      } catch {
        failed++;
      }
    }
    if (failed === proposal.recipes.length) {
      setState('idle');
      showToast({ kind: 'error', message: "Couldn't add those to your list. Try again." });
      return;
    }
    setState('done');
    onDone();
    showToast({
      kind: 'success',
      message: added > 0
        ? `Added ${added} item${added === 1 ? '' : 's'} to your shopping list`
        : 'Those ingredients are already on your shopping list',
    });
  };

  return (
    <div className="assistant-proposal">
      <div className="assistant-proposal-text">
        <ShoppingCart size={16} />
        <span>Add ingredients for {proposal.recipes.map((r) => r.title).join(', ')}?</span>
      </div>
      <button className="assistant-proposal-btn" onClick={add} disabled={state !== 'idle'}>
        {state === 'done' ? <><Check size={15} /> Added</> : state === 'saving' ? 'Adding…' : 'Add to list'}
      </button>
    </div>
  );
}

export default function Assistant({ onOpen }) {
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const send = async (text) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      // Only plain text turns go to the server; it re-runs any lookups itself.
      const history = next.filter((m) => !m.error).map(({ role, content: c }) => ({ role, content: c }));
      const { data } = await api.post('/assistant/chat', { messages: history });
      setMessages([...next, {
        role: 'assistant',
        content: data.reply,
        tools: [...new Set((data.toolCalls || []).map((t) => TOOL_LABELS[t.name]).filter(Boolean))],
        proposal: data.proposals?.length ? { recipes: data.proposals, added: false } : null,
      }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Try again.';
      setMessages([...next, { role: 'assistant', content: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const markAdded = (index) =>
    setMessages((ms) => ms.map((m, i) => (i === index ? { ...m, proposal: { ...m.proposal, added: true } } : m)));

  const reset = () => setMessages([GREETING]);

  return (
    <div className="assistant-page">
      <div className="assistant-header">
        <div>
          <h2 className="screen-title">Kitchen Assistant</h2>
          <p className="screen-subtitle">Ask for ideas. Every suggestion comes from the app's recipes and fits your diet.</p>
        </div>
        {messages.length > 1 && (
          <button className="tag-pill" onClick={reset} disabled={busy} aria-label="Start a new chat">
            <RotateCcw size={14} /> New chat
          </button>
        )}
      </div>

      <div className="assistant-thread" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`assistant-msg ${m.role}${m.error ? ' error' : ''}`}>
            {m.role === 'assistant' && <div className="assistant-avatar"><ChefHat size={16} /></div>}
            <div className="assistant-bubble">
              <MessageText text={m.content} onOpen={onOpen} />
              {m.proposal && <ProposalCard proposal={m.proposal} onDone={() => markAdded(i)} />}
              {m.tools?.length > 0 && <div className="assistant-tools">Checked: {m.tools.join(', ')}</div>}
            </div>
          </div>
        ))}

        {busy && (
          <div className="assistant-msg assistant">
            <div className="assistant-avatar"><ChefHat size={16} /></div>
            <div className="assistant-bubble assistant-typing" aria-label="Assistant is thinking">
              <span /><span /><span />
            </div>
          </div>
        )}

        {messages.length === 1 && !busy && (
          <div className="assistant-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="tag-pill" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="assistant-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          placeholder="What are you hungry for?"
          rows={1}
          maxLength={2000}
          aria-label="Message the kitchen assistant"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
