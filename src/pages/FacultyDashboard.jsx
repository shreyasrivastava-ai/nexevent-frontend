// Frontend: src/pages/FacultyDashboard.jsx
import { useMemo, useState } from 'react';
import {
  CalendarDays, Users, ShieldCheck, Activity, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useApi';
import OrganizerEventModal from '../components/OrganizerEventModal';
import { getDynamicEventStatus } from '../utils/eventVisuals';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);

  const {
    data: events,
    loading,
    error, // Capture API errors
    refetch,
  } = useFetch('/events/faculty-feed', {
    select: (d) => (Array.isArray(d) ? d : d?.items ?? []),
    initialData: [],
  });

  // Calculate Metrics
  const totalEvents = events.length;
  const totalStudents = useMemo(
    () => events.reduce((sum, e) => sum + (e.registeredStudents?.length || 0), 0),
    [events]
  );
  const compulsoryEvents = useMemo(
    () => events.filter(e => e.isCompulsory).length,
    [events]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">

        <header>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {user?.role === 'CLUB_LEAD' ? 'Club Console' : 'Faculty Console'}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Rolling 10-Day University Feed
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, {user?.name}. Here is the summary of all university-wide events for the next 5 days and the past 5 days.
          </p>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-[#0088cc]">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Events in Window</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : totalEvents}</p>
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Students Reached</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : totalStudents}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Activity className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Compulsory Events</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : compulsoryEvents}</p>
            </div>
          </div>
        </section>

        {/* Event List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-800">University Events Feed</h2>
          </header>
          
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              {error ? `Error loading feed: ${error.message || 'Server error'}` : "No events in the rolling window."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Club</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Registrations</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map(evt => {
                    const displayStatus = getDynamicEventStatus(evt);
                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800 flex items-center gap-2">
                            {evt.title}
                            {evt.isCompulsory && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Compulsory</span>}
                          </div>
                          <div className={`text-[10px] font-semibold uppercase mt-0.5 ${
                            displayStatus === 'ONGOING' ? 'text-amber-600' : 
                            displayStatus === 'COMPLETED' ? 'text-slate-400' : 
                            'text-emerald-600'
                          }`}>
                            {displayStatus}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{evt.organizingClub || '—'}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {evt.startTime ? new Date(evt.startTime).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {evt.registeredStudents?.length || 0}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedEvent(evt)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0088cc] hover:underline"
                          >
                            Manage <ArrowRight className="h-3 w-3" />
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

      </div>

      <OrganizerEventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRefresh={refetch}
      />
    </div>
  );
}