import {useEffect, type ReactNode} from 'react';
import {Link, usePathname} from 'expo-router';
import {useDemo} from '../features/DemoProvider';
import {focusHeading} from '../lib/platform';
import {Icon} from './ui';
import {ThemeProvider, ThemeToggle} from './Appearance.web';
import '../theme/global.css';
export function AppFrame({children}: {children: ReactNode}) {
  return (
    <ThemeProvider>
      <Frame>{children}</Frame>
    </ThemeProvider>
  );
}
function Frame({children}: {children: ReactNode}) {
  const {demo, loading} = useDemo();
  const pathname = usePathname();
  useEffect(() => {
    focusHeading();
  }, [pathname]);
  const active = demo?.active;
  return (
    <div className="app-shell">
      <header>
        <div className="app-header">
          <Link
            href={active ? '/check-in' : '/'}
            className="wordmark"
            aria-label="Aura home">
            aura
          </Link>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              href="/about"
              className="icon-link"
              aria-label="About Aura and support">
              <Icon name="help" size={26} />
            </Link>
          </div>
        </div>
        <div className="demo-caption">
          <p className="text text-small text-muted">
            {loading
              ? 'A little space for you'
              : active
                ? 'Temporary demo · fictional starting moments'
                : 'A mood journal, one moment at a time'}
          </p>
        </div>
      </header>
      <main className={`app-main ${!active ? 'no-nav' : ''}`} id="main-content">
        {children}
      </main>
      {active && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {(
            [
              {href: '/check-in', label: 'Check-in', icon: 'checkin'},
              {href: '/moments', label: 'Moments', icon: 'moments'},
              {href: '/patterns', label: 'Patterns', icon: 'patterns'},
            ] as const
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={
                pathname.startsWith(item.href) ? 'page' : undefined
              }>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
