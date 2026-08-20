"use client";

// Replaces Next's opaque "a client-side exception has occurred" with the actual
// error message + stack, so a crash is diagnosable instead of a dead end. Also
// forwards the details to the desktop's main process (if the preload bridge is
// present) so they land in a log file.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const payload = {
      message: error?.message,
      stack: error?.stack,
      digest: error?.digest,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    // eslint-disable-next-line no-console
    console.error("[global-error]", payload);
    try {
      (
        window as unknown as {
          irsDesktop?: { reportError?: (p: unknown) => void };
        }
      ).irsDesktop?.reportError?.(payload);
    } catch {
      /* not desktop */
    }
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          background: "#0e0e0c",
          color: "#f4f1ea",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 760, width: "100%" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "#FFEB02",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                color: "#111",
              }}
            >
              !
            </span>
            <strong style={{ fontSize: 15 }}>Something broke</strong>
          </div>

          <p style={{ color: "#a8a49a", fontSize: 13, marginTop: 0 }}>
            The interface hit an error. Here is the actual message, copy it if you
            want me to fix it.
          </p>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#1a1a17",
              border: "1px solid #2a2a26",
              borderRadius: 10,
              padding: 16,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "#ffd7d1",
              maxHeight: 360,
              overflow: "auto",
            }}
          >
            {error?.message || "Unknown error"}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
            {error?.stack ? `\n\n${error.stack}` : ""}
          </pre>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#FFEB02",
                color: "#16150a",
                border: 0,
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reload
            </button>
            <button
              onClick={() => {
                const text = `${error?.message ?? ""}\n${error?.digest ?? ""}\n${error?.stack ?? ""}`;
                navigator.clipboard?.writeText(text).catch(() => {});
              }}
              style={{
                background: "transparent",
                color: "#f4f1ea",
                border: "1px solid #2a2a26",
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Copy error
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
