"use client";

import { PropsWithChildren } from "react";
import AppSidebar from "./app-sidebar";

/** Page composition stays deliberately shallow; AppSidebar owns navigation. */
export default function NavigationLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-sidebar flex min-h-screen w-screen flex-col lg:h-screen lg:flex-row">
      <AppSidebar />
      <main className="bg-surface-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:my-2 lg:mr-2 lg:rounded-[var(--radius-menu)] lg:shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]">
        {children}
      </main>
    </div>
  );
}
