import React, { useState } from 'react';
import { AppDatabase, Session } from '../types';
import {
  saveDatabase,
  calculateAssociateTotals,
  formatMoney,
  syncDatabaseToGitHub,
  loadGitHubConfig,
} from '../utils/storage';
import {
  UserCircle,
  Phone,
  Mail,
  MapPin,
  Lock,
  CheckCircle,
  AlertCircle,
  KeyRound,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Github,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';

interface MyProfileViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  db,
  session,
  onUpdateDb,
}) => {
  const associate = db.associates.find((a) => a.id === session.id);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [githubSyncMsg, setGithubSyncMsg] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  if (!associate) {
    return (
      <div className="p-8 text-center text-slate-400">
        <UserCircle className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
        <p className="text-sm font-medium">Associate profile record not found.</p>
      </div>
    );
  }

  const totals = calculateAssociateTotals(db, associate.id);
  const ghConfig = loadGitHubConfig();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (associate.password !== oldPassword) {
      showNotice('Current password does not match.', 'error');
      return;
    }

    if (newPassword.length < 4) {
      showNotice('New password must be at least 4 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotice('New passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    setGithubSyncMsg(null);

    const updatedAssociates = db.associates.map((a) =>
      a.id === associate.id ? { ...a, password: newPassword } : a
    );

    const updatedDb: AppDatabase = {
      ...db,
      associates: updatedAssociates,
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // Trigger auto-sync to GitHub
    try {
      const ghResult = await syncDatabaseToGitHub(
        updatedDb,
        `Security: Password updated for associate ${associate.name} (${associate.phone})`
      );

      if (ghResult.success) {
        setGithubSyncMsg(`Auto-synced to GitHub repository (${ghResult.commitSha})`);
        showNotice(
          `Password updated and auto-synced to GitHub (${ghResult.commitSha})!`,
          'success'
        );
      } else {
        setGithubSyncMsg(ghResult.message || 'Saved locally');
        showNotice(
          'Your login password was updated successfully in the network.',
          'success'
        );
      }
    } catch {
      showNotice('Your login password was updated successfully.', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-orange-500" />
          My Associate Profile & Credentials
        </h2>
        <p className="text-xs text-slate-500">
          Review your account details and update your login password
        </p>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#10243a] to-[#1c3b58] text-[#f28c28] font-bold text-lg flex items-center justify-center shadow-xs">
              {associate.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {associate.name}
              </h3>
              <p className="text-xs text-slate-500">
                Partner ID: {associate.id} · Civil Engineering Associate
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 w-fit">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Partner</span>
          </span>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-[10.5px] font-semibold text-slate-400 block mb-0.5">
              Login Phone Number
            </span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{associate.phone}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-[10.5px] font-semibold text-slate-400 block mb-0.5">
              Email Address
            </span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{associate.email || 'Not specified'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-[10.5px] font-semibold text-slate-400 block mb-0.5">
              Address / Region
            </span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{associate.address || 'Dhaka, Bangladesh'}</span>
            </div>
          </div>
        </div>

        {/* Financial stats summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[11px] font-bold text-emerald-900 block mb-0.5">
              Total Earnings
            </span>
            <div className="text-xl font-bold text-emerald-700">
              {formatMoney(totals.earned)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-[11px] font-bold text-blue-900 block mb-0.5">
              Total Disbursed
            </span>
            <div className="text-xl font-bold text-blue-700">
              {formatMoney(totals.paid)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-[11px] font-bold text-rose-900 block mb-0.5">
              Pending Due
            </span>
            <div className="text-xl font-bold text-rose-700">
              {formatMoney(totals.due)}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-[#f28c28]" />
          <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
            Change Login Password
          </h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Current Password *
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="oldPassInput"
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              New Password * (Min 4 chars)
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="newPassInput"
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="confirmPassInput"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              id="updatePassBtn"
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5 ${
                isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#f28c28] hover:bg-[#e07f20]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating & Syncing...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>

            {ghConfig.owner && ghConfig.repo && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Github className="w-3.5 h-3.5 text-slate-400" />
                <span>Auto-syncs to {ghConfig.owner}/{ghConfig.repo}</span>
              </span>
            )}
          </div>

          {githubSyncMsg && (
            <div className="text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mt-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{githubSyncMsg}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
