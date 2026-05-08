import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { ShoppingCart, Plus, Trash2, Check, Send, Mail, Share2, Printer, Store, CheckSquare, Square } from 'lucide-react';

const BASE = `${API_BASE}/api`;

export default function ShoppingList({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // {kind: 'success'|'error', msg: string}
  const [printScope, setPrintScope] = useState('all'); // 'all' | recipe key
  const sendMenuRef = useRef(null);

  useEffect(() => {
    if (!sendOpen) return;
    const handler = (e) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target)) setSendOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sendOpen]);

  useEffect(() => {
    if (!sendStatus) return;
    const t = setTimeout(() => setSendStatus(null), 4000);
    return () => clearTimeout(t);
  }, [sendStatus]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${BASE}/shopping-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setItems(res.data))
      .catch(() => { /* fetch failed; leave items as-is */ })
      .finally(() => setLoading(false));
  }, [token]);

  const addItem = async (e) => {
    e?.preventDefault();
    const name = newItem.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await axios.post(
        `${BASE}/shopping-list`,
        { ingredient_name: name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(prev => [res.data, ...prev]);
      setNewItem('');
    } catch { alert('Could not add item.'); }
    finally { setAdding(false); }
  };

  const toggle = async (item) => {
    const next = !item.checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i));
    try {
      await axios.patch(
        `${BASE}/shopping-list/${item.id}`,
        { checked: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
    }
  };

  const remove = async (item) => {
    const prev = items;
    setItems(p => p.filter(i => i.id !== item.id));
    try {
      await axios.delete(`${BASE}/shopping-list/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch { setItems(prev); }
  };

  const clearChecked = async () => {
    const checked = items.filter(i => i.checked);
    if (checked.length === 0) return;
    if (!window.confirm(`Remove ${checked.length} checked item${checked.length === 1 ? '' : 's'}?`)) return;
    const prev = items;
    setItems(p => p.filter(i => !i.checked));
    try {
      await axios.delete(`${BASE}/shopping-list?checked=true`, { headers: { Authorization: `Bearer ${token}` } });
    } catch { setItems(prev); }
  };

  const unchecked = items.filter(i => !i.checked);
  const checkedItems = items.filter(i => i.checked);

  // Group unchecked items by recipe. Items with no recipe get a "Manually added" bucket.
  // Groups are ordered by most-recent item first; within a group, newest first.
  const groupedUnchecked = (() => {
    const groups = new Map(); // key -> { title, recipeId|null, items: [], latest: number }
    for (const it of unchecked) {
      const key = it.recipe_id ? `r:${it.recipe_id}` : 'manual';
      if (!groups.has(key)) {
        groups.set(key, {
          title: it.recipe_title || 'Added manually',
          recipeId: it.recipe_id || null,
          items: [],
          latest: 0,
        });
      }
      const g = groups.get(key);
      g.items.push(it);
      const t = new Date(it.created_at).getTime();
      if (t > g.latest) g.latest = t;
    }
    return Array.from(groups.values()).sort((a, b) => b.latest - a.latest);
  })();

  const buildPlainText = () => {
    if (unchecked.length === 0) return '';
    return unchecked
      .map(i => `• ${i.amount ? `${i.amount} ` : ''}${i.ingredient_name}`)
      .join('\n');
  };

  const handleEmail = async () => {
    setSendOpen(false);
    if (unchecked.length === 0) { setSendStatus({ kind: 'error', msg: 'Nothing to send — your unchecked list is empty.' }); return; }
    try {
      const res = await axios.post(
        `${BASE}/shopping-list/email`,
        { onlyUnchecked: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSendStatus({ kind: 'success', msg: `Emailed ${res.data.count} item${res.data.count === 1 ? '' : 's'} to ${res.data.sentTo}.` });
    } catch (err) {
      setSendStatus({ kind: 'error', msg: err.response?.data?.error || 'Could not send email.' });
    }
  };

  const handleShare = async () => {
    setSendOpen(false);
    const text = buildPlainText();
    if (!text) { setSendStatus({ kind: 'error', msg: 'Your list is empty.' }); return; }
    const payload = { title: 'Shopping list', text };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setSendStatus({ kind: 'success', msg: 'Copied to clipboard.' });
      } else {
        setSendStatus({ kind: 'error', msg: 'Sharing not supported on this device.' });
      }
    } catch (err) {
      if (err.name !== 'AbortError') setSendStatus({ kind: 'error', msg: 'Share failed.' });
    }
  };

  const handlePrint = () => {
    setSendOpen(false);
    if (unchecked.length === 0) { setSendStatus({ kind: 'error', msg: 'Your list is empty.' }); return; }
    setPrintScope('all');
    setTimeout(() => window.print(), 0);
  };

  const printGroup = (group) => {
    setPrintScope(`r:${group.recipeId ?? 'manual'}`);
    setTimeout(() => window.print(), 0);
  };

  const bulkToggleGroup = async (group, checked) => {
    const ids = group.items.map(i => i.id);
    const prev = items;
    setItems(p => p.map(i => ids.includes(i.id) ? { ...i, checked } : i));
    try {
      await axios.post(
        `${BASE}/shopping-list/bulk-check`,
        { ids, checked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      setItems(prev);
    }
  };

  const handleInstacart = async () => {
    setSendOpen(false);
    if (unchecked.length === 0) { setSendStatus({ kind: 'error', msg: 'Your list is empty.' }); return; }
    try {
      const res = await axios.post(
        `${BASE}/shopping-list/instacart`,
        { onlyUnchecked: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.url) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
        setSendStatus({ kind: 'success', msg: `Opened Instacart with ${res.data.count} item${res.data.count === 1 ? '' : 's'}.` });
      }
    } catch (err) {
      const data = err.response?.data;
      setSendStatus({ kind: 'error', msg: data?.hint || data?.error || 'Instacart request failed.' });
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 120px' }}>
      <style>{`
        .print-only { display: none; }
        @media print {
          @page { margin: 0.6in; }
          .no-print { display: none !important; }
          .print-only { display: block !important; color: #000 !important; background: #fff !important; }
          .print-only * { color: #000 !important; background: transparent !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <ShoppingCart size={26} style={{ color: 'var(--accent, #3b82f6)' }} />
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Shopping List
        </h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
          {unchecked.length} to buy
        </span>

        <div ref={sendMenuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setSendOpen(o => !o)}
            disabled={unchecked.length === 0}
            className="primary-button"
            style={{ padding: '8px 14px', fontSize: '0.85rem', opacity: unchecked.length === 0 ? 0.5 : 1 }}
          >
            <Send size={14} /> Send
          </button>
          {sendOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 10,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)', minWidth: 220, padding: 6,
              display: 'flex', flexDirection: 'column'
            }}>
              <SendMenuItem icon={<Store size={15} />} label="Send to Instacart" sub="Costco, Wegmans, Aldi & more" onClick={handleInstacart} />
              <SendMenuItem icon={<Mail size={15} />} label="Email me the list" onClick={handleEmail} />
              <SendMenuItem icon={<Share2 size={15} />} label="Share / Copy" onClick={handleShare} />
              <SendMenuItem icon={<Printer size={15} />} label="Print" onClick={handlePrint} />
            </div>
          )}
        </div>
      </div>

      {sendStatus && (
        <div className="no-print" style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '0.88rem',
          background: sendStatus.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: sendStatus.kind === 'success' ? 'rgb(21,128,61)' : 'rgb(185,28,28)',
          border: `1px solid ${sendStatus.kind === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
        }}>
          {sendStatus.msg}
        </div>
      )}

      <div className="print-only">
        {(() => {
          const printable = printScope === 'all'
            ? groupedUnchecked
            : groupedUnchecked.filter(g => `r:${g.recipeId ?? 'manual'}` === printScope);
          const totalItems = printable.reduce((n, g) => n + g.items.length, 0);
          return (
            <>
              <h1 style={{ fontFamily: 'inherit', fontSize: 22, marginBottom: 16 }}>
                Shopping List ({totalItems})
              </h1>
              {printable.map((g, gi) => (
                <div key={gi} style={{ marginBottom: 16, pageBreakInside: 'avoid' }}>
                  <h2 style={{ fontSize: 14, margin: '0 0 6px', borderBottom: '1px solid #000', paddingBottom: 3 }}>
                    {g.title}
                  </h2>
                  <ul style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 13, margin: 0 }}>
                    {g.items.map(i => (
                      <li key={i.id}>
                        {i.amount && <strong>{i.amount} </strong>}
                        {i.ingredient_name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          );
        })()}
      </div>

      <form onSubmit={addItem} className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Add an item..."
          maxLength={200}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: '0.95rem', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          disabled={!newItem.trim() || adding}
          className="primary-button"
          style={{ padding: '10px 16px', opacity: !newItem.trim() || adding ? 0.5 : 1 }}
        >
          <Plus size={16} /> Add
        </button>
      </form>

      {loading ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 40 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <ShoppingCart size={42} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Your shopping list is empty.</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Add items above, or open a recipe and tap "Add to shopping list".</p>
        </div>
      ) : (
        <>
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groupedUnchecked.map(group => (
              <section key={group.recipeId ?? 'manual'}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', flexWrap: 'wrap'
                }}>
                  <h3 style={{
                    margin: 0, fontSize: '0.78rem', textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 700,
                  }}>
                    {group.title}
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 500 }}>
                    · {group.items.length}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => bulkToggleGroup(group, true)}
                      title="Check all"
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <CheckSquare size={12} /> Check all
                    </button>
                    <button
                      onClick={() => printGroup(group)}
                      title="Print this recipe's list"
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.items.map(item => (
                    <ShoppingItem key={item.id} item={item} onToggle={toggle} onRemove={remove} hideSource />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {checkedItems.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>
                  Checked off ({checkedItems.length})
                </h3>
                <button
                  onClick={clearChecked}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.6 }}>
                {checkedItems.map(item => (
                  <ShoppingItem key={item.id} item={item} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SendMenuItem({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
        borderRadius: 8, color: 'var(--text-1)', fontSize: '0.88rem', fontWeight: 600,
        fontFamily: 'inherit'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2, rgba(0,0,0,0.04))'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ color: 'var(--text-2)', display: 'flex' }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{label}</span>
        {sub && <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-3)' }}>{sub}</span>}
      </div>
    </button>
  );
}

function ShoppingItem({ item, onToggle, onRemove, hideSource }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => onToggle(item)}
        aria-label={item.checked ? 'Uncheck' : 'Check off'}
        style={{
          width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.checked ? 'var(--accent, #3b82f6)' : 'var(--border)'}`,
          background: item.checked ? 'var(--accent, #3b82f6)' : 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
        }}
      >
        {item.checked && <Check size={14} color="white" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-1)', textDecoration: item.checked ? 'line-through' : 'none', fontWeight: 500 }}>
          {item.amount && <span style={{ fontWeight: 700, marginRight: 6 }}>{item.amount}</span>}
          {item.ingredient_name}
        </div>
        {!hideSource && item.recipe_title && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
            from {item.recipe_title}
          </div>
        )}
        {hideSource && item.source_titles?.length > 1 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
            also in: {item.source_titles.filter(t => t !== item.recipe_title).join(', ')}
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(item)}
        aria-label="Remove"
        style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
