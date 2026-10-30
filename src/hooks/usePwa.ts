import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Стandalone-режим: приложение установлено (iOS Home Screen,         */
/* Android — display-mode: standalone). Понадобится и для push:       */
/* iOS разрешает запрос push-разрешения только внутри установленного  */
/* приложения.                                                        */
/* ------------------------------------------------------------------ */

let standaloneCache: boolean | null = null;

function computeStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}

export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(
    () => (standaloneCache = standaloneCache ?? computeStandalone()),
  );

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      standaloneCache = computeStandalone();
      setStandalone(standaloneCache);
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  return standalone;
}

/* ------------------------------------------------------------------ */
/* beforeinstallprompt: нативный диалог установки (Chrome/Edge).      */
/* iOS его не шлёт — там установка только вручную через «На экран      */
/* “Домой”».                                                          */
/* ------------------------------------------------------------------ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
  });
}

export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null);

  useEffect(() => {
    const notify = (available: boolean) => setCanInstall(available);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
  }, []);

  return { canInstall, promptInstall };
}
