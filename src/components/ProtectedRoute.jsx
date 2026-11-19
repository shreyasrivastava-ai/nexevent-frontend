// src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * @param {string[]} allowedRoles - Roles permitted to access the nested routes.
 *                                  Pass `[]` or omit to allow any authenticated user.
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, role, requiresPasswordChange } = useAuth();
  const location = useLocation();

  // 1. Not logged in -> go to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in but MUST change password -> force redirect to Update Password
  if (requiresPasswordChange && location.pathname !== '/update-password') {
    return <Navigate to="/update-password" replace />;
  }

  // 3. Logged in, password is fine, but trying to access the Update Password page -> go home
  if (!requiresPasswordChange && location.pathname === '/update-password') {
    return <Navigate to="/" replace />;
  }

  // 4. Check if the user's role is allowed to access the route
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}