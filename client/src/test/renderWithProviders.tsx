import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '../offline/queryClient';
import { MemoryRouter } from 'react-router';

// Renders a component with the same providers as the real app,
// using an in-memory router so tests don't need a browser URL.
export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  // Same setup as the app (offline actions included), without retries
  const queryClient = createAppQueryClient({ retry: false });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

// Fake fetch response with a JSON body
export function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}
