import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppBootstrap from '@/components/AppBootstrap';
import { router } from '@/router';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap>
      <RouterProvider router={router} />
    </AppBootstrap>
  </StrictMode>,
);
