"use client";

import { PropsWithChildren } from "react";
import AppSidebar from "./app-sidebar";

/** Page composition stays deliberately shallow; AppSidebar owns navigation. */
export default function NavigationLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen w-screen flex-col lg:h-screen lg:flex-row">
      <AppSidebar />
      <main className="bg-canvas border-border flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
        {children}
      </main>
    </div>
  );
}
