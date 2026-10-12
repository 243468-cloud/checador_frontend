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

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const encodedSlug = encodeURIComponent(slug);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  let appleIcon = "/icons/icon-192x192.png";

  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/settings/public/${encodedSlug}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.iconUrl) appleIcon = data.iconUrl;
        else if (data.logoUrl) appleIcon = data.logoUrl;
      }
    } catch {
      // Fallback
    }
  }

  return (
    <>
      <link rel="manifest" href={`/t/${encodedSlug}/manifest.webmanifest`} />
      <link rel="apple-touch-icon" href={appleIcon} />
      {children}
    </>
  );
}
