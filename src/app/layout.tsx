import { WEBSITE_NAME } from "@/const";
import type { Metadata } from "next";

import "./codemirror-override.css";
import "./globals.css";
// crisp design system — consumed directly from the linked crisp repo
// (vendor/crisp → ~/crisp/packages, wired via file: deps in package.json).
import "@seed-design/css/base.css";
import "@seed-design/css/recipes/action-button.css";
import "@seed-design/css/recipes/text-input.css";
import "@seed-design/css/recipes/menu.css";
import "@seed-design/css/recipes/menu-item.css";

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
