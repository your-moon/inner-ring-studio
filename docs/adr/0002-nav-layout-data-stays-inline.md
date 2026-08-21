# ADR 0002 — nav-layout data domains stay inline until a second consumer appears

Status: Accepted (2026-08-21)

## Context

`src/app/(main)/nav-layout.tsx` (~405 lines) owns three unrelated data domains
inline — the auth/`me` SWR, the cloud-link SWR plus its 2s polling loop, and the
vault-connections SWR plus its CRUD and delete-confirm — alongside folder-group
derivation and all the layout JSX. An architecture review flagged this as
*Divergent Change* (one file edited for several unrelated reasons) and suggested
extracting per-domain hooks (`useCloudLink`, `useVaultConnections`).

The review itself noted the honest caveat: each extracted hook would have a
**single caller** (nav-layout). So the change buys locality/navigability, but no
**leverage** — one implementation, one call site, nothing reused. By the "one
adapter = hypothetical seam, two = real" rule, this is a hypothetical seam.

## Decision

Leave the three data domains inline in `nav-layout.tsx` for now. Do not extract
single-caller hooks purely to reduce the file's reasons-to-change.

## Consequences

- `nav-layout.tsx` stays the one place these three nav data-domains live.
- **The trigger to revisit:** when a *second* consumer of any of these domains
  appears — another view needs cloud-link status, or the vault-connections list,
  or the `me` context — extract *that* domain into a hook at that point. Two
  callers make the seam real and the extraction pay for itself.
- If the file grows unwieldy for reasons beyond these three domains (e.g. the
  layout JSX itself sprawls), that's a separate, layout-only refactor and not
  blocked by this decision.
