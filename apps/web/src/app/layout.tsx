import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Policy Monitor',
  description: 'Monitor AI policy developments across entities and regulators',
};

const awarenessNavLinks = [
  { href: '/awareness/activities', label: 'Activities' },
  { href: '/awareness/positions', label: 'Positions' },
  { href: '/awareness/priorities', label: 'Priorities' },
];

const mainNavLinks = [
  { href: '/entities', label: 'Entities' },
  { href: '/runs', label: 'Runs' },
];

const settingsNavLinks = [
  { href: '/settings/templates', label: 'Query Templates' },
  { href: '/settings/profile', label: 'User Information' },
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
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            <div className="mb-1">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                Awareness
              </p>
              {awarenessNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                Data
              </p>
              {mainNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                Settings
              </p>
              {settingsNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-white/10">
              <Link
                href="/report"
                className="block rounded px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                Generate Briefing
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </body>
    </html>
  );
}
