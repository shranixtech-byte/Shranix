import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './providers/preferences-provider';
import { ThemeProvider } from './providers/theme-provider';
import { router } from './routes';
import { store } from './store';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has a root div.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider defaultTheme="light" storageKey="shranix-theme">
        <PreferencesProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
