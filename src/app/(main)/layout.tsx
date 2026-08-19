import ClientOnly from "@/components/client-only";
import ThemeLayout from "../(theme)/theme_layout";

export default function LocalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeLayout>
      <ClientOnly>{children}</ClientOnly>
    </ThemeLayout>
  );
}
