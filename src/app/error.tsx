"use client";

// Segment-level error boundary (keeps the root <html>). Shows the real error
// message + stack instead of a generic string, and logs it (captured by the
// desktop app's renderer-console logger).
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app-error]", {
      message: error?.message,
      stack: error?.stack,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <div style={{ maxWidth: 720, width: "100%" }}>
        <strong style={{ fontSize: 15 }}>Something broke on this screen</strong>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "var(--secondary, #f5f5f5)",
            border: "1px solid var(--border, #e5e5e5)",
            borderRadius: 10,
            padding: 16,
            fontSize: 12.5,
            lineHeight: 1.5,
            marginTop: 12,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          {error?.message || "Unknown error"}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          {error?.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 14,
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
          Try again
        </button>
      </div>
    </div>
  );
}
