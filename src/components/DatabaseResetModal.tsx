import React, { useState } from 'react';
import { AppDatabase, Session } from '../types';
import {
  DatabaseResetMode,
  resetDatabaseSystem,
} from '../utils/storage';
import {
  AlertTriangle,
  RotateCcw,
  Download,
  ShieldAlert,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Trash2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  session?: Session;
  onResetSuccess?: (newDb: AppDatabase) => void;
}

export const DatabaseResetModal: React.FC<DatabaseResetModalProps> = ({
  isOpen,
  onClose,
  db,
  session,
  onResetSuccess,
}) => {
  if (!isOpen) return null;

  const [selectedMode, setSelectedMode] = useState<DatabaseResetMode>('factory_default');
  const [confirmText, setConfirmText] = useState('');
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger JSON download
  const handleDownloadBackup = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `hybrid_civil_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setHasDownloadedBackup(true);
    } catch (e) {
      console.error('Backup download error:', e);
    }
  };

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET';

  const handleExecuteReset = async () => {
    if (!isConfirmed) return;
    setIsResetting(true);
    setErrorMessage(null);

    try {
      const result = await resetDatabaseSystem(selectedMode, db);
      if (result.success && result.data) {
        if (onResetSuccess) {
          onResetSuccess(result.data);
        }
        onClose();
      } else {
        setErrorMessage(result.error || 'Failed to complete database reset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected reset error.');
    } finally {
      setIsResetting(false);
    }
  };

  const resetOptions: {
    id: DatabaseResetMode;
    title: string;
    description: string;
    dangerLevel: 'high' | 'medium' | 'low';
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'factory_default',
      title: 'Factory Default Reset',
      description: 'Restores default sample dataset (demo associates, board directors, clients, and clean ledgers). Keeps admin credentials.',
      dangerLevel: 'high',
      icon: RotateCcw,
    },
    {
      id: 'clean_slate',
      title: 'Fresh Blank Slate (Purge All Transactions)',
      description: 'Retains your Associates, Directors, and Admin user, but wipes ALL transactions, payments, P2P transfers, messages, and distributions to 0.',
      dangerLevel: 'high',
      icon: Sparkles,
    },
    {
      id: 'clear_transfers_only',
      title: 'Clear Peer-to-Peer Transfers Only',
      description: 'Deletes all associate peer-to-peer balance transfer records and ledger audit trails without affecting project clients.',
      dangerLevel: 'medium',
      icon: Trash2,
    },
    {
      id: 'clear_transactions_only',
      title: 'Clear Project Transactions & Payments Only',
      description: 'Clears all project earnings, payment disbursements, and associate due balances while keeping clients and associate accounts.',
      dangerLevel: 'medium',
      icon: Layers,
    },
    {
      id: 'clear_messages_only',
      title: 'Clear All Messages & Broadcasts',
      description: 'Purges conversation threads and admin broadcast announcements.',
      dangerLevel: 'low',
      icon: Trash2,
    },
    {
      id: 'clear_distributions_only',
      title: 'Clear Director 90% Distribution Records',
      description: 'Clears historical 90% share dividend payouts and distribution sheets.',
      dangerLevel: 'low',
      icon: Trash2,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">Database Reset & Maintenance System</h3>
              <p className="text-[11px] text-rose-700">Authoritative database reinitialization with backup safeguard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
              {errorMessage}
            </div>
          )}

          {/* Step 1: Backup First */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block text-xs">Step 1: Download Instant JSON Backup</span>
              <p className="text-[11px] text-slate-500">
                Safely download your current database records before applying any reset.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                hasDownloadedBackup
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {hasDownloadedBackup ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Backup Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Choose Mode */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-900 text-xs">
              Step 2: Select Reset Mode
            </label>
            <div className="grid grid-cols-1 gap-2">
              {resetOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedMode === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedMode(opt.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resetMode"
                      checked={isSelected}
                      onChange={() => setSelectedMode(opt.id)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                          {opt.title}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            opt.dangerLevel === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : opt.dangerLevel === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {opt.dangerLevel} impact
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{opt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Type Confirmation */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block font-bold text-slate-900 text-xs">
              Step 3: Security Confirmation
            </label>
            <p className="text-[11px] text-slate-500">
              To prevent accidental data loss, please type <strong className="text-rose-700 font-mono">RESET</strong> below to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "RESET" here'
              className="w-full px-3 py-2 font-mono text-center uppercase tracking-widest text-sm font-bold text-rose-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isConfirmed || isResetting}
            onClick={handleExecuteReset}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            {isResetting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Resetting Database...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Execute Database Reset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
