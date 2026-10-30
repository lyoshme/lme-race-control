import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyInitialTheme } from './hooks/useTheme';
import { registerSW } from 'virtual:pwa-register';
import 'flag-icons/css/flag-icons.min.css';
import './index.css';

applyInitialTheme();

// Service worker: precache приложения + оффлайн-навигация (PWA).
// autoUpdate — новая версия SW активируется сразу, страница обновится
// на следующем визите.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
