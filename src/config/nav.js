// src/config/nav.js
import { LayoutDashboard, ListChecks, Compass, Bell, User } from 'lucide-react';

export const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    icon: LayoutDashboard,
    roles: ['SUPER_DEAN'],
  },
  {
    to: '/faculty/dashboard',
    label: 'Faculty Home',
    shortLabel: 'Home',
    icon: LayoutDashboard,
    roles: ['FACULTY', 'CLUB_LEAD'],
  },
  {
    to: '/events/manage',
    label: 'My Events',
    shortLabel: 'Events',
    icon: ListChecks,
    roles: ['FACULTY', 'CLUB_LEAD', 'STUDENT_COORDINATOR'],
  },
  {
    to: '/events/discover',
    label: 'Discover',
    shortLabel: 'Discover',
    icon: Compass,
    roles: ['STUDENT', 'CLUB_LEAD', 'STUDENT_COORDINATOR'],
  },
  {
    to: '/notifications',
    label: 'Notifications',
    shortLabel: 'Alerts',
    icon: Bell,
    roles: ['SUPER_DEAN', 'FACULTY', 'CLUB_LEAD', 'STUDENT_COORDINATOR', 'STUDENT'],
    showBadge: true,
  },
  {
    to: '/profile',
    label: 'Profile',
    shortLabel: 'Profile',
    icon: User,
    roles: ['SUPER_DEAN', 'FACULTY', 'CLUB_LEAD', 'STUDENT_COORDINATOR', 'STUDENT'],
  },
];

export const navForRole = (role) =>
  NAV_ITEMS.filter((item) => item.roles.includes(role));