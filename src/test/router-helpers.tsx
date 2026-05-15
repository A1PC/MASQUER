import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';

/**
 * Render a set of routes inside a memory router for tests.
 *
 *   renderWithRouter(
 *     [
 *       { path: '/login', element: <LoginPage /> },
 *       { path: '/lobby', element: <p>lobby</p> },
 *     ],
 *     { initialEntry: '/login' },
 *   );
 */
export function renderWithRouter(
  routes: RouteObject[],
  options: { initialEntry?: string } = {},
): ReturnType<typeof render> {
  const router = createMemoryRouter(routes, {
    initialEntries: [options.initialEntry ?? '/'],
  });
  return render(<RouterProvider router={router} />);
}
