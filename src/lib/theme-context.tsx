"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";

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
  const pathname = usePathname();

  const applySettings = useCallback((data: TenantSettings) => {
    setSettings(data);
    if (data.primaryColor) {
      document.documentElement.style.setProperty("--color-primary", data.primaryColor);
    }
    if (data.companyName) {
      document.title = `${data.companyName} | Checador`;
    }

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
  }, []);

  const loadSettings = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    let slug = params.get("empresa");

    if (!slug) {
      slug = localStorage.getItem("tenantSlug");
    }

    const hasStoredUser = !!localStorage.getItem("user");

    if (hasStoredUser) {
      // Si el usuario tiene sesión activa, consultar /api/proxy/settings/current
      // para obtener tanto el branding como activeModules
      axios.get('/api/proxy/settings/current')
        .then((res) => applySettings(res.data))
        .catch(() => {
          if (slug) {
            return axios.get(`${API_URL}/api/settings/public/${slug}`)
              .then((res) => applySettings(res.data))
              .catch(() => {});
          }
        })
        .finally(() => setLoading(false));
    } else if (slug) {
      localStorage.setItem("tenantSlug", slug);
      axios.get(`${API_URL}/api/settings/public/${slug}`)
        .then((res) => applySettings(res.data))
        .catch(() => console.warn("No se encontró configuración pública para", slug))
        .finally(() => setLoading(false));
    } else if (pathname && !pathname.endsWith('/login') && pathname !== '/register') {
      axios.get('/api/proxy/settings/current')
        .then((res) => applySettings(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [applySettings, pathname]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const handleAuthChanged = () => loadSettings();
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, [loadSettings]);

  return (
    <ThemeContext.Provider value={{ settings, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
