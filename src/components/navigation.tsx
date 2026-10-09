'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Columns3,
  Upload,
  Settings,
  Search,
} from 'lucide-react';
const items = [
  ['/app', 'Dashboard', LayoutDashboard],
  ['/app/discover', 'Find businesses', Search],
  ['/app/prospects', 'Prospects', Users],
  ['/app/pipeline', 'Pipeline', Columns3],
  ['/app/import', 'CSV import', Upload],
  ['/app/settings', 'Settings', Settings],
] as const;
export function Navigation() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Workspace">
      {items.map(([href, name, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (href === '/app' ? path === href : path.startsWith(href))
              ? 'page'
              : undefined
          }
        >
          <Icon size={17} aria-hidden />
          {name}
        </Link>
      ))}
    </nav>
  );
}
