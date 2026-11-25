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

export function AdminShell() {
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
      className="flex min-h-screen flex-col bg-background text-foreground md:flex-row"
    >
      <aside className="border-border bg-card md:w-64 md:shrink-0 md:border-e">
        <div className="p-4 text-start">
          <h1 className="text-lg font-bold">{t.appName}</h1>
          <p className="text-sm text-muted-foreground">{t.appSubtitle}</p>
        </div>
        <nav className="flex flex-col gap-1 px-2 pb-4" aria-label={t.appName}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center justify-between gap-2 border-s-4 px-3 text-start text-sm font-bold transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
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
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background ps-4 pe-4 py-2">
          <Badge variant="secondary" data-testid="content-version">
            {t.nav.contentVersion} {formatNumber(version.data?.adminContentVersion ?? 0)}
          </Badge>
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {t.nav.switchLanguage}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await logout();
                  queryClient.clear();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
                }
              }}
            >
              <LogOut aria-hidden="true" />
              {t.nav.signOut}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 text-start">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
