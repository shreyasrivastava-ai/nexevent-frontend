// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login               from './pages/Login';
import SuperDeanDashboard  from './pages/SuperDeanDashboard';
import EventManagement     from './pages/EventManagement';
import EventRoster         from './pages/EventRoster';
import StudentDiscovery    from './pages/StudentDiscovery';
import Notifications       from './pages/Notifications';
import FacultyDashboard    from './pages/FacultyDashboard'; 
import ClubLeadDashboard   from './pages/ClubLeadDashboard';

// NEW IMPORTS
import Profile             from './pages/Profile';
import UpdatePassword      from './pages/UpdatePassword';
import ForgotPassword      from './pages/ForgotPassword';
import ResetPassword       from './pages/ResetPassword';

const DashboardRouter = () => {
  const { role } = useAuth();
  if (role === 'CLUB_LEAD') return <ClubLeadDashboard />;
  return <FacultyDashboard />;
};

const UnauthorizedPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-slate-700">
    <ShieldAlert className="mb-4 h-14 w-14 text-red-500" />
    <h1 className="text-2xl font-semibold">Access Denied</h1>
  </div>
);

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-slate-700">
    <ShieldAlert className="mb-4 h-14 w-14 text-slate-400" />
    <h1 className="text-2xl font-semibold">404 — Not Found</h1>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public Routes ─────────────────────────────────── */}
            <Route path="/login"             element={<Login />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/unauthorized"      element={<UnauthorizedPage />} />

            {/* ── Forced Password Change ────────────────────────── */}
            {/* Note: ProtectedRoute handles the redirection logic */}
            <Route element={<ProtectedRoute />}>
              <Route path="/update-password" element={<UpdatePassword />} />
            </Route>

            {/* ── SUPER_DEAN only ────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_DEAN']} />}>
              <Route element={<Layout />}>
                <Route path="/admin/dashboard" element={<SuperDeanDashboard />} />
              </Route>
            </Route>

            {/* ── FACULTY + CLUB_LEAD + STUDENT_COORDINATOR ──────── */}
            <Route element={<ProtectedRoute allowedRoles={['FACULTY', 'CLUB_LEAD', 'STUDENT_COORDINATOR']} />}>
              <Route element={<Layout />}>
                <Route path="/events/manage"      element={<EventManagement />} />
                <Route path="/faculty/dashboard"  element={<DashboardRouter />} /> 
                <Route path="/events/:id/roster"  element={<EventRoster />} />
              </Route>
            </Route>
            
            {/* ── STUDENT + CLUB_LEAD + STUDENT_COORDINATOR ──────── */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'CLUB_LEAD', 'STUDENT_COORDINATOR']} />}>
              <Route element={<Layout />}>
                <Route path="/events/discover" element={<StudentDiscovery />} />
              </Route>
            </Route>

            {/* ── Any authenticated user ─────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/profile"       element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>
            </Route>

            {/* ── Root & fallback ────────────────────────────────── */}
            <Route path="/"  element={<Navigate to="/login" replace />} />
            <Route path="*"  element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}