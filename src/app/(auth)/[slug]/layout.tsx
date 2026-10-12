import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const encodedSlug = encodeURIComponent(slug);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  let companyName = "Checador";
  let iconUrl = "/icons/icon-192x192.png";

  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/settings/public/${encodedSlug}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.companyName) companyName = data.companyName;
        if (data.iconUrl) iconUrl = data.iconUrl;
        else if (data.logoUrl) iconUrl = data.logoUrl;
      }
    } catch {
      // Fallback silencioso si falla conexión
    }
  }

  return {
    title: companyName,
    manifest: `/t/${encodedSlug}/manifest.webmanifest`,
    icons: {
      apple: iconUrl,
      icon: iconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: companyName,
    },
  };
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
