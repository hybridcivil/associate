import React from 'react';
import { Session } from '../types';
import {
  LogOut,
  ShieldCheck,
  User,
  Github,
  Cloud,
  RefreshCw,
} from 'lucide-react';

interface NativeHeaderProps {
  session: Session;
  onLogout: () => void;
  onOpenGithub: () => void;
  syncAction?: 'idle' | 'pulling' | 'pushing';
  onSyncDatabase?: () => void;
  syncSource?: string;
  lastSyncTime?: string;
}

export const NativeHeader: React.FC<NativeHeaderProps> = ({
  session,
  onLogout,
  onOpenGithub,
  syncAction = 'idle',
  onSyncDatabase,
  syncSource = 'GitHub',
  lastSyncTime = 'Active',
}) => {
  const isAdmin = session.role === 'admin';
  const isBusy = syncAction !== 'idle';

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
          {/* GitHub Auto Pull / Push Status Pill */}
          <button
            id="headerSyncBtn"
            onClick={onSyncDatabase}
            disabled={isBusy}
            title={`Real-Time Auto-Pull & Auto-Push with ${syncSource}. Click to manually check & pull now.`}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
              syncAction === 'pushing'
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse'
                : syncAction === 'pulling'
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 animate-pulse'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-300'
            }`}
          >
            {syncAction === 'pushing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : syncAction === 'pulling' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold text-[11px] hidden sm:inline">
              {syncAction === 'pushing'
                ? 'Auto-Pushing...'
                : syncAction === 'pulling'
                ? 'Auto-Pulling...'
                : `GitHub Auto-Sync (${lastSyncTime})`}
            </span>
          </button>

          {/* GitHub Host Action Pill (Admin only) */}
          {isAdmin && (
            <button
              id="headerGithubBtn"
              onClick={onOpenGithub}
              title="GitHub Hosting & PWA Settings"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 transition-colors cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-medium text-[11px]">Repo Config</span>
            </button>
          )}

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
