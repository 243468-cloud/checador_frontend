'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle, Share, MoreVertical, PlusSquare } from 'lucide-react';

export default function InstallPwaCard() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar si la app ya está corriendo instalada (Standalone mode)
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }

    // Capturar evento nativo de instalación de Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="install-card-installed">
        <CheckCircle size={16} className="text-emerald-400" />
        <span>Aplicación Instalada en este dispositivo</span>
      </div>
    );
  }

  return (
    <>
      {/* CARD PRINCIPAL */}
      <div className="install-pwa-card">
        <div className="install-card-content">
          <div className="install-card-icon">
            <Smartphone size={22} color="#60a5fa" />
          </div>
          <div className="install-card-text">
            <h4>Instala la App en tu Celular</h4>
            <p>Accede con 1 solo toque desde tu pantalla de inicio sin usar navegador</p>
          </div>
        </div>

        <button
          type="button"
          className="install-card-btn"
          onClick={handleNativeInstall}
        >
          <Download size={15} />
          <span>{deferredPrompt ? 'Instalar Ahora' : 'Ver Instrucciones'}</span>
        </button>
      </div>

      {/* MODAL CON MANUAL PASO A PASO */}
      {showModal && (
        <div className="install-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="install-modal-content" onClick={e => e.stopPropagation()}>
            <div className="install-modal-header">
              <div className="flex items-center gap-2">
                <Smartphone size={20} color="#60a5fa" />
                <h3>Cómo instalar en tu Celular</h3>
              </div>
              <button
                type="button"
                className="install-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* PESTAÑAS DE NAVEGADOR */}
            <div className="install-tabs">
              <button
                type="button"
                className={`install-tab ${activeTab === 'android' ? 'active' : ''}`}
                onClick={() => setActiveTab('android')}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                className={`install-tab ${activeTab === 'ios' ? 'active' : ''}`}
                onClick={() => setActiveTab('ios')}
              >
                iPhone (Safari)
              </button>
            </div>

            {/* CONTENIDO PASO A PASO */}
            <div className="install-steps-body">
              {activeTab === 'android' ? (
                <div className="steps-list">
                  <div className="step-item">
                    <div className="step-number">1</div>
                    <div className="step-desc">
                      Abre este sitio en <strong>Google Chrome</strong> en tu celular.
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">2</div>
                    <div className="step-desc">
                      Toca el menú de los <strong>3 puntos verticales (⋮)</strong> en la esquina superior derecha.
                      <div className="step-subicon"><MoreVertical size={16} color="#60a5fa" /></div>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">3</div>
                    <div className="step-desc">
                      Selecciona <strong>"Agregar a la pantalla de inicio"</strong> o <strong>"Instalar aplicación"</strong>.
                      <div className="step-subicon"><Download size={16} color="#34d399" /></div>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">4</div>
                    <div className="step-desc">
                      Confirma tocando <strong>"Instalar"</strong>. ¡Listo! El acceso directo aparecerá en tu inicio.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="steps-list">
                  <div className="step-item">
                    <div className="step-number">1</div>
                    <div className="step-desc">
                      Abre este sitio en el navegador <strong>Safari</strong> en tu iPhone.
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">2</div>
                    <div className="step-desc">
                      Toca el botón de <strong>Compartir</strong> en la barra inferior.
                      <div className="step-subicon"><Share size={16} color="#60a5fa" /></div>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">3</div>
                    <div className="step-desc">
                      Desplázate hacia abajo y elige <strong>"Agregar al inicio"</strong>.
                      <div className="step-subicon"><PlusSquare size={16} color="#38bdf8" /></div>
                    </div>
                  </div>

                  <div className="step-item">
                    <div className="step-number">4</div>
                    <div className="step-desc">
                      Toca <strong>"Agregar"</strong> en la esquina superior derecha para finalizar.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="install-modal-footer">
              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setShowModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .install-pwa-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border: 1px solid rgba(96, 165, 250, 0.25);
          border-radius: 14px;
          padding: 14px 16px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          transition: transform 0.2s, border-color 0.2s;
        }

        .install-pwa-card:hover {
          border-color: rgba(96, 165, 250, 0.45);
          transform: translateY(-1px);
        }

        .install-card-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .install-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(96, 165, 250, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .install-card-text h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 2px 0;
        }

        .install-card-text p {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.3;
        }

        .install-card-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.2s;
        }

        .install-card-btn:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: scale(1.02);
        }

        .install-card-installed {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.78rem;
          color: #34d399;
          font-weight: 600;
          margin-top: 14px;
        }

        /* MODAL STYLES */
        .install-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(7, 11, 18, 0.85);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .install-modal-content {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          width: 100%;
          max-width: 440px;
          padding: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
          animation: slideUp 0.25s ease-out;
        }

        .install-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .install-modal-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .install-modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
        }

        .install-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 10px;
          gap: 4px;
          margin-bottom: 16px;
        }

        .install-tab {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .install-tab.active {
          background: #2563eb;
          color: #ffffff;
        }

        .steps-list {
          display: flex;
          flex-col;
          gap: 12px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 10px 12px;
          border-radius: 10px;
        }

        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(96, 165, 250, 0.2);
          color: #60a5fa;
          font-size: 0.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .step-desc {
          font-size: 0.8rem;
          color: #e2e8f0;
          line-height: 1.4;
        }

        .step-subicon {
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          vertical-align: middle;
        }

        .install-modal-footer {
          margin-top: 20px;
          text-align: right;
        }

        .btn-modal-done {
          background: #334155;
          color: #f8fafc;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
