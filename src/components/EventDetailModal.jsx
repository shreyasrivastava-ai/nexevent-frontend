// src/components/EventDetailModal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CalendarDays,
  MapPin,
  Users,
  ScrollText,
  UserRound,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  gradientFor,
  avatarColorFor,
  initialsFor,
  formatEventWindow,
  getDynamicEventStatus, // <-- Imported this
} from '../utils/eventVisuals';

export default function EventDetailModal({
  open,
  event,
  onClose,
  status,        // 'IDLE' | 'LOADING' | 'REGISTERED'
  onRegister,
}) {
  /* Escape-to-close + body scroll lock. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && status !== 'LOADING') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, status, onClose]);

  if (!open || !event) return null;

  const guests = event.guestList ?? [];
  const rules  = event.rules ?? '';
  const ruleLines = String(rules).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-6 backdrop-blur-sm sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      onClick={(e) => { if (e.target === e.currentTarget && status !== 'LOADING') onClose(); }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">

        {/* ── Banner ─────────────────────────────────────── */}
        <div className="relative aspect-[16/7] w-full overflow-hidden">
          {event.bannerUrl ? (
            <img
              src={event.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradientFor(event.title)}`} />
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={status === 'LOADING'}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Compulsory Badge or NAAC Criterion */}
          {event.isCompulsory ? (
            <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Compulsory Event
            </span>
          ) : event.naacCriterion ? (
            <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 backdrop-blur">
              <Sparkles className="h-3 w-3 text-[#0088cc]" aria-hidden="true" />
              {event.naacCriterion}
            </span>
          ) : null}
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 sm:px-7">

          <h2 id="event-detail-title" className="text-2xl font-bold tracking-tight text-slate-900">
            {event.title}
          </h2>

          <dl className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
            <MetaRow icon={CalendarDays} label="When"  value={formatEventWindow(event.startTime, event.endTime)} />
            <MetaRow icon={MapPin}       label="Where" value={event.venueName ?? '—'} />
            <MetaRow icon={Users}        label="Organizer" value={event.organizingClub ?? '—'} />
            <MetaRow
              icon={Users}
              label="Registrations"
              value={`${event.registrationCount ?? 0} student${(event.registrationCount ?? 0) === 1 ? '' : 's'}`}
            />
          </dl>

          {event.description && (
            <section className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                About this event
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            </section>
          )}

          {guests.length > 0 && (
            <section className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Distinguished Guests
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {guests.map((g, i) => {
                  const name = typeof g === 'string' ? g : g?.name ?? `Guest ${i + 1}`;
                  return (
                    <li key={`${name}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColorFor(name)}`}>
                        {initialsFor(name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">{name}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {ruleLines.length > 0 && (
            <section className="mt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <ScrollText className="h-3.5 w-3.5" /> Rules & Guidelines
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {ruleLines.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {event.contactPerson && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Contact</p>
                  <p className="truncate text-sm text-slate-700">{event.contactPerson}</p>
                </div>
              </div>
            )}
            {event.brochureUrl && (
              <a href={event.brochureUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-[#0088cc] hover:bg-cyan-50/50">
                <FileText className="h-4 w-4 shrink-0 text-[#0088cc]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Brochure</p>
                  <p className="truncate text-sm text-slate-700">View full details</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
          <RegisterButton status={status} onClick={() => onRegister?.(event)} event={event} />
        </footer>
      </div>
    </div>,
    document.body
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="truncate text-sm text-slate-700">{value}</dd>
      </div>
    </div>
  );
}

function RegisterButton({ status, onClick, event }) {
  const base = 'inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed';

  // 1. EVENT HAS ENDED
  const displayStatus = getDynamicEventStatus(event);
  if (displayStatus === 'COMPLETED') {
    return (
      <div className={`${base} bg-slate-100 text-slate-500 border border-slate-200 cursor-default`}>
        <CalendarDays className="h-4 w-4" />
        Event has ended
      </div>
    );
  }

  // 2. COMPULSORY EVENT
  if (event?.isCompulsory) {
    return (
      <div className={`${base} bg-blue-50 text-blue-700 border border-blue-200 cursor-default`}>
        <ShieldAlert className="h-4 w-4" />
        Compulsory Event — Attendance Mandatory
      </div>
    );
  }

  // 3. EXTERNAL REGISTRATION (Google Form)
  if (event?.registrationUrl) {
    return (
      <a
        href={event.registrationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-[#0088cc] text-white hover:bg-[#0077b3] active:bg-[#006699] focus-visible:ring-[#0088cc]/40`}
      >
        Register via Google Form <ExternalLink className="h-4 w-4" />
      </a>
    );
  }

  // 4. OPEN EVENT (No Registration Required)
  if (event?.requiresRegistration === false) {
    return (
      <div className={`${base} bg-slate-100 text-slate-600 border border-slate-200 cursor-default`}>
        <Users className="h-4 w-4" />
        Open Event — No RSVP Required
      </div>
    );
  }

  // 5. ALREADY REGISTERED
  if (status === 'REGISTERED') {
    return (
      <div className="space-y-2">
        <button type="button" disabled className={`${base} bg-emerald-500 text-white shadow-sm`}>
          <CheckCircle2 className="h-4 w-4" /> Registered ✓
        </button>
        <p className="text-center text-xs text-emerald-700">
          You're on the list. Check <span className="font-medium">/notifications</span> for updates.
        </p>
      </div>
    );
  }

  // 6. FALLBACK (Internal Registration - Deprecated)
  const loading = status === 'LOADING';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`${base} ${
        loading ? 'bg-[#0088cc] text-white opacity-80' : 'bg-[#0088cc] text-white hover:bg-[#0077b3]'
      }`}
    >
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</> : 'Register Now'}
    </button>
  );
}