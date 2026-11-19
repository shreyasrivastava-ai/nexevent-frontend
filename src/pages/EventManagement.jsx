// Frontend: src/pages/EventManagement.jsx
import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Plus,
  CalendarDays,
  MapPin,
  Users,
  RefreshCw,
  Inbox,
  Pencil,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  X,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useApi';
import api from '../utils/axiosConfig';
import EventCreateModal from '../components/EventCreateModal';
import { getDynamicEventStatus } from '../utils/eventVisuals';

const STATUS_TONE = {
  DRAFT:            'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED:         'bg-red-50 text-red-700 border-red-200',
  COMPLETED:        'bg-sky-50 text-sky-700 border-sky-200',
  ONGOING:          'bg-amber-50 text-amber-700 border-amber-200',
  UPCOMING:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED:        'bg-slate-100 text-slate-500 border-slate-200',
};

export default function EventManagement() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [viewMode, setViewMode] = useState('CREATED'); 

  const isFaculty = user?.role === 'FACULTY';
  const isCoordinator = user?.role === 'STUDENT_COORDINATOR';

  useEffect(() => {
    if (isCoordinator) setViewMode('CREATED');
  }, [isCoordinator]);

  const {
    data: events,
    loading,
    refetching,
    refetch,
  } = useFetch('/events', {
    params: { 
      coordinating: isCoordinator ? true : undefined,
      mine: (!isCoordinator && viewMode === 'CREATED') ? true : undefined,
      oversight: (!isCoordinator && viewMode === 'OVERSIGHT') ? true : undefined 
    },
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  const handleCreated = () => {
    setModalOpen(false);
    setEditingEvent(null);
    refetch();
  };

  const isRefreshing = loading || refetching;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
              {isCoordinator ? 'Coordinator Workspace' : viewMode === 'CREATED' ? 'Organizer Workspace' : 'Faculty Oversight'}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isCoordinator ? 'Events I Coordinate' : viewMode === 'CREATED' ? 'My Events' : 'Events I Oversee'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {user?.department ? `${user.department} · ` : ''}
              {isCoordinator ? 'Manage rosters for events assigned to you.' : viewMode === 'CREATED' ? 'Draft, submit, and track events you created.' : 'Manage events where you are assigned as Faculty Incharge.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={isRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
              aria-label="Refresh events"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            {!isCoordinator && viewMode === 'CREATED' && (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3] active:bg-[#006699] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Draft New Event
              </button>
            )}
          </div>
        </header>

        {isFaculty && (
          <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-fit">
            <button
              onClick={() => setViewMode('CREATED')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'CREATED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Pencil className="h-4 w-4" /> My Drafts
            </button>
            <button
              onClick={() => setViewMode('OVERSIGHT')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'OVERSIGHT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Eye className="h-4 w-4" /> Oversight
            </button>
          </div>
        )}

        {loading ? (
          <EventsSkeleton />
        ) : events.length === 0 ? (
          <EmptyEvents 
            onCreate={() => { setEditingEvent(null); setModalOpen(true); }} 
            isOversight={viewMode === 'OVERSIGHT'} 
            isCoordinator={isCoordinator}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((evt) => (
              <EventCard 
                key={evt.id} 
                event={evt} 
                onManage={() => setSelectedEvent(evt)} 
                onEdit={!isCoordinator && viewMode === 'CREATED' ? () => { setEditingEvent(evt); setModalOpen(true); } : undefined}
                isOversight={viewMode === 'OVERSIGHT'}
                isCoordinator={isCoordinator}
              />
            ))}
          </div>
        )}

      </div>

      <EventCreateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        onCreated={handleCreated}
        initialData={editingEvent}
        isEdit={!!editingEvent}
      />

      <OrganizerEventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRefresh={refetch}
      />
    </div>
  );
}

function EventCard({ event, onManage, onEdit, isOversight, isCoordinator }) {
  const displayStatus = getDynamicEventStatus(event);
  const tone = STATUS_TONE[displayStatus] ?? STATUS_TONE.DRAFT;

  const dateRange = useMemo(() => {
    if (!event.startTime) return '—';
    const start = new Date(event.startTime);
    const end   = event.endTime ? new Date(event.endTime) : null;
    const day   = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const t1    = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const t2    = end ? end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
    return t2 ? `${day} · ${t1}–${t2}` : `${day} · ${t1}`;
  }, [event.startTime, event.endTime]);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {event.bannerUrl && (
        <div className="aspect-[16/7] w-full overflow-hidden bg-slate-100">
          <img
            src={event.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-slate-800">{event.title}</h3>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
            {displayStatus.replace('_', ' ')}
          </span>
        </div>

        {event.naacCriterion && (
          <div className="mt-1 text-[11px] text-slate-400">NAAC {event.naacCriterion}</div>
        )}

        {event.status === 'REJECTED' && event.rejectionReason && (
          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700 flex gap-2 items-start">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span><strong>Feedback:</strong> {event.rejectionReason}</span>
          </div>
        )}

        <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{dateRange}</span>
          </div>
          {event.venueName && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="truncate">{event.venueName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{event.registeredStudents?.length ?? 0} registered</span>
          </div>
        </dl>

        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
          <Link
            to={`/events/${event.id}/roster`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0088cc] hover:text-[#0088cc]"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Roster
          </Link>
          
          {onEdit && displayStatus !== 'COMPLETED' && displayStatus !== 'CANCELLED' && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0088cc] hover:text-[#0088cc]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          )}
          
          {!isCoordinator && (
            <button
              type="button"
              onClick={onManage}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Manage
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  ORGANIZER MODAL (Manage Team & Complete Event)
 * ═══════════════════════════════════════════════════════════════ */
function OrganizerEventModal({ event, onClose, onRefresh }) {
  const toast = useToast();
  const [newCoordinator, setNewCoordinator] = useState('');
  const [updating, setUpdating] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!event) return null;

  const handleUpdateTeam = async (field, person) => {
    if (!person.trim()) return;
    setUpdating(true);
    try {
      const existing = event[field] || [];
      await api.patch(`/events/${event.id}/update`, { [field]: [...existing, person] });
      toast.success(`${person} assigned to event.`);
      onRefresh();
      if (field === 'studentCoordinators') setNewCoordinator('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update team.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveTeam = async (field, personToRemove) => {
    setUpdating(true);
    try {
      const existing = event[field] || [];
      await api.patch(`/events/${event.id}/update`, { [field]: existing.filter(p => p !== personToRemove) });
      toast.success(`${personToRemove} removed.`);
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to remove.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!window.confirm('Marking this event as completed will end the tenure of all Student Coordinators. Proceed?')) return;
    setCompleting(true);
    try {
      await api.patch(`/events/${event.id}/complete`);
      toast.success('Event marked as completed. Coordinator tenures have ended.');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to complete event.');
    } finally {
      setCompleting(false);
    }
  };

  const renderTeamList = (field, val, Icon, colorClass) => {
    const arr = Array.isArray(val) ? val : [];
    return (
      <div className="flex flex-col gap-1.5 mt-1">
        {arr.length === 0 && <span className="text-slate-400 italic text-xs">None assigned</span>}
        {arr.map((person, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 group">
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
              <span className="text-xs font-medium text-slate-700">{person}</span>
            </div>
            <button 
              onClick={() => handleRemoveTeam(field, person)}
              className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{event.title}</h2>
            <p className="text-xs text-slate-500 mt-1">Manage Event Team</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          <div className="space-y-4 pb-5">
            
            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <UserCheck className="h-3.5 w-3.5 text-[#0088cc]" /> Faculty Incharge
              </span>
              {renderTeamList('facultyIncharge', event.facultyIncharge, UserCheck, 'text-[#0088cc]')}
            </div>

            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Club Leads
              </span>
              {renderTeamList('clubLeads', event.clubLeads, ShieldCheck, 'text-amber-500')}
            </div>

            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <GraduationCap className="h-3.5 w-3.5 text-violet-500" /> Student Coordinators
              </span>
              {renderTeamList('studentCoordinators', event.studentCoordinators, GraduationCap, 'text-violet-500')}
              
              {event.status !== 'COMPLETED' && (
                <div className="flex gap-2 mt-2">
                  <input type="text" placeholder="Add Coordinator (Name or ERP)" value={newCoordinator} onChange={e => setNewCoordinator(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0088cc]" />
                  <button onClick={() => handleUpdateTeam('studentCoordinators', newCoordinator)} disabled={updating} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700"><PlusCircle className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>

          </div>

          {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Mark Event as Completed</h3>
              <p className="text-xs text-emerald-600 mt-1 mb-3">
                Completing the event will automatically end the tenure of all assigned Student Coordinators, reverting them to standard Student roles.
              </p>
              <button 
                onClick={handleMarkCompleted} 
                disabled={completing} 
                className="w-full rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {completing ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing...</> : 'Complete Event & End Tenures'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-6 h-8 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyEvents({ onCreate, isOversight, isCoordinator }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-800">
        {isCoordinator ? 'No events assigned' : isOversight ? 'No oversight assignments' : 'No events yet'}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {isCoordinator 
          ? 'You have not been assigned as a Student Coordinator for any events yet.' 
          : isOversight
            ? 'You have not been assigned as Faculty Incharge for any events yet.'
            : 'Draft your first event to begin collecting registrations and building your roster.'}
      </p>
      {!isOversight && !isCoordinator && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Draft New Event
        </button>
      )}
    </div>
  );
}