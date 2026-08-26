"use client";

import { PropsWithChildren } from "react";
import AppSidebar from "./app-sidebar";

/** Page composition stays deliberately shallow; AppSidebar owns navigation. */
export default function NavigationLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-surface-panel flex min-h-screen w-screen flex-col lg:h-screen lg:flex-row">
      <AppSidebar />
      <main className="bg-surface-panel border-border-subtle flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:border-l">
        {children}
      </main>
    </div>
  );
}
