import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { executeAdminGraphQL } from '@/lib/graphql';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const PENDING_SUGGESTIONS_KEY = ['adminSuggestions', 'pending'] as const;
export const CONTENT_VERSION_KEY = ['adminContentVersion'] as const;

function useIsMobile() {
  const query = '(max-width: 767px)';
  const get = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

export function AdminShell() {
  const isMobile = useIsMobile();
  const { t, lang, dir, formatNumber, toggleLang } = useI18n();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const version = useQuery({
    queryKey: CONTENT_VERSION_KEY,
    queryFn: () =>
      executeAdminGraphQL<{ adminContentVersion: number }>('query { adminContentVersion }'),
  });
  const pending = useQuery({
    queryKey: PENDING_SUGGESTIONS_KEY,
    queryFn: () =>
      executeAdminGraphQL<{ adminSuggestions: { id: string }[] }>(
        'query { adminSuggestions(status: "pending") { id } }',
      ),
  });

  const signOut = async () => {
    try {
      await logout();
      queryClient.clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
    }
  };

  const nav = [
    { to: '/verses', label: t.nav.verses },
    { to: '/names', label: t.nav.names },
    { to: '/blessings', label: t.nav.blessings },
    { to: '/suggestions', label: t.nav.suggestions, count: pending.data?.adminSuggestions.length ?? 0 },
    { to: '/audit-log', label: t.nav.auditLog },
  ];

  return (
    <div
      dir={dir}
      lang={lang}
      data-testid="admin-shell"
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground md:flex-row"
    >
      <aside className="shrink-0 border-b border-border bg-card md:w-64 md:overflow-y-auto md:border-b-0 md:border-e">
        <div className="hidden px-4 text-start md:block md:p-4">
          <h1 className="text-base font-bold md:text-lg">{t.appName}</h1>
          <p className="hidden text-sm text-muted-foreground md:block">{t.appSubtitle}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-4" aria-label={t.appName}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] shrink-0 items-center justify-between gap-2 whitespace-nowrap border-b-4 px-3 md:border-b-0 md:border-s-4 text-start text-sm font-bold transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive ? 'border-accent bg-secondary' : 'border-transparent',
                )
              }
            >
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <Badge variant="accent" data-testid="pending-count">
                  {formatNumber(item.count)}
                </Badge>
              ) : null}
            </NavLink>
          ))}
          {isMobile ? (
          <div className="ms-1 flex shrink-0 items-center gap-1 self-stretch border-s border-border ps-3">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs whitespace-nowrap">
              {t.nav.contentVersion} {formatNumber(version.data?.adminContentVersion ?? 0)}
            </Badge>
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {t.nav.switchLanguage}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label={t.nav.signOut}>
              <LogOut aria-hidden="true" />
            </Button>
          </div>
          ) : null}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col ">
        {!isMobile ? (
        <header className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-1.5 md:px-4 md:py-2">
          <Badge variant="secondary" data-testid="content-version" className="px-2 py-0.5 text-xs md:px-3 md:py-1 md:text-sm">
            {t.nav.contentVersion} {formatNumber(version.data?.adminContentVersion ?? 0)}
          </Badge>
          <div className="flex items-center gap-1 md:gap-2">
            <span dir="ltr" className="hidden text-sm text-muted-foreground md:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {t.nav.switchLanguage}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
            >
              <LogOut aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t.nav.signOut}</span>
            </Button>
          </div>
        </header>
        ) : null}
        <main className="min-h-0 flex-1 overflow-y-auto p-3 text-start md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
