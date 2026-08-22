import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";
import { useTheme } from "next-themes";
import { useMemo } from "react";

export default function useCodeEditorTheme({
  fontSize = 0.875,
}: {
  fontSize?: number;
}) {
  const { resolvedTheme, forcedTheme } = useTheme();

  return useMemo(() => {
    if ((forcedTheme ?? resolvedTheme) === "light") {
      return createTheme({
        theme: "light",
        settings: {
          background: "#FFFFFF",
          foreground: "#000000",
          caret: "#FBAC52",
          selection: "#FFD420",
          selectionMatch: "#FFD420",
          gutterBackground: "#fff",
          gutterForeground: "#4D4D4C",
          gutterBorder: "transparent",
          lineHighlight: "var(--accent)",
          fontSize: fontSize + "rem",
          fontFamily:
            'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
        },
        // VS Code Light+ palette — familiar and readable, replacing the old
        // garish set (hot-pink numbers, clashing blues).
        styles: [
          { tag: [t.meta, t.comment], color: "#008000" },
          { tag: [t.keyword, t.strong, t.standard(t.name)], color: "#0000ff" },
          { tag: [t.number], color: "#098658" },
          { tag: [t.string], color: "#a31515" },
          { tag: [t.variableName], color: "#001080" },
          { tag: [t.escape], color: "#a31515" },
          { tag: [t.tagName], color: "#267f99" },
          { tag: [t.heading], color: "#0000ff" },
          { tag: [t.quote], color: "#333333" },
          { tag: [t.list], color: "#0000ff" },
          { tag: [t.documentMeta], color: "#808080" },
          { tag: [t.function(t.variableName)], color: "#795e26" },
          { tag: [t.definition(t.typeName), t.typeName], color: "#267f99" },
        ],
      });
    } else {
      return createTheme({
        theme: "dark",
        settings: {
          background: "var(--background)",
          foreground: "#9cdcfe",
          caret: "#c6c6c6",
          selection: "#6199ff2f",
          selectionMatch: "#72a1ff59",
          lineHighlight: "var(--accent)",
          gutterBackground: "var(--background)",
          gutterForeground: "#838383",
          gutterActiveForeground: "#fff",
          fontSize: fontSize + "rem",
          fontFamily:
            'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
        },
        styles: [
          { tag: [t.number], color: "#fbc531" },
          { tag: [t.keyword, t.strong, t.standard(t.name)], color: "#3498db" },
          { tag: t.comment, color: "#27ae60" },
          { tag: t.definition(t.typeName), color: "#27ae60" },
          { tag: t.typeName, color: "#4ec9b0" },
          { tag: t.tagName, color: "#4ec9b0" },
          { tag: t.variableName, color: "#9cdcfe" },
          { tag: t.string, color: "#e67e22" },
        ],
      });
    }
  }, [resolvedTheme, forcedTheme, fontSize]);
}
