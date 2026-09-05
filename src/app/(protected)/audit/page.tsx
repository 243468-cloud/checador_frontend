'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Play,
  Square,
  Download,
  Search,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AuditEntry {
  id: number;
  performedBy?: { fullName: string; role: string };
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  ipAddress: string;
  branch?: { name: string };
  createdAt: string;
}

interface Page { content: AuditEntry[]; totalElements: number; totalPages: number; number: number; }

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN:    <Lock size={12} />,
  CREATE:   <Plus size={12} />,
  UPDATE:   <Edit2 size={12} />,
  DELETE:   <Trash2 size={12} />,
  TOGGLE:   <RefreshCw size={12} />,
  CHECKIN:  <Play size={12} />,
  CHECKOUT: <Square size={12} />,
  EXPORT:   <Download size={12} />,
};

export default function AuditPage() {
  const [page, setPage] = useState<Page | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (p: number) => {
    setLoading(true);
    apiFetch<Page>(`/api/audit?page=${p}&size=25`)
      .then(setPage)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(currentPage); }, [currentPage]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Auditoría del Sistema</h1>
            <p className="page-subtitle">{page?.totalElements ?? 0} eventos registrados</p>
          </div>
          <span className="badge badge-info flex items-center gap-1">
            <Shield size={12} />
            <span>Solo lectura</span>
          </span>
        </div>

        <div className="card">
          {loading ? (
            <div className="skeleton" style={{ height: 400 }} />
          ) : !page || page.content.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={40} /></div>
              <p>No hay eventos en el registro</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Acción</th>
                      <th>Realizado por</th>
                      <th>Sucursal</th>
                      <th>Entidad</th>
                      <th>Detalles</th>
                      <th>IP</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.content.map(entry => (
                      <tr key={entry.id}>
                        <td>
                          <span className="badge badge-primary flex items-center gap-1">
                            {ACTION_ICONS[entry.action] || null}
                            <span>{entry.action}</span>
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{entry.performedBy?.fullName || '—'}</div>
                          {entry.performedBy && <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>{entry.performedBy.role}</div>}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{entry.branch?.name || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {entry.entityType && <span className="badge badge-muted">{entry.entityType} #{entry.entityId}</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.details || '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-faint)' }}>{entry.ipAddress || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{fmt(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {page.totalPages > 1 && (
                <div className="flex items-center justify-between" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Página {page.number + 1} de {page.totalPages} · {page.totalElements} registros
                  </span>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm flex items-center gap-1" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <button className="btn btn-ghost btn-sm flex items-center gap-1" disabled={currentPage >= page.totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
