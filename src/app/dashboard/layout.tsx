import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Dashboard — Checador de Asistencia',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
