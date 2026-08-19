import { Database } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { DatabaseSchemas } from "@/drivers/base-driver";
import { useBoardContext } from "./board-provider";

/**
 * Picks which connection (source) a chart's query runs against, and loads that
 * source's schema for SQL autocomplete. Backed by the board's BoardSourceDriver
 * from context. Recreated for the Inner Ring fork (the original was Outerbase's).
 */
export default function BoardSourcePicker({
  value,
  onChange,
  onSchemaLoad,
}: {
  value?: string;
  usedSourceId?: string[];
  onChange: (sourceId: string) => void;
  onSchemaLoad: (loaded: { schema: DatabaseSchemas; selectedSchema?: string }) => void;
}) {
  const { sources } = useBoardContext();
  const list = sources?.sourceList() ?? [];
  const loadedFor = useRef<string | null>(null);

  // Default to the first source when none is selected.
  useEffect(() => {
    if (!value && list.length) onChange(list[0].id);
  }, [value, list, onChange]);

  // Load the schema whenever the selected source changes.
  useEffect(() => {
    if (!sources || !value || loadedFor.current === value) return;
    loadedFor.current = value;
    sources
      .schemas(value)
      .then((s) => onSchemaLoad(s))
      .catch(() => {});
  }, [sources, value, onSchemaLoad]);

  return (
    <div className="relative">
      <Database className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-400" size={15} />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-neutral-300 bg-white pr-3 pl-8 text-sm outline-none focus:border-[#e0cf00] dark:border-neutral-700 dark:bg-neutral-900"
      >
        {list.length === 0 && <option value="">No connections</option>}
        {list.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
