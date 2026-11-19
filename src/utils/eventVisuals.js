// src/utils/eventVisuals.js

/* 8 gradient recipes — Tailwind's built-in from/via/to pairs.
   Chosen to be vivid against white cards without clashing with the
   institutional cyan accent used elsewhere. */
const GRADIENTS = [
  'from-cyan-500 via-sky-500 to-blue-600',
  'from-violet-500 via-purple-500 to-fuchsia-600',
  'from-rose-500 via-pink-500 to-red-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-indigo-500 via-blue-500 to-purple-600',
  'from-lime-500 via-emerald-500 to-teal-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
];

const AVATAR_COLORS = [
  'bg-cyan-100 text-cyan-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

/* FNV-1a-style 32-bit hash — small, deterministic, no deps. */
function hashString(str) {
  let h = 0;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function gradientFor(seed) {
  return GRADIENTS[hashString(seed) % GRADIENTS.length];
}

export function avatarColorFor(seed) {
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}

export function initialsFor(name) {
  return String(name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* Format a start/end pair as a compact, human-readable string. */
export function formatEventWindow(start, end) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const day = s.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
  const t1 = s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const t2 = e ? e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  return t2 ? `${day} · ${t1} – ${t2}` : `${day} · ${t1}`;
}

/* NEW: Calculate dynamic status based on current time */
export const getDynamicEventStatus = (event) => {
  if (!event) return 'UNKNOWN';
  if (event.status === 'DRAFT' || event.status === 'REJECTED') {
    return event.status;
  }

  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  if (now > end) return 'COMPLETED';
  if (now >= start && now <= end) return 'ONGOING';
  return 'UPCOMING';
};