import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autovion — AI Video Engine",
  description: "Crie vídeos virais com inteligência artificial",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>▶</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
