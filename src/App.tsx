import React, { useState, useEffect } from 'react';
import { TabKey, Session, AppDatabase } from './types';
import {
  loadDatabase,
  saveDatabase,
  loadSession,
  saveSession,
  calculateAssociateTotals,
} from './utils/storage';
import { NativeHeader } from './components/NativeHeader';
import { NativeTabBar } from './components/NativeTabBar';
import { DashboardView } from './components/DashboardView';
import { AssociatesView } from './components/AssociatesView';
import { ClientsView } from './components/ClientsView';
import { ProfitEntryView } from './components/ProfitEntryView';
import { TransactionsView } from './components/TransactionsView';
import { GitHubHostView } from './components/GitHubHostView';
import { MyProfileView } from './components/MyProfileView';
import { LoginModal } from './components/LoginModal';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');

  // Sync session changes
  const handleLoginSuccess = (newSession: Session) => {
    setSession(newSession);
    saveSession(newSession);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    saveSession(null);
  };

  const handleUpdateDb = (updated: AppDatabase) => {
    setDb(updated);
    saveDatabase(updated);
  };

  // If role is associate, ensure they cannot stay on admin-only tabs
  useEffect(() => {
    if (session && session.role === 'associate') {
      const adminTabs: TabKey[] = ['associates', 'clients', 'profit', 'github'];
      if (adminTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [session, currentTab]);

  // Calculate pending due count for badge
  const pendingDueCount =
    session?.role === 'admin'
      ? db.associates.filter((a) => calculateAssociateTotals(db, a.id).due > 0.001)
          .length
      : session?.id
      ? calculateAssociateTotals(db, session.id).due > 0.001
        ? 1
        : 0
      : 0;

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-800 flex flex-col font-sans select-none antialiased text-[13px]">
      {session ? (
        <>
          {/* Stacked Sticky Top Bar (Header + Navigation) */}
          <div className="sticky top-0 z-40">
            <NativeHeader
              session={session}
              onLogout={handleLogout}
              onOpenGithub={() => setCurrentTab('github')}
            />

            <NativeTabBar
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              session={session}
              pendingDueCount={pendingDueCount}
            />
          </div>

          <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 pb-24 md:pb-8">
            {currentTab === 'dashboard' && (
              <DashboardView
                db={db}
                session={session}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'associates' && session.role === 'admin' && (
              <AssociatesView db={db} onUpdateDb={handleUpdateDb} />
            )}

            {currentTab === 'clients' && session.role === 'admin' && (
              <ClientsView db={db} onUpdateDb={handleUpdateDb} />
            )}

            {currentTab === 'profit' && session.role === 'admin' && (
              <ProfitEntryView
                db={db}
                onUpdateDb={handleUpdateDb}
                onNavigateToTx={() => setCurrentTab('transactions')}
              />
            )}

            {currentTab === 'transactions' && (
              <TransactionsView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
              />
            )}

            {currentTab === 'github' && session.role === 'admin' && (
              <GitHubHostView db={db} onUpdateDb={handleUpdateDb} />
            )}

            {currentTab === 'myprofile' && session.role === 'associate' && (
              <MyProfileView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
              />
            )}
          </main>
        </>
      ) : (
        <LoginModal db={db} onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
