import React, { useState } from 'react';
import { AppDatabase, Session, Payment, Transaction } from '../types';
import {
  generateId,
  saveDatabase,
  calculateAssociateTotals,
  formatMoney,
  recordDeletedTransactionIds,
} from '../utils/storage';
import { deleteTransactionsFromSupabase } from '../utils/supabase';
import {
  Receipt,
  Download,
  Filter,
  CreditCard,
  Calendar,
  UserCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface TransactionsViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => Promise<any> | void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  db,
  session,
  onUpdateDb,
}) => {
  const isAdmin = session.role === 'admin';

  // Filters
  const [filterAssociate, setFilterAssociate] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'projects' | 'p2p_transfers' | 'director_dividends'>('all');

  // Delete transaction state (Admin only)
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [deleteScope, setDeleteScope] = useState<'single' | 'distribution'>('single');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Payment form states (Admin only)
  const [payAssociateId, setPayAssociateId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getClientName = (cid: string) => {
    if (cid === 'p2p-transfer') return 'Peer-to-Peer Transfer';
    if (cid === 'director-dividend') return 'Director 90% Share Dividend';
    return db.clients.find((c) => c.id === cid)?.name || 'Direct Project';
  };

  const getAssociateName = (aid: string) => {
    return db.associates.find((a) => a.id === aid)?.name || 'Associate';
  };

  const handleDeleteTransactionClick = (tx: Transaction) => {
    setTxToDelete(tx);
    setDeleteScope('single');
  };

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);

    try {
      const linkedDistributionTxs = txToDelete.distributionId
        ? db.transactions.filter((t) => t.distributionId === txToDelete.distributionId)
        : [];
      const hasMultipleInDist = linkedDistributionTxs.length > 1;
      const isDeleteAll = deleteScope === 'distribution' && hasMultipleInDist;

      const targetIds = isDeleteAll
        ? linkedDistributionTxs.map((t) => t.id)
        : [txToDelete.id];

      // 1. Record in persistent deleted set
      recordDeletedTransactionIds(targetIds);

      // 2. Filter from memory transactions
      const delSet = new Set(targetIds);
      const updatedTransactions = db.transactions.filter((t) => !delSet.has(t.id));

      // 3. Clean up linked payment allocations if any
      const updatedPayments = db.payments.map((p) => {
        if (!p.parts) return p;
        let changed = false;
        const newParts = { ...p.parts };
        for (const tid of targetIds) {
          if (newParts[tid] !== undefined) {
            delete newParts[tid];
            changed = true;
          }
        }
        return changed ? { ...p, parts: newParts } : p;
      });

      const updatedDb: AppDatabase = {
        ...db,
        transactions: updatedTransactions,
        payments: updatedPayments,
      };

      const commitMsg = targetIds.length > 1
        ? `Delete transactions ${targetIds.join(',')}`
        : `Delete transaction ${targetIds[0]}`;

      // 4. Direct delete call to server & Supabase first
      try {
        await fetch('/api/transactions/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: targetIds }),
        });
      } catch (apiErr) {
        console.warn('API delete transactions note:', apiErr);
      }
      deleteTransactionsFromSupabase(targetIds).catch(() => {});

      // 5. Update memory, local storage, and broadcast push once
      await onUpdateDb(updatedDb, commitMsg);

      showNotice(
        targetIds.length > 1
          ? `Entire distribution (${targetIds.length} entries) deleted from ledger.`
          : `Ledger entry (${formatMoney(txToDelete.amount)}) deleted successfully.`,
        'success'
      );
      setTxToDelete(null);
    } catch (err: any) {
      showNotice(`Failed to delete ledger entry: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick pay handler
  const handleQuickPay = (associateId: string, dueAmount: number) => {
    setPayAssociateId(associateId);
    setPayAmount(String(dueAmount));
    setPayDate(new Date().toISOString().slice(0, 10));
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Payment execution
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!payAssociateId) {
      showNotice('Please select the associate receiving payment.', 'error');
      return;
    }

    const amountNum = parseFloat(payAmount) || 0;
    if (amountNum <= 0) {
      showNotice('Please enter a valid positive payment amount.', 'error');
      return;
    }

    const totals = calculateAssociateTotals(db, payAssociateId);
    if (amountNum > totals.due + 0.001) {
      showNotice(
        `Payment amount (${formatMoney(amountNum)}) exceeds associate's outstanding due of ${formatMoney(totals.due)}.`,
        'error'
      );
      return;
    }

    // Allocate payment to oldest due transactions first
    let remaining = amountNum;
    const parts: Record<string, number> = {};
    const allocations: string[] = [];

    const assocTxs = db.transactions
      .filter((t) => t.associateId === payAssociateId)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const tx of assocTxs) {
      const alreadyPaid = db.payments.reduce(
        (sum, p) => sum + (p.parts?.[tx.id] || 0),
        0
      );
      const txBalance = Math.max(0, tx.amount - alreadyPaid);
      const take = Math.min(txBalance, remaining);

      if (take > 0) {
        parts[tx.id] = take;
        allocations.push(tx.id);
        remaining -= take;
      }

      if (remaining <= 0.000001) break;
    }

    const newPayment: Payment = {
      id: 'pay-' + generateId(),
      associateId: payAssociateId,
      date: payDate,
      amount: amountNum,
      parts,
      allocations,
    };

    const updatedDb: AppDatabase = {
      ...db,
      payments: [...db.payments, newPayment],
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);

    showNotice(
      `Recorded disbursement of ${formatMoney(amountNum)} to ${getAssociateName(payAssociateId)} (allocated to oldest dues).`,
      'success'
    );

    setPayAmount('');
  };

  // Filtered transaction list
  const filteredTransactions = db.transactions.filter((tx) => {
    if (!isAdmin) {
      if (tx.associateId !== session.id) return false;
    }
    if (filterAssociate && tx.associateId !== filterAssociate) return false;
    if (filterFrom && tx.date < filterFrom) return false;
    if (filterTo && tx.date > filterTo) return false;

    // Type filter
    if (typeFilter === 'projects') {
      if (tx.clientId === 'p2p-transfer' || tx.clientId === 'director-dividend') return false;
    } else if (typeFilter === 'p2p_transfers') {
      if (tx.clientId !== 'p2p-transfer') return false;
    } else if (typeFilter === 'director_dividends') {
      if (tx.clientId !== 'director-dividend') return false;
    }

    return true;
  });

  // Export CSV
  const handleExportCsv = () => {
    const rows = [
      ['Date', 'Associate', 'Phone', 'Client', 'Share Type', 'Earned (BDT)', 'Paid (BDT)', 'Due (BDT)'],
    ];

    filteredTransactions.forEach((tx) => {
      const assoc = db.associates.find((a) => a.id === tx.associateId);
      const txPaid = db.payments.reduce(
        (sum, p) => sum + (p.parts?.[tx.id] || 0),
        0
      );
      const due = Math.max(0, tx.amount - txPaid);

      rows.push([
        tx.date,
        assoc?.name || 'Associate',
        assoc?.phone || '',
        getClientName(tx.clientId),
        tx.shareType,
        String(tx.amount.toFixed(2)),
        String(txPaid.toFixed(2)),
        String(due.toFixed(2)),
      ]);
    });

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybrid-civil-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybrid-civil-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeAssociates = db.associates.filter((a) => a.status === 'active');

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-500" />
            {isAdmin ? 'Associate Transaction Ledger' : 'My Transaction Records'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Complete audit trail of all 90/5/5 profit distributions and payout settlements'
              : 'Detailed breakdown of all direct commission and pool share allocations'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-lg bg-[#10243a] hover:bg-[#1a3756] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Full Backup (JSON)</span>
            </button>
          )}
        </div>
      </div>

      {/* Transaction Category Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        {[
          { id: 'all', label: 'All Ledger Entries' },
          { id: 'projects', label: 'Project Commissions' },
          { id: 'p2p_transfers', label: 'Peer-to-Peer Transfers' },
          { id: 'director_dividends', label: 'Director 90% Shares' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              typeFilter === t.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
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

      {/* Admin Filters */}
      {isAdmin && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-2 pb-1 text-slate-700 text-xs font-bold">
            <Filter className="w-3.5 h-3.5 text-[#f28c28]" />
            <span>Ledger Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Filter by Associate
              </label>
              <select
                id="filterAssocSelect"
                value={filterAssociate}
                onChange={(e) => setFilterAssociate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white"
              >
                <option value="">All Associates ({db.associates.length})</option>
                {db.associates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                From Date
              </label>
              <input
                id="filterFromInput"
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                To Date
              </label>
              <input
                id="filterToInput"
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white"
              />
            </div>
          </div>

          {(filterAssociate || filterFrom || filterTo) && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setFilterAssociate('');
                  setFilterFrom('');
                  setFilterTo('');
                }}
                className="text-xs font-semibold text-[#f28c28] hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
            Ledger Entries ({filteredTransactions.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Ordered chronologically
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Date</th>
                <th className="px-3.5 py-2.5">Beneficiary Associate</th>
                <th className="px-3.5 py-2.5">Client & Project</th>
                <th className="px-3.5 py-2.5">Share Type</th>
                <th className="px-3.5 py-2.5">Earned</th>
                <th className="px-3.5 py-2.5">Disbursed</th>
                <th className="px-3.5 py-2.5">Balance Due</th>
                {isAdmin && <th className="px-3.5 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="py-10 text-center text-slate-400"
                  >
                    No transactions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions
                  .slice()
                  .reverse()
                  .map((tx) => {
                    const txPaid = db.payments.reduce(
                      (sum, p) => sum + (p.parts?.[tx.id] || 0),
                      0
                    );
                    const due = Math.max(0, tx.amount - txPaid);
                    const isSettled = due <= 0.001;

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {getAssociateName(tx.associateId)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 max-w-[200px]">
                          <span className="line-clamp-1">
                            {getClientName(tx.clientId)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
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
                        <td className="px-3.5 py-2.5 text-emerald-600 whitespace-nowrap">
                          {formatMoney(txPaid)}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold whitespace-nowrap">
                          {isSettled ? (
                            <span className="text-emerald-600 font-semibold">
                              Settled
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold">
                              {formatMoney(due)}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSettled ? (
                                <button
                                  id={`pay-due-${tx.id}`}
                                  onClick={() => handleQuickPay(tx.associateId, due)}
                                  className="px-2 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Disburse payment for this due amount"
                                >
                                  Pay Due
                                </button>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Settled
                                </span>
                              )}
                              <button
                                id={`delete-tx-${tx.id}`}
                                onClick={() => handleDeleteTransactionClick(tx)}
                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Ledger Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Card (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-[#f28c28]" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                Record Associate Payment Disbursement
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Disbursements are sequentially applied to the associate's oldest unsettled earnings
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Associate Recipient *
                </label>
                <div className="relative">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    id="payAssocSelect"
                    required
                    value={payAssociateId}
                    onChange={(e) => {
                      setPayAssociateId(e.target.value);
                      if (e.target.value) {
                        const tot = calculateAssociateTotals(db, e.target.value);
                        setPayAmount(String(tot.due));
                      }
                    }}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                  >
                    <option value="">— Select Associate —</option>
                    {activeAssociates.map((a) => {
                      const tot = calculateAssociateTotals(db, a.id);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} (Due: {formatMoney(tot.due)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Payment Amount (৳) *
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-bold text-xs absolute left-3 top-2">
                    ৳
                  </span>
                  <input
                    id="payAmountInput"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Disbursement Date *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    id="payDateInput"
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <button
              id="submitPaymentBtn"
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#10243a] hover:bg-[#1a3756] text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span>Record & Settle Due Amount</span>
            </button>
          </form>
        </div>
      )}

      {/* Delete Ledger Entry Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0d1f33]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Delete Ledger Entry
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ledger accounting and record reversal
                  </p>
                </div>
              </div>

              {/* Transaction details card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Beneficiary</span>
                  <span className="font-bold text-slate-800">
                    {getAssociateName(txToDelete.associateId)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Project / Client</span>
                  <span className="font-semibold text-slate-700">
                    {getClientName(txToDelete.clientId)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Date & Share</span>
                  <span className="text-slate-700">
                    {txToDelete.date} · <span className="font-semibold text-orange-600">{txToDelete.shareType}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 font-medium">Earned Amount</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatMoney(txToDelete.amount)}
                  </span>
                </div>
              </div>

              {/* Multiple entries in distribution option */}
              {(() => {
                const linkedTxs = txToDelete.distributionId
                  ? db.transactions.filter((t) => t.distributionId === txToDelete.distributionId)
                  : [];
                if (linkedTxs.length <= 1) return null;

                const distTotal = linkedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

                return (
                  <div className="space-y-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Part of 90/5/5 Distribution Batch</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This entry was generated alongside {linkedTxs.length - 1} other entries for the same client project profit event (Total: {formatMoney(distTotal)}).
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-amber-100/50">
                        <input
                          type="radio"
                          name="deleteScope"
                          checked={deleteScope === 'single'}
                          onChange={() => setDeleteScope('single')}
                          className="text-[#f28c28] focus:ring-orange-500"
                        />
                        <span className="text-xs text-slate-800">
                          Delete only this entry (<span className="font-bold">{formatMoney(txToDelete.amount)}</span>)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-amber-100/50">
                        <input
                          type="radio"
                          name="deleteScope"
                          checked={deleteScope === 'distribution'}
                          onChange={() => setDeleteScope('distribution')}
                          className="text-[#f28c28] focus:ring-orange-500"
                        />
                        <span className="text-xs font-semibold text-slate-900">
                          Delete entire distribution batch ({linkedTxs.length} entries · {formatMoney(distTotal)})
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Payment warning */}
              {(() => {
                const paid = db.payments.reduce(
                  (sum, p) => sum + (p.parts?.[txToDelete.id] || 0),
                  0
                );
                if (paid <= 0) return null;
                return (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                    <span className="font-bold">Payment notice:</span> {formatMoney(paid)} has already been disbursed against this entry. Deleting will unlink this payment allocation.
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setTxToDelete(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirmDeleteTxBtn"
                  disabled={isDeleting}
                  onClick={confirmDeleteTransaction}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deleteScope === 'distribution' ? 'Delete Distribution Batch' : 'Yes, Delete Entry'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
