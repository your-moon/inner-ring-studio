"use client";

// Next remounts a route group's template on every navigation inside it — the
// hook for a route-level entrance without touching each page. One quiet rise,
// transform+opacity only (see .route-in; reduced-motion turns it off).
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-in">{children}</div>;
}
