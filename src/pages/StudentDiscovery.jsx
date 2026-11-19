// Frontend: src/pages/StudentDiscovery.jsx
import { useCallback, useMemo, useState } from 'react';
import {
  Search,
  CalendarDays,
  MapPin,
  Users,
  Inbox,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useFetch, useMutation } from '../hooks/useApi';
import EventDetailModal from '../components/EventDetailModal';
import { gradientFor, formatEventWindow, getDynamicEventStatus } from '../utils/eventVisuals';

export default function StudentDiscovery() {
  const toast = useToast();
  const { user } = useAuth();

  const [query, setQuery]             = useState('');
  const [openEventId, setOpenEventId] = useState(null);

  const [registeredIds, setRegisteredIds] = useState(() => new Set());
  const [countDeltas, setCountDeltas] = useState({});
  const [inFlightId, setInFlightId] = useState(null);

  const {
    data: events,
    loading,
    refetching,
    refetch,
  } = useFetch('/events', {
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  const { mutate: registerForEvent } = useMutation(
    (eventId) => api.post(`/events/${eventId}/register`),
    {
      onSuccess: (_data, eventId) => {
        setRegisteredIds((prev) => new Set(prev).add(eventId));
        setCountDeltas((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? 0) + 1 }));
      },
    }
  );

  const handleRegister = useCallback(
    async (event) => {
      setInFlightId(event.id);
      try {
        await registerForEvent(event.id);
        toast.success(`You're registered for "${event.title}".`, { title: 'See you there!' });
      } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        const conflicts = err?.response?.data?.conflicts;

        if (status === 409) {
          if (conflicts && conflicts.length > 0) {
            const list = conflicts.map(c => `"${c.title}" (${new Date(c.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`).join(', ');
            toast.warning(`Schedule clash with: ${list}`, { title: 'Schedule Conflict', duration: 8000 });
          } else if (detail?.includes('already registered')) {
            setRegisteredIds((prev) => new Set(prev).add(event.id));
            toast.info(detail || 'You were already registered for this event.');
          } else {
            toast.warning(detail || 'A scheduling conflict was detected.', { title: 'Schedule Conflict', duration: 7000 });
          }
        } else if (status === 404) {
          toast.error('This event is no longer available.', { title: 'Event removed' });
          setOpenEventId(null);
          refetch();
        } else {
          toast.error(detail || 'Registration failed. Please try again.');
        }
      } finally {
        setInFlightId(null);
      }
    },
    [registerForEvent, refetch, toast]
  );

  const isRegistered = useCallback(
    (event) => {
      if (event.isCompulsory) return false; 
      return Boolean(event.isRegistered || event.is_registered || event.registered) || registeredIds.has(event.id);
    },
    [registeredIds]
  );

  // Split events into Upcoming and Past
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q ? events : events.filter((e) =>
      [e.title, e.description, e.venueName, e.organizingClub]
        .some((v) => String(v ?? '').toLowerCase().includes(q))
    );

    const upcoming = [];
    const past = [];

    filtered.forEach(evt => {
      const status = getDynamicEventStatus(evt);
      if (status === 'COMPLETED') {
        past.push(evt);
      } else {
        upcoming.push(evt);
      }
    });

    // Sort upcoming by startTime (soonest first)
    upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    // Sort past by startTime (most recent first)
    past.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events, query]);

  const openEvent = useMemo(
    () => events.find((e) => e.id === openEventId) ?? null,
    [events, openEventId]
  );

  const openStatus = !openEvent
    ? 'IDLE'
    : inFlightId === openEvent.id
      ? 'LOADING'
      : isRegistered(openEvent)
        ? 'REGISTERED'
        : 'IDLE';

  const isRefreshing = loading || refetching;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-400/20 via-sky-400/10 to-transparent blur-2xl"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
              <Compass className="h-3 w-3" aria-hidden="true" />
              Discover
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Hey{user?.name ? `, ${user.name.split(' ')[0]}` : ''} —{' '}
              <span className="text-[#0088cc]">what's happening?</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
              Hackathons, workshops, cultural nights, and more — all in one place.
              Register with a tap and show up.
            </p>

            <div className="relative mt-5 max-w-xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, venues, clubs…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20"
              />
            </div>
          </div>
        </header>

        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={refetch}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <DiscoverySkeleton />
        ) : upcomingEvents.length === 0 && pastEvents.length === 0 ? (
          <EmptyFeed hasQuery={query.trim().length > 0} />
        ) : (
          <div className="space-y-12">
            {/* UPCOMING EVENTS SECTION */}
            {upcomingEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Upcoming Events</h2>
                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-[#0088cc]">
                    {upcomingEvents.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      registered={isRegistered(evt)}
                      registeredCount={(evt.registrationCount ?? evt.registered_count ?? evt.registeredStudents?.length ?? 0) + (countDeltas[evt.id] ?? 0)}
                      onOpen={() => setOpenEventId(evt.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* PAST EVENTS SECTION */}
            {pastEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Past Events</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    {pastEvents.length}
                  </span>
                </div>
                {/* Note the opacity-80 to visually separate past events */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 opacity-80">
                  {pastEvents.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      registered={isRegistered(evt)}
                      registeredCount={(evt.registrationCount ?? evt.registered_count ?? evt.registeredStudents?.length ?? 0) + (countDeltas[evt.id] ?? 0)}
                      onOpen={() => setOpenEventId(evt.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

      </div>

      <EventDetailModal
        open={Boolean(openEvent)}
        event={openEvent}
        status={openStatus}
        onClose={() => setOpenEventId(null)}
        onRegister={handleRegister}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
function EventCard({ event, registered, registeredCount, onOpen }) {
  const organizer = event.organizingClub ?? event.department ?? '—';
  const displayStatus = getDynamicEventStatus(event);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${gradientFor(event.title)} transition-transform duration-500 group-hover:scale-105`}
          >
            <div className="flex h-full w-full items-center justify-center">
              <CalendarDays className="h-10 w-10 text-white/60" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Status overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex gap-2">
            {event.isCompulsory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
                Compulsory
              </span>
            )}
            {displayStatus !== 'UPCOMING' && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${
                displayStatus === 'ONGOING' ? 'bg-amber-500' : 'bg-slate-500'
              }`}>
                {displayStatus}
              </span>
            )}
          </div>

          {registered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              Registered
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-[#0088cc]">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
          {organizer}
        </p>

        <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{formatEventWindow(event.startTime, event.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{event.venueName ?? 'Venue TBA'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{registeredCount} registered</span>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-400">
            {registered ? 'You\u2019re going' : 'Tap to view details'}
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#0088cc] group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}

function DiscoverySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-[16/9] w-full animate-pulse bg-slate-100" />
          <div className="p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ hasQuery }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {hasQuery ? <Search className="h-7 w-7" /> : <Inbox className="h-7 w-7" />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-800">
        {hasQuery ? 'No events match your search' : 'Nothing on the calendar yet'}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {hasQuery
          ? 'Try a different keyword, venue, or club name.'
          : 'Check back soon — clubs and departments publish events here throughout the term.'}
      </p>
    </div>
  );
}