"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Si usas una URL base global configurada, úsala. Si no, usa esta:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface TenantSettings {
  companyName: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  toleranceMinutes: number;
}

interface ThemeContextType {
  settings: TenantSettings | null;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ settings: null, loading: true });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí puedes determinar el "slug" basado en el subdominio de la URL actual.
    // Por ahora, como ejemplo, forzaremos un slug "mi-empresa" o leeremos un env.
    const slug = process.env.NEXT_PUBLIC_TENANT_SLUG || "mi-empresa";

    axios.get(`${API_URL}/api/settings/public/${slug}`)
      .then((response) => {
        const data = response.data;
        setSettings(data);
        
        // Inyectar el color primario en CSS global
        if (data.primaryColor) {
          document.documentElement.style.setProperty("--color-primary", data.primaryColor);
          // Si usas un sistema de variables específico en globals.css (ej. Tailwind variables),
          // puedes inyectarlas aquí también.
        }

        if (data.companyName) {
          document.title = `${data.companyName} | Checador`;
        }
      })
      .catch((error) => {
        console.warn("No se pudo cargar la configuración de marca blanca", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, loading }}>
      {/* Si prefieres no mostrar nada hasta cargar el theme, puedes hacer un condicional aquí.
          Pero es mejor renderizar para evitar pantallas blancas. */}
      {children}
    </ThemeContext.Provider>
  );
}
