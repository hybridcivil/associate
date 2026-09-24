import React from 'react';
import { TabKey, Session } from '../types';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PieChart,
  Receipt,
  MessageSquare,
  UserCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface NativeTabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  session: Session;
  pendingDueCount?: number;
  unreadMessagesCount?: number;
}

export const NativeTabBar: React.FC<NativeTabBarProps> = ({
  currentTab,
  onSelectTab,
  session,
  pendingDueCount = 0,
  unreadMessagesCount = 0,
}) => {
  const isAdmin = session.role === 'admin';

  interface TabItem {
    id: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    assocOnly?: boolean;
    badge?: number | string;
  }

  const tabs: TabItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'associates',
      label: 'Associates',
      icon: Users,
      adminOnly: true,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Briefcase,
      adminOnly: true,
    },
    {
      id: 'profit',
      label: 'Profit Entry',
      icon: PieChart,
      adminOnly: true,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      badge: pendingDueCount > 0 ? pendingDueCount : undefined,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    {
      id: 'myprofile',
      label: 'My Profile',
      icon: UserCircle,
      assocOnly: true,
    },
  ];

  const visibleTabs = tabs.filter((t) => {
    if (isAdmin && t.assocOnly) return false;
    if (!isAdmin && t.adminOnly) return false;
    return true;
  });

  return (
    <>
      {/* Desktop / Tablet Top Segmented Navigation */}
      <div className="hidden md:block bg-white border-b border-slate-200/80 px-4 py-2 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`desktop-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDesktopTab"
                    className="absolute inset-0 bg-[#f28c28] rounded-lg -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Native Tab Bar (iOS style) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 px-1 shadow-2xl flex items-center justify-around"
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative min-w-0 transition-all active:scale-95 ${
                isActive ? 'text-[#f28c28]' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-full">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeMobileDot"
                  className="w-1 h-1 rounded-full bg-[#f28c28] mt-0.5"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
