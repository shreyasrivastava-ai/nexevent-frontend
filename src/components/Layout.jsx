// src/components/Layout.jsx
import { Outlet } from 'react-router-dom';
import { NotificationProvider } from '../context/NotificationContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          {/* pb-24 on mobile leaves room for the fixed bottom nav + safe area. */}
          <main className="flex-1 pb-24 lg:pb-0">
            <Outlet />
          </main>
        </div>

        <BottomNav />
      </div>
    </NotificationProvider>
  );
}