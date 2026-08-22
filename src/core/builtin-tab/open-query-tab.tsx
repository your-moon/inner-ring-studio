import QueryWindow from "@/components/gui/tabs/query-tab";
import { generateId } from "@/lib/generate-id";
import { Binoculars } from "@phosphor-icons/react";
import { createTabExtension } from "../extension-tab";

let QUERY_COUNTER = 2;

/**
 * Keep auto-numbering of new unsaved queries above any tabs already restored
 * from a previous session, so a fresh ⌘T doesn't collide with a restored
 * "Query N" (whose SQL draft is keyed by that name).
 */
export function ensureQueryCounterAtLeast(n: number) {
  if (n > QUERY_COUNTER) QUERY_COUNTER = n;
}

export const builtinOpenQueryTab = createTabExtension<
  | {
      name?: string;
      /** Reuse a specific tab id (session restore) instead of a random one. */
      restoreId?: string;
      saved?: {
        namespaceName?: string;
        key: string;
        sql: string;
      };
    }
  | undefined
>({
  name: "query",
  key: (options) => {
    if (options?.saved) {
      return options.saved.key;
    }
    return options?.restoreId ?? generateId();
  },
  generate: (options) => {
    // An explicit `name` (session restore) is honored verbatim and does not
    // advance the counter; otherwise a fresh unsaved query auto-numbers.
    const title = options?.saved
      ? (options.name ?? "Query")
      : (options?.name ?? "Query " + (QUERY_COUNTER++).toString());

    const component = options?.saved ? (
      <QueryWindow
        initialName={title}
        initialCode={options.saved.sql}
        initialSavedKey={options.saved.key}
        initialNamespace={options.saved.namespaceName}
      />
    ) : (
      <QueryWindow initialName={title} />
    );

    return {
      title,
      component,
      icon: Binoculars,
    };
  },
});
