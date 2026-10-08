import type { Metadata } from 'next';
import { product } from '@/lib/config';
import './globals.css';
export const metadata: Metadata = {
  title: { default: product.name, template: `%s · ${product.name}` },
  description: 'An organized prospect workspace for digital agencies.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
