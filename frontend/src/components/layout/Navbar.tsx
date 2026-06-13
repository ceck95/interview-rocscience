import { NavLink } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/jobs/submit', label: 'Submit Job' },
  { to: '/billing', label: 'Billing' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-900">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <NavLink to="/jobs" className="flex items-center gap-2 text-white">
          <Cloud className="h-5 w-5 text-blue-400" />
          <span className="font-semibold tracking-tight">Cloud Job Runner</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/jobs'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
