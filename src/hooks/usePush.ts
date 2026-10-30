import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useStandalone } from './usePwa';
import { computePushSupport, isIOSDevice, urlBase64ToUint8Array } from '@/lib/webpush';
import * as api from '@/lib/api';
import type { PushKeys } from '@/types';

/** Состояние push для кнопки в панели колокола. */
export type PushStatus =
  | 'unsupported' // браузер вообще без Push API (или нет VAPID-ключа)
  | 'needs-install' // iOS: разрешение даётся только установленному PWA
  | 'denied'        // пользователь запретил уведомления на уровне сайта
  | 'off'           // всё готово, но push не включён
  | 'on';           // подписка активна

/**
 * Подписка на Web Push текущего аккаунта.
 *
 * Гейты (по сессионному плану):
 *  - только при активной сессии (вне сессии enable ничего не делает);
 *  - iOS/Safari — запрос разрешения только в установленном приложении;
 *  - ключ сервера: VITE_VAPID_PUBLIC_KEY (приватный живёт в Supabase).
 */
export function usePush() {
  const { session } = useAuth();
  const standalone = useStandalone();

  const supported = useMemo(() => computePushSupport(), []);
  const isIOS = useMemo(() => isIOSDevice(), []);
  const vapidKey = useMemo(
    () => import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined,
    [],
  );

  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(
    () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied',
  );

  useEffect(() => {
    if (!supported) return;
    let stale = false;
    void (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!stale) {
        setActiveEndpoint(sub?.endpoint ?? null);
      }
    })();
    return () => {
      stale = true;
    };
  }, [supported]);

  const status: PushStatus = useMemo(() => {
    if (!supported || !vapidKey) return 'unsupported';
    if (denied) return 'denied';
    if (isIOS && !standalone) return 'needs-install';
    if (activeEndpoint !== null) return 'on';
    return 'off';
  }, [supported, vapidKey, denied, isIOS, standalone, activeEndpoint]);

  /** Включить push из явного жеста пользователя. */
  const enable = useCallback(async () => {
    if (!session || busy || status === 'needs-install' || status === 'denied' || status === 'unsupported') {
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') setDenied(true);

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey as string),
      });

      const json = sub.toJSON() as { endpoint?: string; keys?: Partial<PushKeys> };
      const endpoint = json.endpoint;
      const keys: PushKeys | null =
        json.keys?.p256dh && json.keys?.auth
          ? { p256dh: json.keys.p256dh, auth: json.keys.auth }
          : null;
      if (!endpoint || !keys) throw new Error('Браузер вернул неполную подписку на push');

      await api.push.subscribe(session.user.id, endpoint, keys);
      setActiveEndpoint(endpoint);
    } finally {
      setBusy(false);
    }
  }, [session, busy, status, vapidKey]);

  /** Выключить push: отписка в браузере + удаление строки из БД. */
  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.push.unsubscribe(sub.endpoint);
      }
      setActiveEndpoint(null);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { status, busy, enable, disable };
}
