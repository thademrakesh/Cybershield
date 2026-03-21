import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import AlertPopup from './AlertPopup';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AlertPopup />
      <Sidebar />
      <div className="ml-64 p-8">
        {children}
      </div>
    </div>
  );
}
