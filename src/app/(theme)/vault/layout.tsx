import ThemeLayout from "../theme_layout";

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeLayout>{children}</ThemeLayout>;
}
