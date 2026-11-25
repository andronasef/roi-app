import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { I18nProvider, type AdminLang } from '@/lib/i18n';

export type Handler = (variables: Record<string, any> | undefined) => unknown;
export interface RecordedRequest {
  query: string;
  variables?: Record<string, any>;
}

/** Stubs fetch: the first handler whose key appears in the GraphQL document answers (`{data}` or `{errors}`). */
export function mockGraphQL(handlers: Record<string, Handler>) {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const { query, variables } = JSON.parse(String(init.body)) as RecordedRequest;
      requests.push({ query, variables });
      const key = Object.keys(handlers).find((k) => query.includes(k));
      const body = key ? handlers[key]!(variables) : { errors: [{ message: 'unhandled' }] };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }),
  );
  return requests;
}

export const ok = (data: unknown) => ({ data });

export function renderAt(ui: ReactNode, path: string, route = '*', lang: AdminLang = 'en') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLang={lang}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

/** ProseMirror under jsdom needs these layout stubs (same as the editor suites). */
export function stubProseMirrorLayout() {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  document.elementFromPoint = () => null;
}
