import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escola Estadual Prof. Fabio Fanucchi | Sistema de Tutoria',
  description: 'Sistema de apoio presencial de tutoria da Escola Estadual Prof. Fabio Fanucchi',
  icons: {
    icon: '/favicon.jpg',
    shortcut: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
