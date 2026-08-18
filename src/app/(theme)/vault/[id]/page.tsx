import ClientOnly from "@/components/client-only";
import VaultStudioClient from "./page-client";

export default function VaultStudioPage() {
  return (
    <ClientOnly>
      <VaultStudioClient />
    </ClientOnly>
  );
}
