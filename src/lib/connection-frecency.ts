// When a connection was last opened, tracked client-side — drives the home
// list's "2h ago" column and recency ordering. Same scopedStore discipline as
// table frecency; keyed once for all connections so one read serves the list.

import { scopedStore } from "./scoped-store";

type Store = Record<string, number>; // connection id -> last-opened epoch ms

const store = scopedStore<Store>("connectionOpens", {});

/** Record that a connection was opened (call when entering its studio). */
export function bumpConnection(id: string) {
  store.update((s) => ({ ...s, [id]: Date.now() }));
}

/** Last-opened time per connection id (absent = never opened here). */
export function connectionLastOpened(): Record<string, number> {
  return store.read();
}
