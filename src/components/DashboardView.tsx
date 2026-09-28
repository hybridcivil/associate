import React, { useState } from 'react';
import { AppDatabase, formatMoney, calculateAssociateTotals } from '../utils/storage';
import { Session, TabKey } from '../types';
import {
  Users,
  Briefcase,
  TrendingUp,
  Receipt,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  PieChart,
  CheckCircle2,
  AlertCircle,
  UserCircle,
  MessageSquare,
  BookUser,
  ArrowRightLeft,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Landmark,
  Award,
} from 'lucide-react';

interface DashboardViewProps {
  db: AppDatabase;
  session: Session;
  onNavigate: (tab: TabKey) => void;
}

const OFFICIAL_FB_URL = 'https://fb.com/hybridcivil';

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  session,
  onNavigate,
}) => {
  const isAdmin = session.role === 'admin';
  const [fbCopied, setFbCopied] = useState(false);

  const handleCopyFb = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(OFFICIAL_FB_URL);
      }
      setFbCopied(true);
      setTimeout(() => setFbCopied(false), 2500);
    } catch {}
  };

  const handleShareFb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hybrid Civil Network',
          text: 'Official Hybrid Civil engineering community page & project updates.',
          url: OFFICIAL_FB_URL,
        });
        return;
      } catch {}
    }
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(OFFICIAL_FB_URL)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Calculate admin global stats
  const totalProfit = db.transactions
    .filter((t) => t.kind === 'referral')
    .reduce((sum, t) => sum + (t.profit || 0), 0);

  const totalShares = db.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalPaid = db.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalDue = Math.max(0, totalShares - totalPaid);

  // Associate personal stats
  const myTotals = !isAdmin && session.id
    ? calculateAssociateTotals(db, session.id)
    : { earned: 0, paid: 0, due: 0 };

  const myTransactions = !isAdmin && session.id
    ? db.transactions.filter((t) => t.associateId === session.id)
    : [];

  const getClientName = (cid: string) => {
    return db.clients.find((c) => c.id === cid)?.name || 'Direct Project';
  };

  const getAssociateName = (aid: string) => {
    return db.associates.find((a) => a.id === aid)?.name || 'Associate';
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-[#10243a] via-[#1a3756] to-[#10243a] rounded-2xl p-4 sm:p-5 text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-orange-500/15 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {isAdmin ? 'System Administrator' : 'Civil Associate'}
              </span>
              <span className="text-xs text-slate-300">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Welcome back, {session.name}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              {isAdmin
                ? 'Manage civil engineering associates, track client billing, and automate transparent 90/5/5 profit distributions.'
                : 'Monitor your referral commissions (5%), equal pool distributions (5%), and payout transaction histories.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <>
                <button
                  id="dashProfitBtn"
                  onClick={() => onNavigate('profit')}
                  className="px-3.5 py-2 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <PieChart className="w-4 h-4" />
                  <span>Distribute Profit</span>
                </button>
                <button
                  id="dashClientBtn"
                  onClick={() => onNavigate('clients')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>+ Client</span>
                </button>
                <button
                  id="dashContactsAdminBtn"
                  onClick={() => onNavigate('contacts')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookUser className="w-3.5 h-3.5 text-orange-400" />
                  <span>Contacts ({db.contacts?.length || 0})</span>
                </button>
                <button
                  id="dashDirectorsAdminBtn"
                  onClick={() => onNavigate('directors')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Landmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Directors 90% ({db.directors?.length || 0})</span>
                </button>
                <button
                  id="dashTransfersAdminBtn"
                  onClick={() => onNavigate('transfers')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transfers ({db.balanceTransfers?.length || 0})</span>
                </button>
                <button
                  id="dashMessagesBtn"
                  onClick={() => onNavigate('messages')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>Messages</span>
                </button>
              </>
            ) : (
              <>
                <button
                  id="dashLedgerAssociateBtn"
                  onClick={() => onNavigate('transactions')}
                  className="px-3.5 py-2 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>My Share Ledger</span>
                </button>
                <button
                  id="dashContactsAssociateBtn"
                  onClick={() => onNavigate('contacts')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookUser className="w-3.5 h-3.5 text-orange-400" />
                  <span>Contacts Directory</span>
                </button>
                <button
                  id="dashTransferAssociateBtn"
                  onClick={() => onNavigate('transfers')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Balance Transfer</span>
                </button>
                <button
                  id="dashMessagesAssocBtn"
                  onClick={() => onNavigate('messages')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  <span>Messages</span>
                </button>
                <button
                  id="dashProfileAssociateBtn"
                  onClick={() => onNavigate('myprofile')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span>My Profile</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Official Facebook Link Sharing Card */}
      <div className="bg-gradient-to-r from-[#1877F2]/90 via-[#1877F2] to-[#0D53B5] rounded-xl p-3 sm:p-4 text-white shadow-xs border border-blue-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white text-[#1877F2] flex items-center justify-center font-black text-xl flex-shrink-0 shadow-xs">
            f
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                Official Facebook Page
              </span>
              <span className="text-xs text-blue-100 font-mono">fb.com/hybridcivil</span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              Share Hybrid Civil with client contacts and engineering partners: <span className="font-bold underline">https://fb.com/hybridcivil</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleShareFb}
            className="px-3 py-1.5 rounded-lg bg-white text-[#1877F2] hover:bg-blue-50 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Page</span>
          </button>
          <button
            onClick={handleCopyFb}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {fbCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{fbCopied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <a
            href={OFFICIAL_FB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Associates
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              {db.associates.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{db.associates.filter((a) => a.status === 'active').length} active partners</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Clients / Works
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              {db.clients.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Recorded client agreements
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Profit
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
              {formatMoney(totalProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Net project profits distributed
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Associate Shares
              </span>
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#10243a] tracking-tight">
              {formatMoney(totalShares)}
            </div>
            <div className="text-[11px] text-rose-500 font-semibold mt-1">
              {formatMoney(totalDue)} pending payment
            </div>
          </div>

          {/* Directors 90% Share & P2P Transfers Quick Cards */}
          <div className="col-span-2 lg:col-span-2 bg-gradient-to-br from-indigo-50/80 to-white rounded-xl p-3.5 border border-indigo-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Landmark className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Board Directors & 90% Share</span>
                  <span className="text-[10px] text-slate-500">{db.directors?.filter((d) => d.status === 'active').length || 0} Active Directors · Salary-wise distribution</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('directors')}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-100">
              <span className="text-slate-600">Base Salary Pool: <strong>{formatMoney((db.directors || []).filter(d => d.status === 'active').reduce((s, d) => s + (d.salary || 0), 0))}</strong></span>
              <span className="text-indigo-700 font-semibold">90% Dist: {db.directorDistributions?.length || 0} batches</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-2 bg-gradient-to-br from-emerald-50/80 to-white rounded-xl p-3.5 border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Peer-to-Peer Transfer Records</span>
                  <span className="text-[10px] text-slate-500">{db.balanceTransfers?.length || 0} Completed P2P Transactions</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('transfers')}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
              >
                <span>Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100">
              <span className="text-slate-600">Total Volume: <strong>{formatMoney((db.balanceTransfers || []).reduce((s, x) => s + (x.amount || 0), 0))}</strong></span>
              <span className="text-emerald-700 font-semibold">Instant Dual Ledger</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Earned
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
              {formatMoney(myTotals.earned)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Lifetime commission & pool shares
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Received
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              {formatMoney(myTotals.paid)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Disbursed to bank / mobile wallet
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Outstanding Due
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight">
              {formatMoney(myTotals.due)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Awaiting admin settlement
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Transactions
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              {myTransactions.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Allocated ledger events
            </div>
          </div>
        </div>
      )}

      {/* Sharing Rule Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
              %
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              Hybrid Civil Profit Sharing Protocol
            </h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Automated Logic
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-800">90% Company Fund</span>
              <span className="text-[11px] font-black text-[#10243a]">90%</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Allocated directly to Hybrid Civil operations, structural engineering licenses, taxation, and project overhead.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-orange-950">5% Selected Associate</span>
              <span className="text-[11px] font-black text-[#f28c28]">5%</span>
            </div>
            <p className="text-orange-900/80 text-[11px] leading-relaxed">
              Direct compensation awarded to the specific associate who brought or led the respective client agreement.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-blue-950">5% Equal Partner Pool</span>
              <span className="text-[11px] font-black text-blue-700">5%</span>
            </div>
            <p className="text-blue-900/80 text-[11px] leading-relaxed">
              Distributed in equal slices among all other active associates. Keeps every partner incentivized across all firm wins.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Distributions / Earnings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              {isAdmin ? 'Recent Profit Distributions' : 'My Recent Share Allocations'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAdmin
                ? 'Chronological list of project profit payouts'
                : 'Earnings credited to your account'}
            </p>
          </div>

          <button
            id="viewAllTxBtn"
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {isAdmin ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Client & Project</th>
                  <th className="px-3.5 py-2.5">Net Profit</th>
                  <th className="px-3.5 py-2.5">Lead Associate (5%)</th>
                  <th className="px-3.5 py-2.5">Lead Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.transactions.filter((t) => t.kind === 'referral').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No profit distributions recorded yet. Click "Distribute Profit" to begin.
                    </td>
                  </tr>
                ) : (
                  db.transactions
                    .filter((t) => t.kind === 'referral')
                    .slice(-6)
                    .reverse()
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                          {getClientName(t.clientId)}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-emerald-600 whitespace-nowrap">
                          {formatMoney(t.profit)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                          {getAssociateName(t.associateId)}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-[#10243a] whitespace-nowrap">
                          {formatMoney(t.amount)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Client</th>
                  <th className="px-3.5 py-2.5">Share Type</th>
                  <th className="px-3.5 py-2.5">Earned</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No earnings records found.
                    </td>
                  </tr>
                ) : (
                  myTransactions
                    .slice(-8)
                    .reverse()
                    .map((tx) => {
                      const paidAmount = db.payments.reduce(
                        (sum, p) => sum + (p.parts?.[tx.id] || 0),
                        0
                      );
                      const dueAmount = Math.max(0, tx.amount - paidAmount);
                      const isSettled = dueAmount <= 0.001;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                            {getClientName(tx.clientId)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                tx.kind === 'referral'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {tx.shareType}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                            {formatMoney(tx.amount)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                Due {formatMoney(dueAmount)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
