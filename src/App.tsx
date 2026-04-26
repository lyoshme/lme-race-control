import { ToastProvider } from '@/components/toast/ToastContext';
import { RouterProvider, useRouter } from '@/router';
import { Header } from '@/components/layout/Header';
import { Landing } from '@/pages/Landing';
import { ChampionshipPublic } from '@/pages/ChampionshipPublic';
import { ChampionshipManage } from '@/pages/ChampionshipManage';

function Router() {
  const { route, goHome } = useRouter();
  return (
    <div className="min-h-screen flex flex-col">
      <Header goHome={goHome} current={route} />
      <main className="flex-1">
        {route.view === 'landing' && <Landing />}
        {route.view === 'public' && (
          <ChampionshipPublic championshipId={route.championshipId} tab={route.tab} />
        )}
        {route.view === 'manage' && (
          <ChampionshipManage championshipId={route.championshipId} tab={route.tab} />
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
      <RouterProvider>
        <Router />
      </RouterProvider>
    </ToastProvider>
  );
}
