// src/components/VenueCombobox.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';
import api from '../utils/axiosConfig';

export default function VenueCombobox({ value, onChange, disabled }) {
  const [query, setQuery] = useState(value ?? '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const rootRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value → local query (e.g. form reset).
  useEffect(() => { setQuery(value ?? ''); }, [value]);

  // Debounced fetch. AbortController prevents out-of-order responses.
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/dashboard/venues', {
          params: { q: query },
          signal: ctrl.signal,
        });
        const list = Array.isArray(data) ? data : data?.items ?? [];
        setOptions(list);
        setHighlight(list.length > 0 ? 0 : -1);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  // Click-outside dismissal.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const commit = useCallback((venueName) => {
    onChange?.(venueName);
    setQuery(venueName);
    setOpen(false);
  }, [onChange]);

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && options[highlight]) commit(options[highlight].name ?? options[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <MapPin
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="venue-listbox"
        aria-autocomplete="list"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange?.(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search venues…"
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20 disabled:opacity-60"
      />
      {loading && (
        <Loader2
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
          aria-hidden="true"
        />
      )}

      {open && (options.length > 0 || (!loading && query.trim())) && (
        <ul
          id="venue-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/5"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-slate-400">No matching venues.</li>
          ) : (
            options.map((opt, idx) => {
              const name = opt.name ?? opt;
              const selected = name === value;
              const active = idx === highlight;
              return (
                <li
                  key={name}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => { e.preventDefault(); commit(name); }}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-cyan-50 text-[#0088cc]' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-medium">{name}</span>
                    {opt.building && (
                      <span className="ml-2 text-xs text-slate-400">{opt.building}</span>
                    )}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}