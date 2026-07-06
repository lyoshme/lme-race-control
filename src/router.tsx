import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type PublicTab = 'overview' | 'drivers' | 'teams' | 'participants' | 'stages';
export type ManageTab = 'settings' | 'teams' | 'scoring' | 'standings' | 'stages' | 'editors' | 'seasons';

export type Route =
  | { view: 'landing' }
  | { view: 'account' }
  | { view: 'admin' }
  | { view: 'invite'; inviteId: string }
  | { view: 'public'; championshipId: string; tab: PublicTab }
  | { view: 'manage'; championshipId: string; tab: ManageTab }
  | { view: 'driverProfile'; championshipId: string; driverId: string };

interface RouterCtx {
  route: Route;
  goHome: () => void;
  goAccount: () => void;
  goAdmin: () => void;
  goInvite: (id: string) => void;
  goPublic: (id: string, tab?: PublicTab) => void;
  goManage: (id: string, tab?: ManageTab) => void;
  goDriverProfile: (championshipId: string, driverId: string) => void;
  setPublicTab: (tab: PublicTab) => void;
  setManageTab: (tab: ManageTab) => void;
}

const Ctx = createContext<RouterCtx | null>(null);

function parseHash(): Route {
  if (typeof window === 'undefined') return { view: 'landing' };
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { view: 'landing' };
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'account') return { view: 'account' };
  if (parts[0] === 'admin') return { view: 'admin' };
  if (parts[0] === 'invite' && parts[1]) return { view: 'invite', inviteId: parts[1] };
  if (parts[0] === 'championship' && parts[1] && parts[2] === 'driver' && parts[3]) {
    return { view: 'driverProfile', championshipId: parts[1], driverId: parts[3] };
  }
  if (parts[0] === 'championship' && parts[1]) {
    const id = parts[1];
    if (parts[2] === 'manage') {
      const tab = (parts[3] as ManageTab) || 'settings';
      return { view: 'manage', championshipId: id, tab };
    }
    const tab = (parts[2] as PublicTab) || 'overview';
    return { view: 'public', championshipId: id, tab };
  }
  return { view: 'landing' };
}

function buildHash(r: Route): string {
  if (r.view === 'landing') return '#/';
  if (r.view === 'account') return '#/account';
  if (r.view === 'admin') return '#/admin';
  if (r.view === 'invite') return `#/invite/${r.inviteId}`;
  if (r.view === 'driverProfile') return `#/championship/${r.championshipId}/driver/${r.driverId}`;
  if (r.view === 'public') return `#/championship/${r.championshipId}/${r.tab}`;
  return `#/championship/${r.championshipId}/manage/${r.tab}`;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = buildHash(r);
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const api = useMemo<RouterCtx>(
    () => ({
      route,
      goHome: () => navigate({ view: 'landing' }),
      goAccount: () => navigate({ view: 'account' }),
      goAdmin: () => navigate({ view: 'admin' }),
      goInvite: (id) => navigate({ view: 'invite', inviteId: id }),
      goPublic: (id, tab = 'overview') => navigate({ view: 'public', championshipId: id, tab }),
      goManage: (id, tab = 'settings') => navigate({ view: 'manage', championshipId: id, tab }),
      goDriverProfile: (championshipId, driverId) => navigate({ view: 'driverProfile', championshipId, driverId }),
      setPublicTab: (tab) => {
        if (route.view === 'public') navigate({ view: 'public', championshipId: route.championshipId, tab });
      },
      setManageTab: (tab) => {
        if (route.view === 'manage') navigate({ view: 'manage', championshipId: route.championshipId, tab });
      },
    }),
    [route, navigate],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRouter(): RouterCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRouter must be used within RouterProvider');
  return v;
}
