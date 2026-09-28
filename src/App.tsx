import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabKey, Session, AppDatabase, SaveStatus } from './types';
import {
  loadDatabase,
  saveDatabase,
  fetchAuthoritativeDatabase,
  loadSession,
  saveSession,
  calculateAssociateTotals,
  mergeDatabases,
  STORAGE_KEY,
} from './utils/storage';
import { fetchServerSupabaseConfig } from './utils/supabase';
import { sendPresenceHeartbeat, sendPresenceLogout } from './utils/presence';
import { NativeHeader } from './components/NativeHeader';
import { NativeTabBar } from './components/NativeTabBar';
import { DashboardView } from './components/DashboardView';
import { AssociatesView } from './components/AssociatesView';
import { ClientsView } from './components/ClientsView';
import { ProfitEntryView } from './components/ProfitEntryView';
import { TransactionsView } from './components/TransactionsView';
import { MyProfileView } from './components/MyProfileView';
import { MessagesView } from './components/MessagesView';
import { ContactsView } from './components/ContactsView';
import { TransfersView } from './components/TransfersView';
import { DirectorsView } from './components/DirectorsView';
import { DatabaseResetModal } from './components/DatabaseResetModal';
import { SupabaseDatabaseView } from './components/SupabaseDatabaseView';
import { LoginModal } from './components/LoginModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [syncAction, setSyncAction] = useState<'idle' | 'pulling' | 'pushing'>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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

  // On mount, load backend Supabase config into client if not already present
  useEffect(() => {
    fetchServerSupabaseConfig().catch(() => {});
  }, []);

  // Real-time active login presence heartbeat loop
  useEffect(() => {
    if (!session) return;
    sendPresenceHeartbeat(session);
    const interval = setInterval(() => {
      sendPresenceHeartbeat(session);
    }, 10000);

    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        sendPresenceHeartbeat(session);
      }
    };
    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
    };
  }, [session]);

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

          // Never blindly overwrite! Non-destructively merge incoming remote data with memory state
          // This guarantees NO locally-sent messages can EVER vanish due to background polling!
          const merged = mergeDatabases(dbRef.current, result.data);
          const currentJson = JSON.stringify(dbRef.current);
          const mergedJson = JSON.stringify(merged);

          // If content changed remotely, update page state automatically!
          if (currentJson !== mergedJson) {
            setDb(merged);
            dbRef.current = merged;

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {}

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
    // 1. Immediately apply merged state to memory & UI for instant zero-latency feedback
    const deleteMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete message ([a-zA-Z0-9_-]+)/);
    const deletedMsgId = deleteMatch ? deleteMatch[1] : undefined;

    const deleteAssocMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete associate ([a-zA-Z0-9_-]+)/);
    const deletedAssocId = deleteAssocMatch ? deleteAssocMatch[1] : undefined;

    const deleteClientMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete client ([a-zA-Z0-9_-]+)/);
    const deletedClientId = deleteClientMatch ? deleteClientMatch[1] : undefined;

    const deleteContactMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete contact ([a-zA-Z0-9_-]+)/);
    const deletedContactId = deleteContactMatch ? deleteContactMatch[1] : undefined;

    const deleteDirectorMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete director ([a-zA-Z0-9_-]+)/);
    const deletedDirectorId = deleteDirectorMatch ? deleteDirectorMatch[1] : undefined;

    const deleteDistMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete distribution ([a-zA-Z0-9_-]+)/);
    const deletedDistributionId = deleteDistMatch ? deleteDistMatch[1] : undefined;

    const isReset = Boolean(
      typeof commitMsg === 'string' &&
      (commitMsg.startsWith('RESET_DATABASE:') || commitMsg.includes('Reset database'))
    );

    const deleteTxMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete transaction ([a-zA-Z0-9_-]+)/);
    const singleTxId = deleteTxMatch ? deleteTxMatch[1] : undefined;

    const deleteTxsMatch = typeof commitMsg === 'string' && commitMsg.match(/Delete transactions ([a-zA-Z0-9_,-]+)/);
    const multiTxIds = deleteTxsMatch ? deleteTxsMatch[1].split(',') : undefined;

    const deletedTxIds = multiTxIds || (singleTxId ? [singleTxId] : undefined);

    const merged = isReset
      ? updated
      : mergeDatabases(
          dbRef.current,
          updated,
          deletedMsgId,
          deletedAssocId,
          deletedClientId,
          deletedTxIds,
          deletedContactId,
          deletedDirectorId,
          deletedDistributionId
        );

    lastLocalSaveTimeRef.current = Date.now();
    setDb(merged);
    dbRef.current = merged;
    setSyncAction('pushing');

    // 2. Automatically save and push to repository in background
    let statusResult: SaveStatus = {
      success: true,
      localSaved: true,
      githubSaved: false,
    };
    try {
      statusResult = await saveDatabase(merged, commitMsg);
      if (statusResult.data) {
        const finalMerged = isReset
          ? statusResult.data
          : mergeDatabases(
              dbRef.current,
              statusResult.data,
              deletedMsgId,
              deletedAssocId,
              deletedClientId,
              deletedTxIds,
              deletedContactId,
              deletedDirectorId,
              deletedDistributionId
            );
        setDb(finalMerged);
        dbRef.current = finalMerged;
      }
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
    if (session) {
      sendPresenceLogout(session);
    }
    setSession(null);
    saveSession(null);
  };

  // If role is associate, ensure they cannot stay on admin-only tabs
  useEffect(() => {
    if (session && session.role === 'associate') {
      const adminTabs: TabKey[] = ['associates', 'directors', 'clients', 'profit', 'supabase'];
      if (adminTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [session, currentTab]);

  // If tab was previously set to 'github', default to supabase
  useEffect(() => {
    if (currentTab === ('github' as TabKey)) {
      setCurrentTab('supabase');
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

            {currentTab === 'directors' && session.role === 'admin' && (
              <DirectorsView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
                onOpenResetModal={() => setIsResetModalOpen(true)}
              />
            )}

            {currentTab === 'clients' && session.role === 'admin' && (
              <ClientsView db={db} onUpdateDb={handleUpdateDb} />
            )}

            {currentTab === 'contacts' && (
              <ContactsView db={db} session={session} onUpdateDb={handleUpdateDb} />
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

            {currentTab === 'transfers' && (
              <TransfersView
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

            {currentTab === 'supabase' && session.role === 'admin' && (
              <SupabaseDatabaseView
                db={db}
                session={session}
                onUpdateDb={handleUpdateDb}
                onOpenSettings={() => setIsSyncModalOpen(true)}
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

          {isResetModalOpen && (
            <DatabaseResetModal
              isOpen={isResetModalOpen}
              onClose={() => setIsResetModalOpen(false)}
              db={db}
              session={session}
              onResetSuccess={(newDb) => {
                setDb(newDb);
                dbRef.current = newDb;
                pullLatestData(true);
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
