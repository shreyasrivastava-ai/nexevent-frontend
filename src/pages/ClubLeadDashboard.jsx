// Frontend: src/pages/ClubLeadDashboard.jsx
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CalendarDays, MapPin, Users, RefreshCw, CheckCircle2, 
  Sparkles, Compass, ShieldAlert, Plus, ArrowRight, Loader2,
  Inbox, ExternalLink, CalendarCheck
} from 'lucide-react';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useFetch, useMutation } from '../hooks/useApi';
import EventDetailModal from '../components/EventDetailModal';
import EventCreateModal from '../components/EventCreateModal';
import OrganizerEventModal from '../components/OrganizerEventModal';
import { gradientFor, formatEventWindow, getDynamicEventStatus } from '../utils/eventVisuals';

export default function ClubLeadDashboard() {
  const toast = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('OPERATIONS'); // OPERATIONS | DISCOVERY
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openEventId, setOpenEventId] = useState(null);
  const [selectedOrganizerEvent, setSelectedOrganizerEvent] = useState(null);

  // Discover Feed State
  const [query, setQuery] = useState('');
  const [registeredIds, setRegisteredIds] = useState(() => new Set());
  const [countDeltas, setCountDeltas] = useState({});
  const [inFlightId, setInFlightId] = useState(null);

  // ── Data Fetching ──────────────────────────────────────────────
  
  // 1. My Assigned Events (Events created by me OR organized by my club)
  const { 
    data: myEvents = [], 
    loading: myEventsLoading, 
    refetch: refetchMyEvents 
  } = useFetch('/events?mine=true', { initialData: [] });

  // 2. Club History (All events organized by my club)
  const { 
    data: clubEvents = [], 
    loading: clubEventsLoading, 
    refetch: refetchClubEvents 
  } = useFetch(user?.club ? `/events?club=${user.club}` : null, { initialData: [] });

  // 3. Rolling Discovery Feed
  const { 
    data: discoverEvents = [], 
    loading: discoverLoading, 
    refetching: discoverRefetching,
    refetch: refetchDiscover 
  } = useFetch('/events/campus-window', { initialData: [] });

  const { mutate: registerForEvent } = useMutation(
    (eventId) => api.post(`/events/${eventId}/register`),
    {
      onSuccess: (_data, eventId) => {
        setRegisteredIds((prev) => new Set(prev).add(eventId));
        setCountDeltas((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? 0) + 1 }));
      },
    }
  );

  const handleRefreshAll = () => {
    refetchMyEvents();
    refetchClubEvents();
    refetchDiscover();
  };

  // ── Discovery Handlers ─────────────────────────────────────────
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
          } else {
            toast.warning(detail || 'A scheduling conflict was detected.', { title: 'Schedule Conflict', duration: 7000 });
          }
        } else {
          toast.error(detail || 'Registration failed. Please try again.');
        }
      } finally {
        setInFlightId(null);
      }
    },
    [registerForEvent, toast]
  );

  const isRegistered = useCallback(
    (event) => Boolean(event.isRegistered) || registeredIds.has(event.id),
    [registeredIds]
  );

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return discoverEvents;
    return discoverEvents.filter((e) =>
      [e.title, e.description, e.venueName, e.organizingClub]
        .some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [discoverEvents, query]);

  const openEvent = useMemo(
    () => discoverEvents.find((e) => e.id === openEventId) ?? null,
    [discoverEvents, openEventId]
  );

  const openStatus = !openEvent
    ? 'IDLE'
    : inFlightId === openEvent.id
      ? 'LOADING'
      : isRegistered(openEvent)
        ? 'REGISTERED'
        : 'IDLE';

  const isRefreshing = discoverLoading || discoverRefetching;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Club Lead Console
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {user?.club || 'Club'} Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your events and discover what's happening across campus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${(myEventsLoading || clubEventsLoading || isRefreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3]"
            >
              <Plus className="h-4 w-4" /> New Event
            </button>
          </div>
        </header>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-fit">
          <button
            onClick={() => setActiveTab('OPERATIONS')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'OPERATIONS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> Club Operations
          </button>
          <button
            onClick={() => setActiveTab('DISCOVERY')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'DISCOVERY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Compass className="h-4 w-4" /> Campus Discovery
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: CLUB OPERATIONS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'OPERATIONS' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Section A: My Assigned Events */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-800">My Assigned Events</h2>
                <span className="text-xs text-slate-500">{myEvents.length} event(s)</span>
              </header>
              {myEventsLoading ? (
                <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
              ) : myEvents.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">You haven't created any events yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3">Event</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Registrations</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myEvents.map(evt => {
                        const displayStatus = getDynamicEventStatus(evt);
                        return (
                          <tr key={evt.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-4 font-medium text-slate-800">{evt.title}</td>
                            <td className="px-5 py-4 text-slate-600">{new Date(evt.startTime).toLocaleDateString()}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                displayStatus === 'ONGOING' ? 'bg-amber-100 text-amber-700' :
                                displayStatus === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{displayStatus}</span>
                            </td>
                            <td className="px-5 py-4 text-right font-medium">{evt.registeredStudents?.length || 0}</td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => setSelectedOrganizerEvent(evt)}
                                className="text-xs font-semibold text-[#0088cc] hover:underline"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section B: Club History */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Club History</h2>
                <p className="text-sm text-slate-500">All events organized by {user?.club || 'your club'}</p>
              </div>
              
              {clubEventsLoading ? (
                <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
              ) : clubEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
                  No events found for this club.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clubEvents.map(evt => {
                    const displayStatus = getDynamicEventStatus(evt);
                    return (
                      <div key={evt.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-slate-800 line-clamp-1">{evt.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            displayStatus === 'ONGOING' ? 'bg-amber-100 text-amber-700' :
                            displayStatus === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>{displayStatus}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{formatEventWindow(evt.startTime, evt.endTime)}</p>
                        
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1 text-sm text-slate-600">
                            <Users className="h-4 w-4 text-slate-400" /> {evt.registeredStudents?.length || 0}
                          </span>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/events/${evt.id}/roster`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0088cc] hover:text-[#0088cc]"
                            >
                              Roster
                            </Link>
                            <button 
                              onClick={() => setSelectedOrganizerEvent(evt)} 
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              Manage
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: STUDENT DISCOVERY
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'DISCOVERY' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search campus events…"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                />
              </div>
            </div>

            {discoverLoading ? (
              <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
            ) : visibleEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Inbox className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-800">No events found</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  {query ? 'Try adjusting your search.' : 'No events in the 10-day rolling window.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    registered={isRegistered(evt)}
                    registeredCount={(evt.registeredStudents?.length || 0) + (countDeltas[evt.id] ?? 0)}
                    onOpen={() => setOpenEventId(evt.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <EventCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => { setIsCreateOpen(false); handleRefreshAll(); }}
      />
      
      <OrganizerEventModal
        event={selectedOrganizerEvent}
        onClose={() => setSelectedOrganizerEvent(null)}
        onRefresh={handleRefreshAll}
      />

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
  const organizer = event.organizingClub ?? '—';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <div className={`h-full w-full bg-gradient-to-br ${gradientFor(event.title)} transition-transform duration-500 group-hover:scale-105`}>
          <div className="flex h-full w-full items-center justify-center">
            <CalendarDays className="h-10 w-10 text-white/60" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {event.isCompulsory ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <ShieldAlert className="h-2.5 w-2.5" /> Compulsory
            </span>
          ) : <span />}

          {registered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <CheckCircle2 className="h-2.5 w-2.5" /> Registered
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-[#0088cc]">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{organizer}</p>

        <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{formatEventWindow(event.startTime, event.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{event.venueName ?? 'Venue TBA'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{registeredCount} registered</span>
          </div>
        </dl>
      </div>
    </article>
  );
}