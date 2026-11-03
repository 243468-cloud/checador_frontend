'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { branchApi, settingsApi, Branch, TenantSettingsDTO } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import {
  Building2,
  Plus,
  MapPin,
  HelpCircle,
  X,
  Loader2,
  Copy,
  Check,
  Share2,
  Link2,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ImageUploadField from '@/components/ImageUploadField';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false });

export default function BranchesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperuser = user?.role === 'SUPERUSER';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tenants, setTenants] = useState<TenantSettingsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [shareBranch, setShareBranch] = useState<Branch | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('ALL');
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100',
    toleranceMinutes: '10',
    tenantId: '1',
    logoUrl: '',
    iconUrl: '',
    primaryColor: '#e11d48',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal dedicado para editar Logo / Color de Inicio de Sesión de una Sucursal/Matriz
  const [brandingBranch, setBrandingBranch] = useState<Branch | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    companyName: '',
    logoUrl: '',
    iconUrl: '',
    primaryColor: '#e11d48',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'SUPERUSER') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = () => {
    if (!isSuperuser) return;
    setLoading(true);
    Promise.all([
      branchApi.getAll().catch(() => []),
      settingsApi.getAllTenants().catch(() => []),
    ])
      .then(([bList, tList]) => {
        setBranches(bList);
        setTenants(tList.filter((t) => t.tenantId > 0));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isSuperuser) {
      load();
    }
  }, [isSuperuser]);

  if (!authLoading && user && user.role !== 'SUPERUSER') {
    return null;
  }

  const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://checador-frontend.vercel.app';
  };

  const getTenantForBranch = (b: Branch): TenantSettingsDTO | undefined => {
    const found = tenants.find((t) => t.tenantId === b.tenantId);
    if (found) return found;
    if (b.name.toLowerCase().includes('miel') || b.name.toLowerCase().includes('selva')) {
      return tenants.find((t) => t.slug === 'miel-de-la-selva-maya' || t.tenantId === 2);
    }
    return tenants.find((t) => t.tenantId === 1);
  };

  const getBranchSlug = (b: Branch) => {
    if (b.tenantSlug) return b.tenantSlug;
    const found = getTenantForBranch(b);
    if (found?.slug) return found.slug;
    if (b.name.toLowerCase().includes('miel') || b.name.toLowerCase().includes('selva')) {
      return 'miel-de-la-selva-maya';
    }
    return 'via-gourmet';
  };

  const getBranchCompanyName = (b: Branch) => {
    if (b.companyName && b.companyName !== 'Sin Empresa') return b.companyName;
    const found = getTenantForBranch(b);
    if (found?.companyName) return found.companyName;
    if (b.name.toLowerCase().includes('miel') || b.name.toLowerCase().includes('selva')) {
      return 'Miel de la Selva Maya';
    }
    return 'Via Gourmet';
  };

  const getBranchLogo = (b: Branch) => {
    const found = getTenantForBranch(b);
    return found?.logoUrl || found?.iconUrl || null;
  };

  const getBranchColor = (b: Branch) => {
    const found = getTenantForBranch(b);
    return found?.primaryColor || '#e11d48';
  };

  const getLoginLink = (b: Branch) => `${getOrigin()}/${getBranchSlug(b)}/login`;
  const getRegisterLink = (b: Branch) => `${getOrigin()}/${getBranchSlug(b)}/register`;

  const copyLink = async (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      // Fallback
    }
  };

  const shareViaWhatsApp = (b: Branch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const company = getBranchCompanyName(b);
    const loginUrl = getLoginLink(b);
    const registerUrl = getRegisterLink(b);
    const msg = `Hola, te comparto los enlaces de acceso del Checador para *${b.name}* (${company}):\n\n🔹 *Iniciar sesión:* ${loginUrl}\n🔹 *Registro de empleados:* ${registerUrl}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `Checador - ${b.name}`,
          text: msg,
          url: loginUrl,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const openBrandingModal = (b: Branch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const t = getTenantForBranch(b);
    setBrandingBranch(b);
    setBrandingForm({
      companyName: t?.companyName || getBranchCompanyName(b),
      logoUrl: t?.logoUrl || '',
      iconUrl: t?.iconUrl || '',
      primaryColor: t?.primaryColor || '#e11d48',
    });
    setBrandingError('');
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingBranch) return;
    setSavingBranding(true);
    setBrandingError('');
    try {
      const targetTenantId =
        brandingBranch.tenantId ||
        getTenantForBranch(brandingBranch)?.tenantId ||
        (brandingBranch.name.toLowerCase().includes('miel') ? 2 : 1);

      await settingsApi.updateTenantBranding(targetTenantId, {
        companyName: brandingForm.companyName.trim(),
        primaryColor: brandingForm.primaryColor,
        logoUrl: brandingForm.logoUrl.trim() || null,
        iconUrl: (brandingForm.iconUrl.trim() || brandingForm.logoUrl.trim()) || null,
      });
      setBrandingBranch(null);
      load();
    } catch (err: any) {
      setBrandingError(err.message || 'Error al guardar el logo y color');
    } finally {
      setSavingBranding(false);
    }
  };

  const openCreate = () => {
    if (!isSuperuser) return;
    setEditTarget(null);
    const defaultTenant =
      selectedTenantFilter !== 'ALL'
        ? selectedTenantFilter
        : tenants[0]?.tenantId
        ? String(tenants[0].tenantId)
        : '1';
    const selTenant = tenants.find((t) => String(t.tenantId) === defaultTenant);
    setForm({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radiusMeters: '100',
      toleranceMinutes: '10',
      tenantId: defaultTenant,
      logoUrl: selTenant?.logoUrl || '',
      iconUrl: selTenant?.iconUrl || '',
      primaryColor: selTenant?.primaryColor || '#e11d48',
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    if (!isSuperuser) return;
    const t = getTenantForBranch(b);
    setEditTarget(b);
    setForm({
      name: b.name,
      address: b.address || '',
      latitude: String(b.latitude),
      longitude: String(b.longitude),
      radiusMeters: String(b.radiusMeters),
      toleranceMinutes: String(b.toleranceMinutes),
      tenantId: String(b.tenantId || t?.tenantId || 1),
      logoUrl: t?.logoUrl || '',
      iconUrl: t?.iconUrl || '',
      primaryColor: t?.primaryColor || '#e11d48',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const effectiveTenantId = Number(form.tenantId) || 1;
    const data = {
      name: form.name,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radiusMeters: Number(form.radiusMeters),
      toleranceMinutes: Number(form.toleranceMinutes),
      tenantId: effectiveTenantId,
    };
    try {
      // Guardar también el logo y color del Login de la matriz seleccionada
      const currentTenant = tenants.find((t) => t.tenantId === effectiveTenantId);
      if (
        form.logoUrl.trim() !== (currentTenant?.logoUrl || '') ||
        form.iconUrl.trim() !== (currentTenant?.iconUrl || '') ||
        form.primaryColor !== (currentTenant?.primaryColor || '#e11d48')
      ) {
        await settingsApi.updateTenantBranding(effectiveTenantId, {
          companyName: currentTenant?.companyName || undefined,
          primaryColor: form.primaryColor,
          logoUrl: form.logoUrl.trim() || null,
          iconUrl: (form.iconUrl.trim() || form.logoUrl.trim()) || null,
        });
      }

      if (editTarget) {
        await branchApi.update(editTarget.id, data);
        setShowModal(false);
        load();
      } else {
        const created = await branchApi.create(data as any);
        setShowModal(false);
        load();
        setShareBranch(created);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editTarget || !confirm('¿Desactivar esta sucursal?')) return;
    await branchApi.delete(editTarget.id);
    setShowModal(false);
    load();
  };

  const uniqueCompanies = Array.from(
    new Map(
      branches.map((b) => [String(b.tenantId || 1), getBranchCompanyName(b)])
    ).entries()
  );

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getBranchCompanyName(b).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTenant =
      selectedTenantFilter === 'ALL' || String(b.tenantId || 1) === selectedTenantFilter;
    return matchesSearch && matchesTenant;
  });

  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Sucursales, Logos y Enlaces</h1>
            <p className="page-subtitle">
              {branches.length} sucursales activas · Edita sucursales, personaliza su logo de inicio de sesión y comparte su link
            </p>
          </div>
          {isSuperuser && (
            <button
              id="btn-new-branch"
              className="btn btn-primary"
              onClick={openCreate}
              style={{ padding: '12px 20px', borderRadius: '100px' }}
            >
              <Plus size={18} />
              <span>Nueva Sucursal</span>
            </button>
          )}
        </div>

        {/* Filtros por Matriz y Búsqueda */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar sucursal, matriz o dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: 44,
                borderRadius: 16,
                background: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8e8e93',
              }}
            >
              <Building2 size={18} />
            </div>
          </div>

          {uniqueCompanies.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedTenantFilter('ALL')}
                className={`btn ${selectedTenantFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: '100px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  background: selectedTenantFilter === 'ALL' ? undefined : '#ffffff',
                }}
              >
                Todas las Matrices ({branches.length})
              </button>
              {uniqueCompanies.map(([tId, cName]) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setSelectedTenantFilter(tId)}
                  className={`btn ${selectedTenantFilter === tId ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: '100px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    background: selectedTenantFilter === tId ? undefined : '#ffffff',
                  }}
                >
                  {cName} ({branches.filter((b) => String(b.tenantId || 1) === tId).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 220 }} />
              </div>
            ))}
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: 'transparent' }}>
              <Building2 size={40} color="#8e8e93" />
            </div>
            <p style={{ color: '#8e8e93' }}>No se encontraron sucursales.</p>
            {branches.length === 0 && isSuperuser && (
              <button className="btn btn-primary mt-4" onClick={openCreate}>
                Crear primera sucursal
              </button>
            )}
          </div>
        ) : (
          <div className="grid-3 stagger">
            {filteredBranches.map((b) => {
              const loginLink = getLoginLink(b);
              const companyName = getBranchCompanyName(b);
              const branchLogo = getBranchLogo(b);
              const branchColor = getBranchColor(b);
              const isCopied = copiedId === `branch-${b.id}`;
              return (
                <div
                  key={b.id}
                  className="card animate-slide-up"
                  style={{
                    cursor: isSuperuser ? 'pointer' : 'default',
                    transition: 'transform 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => openEdit(b)}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '14px',
                          background: branchLogo ? '#ffffff' : `${branchColor}18`,
                          border: branchLogo ? '1px solid #e2e8f0' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: branchColor,
                          overflow: 'hidden',
                        }}
                      >
                        {branchLogo ? (
                          <img
                            src={branchLogo}
                            alt={companyName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                          />
                        ) : (
                          <Building2 size={22} />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span
                          className="badge badge-primary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: `${branchColor}18`,
                            color: branchColor,
                          }}
                        >
                          Matriz: {companyName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => openBrandingModal(b, e)}
                          className="btn btn-ghost"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            borderRadius: '100px',
                            background: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Cambiar logo y color de inicio de sesión"
                        >
                          <ImageIcon size={12} />
                          <span>Cambiar Logo de Login</span>
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{b.name}</h3>
                    {b.address && (
                      <p
                        className="flex items-center gap-2"
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: 12,
                        }}
                      >
                        <MapPin size={13} />
                        <span>{b.address}</span>
                      </p>
                    )}

                    {/* Caja de Link Compartible */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '10px 12px',
                        marginTop: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        className="flex items-center gap-1"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#64748b',
                          marginBottom: 4,
                        }}
                      >
                        <Link2 size={12} />
                        <span>Link de acceso ({getBranchSlug(b)})</span>
                      </div>
                      <div
                        className="truncate"
                        style={{
                          fontSize: '0.76rem',
                          fontFamily: 'monospace',
                          color: '#334155',
                          marginBottom: 8,
                        }}
                        title={loginLink}
                      >
                        {loginLink}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(e) => copyLink(loginLink, `branch-${b.id}`, e)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: '0.76rem',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? '¡Copiado!' : 'Copiar Link'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={(e) => shareViaWhatsApp(b, e)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.76rem',
                            borderRadius: 8,
                            background: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                          title="Compartir por WhatsApp"
                        >
                          <Share2 size={14} />
                          <span>Compartir</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="divider" style={{ margin: '10px 0' }} />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                        fontSize: '0.78rem',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>
                          Radio GPS
                        </div>
                        <div style={{ fontWeight: 600 }}>{b.radiusMeters} m</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>
                          Tolerancia
                        </div>
                        <div style={{ fontWeight: 600 }}>{b.toleranceMinutes} min</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Dedicado: Personalizar Logo y Color de Inicio de Sesión */}
        {brandingBranch && (
          <div className="modal-overlay" onClick={() => setBrandingBranch(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: 520 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <Palette size={20} color="#e11d48" />
                  <span>Logo de Inicio de Sesión ({getBranchCompanyName(brandingBranch)})</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setBrandingBranch(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveBranding}>
                <div className="modal-body">
                  {/* Vista previa en vivo del Login */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                      VISTA PREVIA EN LOGIN ({getLoginLink(brandingBranch)})
                    </div>
                    <div
                      style={{
                        width: 68,
                        height: 68,
                        margin: '0 auto 10px',
                        borderRadius: 16,
                        background:
                          brandingForm.logoUrl || brandingForm.iconUrl
                            ? '#ffffff'
                            : brandingForm.primaryColor,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {brandingForm.logoUrl || brandingForm.iconUrl ? (
                        <img
                          src={brandingForm.logoUrl || brandingForm.iconUrl}
                          alt="Vista previa logo"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                        />
                      ) : (
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem' }}>
                          {(brandingForm.companyName || 'EM').substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                      {brandingForm.companyName || 'Nombre de la Empresa'}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Nombre que aparece al Iniciar Sesión *</label>
                    <input
                      className="form-input"
                      value={brandingForm.companyName}
                      onChange={(e) =>
                        setBrandingForm((p) => ({ ...p, companyName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <ImageUploadField
                    label="Logo de Inicio de Sesión"
                    value={brandingForm.logoUrl}
                    onChange={(val) => setBrandingForm((p) => ({ ...p, logoUrl: val }))}
                    primaryColor={brandingForm.primaryColor}
                    companyName={brandingForm.companyName}
                    helperText="Sube una foto desde tu celular o laptop para guardarla como logo en Base64."
                  />

                  <div className="form-group">
                    <label>Color Principal del Botón de Login</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandingForm.primaryColor}
                        onChange={(e) =>
                          setBrandingForm((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        style={{
                          width: 44,
                          height: 40,
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={brandingForm.primaryColor}
                        onChange={(e) =>
                          setBrandingForm((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {brandingError && <div className="alert alert-danger">{brandingError}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                    disabled={savingBranding}
                  >
                    {savingBranding ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Guardando Logo...
                      </>
                    ) : (
                      'Guardar Logo y Diseño de Login'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={() => setBrandingBranch(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Crear / Editar Sucursal */}
        {showModal && isSuperuser && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div
              className="modal-card"
              style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <Building2 size={20} color="#e11d48" />
                  <span>{editTarget ? 'Editar Sucursal y Logo' : 'Nueva Sucursal'}</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {!editTarget && tenants.length > 0 && (
                    <div className="form-group">
                      <label>Matriz / Empresa *</label>
                      <select
                        className="form-select"
                        value={form.tenantId}
                        onChange={(e) => {
                          const newTId = e.target.value;
                          const sel = tenants.find((t) => String(t.tenantId) === newTId);
                          setForm((p) => ({
                            ...p,
                            tenantId: newTId,
                            logoUrl: sel?.logoUrl || '',
                            iconUrl: sel?.iconUrl || '',
                            primaryColor: sel?.primaryColor || '#e11d48',
                          }));
                        }}
                        required
                      >
                        {tenants.map((t) => (
                          <option key={t.tenantId} value={t.tenantId}>
                            {t.companyName} (/{t.slug}/login)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Nombre de la Sucursal *</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Sucursal Norte"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Dirección</label>
                    <input
                      className="form-input"
                      placeholder="Dirección completa"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>

                  {/* Sección de Logo y Color de Inicio de Sesión directamente en el modal */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 14,
                      marginTop: 12,
                      marginBottom: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <ImageUploadField
                      label="Logo de la Matriz (Login de esta Sucursal)"
                      value={form.logoUrl}
                      onChange={(val) => setForm((p) => ({ ...p, logoUrl: val }))}
                      primaryColor={form.primaryColor}
                      companyName={form.name || 'Sucursal'}
                      helperText="Sube una foto desde celular o lap (se guardará en Base64)."
                    />

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Color de Login</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, primaryColor: e.target.value }))
                          }
                          style={{
                            width: 42,
                            height: 40,
                            borderRadius: 10,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={form.primaryColor}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, primaryColor: e.target.value }))
                          }
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group mt-4">
                    <label>Ubicación y Área Permitida *</label>
                    <LocationPickerMap
                      initialLat={Number(form.latitude) || 19.4326}
                      initialLng={Number(form.longitude) || -99.1332}
                      initialRadius={Number(form.radiusMeters) || 100}
                      onLocationChange={(lat, lng) =>
                        setForm((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }))
                      }
                      onRadiusChange={(radius) =>
                        setForm((p) => ({ ...p, radiusMeters: String(radius) }))
                      }
                    />
                  </div>
                  <div className="grid-2 mt-4">
                    <div className="form-group">
                      <label>Radio GPS (metros)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="10"
                        max="5000"
                        value={form.radiusMeters}
                        onChange={(e) => setForm((p) => ({ ...p, radiusMeters: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tolerancia (minutos)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        max="60"
                        value={form.toleranceMinutes}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, toleranceMinutes: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {editTarget && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                        Enlace de Acceso de esta Sucursal:
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: '#334155',
                          wordBreak: 'break-all',
                          marginBottom: 8,
                        }}
                      >
                        {getLoginLink(editTarget)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          onClick={() => copyLink(getLoginLink(editTarget), 'modal-copy')}
                        >
                          {copiedId === 'modal-copy' ? '¡Enlace copiado!' : 'Copiar Link'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            background: '#dcfce7',
                            color: '#15803d',
                          }}
                          onClick={() => shareViaWhatsApp(editTarget)}
                        >
                          Compartir por WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className="alert alert-info flex items-start gap-2"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <HelpCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Tip:</strong> Puedes obtener las coordenadas en el mapa o haciendo
                      clic en el botón de compartir en la tarjeta de la sucursal.
                    </span>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                  <button
                    type="submit"
                    id="btn-save-branch"
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin-icon" /> Guardando...
                      </>
                    ) : editTarget ? (
                      'Guardar Cambios'
                    ) : (
                      'Crear Sucursal y Obtener Link'
                    )}
                  </button>
                  {editTarget && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-full"
                      style={{ color: '#ff3b30' }}
                      onClick={handleDelete}
                    >
                      Cerrar / Desactivar Sucursal
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-full"
                    onClick={() => setShowModal(false)}
                    style={{ color: '#8e8e93' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Link Listo para Compartir al crear una nueva sucursal */}
        {shareBranch && (
          <div className="modal-overlay" onClick={() => setShareBranch(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: 500 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header-title">
                  <Check size={20} color="#16a34a" />
                  <span>¡Sucursal Creada con Éxito!</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px' }}
                  onClick={() => setShareBranch(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 16 }}>
                  La sucursal <strong>{shareBranch.name}</strong> ({getBranchCompanyName(shareBranch)})
                  ya está activa. Comparte estos enlaces con tu equipo:
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
                    Enlace de Inicio de Sesión:
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      wordBreak: 'break-all',
                      margin: '6px 0 10px',
                    }}
                  >
                    {getLoginLink(shareBranch)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-full flex items-center justify-center gap-2"
                    onClick={() => copyLink(getLoginLink(shareBranch), 'created-login')}
                  >
                    {copiedId === 'created-login' ? <Check size={16} /> : <Copy size={16} />}
                    <span>
                      {copiedId === 'created-login'
                        ? '¡Link de Login Copiado!'
                        : 'Copiar Link de Login'}
                    </span>
                  </button>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
                    Enlace de Registro para Nuevos Empleados:
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      wordBreak: 'break-all',
                      margin: '6px 0 10px',
                    }}
                  >
                    {getRegisterLink(shareBranch)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-full flex items-center justify-center gap-2"
                    style={{ border: '1px solid #cbd5e1' }}
                    onClick={() => copyLink(getRegisterLink(shareBranch), 'created-register')}
                  >
                    {copiedId === 'created-register' ? <Check size={16} /> : <Copy size={16} />}
                    <span>
                      {copiedId === 'created-register'
                        ? '¡Link de Registro Copiado!'
                        : 'Copiar Link de Registro'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="modal-footer" style={{ flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-full flex items-center justify-center gap-2"
                  style={{ background: '#16a34a', color: '#ffffff' }}
                  onClick={() => shareViaWhatsApp(shareBranch)}
                >
                  <Share2 size={16} />
                  <span>Compartir por WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  onClick={() => setShareBranch(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
