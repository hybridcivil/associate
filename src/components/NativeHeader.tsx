import React from 'react';
import { Session } from '../types';
import {
  LogOut,
  ShieldCheck,
  User,
  Radio,
} from 'lucide-react';

interface NativeHeaderProps {
  session: Session;
  onLogout: () => void;
  onOpenGithub?: () => void;
  onOpenSyncSettings?: () => void;
  syncAction?: 'idle' | 'pulling' | 'pushing';
  saveStatus?: {
    githubSaved: boolean;
    localSaved: boolean;
    message?: string;
  } | null;
  onSyncDatabase?: () => void;
  syncSource?: string;
  lastSyncTime?: string;
}

export const NativeHeader: React.FC<NativeHeaderProps> = ({
  session,
  onLogout,
  onOpenSyncSettings,
  syncAction,
  saveStatus,
}) => {
  const isAdmin = session.role === 'admin';

  const isGitHubSynced = saveStatus ? saveStatus.githubSaved : true;
  const statusText = syncAction === 'pushing'
    ? 'Pushing...'
    : syncAction === 'pulling'
    ? 'Pulling...'
    : saveStatus?.githubSaved
    ? 'Synced to GitHub'
    : saveStatus?.localSaved && !saveStatus?.githubSaved
    ? 'Saved locally'
    : 'Live Network';

  return (
    <header className="bg-[#10243a]/95 backdrop-blur-md text-white border-b border-white/10 select-none shadow-md">
      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f28c28] to-[#ffaa44] flex items-center justify-center shadow-lg shadow-orange-500/20 text-[#10243a] font-black text-base flex-shrink-0">
            HC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                HYBRID CIVIL
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-orange-400 border border-orange-400/20">
                  Network
                </span>
              </h1>
            </div>
            <p className="text-[10.5px] text-slate-300 line-clamp-1">
              Associate Directory · Client Registry · 90/5/5 Profit Allocation
            </p>
          </div>
        </div>

        {/* User bar & Actions */}
        <div className="flex items-center gap-2">
          {/* Live Network Status Pill */}
          <button
            type="button"
            onClick={isAdmin ? onOpenSyncSettings : undefined}
            title={
              isAdmin
                ? `Sync Status: ${statusText}. Click to configure sync & repository token.`
                : `Sync Status: ${statusText}`
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg select-none transition-all ${
              !isGitHubSynced
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                : 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-300'
            } ${
              isAdmin
                ? 'hover:brightness-110 cursor-pointer active:scale-95'
                : 'cursor-default'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                !isGitHubSynced ? 'text-amber-400' : 'text-emerald-400'
              } ${
                syncAction === 'pushing' || syncAction === 'pulling' ? 'animate-spin' : 'animate-pulse'
              }`}
            />
            <span className="font-semibold text-[11px] hidden sm:inline">
              {statusText}
            </span>
          </button>

          {/* User Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/10 text-xs">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span className="font-semibold text-orange-300 text-[11px]">
                  Admin
                </span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-medium text-slate-200 text-[11px] max-w-[120px] truncate">
                  {session.name}
                </span>
              </>
            )}
          </div>

          {/* Logout Button */}
          <button
            id="headerLogoutBtn"
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
