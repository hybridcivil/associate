import React, { useState, useEffect } from 'react';
import { Session } from '../types';
import {
  LogOut,
  Wifi,
  Battery,
  ShieldCheck,
  User,
  Github,
} from 'lucide-react';

interface NativeHeaderProps {
  session: Session;
  onLogout: () => void;
  onOpenGithub: () => void;
}

export const NativeHeader: React.FC<NativeHeaderProps> = ({
  session,
  onLogout,
  onOpenGithub,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = session.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-[#10243a]/95 backdrop-blur-md text-white border-b border-white/10 select-none shadow-md">
      {/* iOS style Simulated Status Bar */}
      <div className="flex items-center justify-between px-4 pt-1.5 pb-0.5 text-[11px] text-slate-300 font-medium tracking-tight">
        <span>{time || '09:41'}</span>
        <div className="flex items-center gap-1.5 opacity-90">
          <span className="text-[10px] tracking-wide text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
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
          {/* GitHub Host Action Pill (Admin only) */}
          {isAdmin && (
            <button
              id="headerGithubBtn"
              onClick={onOpenGithub}
              title="GitHub Hosting & PWA Settings"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 transition-colors cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-medium text-[11px]">GitHub Host</span>
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
