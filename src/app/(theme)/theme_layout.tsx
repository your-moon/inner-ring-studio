"use client";
import PageTracker from "@/components/page-tracker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ThemeProvider, useTheme } from "next-themes";
import Script from "next/script";
import { Fragment, PropsWithChildren, useEffect } from "react";

/**
 * The crisp design system's generated CSS scopes dark tokens by
 * `data-seed-color-mode`; next-themes only manages the `class` attribute.
 * Mirror the resolved theme onto the attribute so crisp components follow.
 */
function CrispColorModeBridge() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-seed-color-mode",
      resolvedTheme === "dark" ? "dark-only" : "light-only",
    );
  }, [resolvedTheme]);
  return null;
}

export default function ThemeLayout({
  children,
  overrideTheme,
  overrideThemeVariables,
}: PropsWithChildren<{
  overrideTheme?: "dark" | "light";
  overrideThemeVariables?: Record<string, string>;
}>) {
  useEffect(() => {
    if (overrideThemeVariables && typeof window === "undefined") {
      Object.entries(overrideThemeVariables).forEach(([key, value]) => {
        document.body.style.setProperty(key, value);
      });
    }
  }, [overrideThemeVariables]);

  return (
    <>
      <ThemeProvider
        forcedTheme={overrideTheme}
        defaultTheme="light"
        enableSystem={false}
        enableColorScheme
        attribute="class"
      >
        <CrispColorModeBridge />
        <TooltipProvider>
          <Fragment>{children}</Fragment>
        </TooltipProvider>
        <Toaster />
      </ThemeProvider>
      <PageTracker />
      <Script async defer src="https://buttons.github.io/buttons.js" />
    </>
  );
}
