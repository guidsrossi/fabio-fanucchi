import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escola Estadual Prof. Fabio Fanucchi | Plataforma de Tutoria',
  description: 'Plataforma de tutoria e acompanhamento da Escola Estadual Prof. Fabio Fanucchi',
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
