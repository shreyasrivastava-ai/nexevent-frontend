// Frontend: src/components/OrganizerEventModal.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, ShieldCheck, UserCheck, GraduationCap, X, PlusCircle, Loader2
} from 'lucide-react';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';

export default function OrganizerEventModal({ event, onClose, onRefresh }) {
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