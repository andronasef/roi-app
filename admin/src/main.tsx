import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AdminShell } from '@/components/layout/AdminShell';
import { ToasterProvider } from '@/components/ui/toaster';
import { KIND_BY_ROUTE } from '@/lib/admin-api';
import { I18nProvider } from '@/lib/i18n';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { CatalogPage, ItemEditorRoute } from '@/pages/CatalogPage';
import { LoginPage } from '@/pages/LoginPage';
import { ModerationQueuePage } from '@/pages/ModerationQueuePage';
import { SuggestionReviewPage } from '@/pages/SuggestionReviewPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function AuthGate() {
  const { user } = useAuth();
  if (!user) {
    return <LoginPage />;
  }
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Navigate to="verses" replace />} />
        {Object.entries(KIND_BY_ROUTE).flatMap(([path, kind]) => [
          <Route key={path} path={path} element={<CatalogPage kind={kind} />} />,
          <Route key={`${path}/new`} path={`${path}/new`} element={<ItemEditorRoute kind={kind} />} />,
          <Route key={`${path}/:id`} path={`${path}/:id`} element={<ItemEditorRoute kind={kind} />} />,
        ])}
        <Route path="suggestions" element={<ModerationQueuePage />} />
        <Route path="suggestions/:id" element={<SuggestionReviewPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="*" element={<Navigate to="/verses" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ToasterProvider>
            <BrowserRouter basename="/admin">
              <AuthGate />
            </BrowserRouter>
          </ToasterProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
