import type { Metadata } from "next";

import { FoundationsPreview } from "./preview";

export const metadata: Metadata = {
  title: "Foundations · PMSQL UI",
  description: "The visual and interaction foundations of the PMSQL UI kit.",
};

export default function FoundationsPage() {
  return <FoundationsPreview />;
}
