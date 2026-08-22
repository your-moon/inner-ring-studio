/** @jest-environment node */
import { syncVault, type VaultSyncPorts } from "./vault-sync";
import type { MergeableVault } from "./vault-merge";

const conn = (id: string, updatedAt: number) => ({ id, updatedAt });

// A fake git-vault: in-memory local + remote, push may be scripted to fail.
function fakePorts(opts: {
  local: MergeableVault;
  remote: MergeableVault | null;
  pushFailsTimes?: number;
}) {
  const state = {
    written: null as Required<MergeableVault> | null,
    fetches: 0,
    pushes: 0,
    pushFailsLeft: opts.pushFailsTimes ?? 0,
  };
  const ports: VaultSyncPorts = {
    fetch: () => {
      state.fetches++;
      return true;
    },
    readLocal: () => state.written ?? opts.local,
    readRemote: () => opts.remote,
    writeMerged: (m) => {
      state.written = m;
    },
    push: () => {
      state.pushes++;
      if (state.pushFailsLeft > 0) {
        state.pushFailsLeft--;
        return false;
      }
      return true;
    },
  };
  return { ports, state };
}

describe("syncVault orchestration", () => {
  test("no remote: writes local and pushes (no merge)", () => {
    const { ports, state } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: null,
    });
    const r = syncVault(ports);
    expect(r).toMatchObject({ merged: false, pushed: true, attempts: 1 });
    expect(state.written!.connections.map((c) => c.id)).toEqual(["a"]);
  });

  test("merges the remote in before pushing", () => {
    const { ports, state } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: { connections: [conn("b", 1)], tombstones: [] },
    });
    const r = syncVault(ports);
    expect(r.merged).toBe(true);
    expect(r.pushed).toBe(true);
    expect(state.written!.connections.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  test("retries the merge when the push is rejected (remote moved)", () => {
    const { ports, state } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: { connections: [conn("b", 1)], tombstones: [] },
      pushFailsTimes: 1,
    });
    const r = syncVault(ports);
    expect(r).toMatchObject({ pushed: true, attempts: 2 });
    expect(state.pushes).toBe(2);
    expect(state.fetches).toBe(2); // re-fetched before the retry
  });

  test("gives up after maxAttempts if the push keeps failing", () => {
    const { ports, state } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: null,
      pushFailsTimes: 99,
    });
    const r = syncVault(ports, 3);
    expect(r).toMatchObject({ pushed: false, attempts: 3 });
    expect(state.pushes).toBe(3);
  });

  test("changed=true when the remote brings a new/different connection", () => {
    const { ports } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: { connections: [conn("b", 1)], tombstones: [] },
    });
    expect(syncVault(ports).changed).toBe(true);
  });

  test("changed=false when the remote matches local (no-op merge)", () => {
    const { ports } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: { connections: [conn("a", 1)], tombstones: [] },
    });
    expect(syncVault(ports).changed).toBe(false);
  });

  test("changed still reflects the original diff across a push retry", () => {
    const { ports } = fakePorts({
      local: { connections: [conn("a", 1)], tombstones: [] },
      remote: { connections: [conn("b", 1)], tombstones: [] },
      pushFailsTimes: 1,
    });
    expect(syncVault(ports)).toMatchObject({ pushed: true, attempts: 2, changed: true });
  });
});
