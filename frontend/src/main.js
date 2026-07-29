import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './providers/theme-provider';
import { router } from './routes';
import { store } from './store';
import './styles/globals.css';
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found. Ensure index.html has <div id="root"></div>.');
}
ReactDOM.createRoot(rootElement).render(_jsx(React.StrictMode, { children: _jsx(Provider, { store: store, children: _jsx(ThemeProvider, { defaultTheme: "light", storageKey: "shranix-theme", children: _jsx(AuthProvider, { children: _jsx(RouterProvider, { router: router }) }) }) }) }));
//# sourceMappingURL=main.js.map