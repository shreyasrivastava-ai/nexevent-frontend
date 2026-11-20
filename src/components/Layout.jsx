// src/components/Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NotificationProvider } from '../context/NotificationContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Desktop Sidebar (Hidden on Mobile) */}
        <Sidebar />

        {/* Mobile Drawer Overlay */}
        <div className="lg:hidden">
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
              isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`} 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          
          {/* Sliding Panel */}
          <div 
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar isMobile onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

          {/* Removed the pb-24 (which was making room for the old bottom nav) and added pb-8 for general spacing */}
          <main className="flex-1 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}