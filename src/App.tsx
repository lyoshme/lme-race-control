import { AlertTriangle } from 'lucide-react';
import { ToastProvider } from '@/components/toast/ToastContext';
import { RouterProvider, useRouter } from '@/router';
import { AuthProvider } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Landing } from '@/pages/Landing';
import { ChampionshipPublic } from '@/pages/ChampionshipPublic';
import { ChampionshipManage } from '@/pages/ChampionshipManage';
import { Account } from '@/pages/Account';
import { AdminPanel } from '@/pages/AdminPanel';
import { InviteAccept } from '@/pages/InviteAccept';
import { DriverProfile } from '@/pages/DriverProfile';
import { isSupabaseConfigured } from '@/lib/supabase';

function ConfigWarning() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-danger/10 border-b border-danger/30 text-danger text-xs px-4 py-2 flex items-center gap-2 justify-center">
      <AlertTriangle size={14} />
      <span>
        Supabase не настроен: проверь <code>.env</code> (скопируй из <code>.env.example</code>).
      </span>
    </div>
  );
}

function Router() {
  const { route, goHome } = useRouter();
  return (
    <div className="min-h-screen flex flex-col">
      <ConfigWarning />
      <Header goHome={goHome} current={route} />
      <main className="flex-1">
        {route.view === 'landing' && <Landing />}
        {route.view === 'account' && <Account />}
        {route.view === 'admin' && <AdminPanel />}
        {route.view === 'public' && (
          <ChampionshipPublic championshipId={route.championshipId} tab={route.tab} />
        )}
        {route.view === 'manage' && (
          <ChampionshipManage championshipId={route.championshipId} tab={route.tab} />
        )}
        {route.view === 'invite' && <InviteAccept inviteId={route.inviteId} />}
        {route.view === 'driverProfile' && (
          <DriverProfile championshipId={route.championshipId} driverId={route.driverId} />
        )}
      </main>
      <footer className="border-t border-ink-border py-6 text-center text-xs text-text-muted uppercase tracking-badge">
        LMERC © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider>
          <Router />
        </RouterProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
