'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ImportedList } from '@canaloni/shared';
import type { Session } from '@supabase/supabase-js';
import type { ParsedPlace } from '@/app/api/lists/import/route';

interface ParseResult {
  name: string;
  places: ParsedPlace[];
  warning: string | null;
}

interface ImportedListsPanelProps {
  lists: ImportedList[];
  highlightedListId: string | null;
  onHighlight: (id: string | null) => void;
  onListAdded: (list: ImportedList) => void;
  onListDeleted: (id: string) => void;
  userId?: string | null;
  userEmail?: string | null;
  guestName?: string | null;
  session?: Session | null;
  adminEmail?: string;
}

export function ImportedListsPanel({
  lists,
  highlightedListId,
  onHighlight,
  onListAdded,
  onListDeleted,
  userId,
  userEmail,
  guestName,
  session,
  adminEmail,
}: ImportedListsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [listName, setListName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = !!(userEmail && adminEmail && userEmail === adminEmail);
  const isIdentified = !!(userId || guestName);

  function canDeleteList(list: ImportedList): boolean {
    if (isAdmin) return true;
    if (userId && list.imported_by === userId) return true;
    if (!userId && guestName && list.guest_name === guestName) return true;
    return false;
  }

  async function handleImport() {
    if (!isIdentified) {
      setError('Sign in or continue as guest to import lists.');
      return;
    }
    const url = urlInput.trim();
    if (!url) { setError('Enter a Google Maps URL first.'); return; }
    setError(null);
    setParsing(true);

    const res = await fetch('/api/lists/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    setParsing(false);

    if (!res.ok) {
      setError('Failed to parse URL.');
      return;
    }

    const result: ParseResult = await res.json();
    setParseResult(result);
    setListName(result.name);
  }

  async function handleSave() {
    const name = listName.trim();
    if (!name) { setError('List name is required.'); return; }

    setSaving(true);
    setError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    if (!userId && guestName) headers['x-guest-name'] = guestName;

    const res = await fetch('/api/lists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, url: urlInput.trim(), places: parseResult?.places ?? [] }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to save list.');
      return;
    }

    const list: ImportedList = await res.json();
    onListAdded(list);
    setParseResult(null);
    setListName('');
    setUrlInput('');
  }

  async function handleDeleteConfirm(listId: string) {
    const headers: Record<string, string> = {};
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    if (!userId && guestName) headers['x-guest-name'] = guestName;

    const res = await fetch(`/api/lists/${listId}`, { method: 'DELETE', headers });

    if (res.ok || res.status === 204) {
      if (highlightedListId === listId) onHighlight(null);
      onListDeleted(listId);
    } else {
      setError('Failed to delete list.');
    }
    setDeletingId(null);
  }

  // Confirmation modal — shown after parsing, before saving
  if (parseResult) {
    const modal = (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
        <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-tuscany-lg max-h-[80vh] flex flex-col animate-slide-up">
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 bg-brown/20 rounded-full" />
          </div>

          <div className="px-5 pt-4 pb-2 border-b border-cream-dark flex items-center justify-between">
            <h3 className="font-serif font-bold text-brown text-lg">📋 Import List</h3>
            <button
              onClick={() => setParseResult(null)}
              className="text-brown/40 hover:text-brown text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {parseResult.warning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-xs leading-relaxed">
                ⚠️ {parseResult.warning}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brown mb-1">List name</label>
              <input
                type="text"
                value={listName}
                onChange={e => setListName(e.target.value)}
                className="input-field"
                maxLength={80}
                autoFocus
              />
            </div>

            {parseResult.places.length > 0 && (
              <div>
                <p className="text-sm font-medium text-brown mb-2">
                  Found {parseResult.places.length} location{parseResult.places.length !== 1 ? 's' : ''}:
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {parseResult.places.map((p, i) => (
                    <li key={i} className="text-xs text-brown/70 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">📍</span>
                      <span className="leading-snug">{p.name}{p.address ? ` — ${p.address}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !listName.trim()}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : parseResult.places.length > 0
                ? `Add ${parseResult.places.length} location${parseResult.places.length !== 1 ? 's' : ''} to map ✓`
                : 'Create empty list ✓'}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modal, document.body) as unknown as React.ReactElement;
  }

  return (
    <div className="w-60 bg-white/95 backdrop-blur-sm rounded-2xl shadow-tuscany border border-cream-dark/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-cream/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-semibold text-brown">Imported Lists</span>
          {lists.length > 0 && (
            <span className="text-[10px] bg-terracotta/15 text-terracotta rounded-full px-1.5 py-0.5 font-medium">
              {lists.length}
            </span>
          )}
        </div>
        <span className="text-brown/40 text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-cream-dark">
          {/* Lists */}
          {lists.length === 0 ? (
            <p className="text-[11px] text-brown/40 italic text-center py-3 px-3">
              No lists yet
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-cream-dark">
              {lists.map(list => (
                <div key={list.id}>
                  {deletingId === list.id ? (
                    <div className="px-3 py-2 bg-red-50">
                      <p className="text-[11px] font-medium text-red-700 mb-1.5">
                        Delete "{list.name}"? This removes all its locations.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDeleteConfirm(list.id)}
                          className="flex-1 py-1 rounded-lg bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="flex-1 py-1 rounded-lg border border-brown/20 text-brown text-[10px] font-medium hover:bg-cream transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onHighlight(highlightedListId === list.id ? null : list.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                        highlightedListId === list.id
                          ? 'bg-terracotta/10'
                          : 'hover:bg-cream/60'
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] font-semibold text-brown truncate">
                          {highlightedListId === list.id && '✦ '}{list.name}
                        </span>
                        <span className="text-[10px] text-brown/50">
                          {list.location_count} location{list.location_count !== 1 ? 's' : ''}
                          {list.guest_name && ` · ${list.guest_name}`}
                        </span>
                      </span>
                      {canDeleteList(list) && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeletingId(list.id); }}
                          className="text-brown/20 hover:text-red-500 transition-colors text-sm shrink-0"
                          title="Delete list"
                        >
                          🗑️
                        </button>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* URL Import input */}
          <div className="p-3 border-t border-cream-dark space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleImport(); }}
              placeholder="Paste Google Maps URL…"
              className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-cream-dark bg-cream/50 text-brown placeholder-brown/30 outline-none focus:border-terracotta transition-colors"
            />
            {error && (
              <p className="text-[10px] text-red-600">{error}</p>
            )}
            <button
              onClick={handleImport}
              disabled={parsing || !urlInput.trim()}
              className="w-full py-1.5 rounded-lg bg-terracotta text-white text-[11px] font-semibold hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsing ? 'Parsing…' : '+ Import List'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
