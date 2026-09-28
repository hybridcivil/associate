import React, { useState, useMemo } from 'react';
import { AppDatabase, Session, BalanceTransfer, Payment, Transaction, Message } from '../types';
import {
  generateId,
  formatMoney,
  calculateAssociateTotals,
} from '../utils/storage';
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Copy,
  Check,
  Filter,
  Users,
  DollarSign,
  Plus,
  X,
  Calendar,
  FileText,
} from 'lucide-react';

interface TransfersViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => Promise<any> | void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ db, session, onUpdateDb }) => {
  const isAdmin = session.role === 'admin';
  const currentAssociateId = session.id;

  // Active associate totals
  const myTotals = !isAdmin && currentAssociateId
    ? calculateAssociateTotals(db, currentAssociateId)
    : { earned: 0, paid: 0, due: 0 };

  const availableBalance = myTotals.due;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for new transfer
  const [senderId, setSenderId] = useState<string>(!isAdmin && currentAssociateId ? currentAssociateId : (db.associates[0]?.id || ''));
  const [receiverId, setReceiverId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Active associates eligible for transfer
  const activeAssociates = useMemo(() => {
    return (db.associates || []).filter((a) => a.status === 'active');
  }, [db.associates]);

  // Sender's calculated available balance
  const senderTotals = useMemo(() => {
    if (!senderId) return { earned: 0, paid: 0, due: 0 };
    return calculateAssociateTotals(db, senderId);
  }, [db, senderId]);

  const effectiveAvailableBalance = isAdmin ? senderTotals.due : availableBalance;

  // Potential receivers: all active associates except sender
  const potentialReceivers = useMemo(() => {
    return activeAssociates.filter((a) => a.id !== senderId);
  }, [activeAssociates, senderId]);

  // Set default receiver if not selected
  const handleOpenTransferModal = () => {
    const defaultSender = !isAdmin && currentAssociateId ? currentAssociateId : (activeAssociates[0]?.id || '');
    setSenderId(defaultSender);
    const validReceivers = activeAssociates.filter((a) => a.id !== defaultSender);
    setReceiverId(validReceivers[0]?.id || '');
    setTransferAmount('');
    setTransferNote('');
    setIsConfirming(false);
    setIsModalOpen(true);
  };

  // Filter transfers
  const allTransfers = useMemo(() => {
    const list = Array.isArray(db.balanceTransfers) ? db.balanceTransfers : [];
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.balanceTransfers]);

  const filteredTransfers = useMemo(() => {
    return allTransfers.filter((t) => {
      // Role filtering
      if (!isAdmin && currentAssociateId) {
        if (filterType === 'sent' && t.senderId !== currentAssociateId) return false;
        if (filterType === 'received' && t.receiverId !== currentAssociateId) return false;
        if (filterType === 'all' && t.senderId !== currentAssociateId && t.receiverId !== currentAssociateId) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSender = (t.senderName || '').toLowerCase().includes(query);
        const matchesReceiver = (t.receiverName || '').toLowerCase().includes(query);
        const matchesNote = (t.note || '').toLowerCase().includes(query);
        const matchesAmount = String(t.amount || '').includes(query);
        const matchesDate = (t.date || '').includes(query);
        if (!matchesSender && !matchesReceiver && !matchesNote && !matchesAmount && !matchesDate) {
          return false;
        }
      }
      return true;
    });
  }, [allTransfers, isAdmin, currentAssociateId, filterType, searchTerm]);

  // Set quick percentage amount
  const handleSetPercentage = (pct: number) => {
    const maxVal = effectiveAvailableBalance;
    if (maxVal <= 0) return;
    const calc = Math.floor((maxVal * pct) / 100);
    setTransferAmount(String(calc));
  };

  // Execute transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(transferAmount);

    if (isNaN(numAmount) || numAmount <= 0) {
      showNotice('Please enter a valid transfer amount greater than 0.', 'error');
      return;
    }

    if (numAmount > effectiveAvailableBalance + 0.001) {
      showNotice(
        `Insufficient available balance. You can transfer up to ${formatMoney(effectiveAvailableBalance)}.`,
        'error'
      );
      return;
    }

    if (!receiverId) {
      showNotice('Please select a recipient associate.', 'error');
      return;
    }

    if (senderId === receiverId) {
      showNotice('Cannot transfer balance to the same associate.', 'error');
      return;
    }

    const senderAssoc = db.associates.find((a) => a.id === senderId);
    const receiverAssoc = db.associates.find((a) => a.id === receiverId);

    if (!senderAssoc || !receiverAssoc) {
      showNotice('Associate profile record not found.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const transferId = 'xfer-' + generateId();
      const senderPaymentId = 'pay-' + generateId();
      const receiverTxId = 'tx-' + generateId();

      // 1. Create BalanceTransfer record
      const newTransfer: BalanceTransfer = {
        id: transferId,
        senderId: senderAssoc.id,
        senderName: senderAssoc.name,
        receiverId: receiverAssoc.id,
        receiverName: receiverAssoc.name,
        amount: numAmount,
        date: today,
        note: transferNote.trim() || 'Peer-to-peer associate balance transfer',
        status: 'completed',
        senderPaymentId,
        receiverTxId,
      };

      // 2. Debit Sender: Add Payment record under sender so due balance decreases
      const senderPayment: Payment = {
        id: senderPaymentId,
        associateId: senderAssoc.id,
        date: today,
        amount: numAmount,
        parts: {},
        allocations: [`P2P Transfer to ${receiverAssoc.name} (Ref: ${transferId})`],
      };

      // 3. Credit Receiver: Add Transaction record under receiver so due balance increases
      const receiverTransaction: Transaction = {
        id: receiverTxId,
        date: today,
        clientId: 'p2p-transfer',
        associateId: receiverAssoc.id,
        shareType: `Transfer from ${senderAssoc.name}`,
        amount: numAmount,
        profit: 0,
        kind: 'held',
        distributionId: transferId,
      };

      // 4. Send automated notification message to receiver thread
      const notificationMsg: Message = {
        id: 'msg-' + generateId(),
        senderRole: 'associate',
        senderId: senderAssoc.id,
        senderName: senderAssoc.name,
        receiverId: receiverAssoc.id,
        receiverName: receiverAssoc.name,
        associateId: receiverAssoc.id,
        subject: `💸 Balance Transfer Received: ${formatMoney(numAmount)}`,
        content: `Assalamu Alaikum ${receiverAssoc.name},\n\nI have transferred ${formatMoney(numAmount)} to your account ledger.\n\nReference: ${newTransfer.note}\nDate: ${today}\nTransfer ID: ${transferId}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
        category: 'payment',
      };

      const updatedDb: AppDatabase = {
        ...db,
        payments: [...db.payments, senderPayment],
        transactions: [...db.transactions, receiverTransaction],
        balanceTransfers: [newTransfer, ...(db.balanceTransfers || [])],
        messages: [...(db.messages || []), notificationMsg],
      };

      const commitMsg = `Balance Transfer: ${senderAssoc.name} sent ${formatMoney(numAmount)} to ${receiverAssoc.name}`;
      await onUpdateDb(updatedDb, commitMsg);

      setIsModalOpen(false);
      setIsConfirming(false);
      setTransferAmount('');
      setTransferNote('');
      showNotice(
        `Successfully transferred ${formatMoney(numAmount)} to ${receiverAssoc.name}!`,
        'success'
      );
    } catch (err: any) {
      showNotice('Failed to execute transfer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTransferId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotice(`Transfer ID ${id} copied to clipboard!`);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Banner / Available Balance Header */}
      <div className="bg-gradient-to-r from-[#10243a] via-[#1a3756] to-[#10243a] rounded-2xl p-4 sm:p-5 text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-orange-500/15 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f28c28] to-[#ffaa44] text-[#10243a] flex items-center justify-center font-black text-xl flex-shrink-0 shadow-lg shadow-orange-500/20">
              <ArrowRightLeft className="w-6 h-6 text-[#10243a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {isAdmin ? 'Admin Master Control' : 'Associate P2P Transfer'}
                </span>
                <span className="text-xs text-slate-300">Instant Ledger Settlement</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {isAdmin ? 'Associate Balance Transfers Master Audit' : 'Associate-to-Associate Balance Transfer'}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {isAdmin
                  ? 'Monitor, verify, or execute peer-to-peer balance disbursements between certified associates with zero delay.'
                  : 'Send any portion of your earned, unpaid profit balance directly to fellow associates for site expenses, advance sharing, or collaborative splits.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            {/* Balance Card for Associate */}
            {!isAdmin && (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-left">
                <span className="text-[10.5px] uppercase font-semibold text-slate-300 block">
                  Available Transferable Due
                </span>
                <div className="text-lg font-black text-orange-400">
                  {formatMoney(availableBalance)}
                </div>
              </div>
            )}

            <button
              id="initiateTransferBtn"
              onClick={handleOpenTransferModal}
              disabled={!isAdmin && availableBalance <= 0.001}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${
                !isAdmin && availableBalance <= 0.001
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#f28c28] hover:bg-[#e07f20] text-white shadow-orange-500/25'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isAdmin ? 'Execute Balance Transfer' : 'Send Balance to Associate'}</span>
            </button>
          </div>
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Transfers
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {allTransfers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Completed network transfers</div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Volume Transferred
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
            {formatMoney(allTransfers.reduce((sum, t) => sum + (t.amount || 0), 0))}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">P2P peer settlement amount</div>
        </div>

        {!isAdmin && currentAssociateId && (
          <>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Sent by Me
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight">
                {formatMoney(
                  allTransfers
                    .filter((t) => t.senderId === currentAssociateId)
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {allTransfers.filter((t) => t.senderId === currentAssociateId).length} outgoing transfers
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Received by Me
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 tracking-tight">
                {formatMoney(
                  allTransfers
                    .filter((t) => t.receiverId === currentAssociateId)
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {allTransfers.filter((t) => t.receiverId === currentAssociateId).length} incoming transfers
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Active Partners
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {activeAssociates.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Eligible transfer participants</div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Audit Status
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
                100% Balanced
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Automated double-entry logic</div>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transfers by sender, receiver, amount, date, or note..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allTransfers.filter((t) => t.senderId === currentAssociateId || t.receiverId === currentAssociateId).length})
            </button>
            <button
              onClick={() => setFilterType('sent')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterType === 'sent' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Sent</span>
            </button>
            <button
              onClick={() => setFilterType('received')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterType === 'received' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>Received</span>
            </button>
          </div>
        )}
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a] flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-orange-500" />
              <span>Peer-to-Peer Balance Transfer Ledger</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Chronological log of associate balance transfers and disbursement adjustments
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredTransfers.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredTransfers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <ArrowRightLeft className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-600">No Balance Transfers Found</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {searchTerm
                  ? 'No records matched your search query.'
                  : 'No peer-to-peer balance transfers recorded yet. Click "Send Balance to Associate" to initiate one.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Sender Associate</th>
                  <th className="px-3.5 py-2.5">Receiver Associate</th>
                  <th className="px-3.5 py-2.5">Purpose / Note</th>
                  <th className="px-3.5 py-2.5">Amount</th>
                  <th className="px-3.5 py-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((tx) => {
                  const isOutgoing = !isAdmin && currentAssociateId === tx.senderId;
                  const isIncoming = !isAdmin && currentAssociateId === tx.receiverId;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.date}</span>
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isOutgoing ? 'text-rose-600 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {tx.senderName}
                          </span>
                          {isOutgoing && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold">
                              You Sent
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Receiver */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isIncoming ? 'text-emerald-600 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {tx.receiverName}
                          </span>
                          {isIncoming && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                              You Received
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Note */}
                      <td className="px-3.5 py-2.5 text-slate-600 max-w-xs">
                        <span className="line-clamp-1 italic text-[11.5px]">
                          {tx.note || 'P2P balance transfer'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div
                          className={`font-black text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                            isOutgoing
                              ? 'bg-rose-50 text-rose-600'
                              : isIncoming
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isOutgoing ? (
                            <ArrowUpRight className="w-3 h-3 text-rose-500" />
                          ) : isIncoming ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                          )}
                          <span>
                            {isOutgoing ? '-' : isIncoming ? '+' : ''}
                            {formatMoney(tx.amount)}
                          </span>
                        </div>
                      </td>

                      {/* Receipt Action */}
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleCopyTransferId(tx.id)}
                          className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy Transfer Reference ID"
                        >
                          {copiedId === tx.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{tx.id.slice(0, 10)}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Transfer Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#10243a] to-[#1e3e60] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Send Associate Balance Transfer
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Instant zero-fee transfer from your available due balance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4 text-xs">
              {/* Available Balance Reminder Card */}
              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-orange-900 block">
                    {isAdmin ? 'Sender Transferable Balance:' : 'Your Transferable Balance:'}
                  </span>
                  <div className="text-lg font-black text-orange-600">
                    {formatMoney(effectiveAvailableBalance)}
                  </div>
                </div>
                <div className="text-[11px] text-orange-800 text-right">
                  Drawn from unpaid due earnings
                </div>
              </div>

              {/* Admin: Sender Selector */}
              {isAdmin && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Debit From Associate (Sender) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={senderId}
                    onChange={(e) => {
                      setSenderId(e.target.value);
                      const otherReceivers = activeAssociates.filter((a) => a.id !== e.target.value);
                      setReceiverId(otherReceivers[0]?.id || '');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                  >
                    {activeAssociates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — Due: {formatMoney(calculateAssociateTotals(db, a.id).due)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Credit To Associate (Recipient) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                >
                  <option value="" disabled>
                    -- Select recipient associate --
                  </option>
                  {potentialReceivers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone})
                    </option>
                  ))}
                </select>
                {potentialReceivers.length === 0 && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    No other active associates found to transfer to.
                  </p>
                )}
              </div>

              {/* Amount Input & Shortcut Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Transfer Amount (BDT) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-slate-400 font-medium">
                    Max: {formatMoney(effectiveAvailableBalance)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={effectiveAvailableBalance}
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount to transfer..."
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>

                {/* Percentage Shortcuts */}
                {effectiveAvailableBalance > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSetPercentage(pct)}
                        className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 font-bold text-[10.5px] transition-colors cursor-pointer"
                      >
                        {pct === 100 ? 'Max (100%)' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Purpose / Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transfer Purpose / Reference Note
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Site fuel reimbursement, advance split, material share"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                />
              </div>

              {/* Preview Summary */}
              {parseFloat(transferAmount) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11.5px] space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Balance Before:</span>
                    <span className="font-semibold text-slate-700">
                      {formatMoney(effectiveAvailableBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Transfer Amount:</span>
                    <span className="font-bold text-rose-600">
                      -{formatMoney(parseFloat(transferAmount) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                    <span>Balance After:</span>
                    <span className="text-emerald-700">
                      {formatMoney(
                        Math.max(0, effectiveAvailableBalance - (parseFloat(transferAmount) || 0))
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Confirmation check */}
              {isConfirming ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Please Confirm Transfer</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Transfer <span className="font-black text-slate-900">{formatMoney(parseFloat(transferAmount) || 0)}</span> to{' '}
                    <span className="font-bold text-slate-900">
                      {potentialReceivers.find((a) => a.id === receiverId)?.name}
                    </span>
                    ? This will immediately deduct from your due balance and credit the recipient ledger.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirming(false)}
                      className="flex-1 py-1.5 rounded-lg border border-amber-300 text-amber-800 font-semibold bg-white hover:bg-amber-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Transferring...' : 'Yes, Send Now'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseFloat(transferAmount);
                      if (isNaN(num) || num <= 0 || num > effectiveAvailableBalance || !receiverId) {
                        showNotice('Please complete valid recipient and amount before confirming.', 'error');
                        return;
                      }
                      setIsConfirming(true);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Review & Confirm</span>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
