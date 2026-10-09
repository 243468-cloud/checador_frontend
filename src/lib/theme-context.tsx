"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Si usas una URL base global configurada, úsala. Si no, usa esta:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface TenantSettings {
  companyName: string;
  slug: string;
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
  toleranceMinutes: number;
  activeModules?: string[];
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
    // 1. Intentar leer el código de empresa (slug) de la URL (ej. ?empresa=kfc)
    const params = new URLSearchParams(window.location.search);
    let slug = params.get("empresa");

    // Si no está en la URL, intentar leerlo de memoria (si entraron antes)
    if (!slug) {
      slug = localStorage.getItem("tenantSlug");
    }

    const applySettings = (data: TenantSettings) => {
      setSettings(data);
      if (data.primaryColor) {
        document.documentElement.style.setProperty("--color-primary", data.primaryColor);
      }
      if (data.companyName) {
        document.title = `${data.companyName} | Checador`;
      }
      
      // Theming Dinámico: Inyección de favicon y Apple Touch Icon
      if (data.iconUrl) {
        let linkIcon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!linkIcon) {
          linkIcon = document.createElement("link");
          linkIcon.rel = "icon";
          document.head.appendChild(linkIcon);
        }
        linkIcon.href = data.iconUrl;

        let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (!appleIcon) {
          appleIcon = document.createElement("link");
          appleIcon.rel = "apple-touch-icon";
          document.head.appendChild(appleIcon);
        }
        appleIcon.href = data.iconUrl;

        // Inyección dinámica del Manifest PWA para este tenant
        let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
        if (!manifestLink) {
          manifestLink = document.createElement("link");
          manifestLink.rel = "manifest";
          document.head.appendChild(manifestLink);
        }
        const dynamicManifest = {
          name: data.companyName || "Checador PWA",
          short_name: data.companyName || "Checador",
          start_url: `/?empresa=${data.slug}`,
          display: "standalone",
          background_color: "#ffffff",
          theme_color: data.primaryColor || "#0f172a",
          icons: [
            {
              src: data.iconUrl,
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: data.iconUrl,
              sizes: "512x512",
              type: "image/png"
            }
          ]
        };
        const blob = new Blob([JSON.stringify(dynamicManifest)], { type: "application/json" });
        manifestLink.href = URL.createObjectURL(blob);
      }
    };

    if (slug) {
      // Guardarlo en memoria para futuras visitas
      localStorage.setItem("tenantSlug", slug);

      // Pedir la configuración pública
      axios.get(`${API_URL}/api/settings/public/${slug}`)
        .then((res) => applySettings(res.data))
        .catch(() => console.warn("No se encontró configuración pública para", slug))
        .finally(() => setLoading(false));

    } else {
      // Si no hay slug, intentar obtener la configuración privada del usuario ya logueado
      // Usamos el proxy para que inyecte automáticamente la cookie (JWT)
      axios.get('/api/proxy/settings/current')
        .then((res) => applySettings(res.data))
        .catch(() => {
          // Si falla (ej. no está logueado), no pasa nada, se queda el diseño genérico
          console.log("Cargando diseño genérico por defecto.");
        })
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
