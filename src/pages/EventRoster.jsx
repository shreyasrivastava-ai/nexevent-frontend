// src/pages/EventRoster.jsx
import { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Users,
  Download,
  UserPlus,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Inbox,
  Search,
} from 'lucide-react';
import api from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch, useMutation } from '../hooks/useApi';

const COLUMNS = [
  { key: 'name',        label: 'Name',        sortable: true },
  { key: 'rollNumber',  label: 'Roll Number', sortable: true },
  { key: 'erp',         label: 'ERP',         sortable: true },
  { key: 'department',  label: 'Department',  sortable: true },
  { key: 'year',        label: 'Year',        sortable: true },
];

export default function EventRoster() {
  const { id } = useParams();
  const { role } = useAuth();
  const toast = useToast();

  const [sort, setSort]           = useState({ key: 'name', dir: 'asc' });
  const [filter, setFilter]       = useState('');
  const [promotion, setPromotion] = useState({ erp: '' });

  const canPromote = role === 'CLUB_LEAD' || role === 'FACULTY';

  const {
    data,
    loading,
    refetching,
    error: fetchError,
    refetch,
  } = useFetch(`/dashboard/events/${id}/roster`, {
    select: (d) => {
      if (Array.isArray(d)) {
        return { event: null, roster: d };
      }
      return {
        event: d?.event ?? {
          title: d?.eventTitle,
          venue: d?.venueName,
          studentCoordinators: d?.studentCoordinators || [],
        },
        roster: d?.roster ?? d?.students ?? [],
      };
    },
    initialData: { event: null, roster: [] },
  });

  const { event, roster } = data;
  const isRefreshing = loading || refetching;

  const errorMessage = useMemo(() => {
    if (!fetchError) return null;
    const status = fetchError?.response?.status;
    if (status === 404) return 'This event could not be found.';
    if (status === 403) return 'You do not have permission to view this roster.';
    return 'Unable to load the roster. Please try again.';
  }, [fetchError]);

  // FIX 1: Pass an empty object {} as the body to satisfy FastAPI's Pydantic requirement
  const { mutate: promoteToCoordinator, loading: promoting } = useMutation(
    (erp) => api.patch(`/users/${erp}/assign-coordinator`, {})
  );

  const handlePromote = useCallback(
    async (e) => {
      e.preventDefault();
      
      // FIX 2: Smartly extract just the ERP if they type "Name(ERP)"
      const match = promotion.erp.match(/\((.*?)\)/);
      const erp = match ? match[1].trim() : promotion.erp.trim();
      
      if (!erp) {
        toast.warning('Enter the ERP of the student to promote.');
        return;
      }

      try {
        await promoteToCoordinator(erp);
        
        const existingCoords = event?.studentCoordinators || [];
        if (!existingCoords.some(c => c.includes(erp))) {
           await api.patch(`/events/${id}/update`, { 
             studentCoordinators: [...existingCoords, erp] 
           });
        }

        toast.success(`${erp} has been promoted to Event Coordinator.`, {
          title: 'Promotion recorded',
        });
        setPromotion({ erp: '' });
        refetch(); 
      } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;

        if (status === 404) {
          toast.error(`No user found with ERP ${erp}.`, { title: 'Unknown user' });
        } else if (status === 409) {
          toast.warning(detail || 'This user is already a coordinator.');
        } else {
          toast.error(detail || 'Promotion failed. Please try again.');
        }
      }
    },
    [promotion, promoteToCoordinator, toast, refetch, event, id]
  );

  const visibleRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? roster.filter((r) =>
          ['name', 'rollNumber', 'erp', 'department', 'year']
            .some((k) => String(r[k] ?? '').toLowerCase().includes(q))
        )
      : roster;

    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const numeric = sort.key === 'year' || sort.key === 'rollNumber';
      const cmp = numeric
        ? Number(av) - Number(bv)
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [roster, sort, filter]);

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const handleExportRoster = useCallback(async () => {
    if (visibleRows.length === 0) {
      toast.warning('There is nothing to export yet.');
      return;
    }
    
    try {
      toast.info('Preparing download...');
      const response = await api.get(`/dashboard/events/${id}/roster/export`, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${event?.title?.replace(/\s+/g, '-').toLowerCase() ?? id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast.success(`${visibleRows.length} record(s) exported.`);
    } catch {
      toast.error('Failed to download the CSV file.');
    }
  }, [visibleRows, event, id, toast]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/events/manage"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to My Events
            </Link>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {event?.title ?? 'Event Roster'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {roster.length} registered participant{roster.length === 1 ? '' : 's'}
              {event?.venue ? ` · ${event.venue}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={isRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
              aria-label="Refresh roster"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleExportRoster}
              disabled={loading || visibleRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </header>

        {canPromote && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0088cc]">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-800">Promote to Coordinator</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Coordinators gain roster-management access for this event only. Their tenure ends automatically when the event is marked as completed.
                </p>
              </div>
            </header>

            <form onSubmit={handlePromote} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={promotion.erp}
                onChange={(e) => setPromotion({ erp: e.target.value })}
                placeholder="Enter student ERP (or Name(ERP))"
                disabled={promoting}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={promoting || !promotion.erp.trim()}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promoting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Promoting…
                  </>
                ) : (
                  'Promote'
                )}
              </button>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-800">Registered Students</h2>
              {!loading && visibleRows.length !== roster.length && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {visibleRows.length} of {roster.length}
                </span>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name, ERP, dept…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20"
              />
            </div>
          </header>

          {loading ? (
            <RosterSkeleton />
          ) : errorMessage ? (
            <ErrorState message={errorMessage} onRetry={refetch} />
          ) : roster.length === 0 ? (
            <EmptyRoster />
          ) : visibleRows.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              No students match “{filter}”.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="px-5 py-3">
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:text-slate-800"
                          >
                            {col.label}
                            <SortIcon active={sort.key === col.key} dir={sort.dir} />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((student, i) => (
                    <tr
                      key={student.erp ?? student.id ?? i}
                      className="transition-colors hover:bg-slate-50/40"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800">{student.name ?? '—'}</td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-600">{student.rollNumber ?? '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{student.erp ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{student.department ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{student.year ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-300" aria-hidden="true" />;
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-[#0088cc]" aria-hidden="true" />
    : <ArrowDown className="h-3 w-3 text-[#0088cc]" aria-hidden="true" />;
}

function RosterSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/6 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/6 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/6 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0088cc] hover:text-[#0088cc]"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function EmptyRoster() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">No registrations yet</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        Share the event link with students — registrations will appear here in real time.
      </p>
    </div>
  );
}