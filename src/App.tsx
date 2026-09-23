import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabKey, Session, AppDatabase } from './types';
import {
  loadDatabase,
  saveDatabase,
  fetchAuthoritativeDatabase,
  mergeDatabases,
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
import { MessagesView } from './components/MessagesView';
import { LoginModal } from './components/LoginModal';
import { CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [syncAction, setSyncAction] = useState<'idle' | 'pulling' | 'pushing'>('idle');
  const [syncSource, setSyncSource] = useState<string>('GitHub');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Connecting...');
  const [syncToast, setSyncToast] = useState<{
    text: string;
    type: 'pull' | 'push' | 'info';
  } | null>(null);

  // Synchronized refs to avoid stale closures in intervals
  const dbRef = useRef<AppDatabase>(db);
  const sessionRef = useRef<Session | null>(session);
  const syncActionRef = useRef<'idle' | 'pulling' | 'pushing'>(syncAction);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    syncActionRef.current = syncAction;
  }, [syncAction]);

  // Toast notification helper
  const showSyncToast = useCallback(
    (text: string, type: 'pull' | 'push' | 'info' = 'info') => {
      setSyncToast({ text, type });
      setTimeout(() => {
        setSyncToast((prev) => (prev?.text === text ? null : prev));
      }, 4000);
    },
    []
  );

  // Core pull function: pulls latest database from GitHub or local repository file
  const pullLatestData = useCallback(
    async (isManual = false) => {
      // Avoid pulling if we're actively pushing out our own changes
      if (syncActionRef.current === 'pushing') return;

      if (isManual) setSyncAction('pulling');
      try {
        const result = await fetchAuthoritativeDatabase();
        if (result.success && result.data) {
          // Smart merge ensures local un-synced messages or records are never wiped out
          const merged = mergeDatabases(dbRef.current, result.data);
          const currentJson = JSON.stringify(dbRef.current);
          const incomingJson = JSON.stringify(merged);

          const timeStr = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastSyncTime(timeStr);
          setSyncSource(result.source === 'github' ? 'GitHub Live' : 'GitHub Repo');

          // If content changed remotely, update page state automatically!
          if (currentJson !== incomingJson) {
            console.log('[Auto-Pull] Remote updates detected. Updating local state.');
            setDb(merged);
            dbRef.current = merged;
            showSyncToast(
              isManual
                ? '⬇️ Pulled latest updates from GitHub!'
                : '⬇️ Auto-pulled latest changes from GitHub / Repo!',
              'pull'
            );

            // If session is an associate whose details were updated remotely, update session
            if (sessionRef.current && sessionRef.current.role === 'associate') {
              const currentAssoc = merged.associates.find(
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
          } else if (isManual) {
            showSyncToast('Everything is up-to-date with GitHub.', 'info');
          }
        }
      } catch (err) {
        console.warn('Auto-pull check error:', err);
      } finally {
        if (isManual) setSyncAction('idle');
      }
    },
    [showSyncToast]
  );

  // Auto-Pull lifecycle: On mount, every 5 seconds polling, and on window focus/visibility
  useEffect(() => {
    // 1. Initial authoritative pull
    pullLatestData(true);

    // 2. Continuous 5-second auto-pull interval
    const interval = setInterval(() => {
      pullLatestData(false);
    }, 5000);

    // 3. Instant auto-pull when switching tabs or focusing window
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
  }, [pullLatestData]);

  // Auto-Push on any page modification
  const handleUpdateDb = async (updated: AppDatabase, commitMsg?: string) => {
    // 1. Immediately apply to local state so UI is instant and zero latency
    setDb(updated);
    dbRef.current = updated;
    setSyncAction('pushing');

    // 2. Automatically push to GitHub and server repository
    try {
      const res = await saveDatabase(updated, commitMsg);
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncTime(timeStr);

      if (res.success) {
        if (res.authError) {
          showSyncToast(
            'Saved to repository file. Note: GitHub token invalid/expired (check GitHub Host)',
            'info'
          );
        } else {
          showSyncToast(
            `⬆️ Auto-pushed to GitHub (${res.commitSha || 'synced'})!`,
            'push'
          );
        }
      } else {
        showSyncToast('Saved to repository file; auto-push queued.', 'info');
      }
    } catch (err) {
      console.error('Auto-push error:', err);
      showSyncToast('Saved to repository; GitHub push will retry.', 'info');
    } finally {
      setSyncAction('idle');
    }
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
      {/* Floating Auto-Sync Notification Toast */}
      {syncToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-bounce transition-all shadow-xl"
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md ${
              syncToast.type === 'pull'
                ? 'bg-cyan-900/90 border-cyan-400/50 text-cyan-200 shadow-cyan-900/30'
                : syncToast.type === 'push'
                ? 'bg-emerald-900/90 border-emerald-400/50 text-emerald-200 shadow-emerald-900/30'
                : 'bg-[#10243a]/90 border-orange-400/50 text-orange-200 shadow-orange-900/30'
            }`}
          >
            {syncToast.type === 'pull' ? (
              <ArrowDownCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
            ) : syncToast.type === 'push' ? (
              <ArrowUpCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-orange-400" />
            )}
            <span>{syncToast.text}</span>
          </div>
        </div>
      )}

      {session ? (
        <>
          {/* Stacked Sticky Top Bar (Header + Navigation) */}
          <div className="sticky top-0 z-40">
            <NativeHeader
              session={session}
              onLogout={handleLogout}
              onOpenGithub={() => setCurrentTab('github')}
              syncAction={syncAction}
              onSyncDatabase={() => pullLatestData(true)}
              syncSource={syncSource}
              lastSyncTime={lastSyncTime}
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
