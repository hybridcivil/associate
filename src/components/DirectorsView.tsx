import React, { useState, useMemo } from 'react';
import {
  AppDatabase,
  Session,
  Director,
  DirectorDistribution,
  DirectorShareItem,
  Transaction,
} from '../types';
import {
  generateId,
  formatMoney,
  calculateAssociateTotals,
} from '../utils/storage';
import {
  Award,
  Users,
  PieChart,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Trash2,
  Edit2,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  ArrowRight,
  TrendingUp,
  FileText,
  CreditCard,
  UserCheck,
  Landmark,
  X,
  RotateCcw,
} from 'lucide-react';

interface DirectorsViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => Promise<any> | void;
  onOpenResetModal?: () => void;
}

export const DirectorsView: React.FC<DirectorsViewProps> = ({
  db,
  session,
  onUpdateDb,
  onOpenResetModal,
}) => {
  const isAdmin = session.role === 'admin';

  // Sub-tabs: roster | calculator | history
  const [activeTab, setActiveTab] = useState<'roster' | 'calculator' | 'history'>('roster');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Notification state
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Director Modal (Add / Edit)
  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);
  const [editingDirectorId, setEditingDirectorId] = useState<string | null>(null);
  const [dirName, setDirName] = useState('');
  const [dirDesignation, setDirDesignation] = useState('Director');
  const [dirSalary, setDirSalary] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirEmail, setDirEmail] = useState('');
  const [dirStatus, setDirStatus] = useState<'active' | 'inactive'>('active');
  const [dirAssociateId, setDirAssociateId] = useState('');
  const [dirNid, setDirNid] = useState('');
  const [dirJoiningDate, setDirJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dirBankInfo, setDirBankInfo] = useState('');
  const [dirNotes, setDirNotes] = useState('');

  // 90% Calculator form state
  // Calculate company accumulated profit as default suggestion
  const totalCompanyProfit = useMemo(() => {
    return (db.transactions || []).reduce((sum, t) => sum + (Number(t.profit) || Number(t.amount) || 0), 0);
  }, [db.transactions]);

  const [poolAmountInput, setPoolAmountInput] = useState<string>(
    totalCompanyProfit > 0 ? String(Math.round(totalCompanyProfit)) : '100000'
  );
  const [distTitle, setDistTitle] = useState('Director 90% Net Profit Share Distribution');
  const [distNotes, setDistNotes] = useState('');
  const [autoCreditAssociates, setAutoCreditAssociates] = useState(true);
  const [isExecutingDist, setIsExecutingDist] = useState(false);
  const [confirmDistModalOpen, setConfirmDistModalOpen] = useState(false);

  // Selected distribution voucher for viewing/printing
  const [selectedVoucher, setSelectedVoucher] = useState<DirectorDistribution | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Directors list
  const directorsList = useMemo(() => {
    return Array.isArray(db.directors) ? db.directors : [];
  }, [db.directors]);

  // Active directors
  const activeDirectors = useMemo(() => {
    return directorsList.filter((d) => d.status === 'active');
  }, [directorsList]);

  // Total active monthly base salary pool
  const totalActiveSalary = useMemo(() => {
    return activeDirectors.reduce((sum, d) => sum + (Number(d.salary) || 0), 0);
  }, [activeDirectors]);

  // Filtered directors for roster table
  const filteredDirectors = useMemo(() => {
    return directorsList.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (d.name || '').toLowerCase().includes(q);
        const matchesDesig = (d.designation || '').toLowerCase().includes(q);
        const matchesPhone = (d.phone || '').toLowerCase().includes(q);
        const matchesEmail = (d.email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesig && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [directorsList, statusFilter, searchTerm]);

  // Distribution calculations for 90% pool
  const currentPoolNum = Math.max(0, parseFloat(poolAmountInput) || 0);
  const directorPool90 = currentPoolNum * 0.90;
  const companyRetained10 = currentPoolNum * 0.10;

  // Items calculated dynamically based on active directors & salary %
  const calculatedShareItems = useMemo<DirectorShareItem[]>(() => {
    if (totalActiveSalary <= 0 || activeDirectors.length === 0) return [];
    return activeDirectors.map((d) => {
      const salary = Number(d.salary) || 0;
      const salaryPct = (salary / totalActiveSalary) * 100;
      const shareAmt = directorPool90 * (salary / totalActiveSalary);
      return {
        directorId: d.id,
        directorName: d.name,
        designation: d.designation,
        salary,
        salaryPercentage: Math.round(salaryPct * 100) / 100,
        shareAmount: Math.round(shareAmt),
        status: 'paid',
        paymentMethod: d.associateId ? 'Associate Ledger Credit' : d.bankInfo ? 'Bank Transfer' : 'Direct Cash / Cheque',
      };
    });
  }, [activeDirectors, totalActiveSalary, directorPool90]);

  // Historical distributions
  const distributionsHistory = useMemo(() => {
    const list = Array.isArray(db.directorDistributions) ? db.directorDistributions : [];
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.directorDistributions]);

  const totalDistributedToDate = useMemo(() => {
    return distributionsHistory.reduce((sum, dst) => sum + (Number(dst.directorPoolAmount) || 0), 0);
  }, [distributionsHistory]);

  // Handle Open Create / Edit Director
  const handleOpenAddDirector = () => {
    setEditingDirectorId(null);
    setDirName('');
    setDirDesignation('Director');
    setDirSalary('');
    setDirPhone('');
    setDirEmail('');
    setDirStatus('active');
    setDirAssociateId('');
    setDirNid('');
    setDirJoiningDate(new Date().toISOString().slice(0, 10));
    setDirBankInfo('');
    setDirNotes('');
    setIsDirectorModalOpen(true);
  };

  const handleOpenEditDirector = (d: Director) => {
    setEditingDirectorId(d.id);
    setDirName(d.name);
    setDirDesignation(d.designation);
    setDirSalary(String(d.salary || ''));
    setDirPhone(d.phone || '');
    setDirEmail(d.email || '');
    setDirStatus(d.status || 'active');
    setDirAssociateId(d.associateId || '');
    setDirNid(d.nid || '');
    setDirJoiningDate(d.joiningDate || new Date().toISOString().slice(0, 10));
    setDirBankInfo(d.bankInfo || '');
    setDirNotes(d.notes || '');
    setIsDirectorModalOpen(true);
  };

  // Save Director Form
  const handleSaveDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirName.trim()) {
      showNotice('Director name is required.', 'error');
      return;
    }
    const salaryNum = parseFloat(dirSalary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      showNotice('Please enter a valid monthly base salary greater than 0.', 'error');
      return;
    }

    const directorObj: Director = {
      id: editingDirectorId || 'dir-' + generateId(),
      name: dirName.trim(),
      designation: dirDesignation.trim() || 'Director',
      salary: salaryNum,
      phone: dirPhone.trim(),
      email: dirEmail.trim() || undefined,
      status: dirStatus,
      associateId: dirAssociateId.trim() || undefined,
      nid: dirNid.trim() || undefined,
      joiningDate: dirJoiningDate,
      bankInfo: dirBankInfo.trim() || undefined,
      notes: dirNotes.trim() || undefined,
      createdAt: editingDirectorId
        ? directorsList.find((d) => d.id === editingDirectorId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedDirectors: Director[];
    let commitMsg = '';

    if (editingDirectorId) {
      updatedDirectors = directorsList.map((d) => (d.id === editingDirectorId ? directorObj : d));
      commitMsg = `Update director record: ${directorObj.name}`;
    } else {
      updatedDirectors = [...directorsList, directorObj];
      commitMsg = `Add new director: ${directorObj.name} (Base Salary ৳${salaryNum.toLocaleString('en-BD')})`;
    }

    const updatedDb: AppDatabase = {
      ...db,
      directors: updatedDirectors,
    };

    await onUpdateDb(updatedDb, commitMsg);
    setIsDirectorModalOpen(false);
    showNotice(editingDirectorId ? 'Director profile updated.' : 'New director entry saved successfully.');
  };

  // Toggle Director Status
  const handleToggleDirectorStatus = async (director: Director) => {
    const newStatus: 'active' | 'inactive' = director.status === 'active' ? 'inactive' : 'active';
    const updated = directorsList.map((d) =>
      d.id === director.id ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
    );
    const updatedDb: AppDatabase = { ...db, directors: updated };
    await onUpdateDb(updatedDb, `Update director status: ${director.name} to ${newStatus}`);
    showNotice(`${director.name} status set to ${newStatus}.`);
  };

  // Delete Director
  const handleDeleteDirector = async (director: Director) => {
    if (!window.confirm(`Are you sure you want to remove ${director.name} from the Board of Directors?`)) {
      return;
    }
    const updated = directorsList.filter((d) => d.id !== director.id);
    const updatedDb: AppDatabase = { ...db, directors: updated };
    await onUpdateDb(updatedDb, `Delete director ${director.id}: ${director.name}`);
    showNotice(`Director ${director.name} removed.`);
  };

  // Execute 90% Profit Share Distribution
  const handleExecuteDistribution = async () => {
    if (calculatedShareItems.length === 0) {
      showNotice('No active directors available for distribution.', 'error');
      return;
    }
    if (currentPoolNum <= 0) {
      showNotice('Please enter a distributable profit pool amount greater than 0.', 'error');
      return;
    }

    setIsExecutingDist(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const distId = 'dist-' + generateId();

      const newDistribution: DirectorDistribution = {
        id: distId,
        date: today,
        title: distTitle.trim() || 'Director 90% Net Profit Share Distribution',
        totalProfitPool: currentPoolNum,
        directorSharePercentage: 90,
        directorPoolAmount: directorPool90,
        companyRetainedAmount: companyRetained10,
        totalDirectorsSalary: totalActiveSalary,
        activeDirectorsCount: activeDirectors.length,
        distributionItems: calculatedShareItems,
        notes: distNotes.trim() || undefined,
        recordedBy: session.name || 'Admin',
        status: 'disbursed',
        createdAt: new Date().toISOString(),
      };

      // If auto-credit associates is enabled, add Transaction records for linked associate accounts
      let additionalTransactions: Transaction[] = [];
      if (autoCreditAssociates) {
        for (const item of calculatedShareItems) {
          const matchingDir = activeDirectors.find((d) => d.id === item.directorId);
          if (matchingDir && matchingDir.associateId) {
            const tx: Transaction = {
              id: 'tx-dist-' + generateId(),
              date: today,
              clientId: 'director-dividend',
              associateId: matchingDir.associateId,
              shareType: `Director 90% Share: ${newDistribution.title}`,
              amount: item.shareAmount,
              profit: 0,
              kind: 'held',
              distributionId: distId,
            };
            additionalTransactions.push(tx);
          }
        }
      }

      const updatedDb: AppDatabase = {
        ...db,
        directorDistributions: [newDistribution, ...(db.directorDistributions || [])],
        transactions: additionalTransactions.length > 0 ? [...db.transactions, ...additionalTransactions] : db.transactions,
      };

      const commitMsg = `Director 90% Profit Share Executed: ${formatMoney(directorPool90)} distributed among ${activeDirectors.length} directors`;
      await onUpdateDb(updatedDb, commitMsg);

      setConfirmDistModalOpen(false);
      setSelectedVoucher(newDistribution);
      showNotice('90% Director distribution executed and recorded successfully!');
      setActiveTab('history');
    } catch (err: any) {
      showNotice(err.message || 'Failed to record distribution.', 'error');
    } finally {
      setIsExecutingDist(false);
    }
  };

  // Delete historical distribution
  const handleDeleteDistribution = async (dist: DirectorDistribution) => {
    if (!window.confirm(`Delete distribution record "${dist.title}" (${formatMoney(dist.directorPoolAmount)})?`)) {
      return;
    }
    const updated = distributionsHistory.filter((d) => d.id !== dist.id);
    const updatedDb: AppDatabase = { ...db, directorDistributions: updated };
    await onUpdateDb(updatedDb, `Delete distribution ${dist.id}: ${dist.title}`);
    showNotice('Distribution record deleted.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-medium">{notification.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Board of Directors & 90% Share Distribution
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Salary-Proportional System
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Director registry, fixed base salary compensation, and automated 90% net profit share distributions according to salary-wise percentage.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => {
                setActiveTab('calculator');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
            >
              <PieChart className="w-4 h-4" />
              <span>Calculate 90% Share</span>
            </button>

            <button
              onClick={handleOpenAddDirector}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-300"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Add Director</span>
            </button>

            {onOpenResetModal && (
              <button
                onClick={onOpenResetModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition border border-rose-200"
                title="Database Reset System"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>DB Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center justify-between">
              <span>Active Directors</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {activeDirectors.length}
              <span className="text-xs font-normal text-slate-500 ml-1">
                / {directorsList.length} total
              </span>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
            <div className="text-[11px] font-medium text-indigo-700 uppercase tracking-wide flex items-center justify-between">
              <span>Monthly Salary Pool</span>
              <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold text-indigo-950 mt-1">
              {formatMoney(totalActiveSalary)}
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
            <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide flex items-center justify-between">
              <span>Accumulated Profit</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-950 mt-1">
              {formatMoney(totalCompanyProfit)}
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
            <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wide flex items-center justify-between">
              <span>Total 90% Distributed</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-amber-950 mt-1">
              {formatMoney(totalDistributedToDate)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-6 pt-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Board Roster & Salary Base ({directorsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'calculator'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>90% Distribution Engine & Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Distribution History & Vouchers ({distributionsHistory.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DIRECTORS ROSTER & SALARY BASE */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search director name, designation, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500">Status:</span>
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
                {(['all', 'active', 'inactive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                      statusFilter === st ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Directors Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Director Name & Role</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4 text-right">Base Salary</th>
                    <th className="py-3 px-4">Salary % Ratio (Active Pool)</th>
                    <th className="py-3 px-4">Linked Associate</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDirectors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No directors found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDirectors.map((d) => {
                      const salaryNum = Number(d.salary) || 0;
                      const ratio =
                        d.status === 'active' && totalActiveSalary > 0
                          ? ((salaryNum / totalActiveSalary) * 100).toFixed(2)
                          : '0.00';

                      const linkedAssoc = d.associateId
                        ? db.associates.find((a) => a.id === d.associateId)
                        : null;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{d.name}</span>
                              {d.status === 'active' && (
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Active Director" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{d.designation}</div>
                            {d.nid && <div className="text-[10px] text-slate-400 font-mono mt-0.5">NID: {d.nid}</div>}
                          </td>

                          <td className="py-3 px-4 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{d.phone || 'N/A'}</span>
                            </div>
                            {d.email && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span>{d.email}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatMoney(salaryNum)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-semibold text-indigo-700">{ratio}%</span>
                                <span className="text-[10px] text-slate-400">of 90% share</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(ratio)))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {linkedAssoc ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                                <UserCheck className="w-3 h-3" />
                                <span>{linkedAssoc.name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Direct Pay</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleDirectorStatus(d)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition capitalize ${
                                d.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {d.status}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleOpenEditDirector(d)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                title="Edit Director"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDirector(d)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Delete Director"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 90% SHARE DISTRIBUTION ENGINE & CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Calculation Parameters & Live Simulation */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Distributable Profit Pool</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Distributable Profit Pool (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={poolAmountInput}
                    onChange={(e) => setPoolAmountInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 500000"
                  />
                </div>
              </div>

              {/* Quick shortcut presets */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Quick Amount Presets:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {totalCompanyProfit > 0 && (
                    <button
                      type="button"
                      onClick={() => setPoolAmountInput(String(Math.round(totalCompanyProfit)))}
                      className="px-2 py-1 text-xs rounded border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium hover:bg-emerald-100 transition truncate text-left"
                    >
                      Current Profit (৳{Math.round(totalCompanyProfit).toLocaleString()})
                    </button>
                  )}
                  {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPoolAmountInput(String(amt))}
                      className="px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono transition text-left"
                    >
                      ৳{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 90% / 10% Split Card */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Total Input Pool:</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(currentPoolNum)}</span>
                </div>

                <div className="flex justify-between items-center text-indigo-700 font-semibold pt-1 border-t border-slate-200">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Directors Share (90%):</span>
                  </span>
                  <span className="font-mono text-sm">{formatMoney(directorPool90)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Company Reserve (10%):</span>
                  </span>
                  <span className="font-mono">{formatMoney(companyRetained10)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200 text-[11px]">
                  <span>Active Directors:</span>
                  <span>{activeDirectors.length} persons (Salary Pool: {formatMoney(totalActiveSalary)})</span>
                </div>
              </div>

              {/* Distribution Metadata Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Distribution Title / Reason
                  </label>
                  <input
                    type="text"
                    value={distTitle}
                    onChange={(e) => setDistTitle(e.target.value)}
                    placeholder="e.g. Q1 2026 Director Profit Dividend"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Reference Details
                  </label>
                  <textarea
                    rows={2}
                    value={distNotes}
                    onChange={(e) => setDistNotes(e.target.value)}
                    placeholder="Optional notes or board meeting minutes reference..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoCreditAssociates}
                    onChange={(e) => setAutoCreditAssociates(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700">
                    Auto-credit linked Associate accounts with their 90% payout share
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={calculatedShareItems.length === 0 || currentPoolNum <= 0}
                onClick={() => setConfirmDistModalOpen(true)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Review & Execute 90% Distribution</span>
              </button>
            </div>
          </div>

          {/* Right Column: Calculated Breakdown for Each Director */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Salary-Wise Proportional Payout Breakdown (90% Pool)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Each active director receives: (90% of Profit Pool) × (Director Salary / Total Directors Salary)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                    90% Pool: {formatMoney(directorPool90)}
                  </span>
                </div>
              </div>

              {calculatedShareItems.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-xs font-medium">No active directors available to calculate shares.</p>
                  <p className="text-[11px] mt-1">Please add active directors with base salary in the Board Roster tab.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Director</th>
                        <th className="py-2.5 px-3 text-right">Base Salary</th>
                        <th className="py-2.5 px-3 text-center">Salary % Ratio</th>
                        <th className="py-2.5 px-3 text-right">Calculated 90% Payout</th>
                        <th className="py-2.5 px-3">Disbursement Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculatedShareItems.map((item) => (
                        <tr key={item.directorId} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{item.directorName}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{item.designation}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {formatMoney(item.salary)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                              {item.salaryPercentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                            {formatMoney(item.shareAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {item.paymentMethod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      <tr>
                        <td className="py-2.5 px-3 text-slate-900">Total (100% of 90% Pool)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                          {formatMoney(totalActiveSalary)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-indigo-700">100.00%</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                          {formatMoney(calculatedShareItems.reduce((s, i) => s + i.shareAmount, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">90% Net Profit Pool</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISTRIBUTION HISTORY & VOUCHERS */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Official 90% Profit Share Distribution Records</h2>
                <p className="text-xs text-slate-500">Audit log of all executed director distributions, vouchers, and payouts.</p>
              </div>
            </div>

            {distributionsHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">No past director distributions recorded yet.</p>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="mt-3 text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Create First 90% Share Distribution →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {distributionsHistory.map((dist) => (
                  <div key={dist.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{dist.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {dist.id}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {dist.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Date: <strong className="text-slate-700">{dist.date}</strong></span>
                        <span>Total Profit Pool: <strong className="text-slate-700">{formatMoney(dist.totalProfitPool)}</strong></span>
                        <span>90% Directors Share: <strong className="text-indigo-700">{formatMoney(dist.directorPoolAmount)}</strong></span>
                        <span>10% Retained: <strong className="text-slate-700">{formatMoney(dist.companyRetainedAmount)}</strong></span>
                        <span>Active Directors: <strong className="text-slate-700">{dist.activeDirectorsCount}</strong></span>
                      </div>
                      {dist.notes && <p className="text-[11px] text-slate-500 italic mt-1">{dist.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setSelectedVoucher(dist)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View Voucher</span>
                      </button>

                      <button
                        onClick={() => {
                          const text = `90% Director Share Distribution - ${dist.title}\nDate: ${dist.date}\nTotal Pool: ${formatMoney(dist.totalProfitPool)}\n90% Director Pool: ${formatMoney(dist.directorPoolAmount)}\nRetained 10%: ${formatMoney(dist.companyRetainedAmount)}\n\nBreakdown:\n` +
                            dist.distributionItems.map((item) => `- ${item.directorName} (${item.salaryPercentage}%): ${formatMoney(item.shareAmount)}`).join('\n');
                          copyToClipboard(text, dist.id);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                        title="Copy Summary"
                      >
                        {copiedId === dist.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDeleteDistribution(dist)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DIRECTOR */}
      {/* ========================================================================= */}
      {isDirectorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{editingDirectorId ? 'Edit Director Profile' : 'Add New Board Director'}</span>
              </h3>
              <button
                onClick={() => setIsDirectorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDirector} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Director Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={dirName}
                    onChange={(e) => setDirName(e.target.value)}
                    placeholder="e.g. Engr. Md. Rafiqul Alam"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={dirDesignation}
                    onChange={(e) => setDirDesignation(e.target.value)}
                    placeholder="e.g. Managing Director, Technical Director"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Base Salary (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="500"
                    value={dirSalary}
                    onChange={(e) => setDirSalary(e.target.value)}
                    placeholder="e.g. 80000"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Used for 90% share proportional calculation</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={dirPhone}
                    onChange={(e) => setDirPhone(e.target.value)}
                    placeholder="01711223344"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={dirEmail}
                    onChange={(e) => setDirEmail(e.target.value)}
                    placeholder="director@hybridcivil.net"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    National ID / Passport
                  </label>
                  <input
                    type="text"
                    value={dirNid}
                    onChange={(e) => setDirNid(e.target.value)}
                    placeholder="19842691234567890"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={dirJoiningDate}
                    onChange={(e) => setDirJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link with Certified Associate Account (Optional)
                  </label>
                  <select
                    value={dirAssociateId}
                    onChange={(e) => setDirAssociateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">None (Standalone Director - Direct Bank/Cheque)</option>
                    {db.associates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.phone})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">
                    If linked, 90% profit share payouts can be directly credited into their associate ledger.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank / Payment Details
                  </label>
                  <input
                    type="text"
                    value={dirBankInfo}
                    onChange={(e) => setDirBankInfo(e.target.value)}
                    placeholder="e.g. Dutch-Bangla Bank, A/C: 115.120.44558"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="dirStatus"
                        value="active"
                        checked={dirStatus === 'active'}
                        onChange={() => setDirStatus('active')}
                      />
                      <span>Active (Eligible for 90% Distribution)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="dirStatus"
                        value="inactive"
                        checked={dirStatus === 'inactive'}
                        onChange={() => setDirStatus('inactive')}
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Scope of Authority
                  </label>
                  <textarea
                    rows={2}
                    value={dirNotes}
                    onChange={(e) => setDirNotes(e.target.value)}
                    placeholder="e.g. Oversees corporate governance and legal tender documentation..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDirectorModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  {editingDirectorId ? 'Save Changes' : 'Create Director'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM 90% DISTRIBUTION */}
      {/* ========================================================================= */}
      {confirmDistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Confirm 90% Share Distribution</span>
              </h3>
              <button
                onClick={() => setConfirmDistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Important Governance Verification</span>
                </div>
                <p className="text-[11px]">
                  You are about to execute a 90% profit share distribution of <strong>{formatMoney(directorPool90)}</strong> among <strong>{activeDirectors.length} active directors</strong> based strictly on their monthly base salary ratio.
                </p>
              </div>

              <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex justify-between">
                  <span className="text-slate-500">Distribution Title:</span>
                  <span className="font-semibold text-slate-900">{distTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distributable Pool:</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(currentPoolNum)}</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-semibold">
                  <span>90% Directors Share:</span>
                  <span className="font-mono">{formatMoney(directorPool90)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>10% Company Reserve:</span>
                  <span className="font-mono">{formatMoney(companyRetained10)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Auto-credit Associate Ledgers:</span>
                  <span className="font-semibold text-emerald-700">{autoCreditAssociates ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isExecutingDist}
                  onClick={() => setConfirmDistModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isExecutingDist}
                  onClick={handleExecuteDistribution}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  {isExecutingDist ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Disburse</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL DISTRIBUTION VOUCHER / RECEIPT */}
      {/* ========================================================================= */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Voucher Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                  Hybrid Civil Engineers & Associates
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Director 90% Profit Share Dividend Voucher</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Body */}
            <div className="p-6 space-y-5 text-xs text-slate-800 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-medium">Voucher ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoucher.id}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-medium">Execution Date</span>
                  <span className="font-bold text-slate-900">{selectedVoucher.date}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-medium">Total Profit Pool</span>
                  <span className="font-mono font-bold text-slate-900">{formatMoney(selectedVoucher.totalProfitPool)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-medium">90% Payout Total</span>
                  <span className="font-mono font-bold text-emerald-700">{formatMoney(selectedVoucher.directorPoolAmount)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Director Name & Title</th>
                      <th className="py-2.5 px-3 text-right">Base Salary</th>
                      <th className="py-2.5 px-3 text-center">Salary % Ratio</th>
                      <th className="py-2.5 px-3 text-right">90% Share Amount</th>
                      <th className="py-2.5 px-3 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVoucher.distributionItems.map((item) => (
                      <tr key={item.directorId}>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900">{item.directorName}</span>
                          <span className="text-[11px] text-slate-500 block">{item.designation}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatMoney(item.salary)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-indigo-700">
                          {item.salaryPercentage.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                          {formatMoney(item.shareAmount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Disbursed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td className="py-2.5 px-3">Total Distributed (90%)</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatMoney(selectedVoucher.totalDirectorsSalary)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-indigo-700">100.00%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                        {formatMoney(selectedVoucher.directorPoolAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 text-[10px]">10% Retained: {formatMoney(selectedVoucher.companyRetainedAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedVoucher.notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                  <strong>Notes:</strong> {selectedVoucher.notes}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Authorized by: <strong>{selectedVoucher.recordedBy}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Voucher</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = `Director 90% Share Voucher: ${selectedVoucher.title} (ID: ${selectedVoucher.id})\nDate: ${selectedVoucher.date}\nTotal Pool: ${formatMoney(selectedVoucher.totalProfitPool)}\n90% Payout: ${formatMoney(selectedVoucher.directorPoolAmount)}\n\n` +
                        selectedVoucher.distributionItems.map((i) => `${i.directorName} (${i.salaryPercentage}%): ${formatMoney(i.shareAmount)}`).join('\n');
                      copyToClipboard(text, selectedVoucher.id);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    {copiedId === selectedVoucher.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === selectedVoucher.id ? 'Copied' : 'Copy Voucher'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
