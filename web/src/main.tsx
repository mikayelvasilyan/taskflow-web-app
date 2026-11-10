import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { ThemeProvider } from './hooks/useTheme';
import { BrandLockup } from './components/brand/Logo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <main className="grid min-h-dvh place-items-center">
        <BrandLockup />
      </main>
    </ThemeProvider>
  </StrictMode>,
);
