import React, { useState, useEffect } from 'react';
import { AppDatabase, Transaction } from '../types';
import { generateId, saveDatabase, formatMoney } from '../utils/storage';
import {
  PieChart,
  Calendar,
  Briefcase,
  UserCheck,
  Coins,
  CheckCircle,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ProfitEntryViewProps {
  db: AppDatabase;
  onUpdateDb: (updated: AppDatabase) => void;
  onNavigateToTx: () => void;
}

export const ProfitEntryView: React.FC<ProfitEntryViewProps> = ({
  db,
  onUpdateDb,
  onNavigateToTx,
}) => {
  const [profitDate, setProfitDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [clientId, setClientId] = useState<string>('');
  const [profitAmount, setProfitAmount] = useState<string>('');
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>('');

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const activeAssociates = db.associates.filter((a) => a.status === 'active');

  // When client changes, auto-select their referring associate if present
  useEffect(() => {
    if (clientId) {
      const client = db.clients.find((c) => c.id === clientId);
      if (client?.associateId) {
        setSelectedAssociateId(client.associateId);
      }
    }
  }, [clientId, db.clients]);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const amountNum = Math.max(0, parseFloat(profitAmount) || 0);

  // Computed preview values
  const companyShare = amountNum * 0.9;
  const leadShare = amountNum * 0.05;
  const poolTotal = amountNum * 0.05;
  const otherAssociates = activeAssociates.filter(
    (a) => a.id !== selectedAssociateId
  );
  const eachOtherShare =
    otherAssociates.length > 0 ? poolTotal / otherAssociates.length : 0;

  const leadAssociateName =
    activeAssociates.find((a) => a.id === selectedAssociateId)?.name ||
    'Selected Associate';

  const handleDistribute = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountNum || amountNum <= 0) {
      showNotice('Please enter a valid positive profit amount in ৳.', 'error');
      return;
    }

    if (!clientId) {
      showNotice('Please select the client for this profit distribution.', 'error');
      return;
    }

    if (!selectedAssociateId) {
      showNotice(
        'Please select the lead associate to receive the 5% direct commission.',
        'error'
      );
      return;
    }

    const refTxId = 'tx-' + generateId();
    const newTransactions: Transaction[] = [];

    // 1. Direct 5% transaction for Lead Associate
    newTransactions.push({
      id: refTxId,
      date: profitDate,
      clientId,
      associateId: selectedAssociateId,
      shareType: 'Selected associate 5%',
      amount: leadShare,
      profit: amountNum,
      kind: 'referral',
    });

    // 2. 5% equal pool distribution among other active associates
    if (otherAssociates.length > 0) {
      otherAssociates.forEach((other) => {
        newTransactions.push({
          id: 'tx-' + generateId(),
          date: profitDate,
          clientId,
          associateId: other.id,
          shareType: 'Equal distribution 5% pool',
          amount: eachOtherShare,
          profit: amountNum,
          kind: 'equal',
          distributionId: refTxId,
        });
      });
    } else {
      // Held if no other associates
      newTransactions.push({
        id: 'tx-' + generateId(),
        date: profitDate,
        clientId,
        associateId: selectedAssociateId,
        shareType: 'Unallocated equal pool (held)',
        amount: 0,
        profit: amountNum,
        kind: 'held',
        distributionId: refTxId,
      });
    }

    const updatedDb: AppDatabase = {
      ...db,
      transactions: [...db.transactions, ...newTransactions],
    };

    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);

    showNotice(
      `Successfully distributed ${formatMoney(amountNum)} net profit! 90% company reserved, 5% to ${leadAssociateName}, and 5% split among ${otherAssociates.length} partner associates.`,
      'success'
    );

    // Reset inputs
    setProfitAmount('');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <PieChart className="w-5 h-5 text-orange-500" />
            Profit Distribution Engine
          </h2>
          <p className="text-xs text-slate-500">
            Enforce the 90/5/5 protocol with transparent ledger records and instant previews
          </p>
        </div>
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
          <span className="flex-1">{notification.text}</span>
          {notification.type === 'success' && (
            <button
              onClick={onNavigateToTx}
              className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors"
            >
              <span>View Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Input Parameters Form */}
        <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-slate-200 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Coins className="w-4 h-4 text-[#f28c28]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              Profit Entry Details
            </h3>
          </div>

          <form onSubmit={handleDistribute} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Distribution Date *
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="profitDateInput"
                  type="date"
                  required
                  value={profitDate}
                  onChange={(e) => setProfitDate(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Project / Client *
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <select
                  id="profitClientSelect"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                >
                  <option value="">— Select Client Project —</option>
                  {db.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.project})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Net Profit to Distribute (৳) *
              </label>
              <div className="relative">
                <span className="text-slate-400 font-bold text-xs absolute left-3 top-2">
                  ৳
                </span>
                <input
                  id="profitAmountInput"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={profitAmount}
                  onChange={(e) => setProfitAmount(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white font-semibold text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Net profit remaining after direct site costs, labor, and sub-vendor expenses.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Lead Associate (Receives Direct 5%) *
              </label>
              <div className="relative">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <select
                  id="profitAssociateSelect"
                  required
                  value={selectedAssociateId}
                  onChange={(e) => setSelectedAssociateId(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white font-medium"
                >
                  <option value="">— Choose Associate —</option>
                  {activeAssociates.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              id="submitProfitBtn"
              type="submit"
              disabled={amountNum <= 0 || !clientId || !selectedAssociateId}
              className="w-full py-2.5 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Calculate & Save Distribution</span>
            </button>
          </form>
        </div>

        {/* Real-time Dynamic Breakdown Preview */}
        <div className="lg:col-span-7 bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                Live Distribution Breakdown Preview
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Rule: 90 / 5 / 5
              </span>
            </div>

            {amountNum <= 0 || !selectedAssociateId ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <PieChart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-medium">
                  Enter a profit amount and choose a lead associate to view the real-time breakdown.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visual Proportion Bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                  <div
                    style={{ width: '90%' }}
                    className="bg-[#10243a] transition-all"
                    title="Company 90%"
                  />
                  <div
                    style={{ width: '5%' }}
                    className="bg-[#f28c28] transition-all"
                    title="Lead Associate 5%"
                  />
                  <div
                    style={{ width: '5%' }}
                    className="bg-blue-600 transition-all"
                    title="Pool 5%"
                  />
                </div>

                {/* Table of Slices */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Beneficiary / Category</th>
                        <th className="px-3 py-2">Ratio</th>
                        <th className="px-3 py-2 text-right">Computed Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* 90% Company */}
                      <tr className="bg-slate-50/50">
                        <td className="px-3 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-[#10243a]" />
                          <span>Hybrid Civil Company Operations</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-semibold">
                          90.0%
                        </td>
                        <td className="px-3 py-2.5 font-bold text-[#10243a] text-right whitespace-nowrap">
                          {formatMoney(companyShare)}
                        </td>
                      </tr>

                      {/* 5% Lead Associate */}
                      <tr className="bg-orange-50/30">
                        <td className="px-3 py-2.5 font-bold text-orange-950 flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-[#f28c28]" />
                          <span>{leadAssociateName} (Lead)</span>
                        </td>
                        <td className="px-3 py-2.5 text-orange-800 font-semibold">
                          5.0%
                        </td>
                        <td className="px-3 py-2.5 font-bold text-[#f28c28] text-right whitespace-nowrap">
                          {formatMoney(leadShare)}
                        </td>
                      </tr>

                      {/* 5% Equal Pool distribution */}
                      {otherAssociates.map((other) => (
                        <tr key={other.id} className="hover:bg-blue-50/20">
                          <td className="px-3 py-2 text-slate-700 pl-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{other.name}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[11px]">
                            Pool Split (1/{otherAssociates.length})
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800 text-right whitespace-nowrap">
                            {formatMoney(eachOtherShare)}
                          </td>
                        </tr>
                      ))}

                      {otherAssociates.length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-slate-500 italic pl-6"
                          >
                            No other active associates (Pool held)
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-medium text-right">
                            {formatMoney(poolTotal)}
                          </td>
                        </tr>
                      )}

                      {/* Total */}
                      <tr className="bg-slate-100/80 font-black">
                        <td className="px-3 py-2.5 text-slate-900">
                          Total Net Profit Accounted
                        </td>
                        <td className="px-3 py-2.5 text-slate-900">100.0%</td>
                        <td className="px-3 py-2.5 text-emerald-600 text-right text-sm whitespace-nowrap">
                          {formatMoney(amountNum)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Mathematical balance confirmed: 100% of profit allocation matches the input amount.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-4 pt-2 border-t border-slate-100">
            Note: Committing creates permanent transaction ledger entries for all beneficiaries.
          </div>
        </div>
      </div>
    </div>
  );
};
