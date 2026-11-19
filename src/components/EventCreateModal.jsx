// Frontend: src/components/EventCreateModal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, AlertCircle, Sparkles, ImageIcon, UserRound, ScrollText,
  Users2, Plus, Trash2, CalendarDays, MapPin, UserCheck, ShieldCheck,
  GraduationCap, Building2, UploadCloud, FileText,
} from 'lucide-react';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';
import { useMutation, useFetch } from '../hooks/useApi';
import VenueCombobox from './VenueCombobox';

const INITIAL = {
  title: '', description: '', start_time: '', end_time: '', naac_criterion: '',
  banner_url: '', brochure_url: '', contact_person: '', rules: '', venue: '',
  organizingClub: '', targetYears: [], targetCourses: [], facultyIncharge: '',
  clubLeads: '', studentCoordinators: '', isCompulsory: false, registrationUrl: '',
  requiresRegistration: true,
};

const formatForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

export default function EventCreateModal({ open, onClose, onCreated, initialData = null, isEdit = false }) {
  const toast = useToast();
  const { data: metadata = { clubs: [], departments: [], naacCriteria: [] } } = useFetch('/dashboard/metadata');

  const [form, setForm] = useState(INITIAL);
  const [guests, setGuests] = useState([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [error, setError] = useState(null);
  
  // Multipart Upload States
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  const { mutate: submitEvent, loading: submitting } = useMutation(
    (payload) => {
      if (isEdit && initialData?.id) return api.patch(`/events/${initialData.id}/update`, payload);
      return api.post('/events', payload);
    },
    {
      onSuccess: (data) => {
        toast.success(`"${data.title}" ${isEdit ? 'updated' : 'drafted'} successfully.`, { title: isEdit ? 'Event Updated' : 'Event Created' });
        onCreated?.(data);
      },
    }
  );

  useEffect(() => {
    if (open) {
      setError(null);
      setGuestDraft('');
      
      if (isEdit && initialData) {
        setForm({
          title: initialData.title || '',
          description: initialData.description || '',
          start_time: formatForInput(initialData.startTime),
          end_time: formatForInput(initialData.endTime),
          naac_criterion: initialData.naacCriterion || '',
          banner_url: initialData.bannerUrl || '',
          brochure_url: initialData.brochureUrl || '',
          contact_person: initialData.contactPerson || '',
          rules: initialData.rules || '',
          venue: initialData.venueName || '',
          organizingClub: initialData.organizingClub || '',
          targetYears: initialData.targetYears || [],
          targetCourses: initialData.targetCourses || [],
          facultyIncharge: initialData.facultyIncharge?.join(', ') || '',
          clubLeads: initialData.clubLeads?.join(', ') || '',
          studentCoordinators: initialData.studentCoordinators?.join(', ') || '',
          isCompulsory: initialData.isCompulsory || false,
          registrationUrl: initialData.registrationUrl || '',
          requiresRegistration: initialData.requiresRegistration ?? true,
        });
        setGuests(initialData.guestList || []);
      } else {
        setForm(INITIAL);
        setGuests([]);
      }
    }
  }, [open, isEdit, initialData]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, submitting, onClose]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  };

  const handleYearToggle = (year) => {
    const newYears = form.targetYears.includes(year) ? form.targetYears.filter((y) => y !== year) : [...form.targetYears, year];
    setField('targetYears', newYears.sort());
  };

  const handleCourseToggle = (course) => {
    const newCourses = form.targetCourses.includes(course) ? form.targetCourses.filter((c) => c !== course) : [...form.targetCourses, course];
    setField('targetCourses', newCourses.sort());
  };

  const addGuest = () => {
    const name = guestDraft.trim();
    if (!name || guests.includes(name)) { setGuestDraft(''); return; }
    setGuests((g) => [...g, name]);
    setGuestDraft('');
  };

  const removeGuest = (name) => setGuests((g) => g.filter((n) => n !== name));

  // Surgical Update: Multipart Upload Handler with Size Limits
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const isBanner = type === 'banner';
    // Enforce size limits
    const maxSize = isBanner ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for banner, 5MB for brochure
    
    if (file.size > maxSize) {
      toast.error(`File too large. Max size is ${isBanner ? '2MB' : '5MB'}.`);
      e.target.value = ''; // Reset input so they can try again
      return;
    }

    const setUploading = isBanner ? setUploadingBanner : setUploadingBrochure;
    const field = isBanner ? 'banner_url' : 'brochure_url';
    const folder = isBanner ? 'nexevent/banners' : 'nexevent/brochures';

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setField(field, res.data.secure_url);
      toast.success(`${isBanner ? 'Banner' : 'Brochure'} uploaded successfully.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to upload ${type}.`);
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.start_time) return 'Start time is required.';
    if (!form.end_time) return 'End time is required.';
    if (new Date(form.end_time) <= new Date(form.start_time)) return 'End time must be after the start time.';
    if (!form.naac_criterion) return 'Please select a NAAC criterion.';
    if (!form.venue.trim()) return 'Please select a venue.';
    
    if (!form.isCompulsory && form.requiresRegistration && !form.registrationUrl.trim()) {
      return 'An external Registration Link is required for events that require RSVP.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError({ message: v }); return; }

    const parseNames = (str) => str.split(',').map((s) => s.trim()).filter(Boolean);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || 'No description provided.',
      startTime: new Date(form.start_time).toISOString(),
      endTime: new Date(form.end_time).toISOString(),
      naacCriterion: form.naac_criterion,
      venueName: form.venue.trim(),
      organizingClub: form.organizingClub || null,
      targetYears: form.targetYears,
      targetCourses: form.targetCourses,
      bannerUrl: form.banner_url || null,
      brochureUrl: form.brochure_url || null,
      contactPerson: form.contact_person.trim() || null,
      rules: form.rules.trim() || null,
      guestList: guests,
      facultyIncharge: parseNames(form.facultyIncharge),
      clubLeads: parseNames(form.clubLeads),
      studentCoordinators: parseNames(form.studentCoordinators),
      isCompulsory: form.isCompulsory,
      registrationUrl: form.registrationUrl.trim() || null,
      requiresRegistration: form.requiresRegistration,
    };

    try {
      await submitEvent(payload);
    } catch (err) {
      const status = err?.response?.status;
      const rawDetail = err?.response?.data?.detail;
      const conflicts = err?.response?.data?.conflicts;
      
      let detail = Array.isArray(rawDetail) ? rawDetail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join(', ') : rawDetail;

      if (status === 409) {
        if (conflicts && conflicts.length > 0) {
          const list = conflicts.map(c => `"${c.title}" (${new Date(c.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`).join(', ');
          detail = `Clashes with: ${list}`;
        }
        toast.warning(detail || 'A scheduling conflict was detected.', { title: 'Conflict', duration: 7000 });
        setError({ message: detail || 'Clash detected — check the time, venue, or compulsory rules.' });
      } else if (status === 422) {
        setError({ message: detail || 'Validation failed. Please check your inputs.' });
      } else {
        setError({ message: detail || 'Unable to save the event.' });
      }
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-6 backdrop-blur-sm sm:py-12" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0088cc]"><Sparkles className="h-5 w-5" /></span>
            <div>
              <h2 id="event-modal-title" className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit Event' : 'Draft New Event'}</h2>
              <p className="mt-0.5 text-xs text-slate-500">Fill in the details below — save as draft or submit for approval.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <form id="event-create-form" onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {error && (<div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error.message}</span></div>)}

          <Section title="Basic Details" hint="The essentials — what, when, and why.">
            <Field label="Event Title" required><input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. National Hackathon 2026" disabled={submitting} className={INPUT} maxLength={140} /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} placeholder="A short paragraph describing the event…" disabled={submitting} className={`${INPUT} resize-none`} maxLength={1200} /></Field>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Start Time" required icon={CalendarDays}><input type="datetime-local" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} disabled={submitting} className={INPUT_WITH_ICON} /></Field>
              <Field label="End Time" required icon={CalendarDays}><input type="datetime-local" value={form.end_time} onChange={(e) => setField('end_time', e.target.value)} disabled={submitting} className={INPUT_WITH_ICON} /></Field>
            </div>

            <Field label="NAAC Criterion" required>
              <select value={form.naac_criterion} onChange={(e) => setField('naac_criterion', e.target.value)} disabled={submitting} className={`${INPUT} cursor-pointer`}>
                <option value="">Select a criterion…</option>
                {metadata.naacCriteria.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Venue" required icon={MapPin}><VenueCombobox value={form.venue} onChange={(v) => setField('venue', v)} disabled={submitting} /></Field>
              
              <Field label="Organizing Club" icon={Building2}>
                <select value={form.organizingClub} onChange={(e) => setField('organizingClub', e.target.value)} disabled={submitting} className={`${INPUT} cursor-pointer`}>
                  <option value="">No Club (Independent)</option>
                  {metadata.clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                </select>
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Event Lifecycle Type" required>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${form.isCompulsory ? 'border-[#0088cc] bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="eventType" checked={form.isCompulsory} onChange={() => { setField('isCompulsory', true); setField('requiresRegistration', false); setField('registrationUrl', ''); }} className="text-[#0088cc] focus:ring-[#0088cc]" />
                      <span className="text-sm font-semibold text-slate-800">Compulsory</span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">Mandatory attendance. No RSVP needed.</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${!form.isCompulsory && form.requiresRegistration ? 'border-[#0088cc] bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="eventType" checked={!form.isCompulsory && form.requiresRegistration} onChange={() => { setField('isCompulsory', false); setField('requiresRegistration', true); }} className="text-[#0088cc] focus:ring-[#0088cc]" />
                      <span className="text-sm font-semibold text-slate-800">Registration</span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">Requires an RSVP via Google Form.</span>
                  </label>

                  <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${!form.isCompulsory && !form.requiresRegistration ? 'border-[#0088cc] bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="eventType" checked={!form.isCompulsory && !form.requiresRegistration} onChange={() => { setField('isCompulsory', false); setField('requiresRegistration', false); setField('registrationUrl', ''); }} className="text-[#0088cc] focus:ring-[#0088cc]" />
                      <span className="text-sm font-semibold text-slate-800">Open Event</span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">Casual/Open. Just show up!</span>
                  </label>
                </div>
              </Field>

              {!form.isCompulsory && form.requiresRegistration && (
                <Field label="External Registration Link" required hint="Google Form, Microsoft Form, etc.">
                  <input type="url" value={form.registrationUrl} onChange={(e) => setField('registrationUrl', e.target.value)} placeholder="https://forms.gle/…" disabled={submitting} className={INPUT} />
                </Field>
              )}
            </div>
          </Section>

          <Section title="Target Audience" hint="Leave empty to apply to all students." icon={Users2}>
            <Field label="Target Years">
              <div className="flex flex-wrap gap-3 mt-1">
                {[1, 2, 3, 4].map((year) => (
                  <label key={year} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={form.targetYears.includes(year)} onChange={() => handleYearToggle(year)} disabled={submitting} className="h-4 w-4 rounded border-slate-300 text-[#0088cc] focus:ring-[#0088cc]" />
                    <span className="font-medium text-slate-700">Year {year}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Target Courses">
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/40">
                {metadata.departments.map((course) => (
                  <label key={course} className="flex items-center gap-2 cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 shadow-sm">
                    <input type="checkbox" checked={form.targetCourses.includes(course)} onChange={() => handleCourseToggle(course)} disabled={submitting} className="h-3.5 w-3.5 rounded border-slate-300 text-[#0088cc] focus:ring-[#0088cc]" />
                    <span className="font-medium text-slate-700">{course}</span>
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Event Leadership" hint="Assign the people responsible for this event." icon={UserCheck}>
            <Field label="Faculty Incharge" icon={UserCheck} hint="Separate multiple with a comma. Include ERPs."><input type="text" value={form.facultyIncharge} onChange={(e) => setField('facultyIncharge', e.target.value)} placeholder="e.g. Dr. A. Sharma (EMP123)" disabled={submitting} className={INPUT_WITH_ICON} /></Field>
            <Field label="Club Leads" icon={ShieldCheck} hint="Separate multiple with a comma. Include ERPs."><input type="text" value={form.clubLeads} onChange={(e) => setField('clubLeads', e.target.value)} placeholder="e.g. Rahul (ERP2024001)" disabled={submitting} className={INPUT_WITH_ICON} /></Field>
            <Field label="Student Coordinators" icon={GraduationCap} hint="Separate multiple with a comma. Include ERPs."><input type="text" value={form.studentCoordinators} onChange={(e) => setField('studentCoordinators', e.target.value)} placeholder="e.g. Amit (ERP2024003)" disabled={submitting} className={INPUT_WITH_ICON} /></Field>
          </Section>

          <Section title="Media & Links" hint="Optional — upload banners and brochures." icon={ImageIcon}>
            
            <Field label="Banner Image" hint="Max 2MB">
              <div className="flex flex-col gap-2">
                <input type="url" value={form.banner_url} readOnly placeholder="No file uploaded yet" disabled={submitting || uploadingBanner} className={INPUT} />
                <label className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${uploadingBanner || submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploadingBanner ? 'Uploading…' : 'Upload Banner (Image)'}
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => handleFileUpload(e, 'banner')} disabled={submitting || uploadingBanner} className="hidden" />
                </label>
              </div>
            </Field>

            <Field label="Brochure Document" hint="PDF format recommended. Max 5MB">
              <div className="flex flex-col gap-2">
                <input type="url" value={form.brochure_url} readOnly placeholder="No file uploaded yet" disabled={submitting || uploadingBrochure} className={INPUT} />
                <label className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${uploadingBrochure || submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploadingBrochure ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {uploadingBrochure ? 'Uploading…' : 'Upload Brochure (PDF)'}
                  <input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'brochure')} disabled={submitting || uploadingBrochure} className="hidden" />
                </label>
              </div>
            </Field>

          </Section>

          <Section title="Extended Info" hint="Contacts, guidelines, and distinguished guests." icon={ScrollText}>
            <Field label="Contact Person" icon={UserRound}><input type="text" value={form.contact_person} onChange={(e) => setField('contact_person', e.target.value)} placeholder="Name · phone or email" disabled={submitting} className={INPUT_WITH_ICON} /></Field>
            <Field label="Rules & Guidelines"><textarea value={form.rules} onChange={(e) => setField('rules', e.target.value)} rows={3} placeholder="One rule per line. These will be shown to registrants." disabled={submitting} className={`${INPUT} resize-none`} /></Field>
            <Field label="Guest List" icon={Users2} hint="Press Enter or click Add to include a name.">
              <div className="flex gap-2">
                <input type="text" value={guestDraft} onChange={(e) => setGuestDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }} placeholder="e.g. Dr. A. Sharma" disabled={submitting} className={INPUT} />
                <button type="button" onClick={addGuest} disabled={submitting || !guestDraft.trim()} className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#0088cc] hover:text-[#0088cc] disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
              </div>
              {guests.length > 0 && (<ul className="mt-3 flex flex-wrap gap-2">{guests.map((name) => (<li key={name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs text-slate-700">{name}<button type="button" onClick={() => removeGuest(name)} disabled={submitting} className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3 w-3" /></button></li>))}</ul>)}
            </Field>
          </Section>
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting || uploadingBanner || uploadingBrochure} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button type="submit" form="event-create-form" disabled={submitting || uploadingBanner || uploadingBrochure} className="inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0077b3] disabled:opacity-70">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : (isEdit ? 'Update Event' : 'Create Draft')}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20 disabled:opacity-60';
const INPUT_WITH_ICON = `${INPUT} pl-9`;

function Section({ title, hint, icon: Icon, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <header className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
        {hint && <span className="text-xs text-slate-400">— {hint}</span>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}{required && <span className="ml-0.5 text-red-500">*</span>}</span>
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        {children}
      </span>
    </label>
  );
}