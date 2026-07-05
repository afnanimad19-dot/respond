import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppStoreProvider, useStore } from './state/AppStore';
import { SignIn } from './screens/SignIn';
import { Calls, Inbox, Notifications } from './screens/Inbox';
import { Chat } from './screens/Chat';
import { Lifecycle } from './screens/Lifecycle';
import { Team } from './screens/Team';
import { Settings } from './screens/Settings';

function Guard({ children }: { children: JSX.Element }) {
  const { session, booting } = useStore();
  const location = useLocation();
  if (booting) return null;
  if (!session) return <Navigate to="/" replace state={{ from: location }} />;
  return children;
}

function Shell() {
  const { session, booting } = useStore();
  if (booting) return null;

  return (
    <div className="phone">
      <Routes>
        <Route path="/" element={session ? <Navigate to="/inbox" replace /> : <SignIn />} />
        <Route path="/inbox" element={<Guard><Inbox /></Guard>} />
        <Route path="/chat/:id" element={<Guard><Chat /></Guard>} />
        <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
        <Route path="/calls" element={<Guard><Calls /></Guard>} />
        <Route path="/settings" element={<Guard><Settings /></Guard>} />
        <Route path="/lifecycle" element={<Guard><Lifecycle /></Guard>} />
        <Route path="/team" element={<Guard><Team /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppStoreProvider>
  );
}
