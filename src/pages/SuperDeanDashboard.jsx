// src/pages/SuperDeanDashboard.jsx
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Clock4,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Inbox,
  MapPin,
  Users,
  Building2,
  X,
  UserCheck,
  GraduationCap,
  Trash2,
  UserMinus,
  Plus,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';
import { useFetch, useMutation } from '../hooks/useApi';
import { getDynamicEventStatus } from '../utils/eventVisuals';

const NAAC_ORDER_HINT = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Exact list of the 19 clubs provided
const STANDARD_CLUBS = [
  "1090 Power Angels", "Apni Pathsala Club", "Beat the Beats", "Business Consultancy Club",
  "Expression Club", "Golden Pen Club", "Health Club", "Manch Club", "NSS Club", "Ozone Club",
  "Positive Psychology Club", "Razzmatazz Club", "Snapshot Club", "Social Media Club",
  "Spic Macay Club", "Srijan Club", "Stock Exchange Club", "Sur Jhankar Club", "Tech Fusion Club"
].sort();

const STATUS_TONE = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  COMPLETED: 'bg-sky-50 text-sky-700 border-sky-200',
  ONGOING: 'bg-amber-50 text-amber-700 border-amber-200',
  UPCOMING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const CHART_COLORS = ['#0088cc', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

export default function SuperDeanDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW | ANALYTICS | AUDIT

  /* ── 1. Data Fetching ───────────────────────────────────────── */
  const { data: stats, loading: statsLoading, refetch: refetchStats } = useFetch('/dashboard/stats', {
    select: (d) => ({
      total_events: d?.totalEvents ?? 0,
      pending_approvals: d?.byStatus?.PENDING_APPROVAL ?? 0,
      naac_breakdown: d?.byNaacCriterion ?? {},
    }),
  });

  const { data: pending, loading: pendingLoading, refetch: refetchPending } = useFetch('/events', {
    params: { status: 'PENDING_APPROVAL' },
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  const { data: allEvents, loading: allEventsLoading, refetch: refetchAllEvents } = useFetch('/events', {
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  const { data: fetchedClubs = [], loading: clubsLoading, refetch: refetchClubs } = useFetch('/dashboard/clubs', {
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  const { data: analytics, loading: analyticsLoading } = useFetch('/dashboard/analytics', {
    initialData: { venueUsage: [], departmentEngagement: [] }
  });

  const { data: auditLogs, loading: auditLoading, refetch: refetchAudit } = useFetch('/dashboard/audit-logs', {
    initialData: []
  });

  const clubs = useMemo(() => Array.from(new Set([...fetchedClubs, ...STANDARD_CLUBS])).sort(), [fetchedClubs]);

  /* ── 2. Local State ─────────────────────────────────────────── */
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [actionInFlight, setActionInFlight] = useState(null);
  const [delegation, setDelegation] = useState({ erp: '', role: 'CLUB_LEAD', club: '' });
  const [exporting, setExporting] = useState(false);
  
  // Modals
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rejectingEvent, setRejectingEvent] = useState(null);

  /* ── 3. Handlers & Mutations ────────────────────────────────── */
  const handleRefreshAll = useCallback(() => {
    refetchStats();
    refetchPending();
    refetchAllEvents();
    refetchClubs();
    refetchAudit();
    toast.success('Dashboard refreshed successfully.');
  }, [refetchStats, refetchPending, refetchAllEvents, refetchClubs, refetchAudit, toast]);

  const handleApprove = async (event) => {
    setActionInFlight({ id: event.id, decision: 'approve' });
    try {
      await api.patch(`/events/${event.id}/approve`);
      setDismissedIds((s) => new Set(s).add(event.id));
      refetchStats();
      refetchAllEvents();
      toast.success(`"${event.title}" approved.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Approval failed.');
    } finally {
      setActionInFlight(null);
    }
  };

  const handleDelegate = async (e) => {
    e.preventDefault();
    const erp = delegation.erp.trim();
    if (!erp) return toast.warning('Enter the ERP of the user.');
    if (delegation.role === 'CLUB_LEAD' && !delegation.club.trim()) return toast.warning('Please select a club.');

    try {
      if (delegation.role === 'REMOVE_CLUB_LEAD') {
        await api.patch(`/users/${erp}/remove-club-lead`);
      } else {
        await api.patch(`/users/${erp}/assign-club-lead`, { club: delegation.club });
      }
      toast.success(`Action applied successfully.`);
      setDelegation({ erp: '', role: delegation.role, club: '' });
      handleRefreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/dashboard/naac-export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `naac-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('NAAC report downloaded.');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const visiblePending = useMemo(() => pending.filter((e) => !dismissedIds.has(e.id)), [pending, dismissedIds]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Super Dean Console
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Institution Overview
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${(statsLoading || pendingLoading || allEventsLoading || auditLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3] disabled:opacity-70"
            >
              {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</> : <><Download className="h-4 w-4" /> Export NAAC (CSV)</>}
            </button>
          </div>
        </header>

        {/* ── Navigation Tabs ─────────────────────────────────── */}
        <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-fit">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: CalendarDays },
            { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
            { id: 'AUDIT', label: 'Audit Logs', icon: ShieldAlert }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Total Events" value={stats?.total_events} icon={CalendarDays} tone="cyan" hint="All time" loading={statsLoading} />
              <MetricCard label="Pending Approvals" value={stats?.pending_approvals} icon={Clock4} tone="amber" hint="Awaiting review" loading={statsLoading} />
              <div className="md:col-span-2 lg:col-span-1">
                <NaacBreakdownCard breakdown={stats?.naac_breakdown} loading={statsLoading} />
              </div>
            </section>

            <PendingApprovalsTable
              events={visiblePending}
              loading={pendingLoading}
              actionInFlight={actionInFlight}
              onApprove={handleApprove}
              onRejectClick={setRejectingEvent}
              onRefresh={refetchPending}
            />

            <AllEventsDirectory
              events={allEvents}
              loading={allEventsLoading}
              onRefresh={refetchAllEvents}
              onEventClick={setSelectedEvent}
            />

            <DelegationPanel
              value={delegation}
              onChange={setDelegation}
              onSubmit={handleDelegate}
              submitting={false}
              clubs={clubs}
              clubsLoading={clubsLoading}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: ANALYTICS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Venue Usage */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0088cc]" /> Top Venues (Usage)
                </h3>
                {analyticsLoading ? <div className="h-72 animate-pulse bg-slate-100 rounded-xl" /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.venueUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="events" fill="#0088cc" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Department Engagement */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-emerald-500" /> Student Engagement by Dept
                </h3>
                {analyticsLoading ? <div className="h-72 animate-pulse bg-slate-100 rounded-xl" /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={analytics.departmentEngagement} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={90} 
                          fill="#8884d8" 
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analytics.departmentEngagement.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Venue Heatmap */}
            <VenueHeatmap events={allEvents} loading={allEventsLoading} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 3: AUDIT LOGS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'AUDIT' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in duration-300 overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Immutable Audit Trail</h2>
              </div>
              <button onClick={refetchAudit} disabled={auditLoading} className="text-xs font-medium text-[#0088cc] hover:underline">Refresh</button>
            </header>
            <div>
              {auditLoading ? (
                <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">No activity recorded yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-x-auto">
                  {auditLogs.map((log) => {
                    const dateStr = log.createdAt || log.timestamp || log.date;
                    const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : 'Just now';
                    
                    return (
                      <li key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 min-w-[600px]">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          log.action.includes('CANCEL') || log.action.includes('REJECT') || log.action.includes('DELETE') 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <Activity className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {log.actorName} <span className="text-slate-500 font-normal">performed</span> {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">Target: {log.targetType} ({log.targetId})</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{formattedDate}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}
      <EventDetailModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        onRefresh={handleRefreshAll} 
      />
      
      <RejectEventModal 
        event={rejectingEvent} 
        onClose={() => setRejectingEvent(null)} 
        onSuccess={() => { 
          refetchStats(); 
          refetchAllEvents(); 
          refetchPending(); 
          refetchAudit(); 
        }} 
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  VENUE HEATMAP (CALENDAR VIEW)
 * ═══════════════════════════════════════════════════════════════ */
function VenueHeatmap({ events, loading }) {
  // 1. Generate the next 28 days (4 weeks)
  const dates = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  // 2. Aggregate events by Venue and Date
  const heatmapData = useMemo(() => {
    const validEvents = events.filter(e => 
      e.status !== 'CANCELLED' && 
      e.status !== 'REJECTED' && 
      e.venueName && 
      e.startTime
    );

    const venues = Array.from(new Set(validEvents.map(e => e.venueName))).sort();
    const map = {};
    
    validEvents.forEach(e => {
      const dateStr = new Date(e.startTime).toISOString().split('T')[0];
      if (!map[e.venueName]) map[e.venueName] = {};
      map[e.venueName][dateStr] = (map[e.venueName][dateStr] || 0) + 1;
    });

    return { venues, map };
  }, [events]);

  const getCellColor = (count) => {
    if (count === 0) return 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-300';
    if (count === 1) return 'bg-cyan-200 border-cyan-300 text-cyan-900';
    if (count === 2) return 'bg-cyan-400 border-cyan-500 text-white';
    return 'bg-cyan-600 border-cyan-700 text-white font-bold';
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-amber-500" /> Venue Usage Heatmap (Next 28 Days)
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
          <div className="w-3 h-3 rounded bg-cyan-200 border border-cyan-300" />
          <div className="w-3 h-3 rounded bg-cyan-400 border border-cyan-500" />
          <div className="w-3 h-3 rounded bg-cyan-600 border border-cyan-700" />
          <span>More</span>
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr>
                <th className="p-2 font-medium text-slate-500 min-w-[120px]">Venue</th>
                {dates.map((d, i) => (
                  <th key={i} className="p-1 text-center font-medium text-slate-400 min-w-[28px]">
                    {d.toLocaleDateString('en-IN', { weekday: 'narrow' })}<br/>
                    <span className="text-[10px]">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.venues.length === 0 ? (
                <tr>
                  <td colSpan={29} className="p-4 text-center text-slate-400 italic">No venue data available for upcoming events.</td>
                </tr>
              ) : (
                heatmapData.venues.map(venue => (
                  <tr key={venue}>
                    <td className="p-2 font-medium text-slate-700 truncate max-w-[150px]" title={venue}>
                      {venue}
                    </td>
                    {dates.map((d, i) => {
                      const dateStr = d.toISOString().split('T')[0];
                      const count = heatmapData.map[venue]?.[dateStr] || 0;
                      return (
                        <td key={i} className="p-0.5">
                          <div 
                            className={`w-full aspect-square rounded border flex items-center justify-center transition-colors cursor-default ${getCellColor(count)}`}
                            title={`${count} event(s) on ${d.toLocaleDateString()} at ${venue}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  REJECT MODAL (Mandatory Feedback)
 * ═══════════════════════════════════════════════════════════════ */
function RejectEventModal({ event, onClose, onSuccess }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const handleReject = async () => {
    if (!reason.trim()) return toast.warning('Please provide actionable feedback.');
    setLoading(true);
    try {
      await api.patch(`/events/${event.id}/reject`, { remarks: reason });
      toast.success('Event rejected and feedback sent to creator.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reject event.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" /> Reject Event
        </h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Rejecting "{event.title}". The club lead will receive your feedback to fix and resubmit.
        </p>
        
        <label className="block mb-4">
          <span className="text-xs font-semibold text-slate-600 mb-1 block">Reason for Rejection *</span>
          <textarea 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            rows={4}
            placeholder="e.g., Venue clash with Dean's address. Please rebook for 2 PM."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button 
            onClick={handleReject} 
            disabled={loading || !reason.trim()} 
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Rejection'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  EVENT DETAIL MODAL (Team Management)
 * ═══════════════════════════════════════════════════════════════ */
function EventDetailModal({ event, onClose, onRefresh }) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const [newFaculty, setNewFaculty] = useState('');
  const [newLead, setNewLead] = useState('');
  const [newCoordinator, setNewCoordinator] = useState('');

  if (!event) return null;

  const handleUpdateTeam = async (field, person) => {
    if (!person.trim()) return;
    setUpdating(true);
    try {
      const existing = event[field] || [];
      await api.patch(`/events/${event.id}/update`, { [field]: [...existing, person] });
      toast.success(`${person} assigned.`);
      onRefresh();
      if (field === 'facultyIncharge') setNewFaculty('');
      if (field === 'clubLeads') setNewLead('');
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

  const handleDelete = async () => {
    if (!deleteReason.trim()) return toast.warning('Please provide a reason for deletion.');
    setIsDeleting(true);
    try {
      await api.delete(`/events/${event.id}`, { data: { reason: deleteReason } });
      toast.success('Event deleted and students notified.');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete.');
    } finally {
      setIsDeleting(false);
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
            <p className="text-xs text-slate-500 mt-1">Status: {getDynamicEventStatus(event)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TEAM MANAGEMENT SECTION */}
          <div className="space-y-4 border-b border-slate-100 pb-5">
            
            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <UserCheck className="h-3.5 w-3.5 text-[#0088cc]" /> Faculty Incharge
              </span>
              {renderTeamList('facultyIncharge', event.facultyIncharge, UserCheck, 'text-[#0088cc]')}
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder="Add Faculty (Name or ERP)" value={newFaculty} onChange={e => setNewFaculty(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0088cc]" />
                <button onClick={() => handleUpdateTeam('facultyIncharge', newFaculty)} disabled={updating} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Club Leads
              </span>
              {renderTeamList('clubLeads', event.clubLeads, ShieldCheck, 'text-amber-500')}
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder="Add Lead (Name or ERP)" value={newLead} onChange={e => setNewLead(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0088cc]" />
                <button onClick={() => handleUpdateTeam('clubLeads', newLead)} disabled={updating} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <GraduationCap className="h-3.5 w-3.5 text-violet-500" /> Student Coordinators
              </span>
              {renderTeamList('studentCoordinators', event.studentCoordinators, GraduationCap, 'text-violet-500')}
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder="Add Coordinator (Name or ERP)" value={newCoordinator} onChange={e => setNewCoordinator(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#0088cc]" />
                <button onClick={() => handleUpdateTeam('studentCoordinators', newCoordinator)} disabled={updating} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>

          </div>

          {/* DANGER ZONE (DELETE) */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Event</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">This action cannot be undone. All registered students will be notified.</p>
            <input 
              type="text" 
              placeholder="Reason for deletion..." 
              value={deleteReason} 
              onChange={e => setDeleteReason(e.target.value)} 
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500 mb-2" 
            />
            <button 
              onClick={handleDelete} 
              disabled={isDeleting || !deleteReason.trim()} 
              className="w-full rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Event Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  HELPER COMPONENTS
 * ═══════════════════════════════════════════════════════════════ */
function MetricCard({ label, value, icon: Icon, tone = 'slate', hint, loading }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    cyan: 'bg-cyan-50 text-[#0088cc]',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <div className="mt-2 h-9">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
            ) : (
              <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {value ?? '—'}
              </p>
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function NaacBreakdownCard({ breakdown, loading }) {
  const entries = useMemo(() => {
    if (!breakdown) return [];
    if (Array.isArray(breakdown)) {
      return breakdown.map((b) => [b.criterion ?? b.label, b.count ?? b.value]);
    }
    return Object.entries(breakdown).sort(
      ([a], [b]) => NAAC_ORDER_HINT.indexOf(a) - NAAC_ORDER_HINT.indexOf(b)
    );
  }, [breakdown]);

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Breakdown by NAAC Criterion
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Distribution of approved events across the 7 criteria
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs italic text-slate-400">No criterion data available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entries.map(([criterion, count]) => (
              <div key={criterion} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="text-[11px] font-semibold text-slate-500">{criterion}</span>
                <span className="text-sm font-bold tabular-nums text-slate-800">{count ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingApprovalsTable({ events, loading, actionInFlight, onApprove, onRejectClick, onRefresh }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mt-6">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Pending Approvals</h2>
          {!loading && events.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {events.length}
            </span>
          )}
        </div>
        <button onClick={onRefresh} disabled={loading} className="text-xs font-medium text-[#0088cc] hover:underline">Refresh</button>
      </header>

      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
      ) : events.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">All caught up.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Organizer</th>
                <th className="px-5 py-3">Date · Venue</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/40">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">{evt.title}</div>
                    {evt.naacCriterion && <div className="mt-0.5 text-[11px] text-slate-400">NAAC {evt.naacCriterion}</div>}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{evt.organizingClub || '—'}</td>
                  <td className="px-5 py-4 text-slate-600">
                    <div>{evt.startTime ? new Date(evt.startTime).toLocaleDateString() : '—'}</div>
                    <div className="text-xs text-slate-400">{evt.venueName}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        disabled={actionInFlight?.id === evt.id} 
                        onClick={() => onApprove(evt)} 
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button 
                        disabled={actionInFlight?.id === evt.id} 
                        onClick={() => onRejectClick(evt)} 
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AllEventsDirectory({ events, loading, onRefresh, onEventClick }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mt-6">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Institutional Events Directory</h2>
        </div>
        <button onClick={onRefresh} disabled={loading} className="text-xs font-medium text-[#0088cc] hover:underline">Refresh</button>
      </header>
      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
      ) : events.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">No events created.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Event Details</th>
                <th className="px-5 py-3">Organizers</th>
                <th className="px-5 py-3">Time & Venue</th>
                <th className="px-5 py-3 text-right">Registrations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((evt) => {
                const displayStatus = getDynamicEventStatus(evt);
                return (
                  <tr key={evt.id} onClick={() => onEventClick(evt)} className="hover:bg-cyan-50/40 cursor-pointer group transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 group-hover:text-[#0088cc]">{evt.title}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[displayStatus] || STATUS_TONE.DRAFT}`}>{displayStatus}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{evt.organizingClub || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{evt.venueName || '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-500" /> {evt.registeredStudents?.length ?? 0}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DelegationPanel({ value, onChange, onSubmit, submitting, clubs, clubsLoading }) {
  const isClubLead = value.role === 'CLUB_LEAD';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">Global Role Management</h2>
        <p className="text-xs text-slate-500">Assign or remove Club Leads globally.</p>
      </header>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">User ERP</span>
          <input type="text" value={value.erp} onChange={(e) => onChange({ ...value, erp: e.target.value })} placeholder="e.g. ERP2024001" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0088cc]" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Club {isClubLead && <span className="text-red-500">*</span>}</span>
          <select value={value.club} onChange={(e) => onChange({ ...value, club: e.target.value })} disabled={!isClubLead || clubsLoading} className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0088cc] disabled:opacity-50">
            <option value="">Select a club…</option>
            {clubs.map((club, idx) => <option key={idx} value={club}>{club}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Action</span>
          <select value={value.role} onChange={(e) => onChange({ ...value, role: e.target.value })} className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0088cc]">
            <option value="CLUB_LEAD">Assign as Club Lead</option>
            <option value="REMOVE_CLUB_LEAD">Remove Club Lead</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={submitting || !value.erp.trim() || (isClubLead && !value.club.trim())} className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : value.role === 'REMOVE_CLUB_LEAD' ? 'Remove' : 'Assign'}
          </button>
        </div>
      </form>
    </section>
  );
}