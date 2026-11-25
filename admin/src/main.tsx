import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AdminShell } from '@/components/layout/AdminShell';
import { ToasterProvider } from '@/components/ui/toaster';
import { I18nProvider } from '@/lib/i18n';
import { LoginPage } from '@/pages/LoginPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// Placeholder targets; replaced by the real pages in plan 03-08.
const placeholder = (name: string) => <h2 className="text-xl font-bold">{name}</h2>;

function AuthGate() {
  const { user } = useAuth();
  if (!user) {
    return <LoginPage />;
  }
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Navigate to="verses" replace />} />
        <Route path="verses" element={placeholder('verses')} />
        <Route path="names" element={placeholder('names')} />
        <Route path="blessings" element={placeholder('blessings')} />
        <Route path="suggestions" element={placeholder('suggestions')} />
        <Route path="audit-log" element={placeholder('audit-log')} />
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
