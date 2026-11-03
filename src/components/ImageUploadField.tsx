'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { fileToBase64Image } from '@/lib/image-compressor';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (base64OrUrl: string) => void;
  primaryColor?: string;
  companyName?: string;
  helperText?: string;
  maxDimension?: number;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  primaryColor = '#e11d48',
  companyName = 'Empresa',
  helperText = 'Sube una imagen desde tu celular o computadora (se convertirá en Base64 para guardarse sin archivos externos).',
  maxDimension = 512,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setProcessing(true);
    try {
      // Comprime y convierte a Base64 ligero (máximo 512x512 para logos/íconos nítidos y ultra livianos)
      const base64 = await fileToBase64Image(file, maxDimension, 0.88);
      onChange(base64);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la imagen seleccionada');
    } finally {
      setProcessing(false);
      // Reset input para permitir subir el mismo archivo si se desea
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasImage = Boolean(value && value.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
        {label}
      </label>

      {/* Caja de subida interactiva */}
      <div
        style={{
          border: hasImage ? '1.5px solid #cbd5e1' : '2px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '14px 16px',
          background: hasImage ? '#ffffff' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Vista previa o placeholder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              background: hasImage ? '#ffffff' : primaryColor,
              border: hasImage ? '1px solid #e2e8f0' : 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {hasImage ? (
              <img
                src={value}
                alt="Vista previa"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
              />
            ) : (
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.25rem' }}>
                {(companyName || 'EM').substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
              {hasImage ? 'Logo cargado con éxito' : 'Sin logo personalizado'}
            </div>
            <div
              className="truncate"
              style={{
                fontSize: '0.74rem',
                color: '#64748b',
                marginTop: 2,
                maxWidth: 240,
              }}
            >
              {hasImage
                ? value.startsWith('data:')
                  ? 'Imagen en Base64 lista para guardar'
                  : value
                : 'Se mostrarán las iniciales en el login'}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            disabled={processing}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-primary, #e11d48)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {processing ? (
              <>
                <Loader2 size={14} className="spin-icon" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>{hasImage ? 'Cambiar Foto' : 'Subir Imagen'}</span>
              </>
            )}
          </button>

          {hasImage && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-ghost"
              title="Quitar logo y usar iniciales"
              style={{
                padding: '8px',
                borderRadius: '10px',
                color: '#ef4444',
                background: '#fef2f2',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
          {error}
        </span>
      )}

      {/* Botón para alternar campo de URL manual si el usuario lo prefiere */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          {helperText}
        </span>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          style={{
            fontSize: '0.72rem',
            color: '#6366f1',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          {showUrlInput ? 'Ocultar URL' : 'O pegar enlace HTTPS'}
        </button>
      </div>

      {showUrlInput && (
        <input
          type="url"
          className="form-input"
          placeholder="https://ejemplo.com/logo.png"
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: '0.8rem', marginTop: 4 }}
        />
      )}
    </div>
  );
}

