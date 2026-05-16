import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Policy Monitor',
  description: 'Monitor AI policy developments across entities and regulators',
};

const navLinks = [
  { href: '/templates', label: 'Templates' },
  { href: '/entities', label: 'Entities' },
  { href: '/runs', label: 'Runs' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50 text-gray-900 antialiased">
        {/* Sidebar */}
        <aside className="flex w-52 flex-col bg-black text-white">
          <div className="border-b border-white/10 px-5 py-5">
            <span className="text-sm font-semibold tracking-wide text-white/80 uppercase">
              AI Policy
            </span>
            <p className="mt-0.5 text-xs text-white/40">Monitor</p>
          </div>
          <nav className="flex flex-col gap-1 px-3 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </body>
    </html>
  );
}
