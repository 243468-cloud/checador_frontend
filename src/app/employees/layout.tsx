import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = { title: 'Empleados — Checador' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-wrapper"><Sidebar /><main className="main-content">{children}</main></div>;
}
