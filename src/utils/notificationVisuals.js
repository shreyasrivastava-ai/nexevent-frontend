// src/utils/notificationVisuals.js
import { Bell, CheckCircle2, XCircle, UserPlus, ShieldCheck } from 'lucide-react';

const VISUALS = {
  event_approved:         { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  event_rejected:         { Icon: XCircle,      tone: 'bg-red-50 text-red-600' },
  registration_confirmed: { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  coordinator_promoted:   { Icon: ShieldCheck,  tone: 'bg-cyan-50 text-[#0088cc]' },
  new_registration:       { Icon: UserPlus,     tone: 'bg-sky-50 text-sky-600' },
  default:                { Icon: Bell,         tone: 'bg-slate-100 text-slate-600' },
};

/**
 * Resolve a notification type to its icon component + Tailwind tone classes.
 * @param {string} type
 * @returns {{ Icon: import('lucide-react').LucideIcon, tone: string }}
 */
export function notificationVisual(type) {
  return VISUALS[type] ?? VISUALS.default;
}