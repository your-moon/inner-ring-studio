// A deep module for the per-key localStorage persistence repeated across the
// app (frecency, query history, saved views, sort order, column widths, …).
// It hides the four things every one of those sites re-implemented: the SSR
// guard, JSON (de)serialization, error-swallowing (quota / disabled storage /
// malformed data), and the `pmsql.` key namespace. Callers learn four small
// methods and get all of it for free.
//
// The value is typed `T` and JSON round-tripped, so this is a *scoped typed
// store*, not a raw string get/set — that's where the depth is.

export interface ScopedStore<T> {
  /** Current value, or `fallback` if unset / unreadable / malformed. */
  read(): T;
  /** Persist `value`. No-op (never throws) if storage is unavailable. */
  write(value: T): void;
  /** Read-modify-write in one call. */
  update(fn: (prev: T) => T): void;
  /** Remove the key. */
  clear(): void;
}

/** A store bound to `pmsql.<name>` holding a JSON-serializable `T`. */
export function scopedStore<T>(name: string, fallback: T): ScopedStore<T> {
  const key = `pmsql.${name}`;

  const read = (): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  };

  const write = (value: T): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / disabled storage */
    }
  };

  return {
    read,
    write,
    update: (fn) => write(fn(read())),
    clear: () => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
