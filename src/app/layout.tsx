import { WEBSITE_NAME } from "@/const";
import type { Metadata } from "next";

import "./codemirror-override.css";
import "./globals.css";

const siteDescription = `${WEBSITE_NAME} is a fast, self-hosted database workspace — connect to your own PostgreSQL, browse and edit data in a grid, and run SQL, with connections stored in an encrypted vault.`;

import { DialogProvider } from "@/components/create-dialog";
import AuthGuard from "@/components/auth-guard";

export const metadata: Metadata = {
  title: WEBSITE_NAME,
  keywords: [
    "postgres",
    "postgresql",
    "database",
    "sql",
    "studio",
    "editor",
    "gui",
    "self-hosted",
    "client",
  ],
  description: siteDescription,
  openGraph: {
    siteName: WEBSITE_NAME,
    description: siteDescription,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthGuard>{children}</AuthGuard>
        <DialogProvider slot="default" />
      </body>
    </html>
  );
}
