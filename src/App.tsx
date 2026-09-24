import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabKey, Session, AppDatabase, SaveStatus } from './types';
import {
  loadDatabase,
  saveDatabase,
  fetchAuthoritativeDatabase,
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
import { MyProfileView } from './components/MyProfileView';
import { MessagesView } from './components/MessagesView';
import { LoginModal } from './components/LoginModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [syncAction, setSyncAction] = useState<'idle' | 'pulling' | 'pushing'>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Synchronized refs to avoid stale closures in intervals
  const dbRef = useRef<AppDatabase>(db);
  const sessionRef = useRef<Session | null>(session);
  const syncActionRef = useRef<'idle' | 'pulling' | 'pushing'>(syncAction);
  const lastLocalSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    syncActionRef.current = syncAction;
  }, [syncAction]);

  // Core pull function: pulls latest database in the background without UI interruption
  const pullLatestData = useCallback(
    async (isManual = false) => {
      // Avoid pulling if we're actively pushing out our own changes
      if (syncActionRef.current === 'pushing') return;

      const requestStartTime = Date.now();
      if (isManual) setSyncAction('pulling');
      try {
        const result = await fetchAuthoritativeDatabase(isManual);
        if (result.success && result.data) {
          // If a local save happened while this request was in flight, discard the stale response!
          if (lastLocalSaveTimeRef.current > requestStartTime) {
            return;
          }

          const currentJson = JSON.stringify(dbRef.current);
          const incomingJson = JSON.stringify(result.data);

          // If content changed remotely, update page state automatically!
          if (currentJson !== incomingJson) {
            setDb(result.data);
            dbRef.current = result.data;

            // If session is an associate whose details were updated remotely, update session
            if (sessionRef.current && sessionRef.current.role === 'associate') {
              const currentAssoc = result.data.associates.find(
                (a) => a.id === sessionRef.current?.id
              );
              if (
                currentAssoc &&
                (currentAssoc.name !== sessionRef.current.name ||
                  currentAssoc.phone !== sessionRef.current.phone)
              ) {
                const updatedSession: Session = {
                  ...sessionRef.current,
                  name: currentAssoc.name,
                  phone: currentAssoc.phone,
                };
                setSession(updatedSession);
                saveSession(updatedSession);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Background sync check error:', err);
      } finally {
        if (isManual) setSyncAction('idle');
      }
    },
    []
  );

  // Dynamic Auto-Pull lifecycle: 1.5s in Messages, 2.5s elsewhere
  useEffect(() => {
    // 1. Initial authoritative pull
    pullLatestData(true);

    // 2. High-frequency live sync interval (1.5 seconds in Messages tab, 2.5 seconds otherwise)
    const intervalMs = currentTab === 'messages' ? 1500 : 2500;
    const interval = setInterval(() => {
      pullLatestData(false);
    }, intervalMs);

    // 3. Instant background pull when switching tabs or focusing window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        pullLatestData(false);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [pullLatestData, currentTab]);

  // Auto-Save & Sync on any page modification (completely silent in background)
  const handleUpdateDb = async (updated: AppDatabase, commitMsg?: string): Promise<SaveStatus> => {
    // 1. Immediately apply to local state so UI is instant and zero latency
    lastLocalSaveTimeRef.current = Date.now();
    setDb(updated);
    dbRef.current = updated;
    setSyncAction('pushing');

    // 2. Automatically save and push to repository in background
    let statusResult: SaveStatus = {
      success: true,
      localSaved: true,
      githubSaved: false,
    };
    try {
      statusResult = await saveDatabase(updated, commitMsg);
      setSaveStatus(statusResult);
    } catch (err: any) {
      console.warn('Background save note:', err);
      statusResult = {
        success: true,
        localSaved: true,
        githubSaved: false,
        warning: err.message,
      };
      setSaveStatus(statusResult);
    } finally {
      setSyncAction('idle');
    }
    return statusResult;
  };

  // Sync session changes
  const handleLoginSuccess = (newSession: Session) => {
    setSession(newSession);
    saveSession(newSession);
    setCurrentTab('dashboard');
    // Pull fresh state on login
    pullLatestData(true);
  };

  const handleLogout = () => {
    setSession(null);
    saveSession(null);
  };

  // If role is associate, ensure they cannot stay on admin-only tabs
  useEffect(() => {
    if (session && session.role === 'associate') {
      const adminTabs: TabKey[] = ['associates', 'clients', 'profit'];
      if (adminTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [session, currentTab]);

  // If tab was previously set to 'github', default to dashboard
  useEffect(() => {
    if (currentTab === ('github' as TabKey)) {
      setCurrentTab('dashboard');
    }
  }, [currentTab]);

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

  // Calculate unread messages count for badge
  const unreadMessagesCount =
    session?.role === 'admin'
      ? (db.messages || []).filter((m) => m.senderRole === 'associate' && !m.read).length
      : session?.id
      ? (db.messages || []).filter(
          (m) => m.associateId === session.id && m.senderRole === 'admin' && !m.read
        ).length
      : 0;

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-800 flex flex-col font-sans select-none antialiased text-[13px] relative">
      {session ? (
        <>
          {/* Stacked Sticky Top Bar (Header + Navigation) */}
          <div className="sticky top-0 z-40">
            <NativeHeader
              session={session}
              onLogout={handleLogout}
              onOpenSyncSettings={() => setIsSyncModalOpen(true)}
              syncAction={syncAction}
              saveStatus={saveStatus}
            />

            <NativeTabBar
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              session={session}
              pendingDueCount={pendingDueCount}
              unreadMessagesCount={unreadMessagesCount}
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

            {currentTab === 'messages' && (
              <MessagesView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
                onPullLatest={() => pullLatestData(false)}
              />
            )}

            {currentTab === 'myprofile' && session.role === 'associate' && (
              <MyProfileView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
              />
            )}
          </main>

          {isSyncModalOpen && (
            <SyncSettingsModal
              isOpen={isSyncModalOpen}
              onClose={() => setIsSyncModalOpen(false)}
              db={db}
              onForceSync={async () => {
                await pullLatestData(true);
              }}
              onForcePush={async () => {
                await handleUpdateDb(db, 'Force sync push to repository');
              }}
            />
          )}
        </>
      ) : (
        <LoginModal db={db} onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
