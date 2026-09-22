import React, { useState } from 'react';
import { AppDatabase, Associate } from '../types';
import {
  generateId,
  saveDatabase,
  calculateAssociateTotals,
  formatMoney,
  syncDatabaseToGitHub,
  loadGitHubConfig,
} from '../utils/storage';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Lock,
  Mail,
  MapPin,
  X,
  AlertCircle,
  Github,
} from 'lucide-react';

interface AssociatesViewProps {
  db: AppDatabase;
  onUpdateDb: (updated: AppDatabase) => void;
}

export const AssociatesView: React.FC<AssociatesViewProps> = ({
  db,
  onUpdateDb,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPassword('');
    setEmail('');
    setAddress('');
    setStatus('active');
  };

  const handleEditClick = (assoc: Associate) => {
    setEditingId(assoc.id);
    setName(assoc.name);
    setPhone(assoc.phone);
    setPassword(''); // leave blank to keep old
    setEmail(assoc.email || '');
    setAddress(assoc.address || '');
    setStatus(assoc.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    const assoc = db.associates.find((a) => a.id === id);
    if (!assoc) return;
    if (
      !confirm(
        `Are you sure you want to remove "${assoc.name}"? Existing distribution records will be preserved.`
      )
    ) {
      return;
    }

    const updatedAssociates = db.associates.filter((a) => a.id !== id);
    const updatedDb: AppDatabase = {
      ...db,
      associates: updatedAssociates,
    };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    showNotice(`Associate "${assoc.name}" was removed.`, 'success');

    // Auto-update to GitHub repository
    syncDatabaseToGitHub(
      updatedDb,
      `Associate removed: ${assoc.name} (${assoc.phone})`
    ).then((res) => {
      if (res.success) {
        showNotice(`Associate "${assoc.name}" removed & auto-synced to GitHub (${res.commitSha})!`, 'success');
      }
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      showNotice('Associate Name and Phone number are required.', 'error');
      return;
    }

    // Phone uniqueness check
    const existing = db.associates.find(
      (a) => a.phone === phone.trim() && a.id !== editingId
    );
    if (existing) {
      showNotice(
        `Phone number "${phone.trim()}" is already assigned to ${existing.name}.`,
        'error'
      );
      return;
    }

    if (!editingId && !password.trim()) {
      showNotice('Please assign a login password for the new associate.', 'error');
      return;
    }

    let updatedAssociates = [...db.associates];
    const isNew = !editingId;
    const targetName = name.trim();
    const targetPhone = phone.trim();

    if (editingId) {
      const old = db.associates.find((a) => a.id === editingId);
      const updated: Associate = {
        id: editingId,
        name: targetName,
        phone: targetPhone,
        password: password.trim() ? password.trim() : old?.password || 'assoc123',
        email: email.trim(),
        address: address.trim(),
        status,
      };
      updatedAssociates = updatedAssociates.map((a) =>
        a.id === editingId ? updated : a
      );
      showNotice(`Associate "${targetName}" successfully updated.`, 'success');
    } else {
      const newAssoc: Associate = {
        id: 'assoc-' + generateId(),
        name: targetName,
        phone: targetPhone,
        password: password.trim(),
        email: email.trim(),
        address: address.trim(),
        status,
      };
      updatedAssociates.push(newAssoc);
      showNotice(
        `Associate "${targetName}" registered. Login with phone: ${targetPhone}`,
        'success'
      );
    }

    const updatedDb: AppDatabase = {
      ...db,
      associates: updatedAssociates,
    };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    resetForm();

    // Auto-update to GitHub repository
    try {
      const ghResult = await syncDatabaseToGitHub(
        updatedDb,
        isNew
          ? `Add new associate: ${targetName} (${targetPhone})`
          : `Update associate: ${targetName} (${targetPhone})`
      );
      if (ghResult.success) {
        showNotice(
          isNew
            ? `Associate "${targetName}" registered & auto-synced to GitHub (${ghResult.commitSha})!`
            : `Associate "${targetName}" updated & auto-synced to GitHub (${ghResult.commitSha})!`,
          'success'
        );
      }
    } catch {
      // Benign fallback
    }
  };

  const filteredAssociates = db.associates.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.phone.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Associate Partner Network
          </h2>
          <p className="text-xs text-slate-500">
            Register civil engineers, manage credentials, and review partnership balances
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
          <span>{notification.text}</span>
        </div>
      )}

      {/* Associate Entry Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#f28c28]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              {editingId ? 'Edit Associate Partner' : 'Register New Associate'}
            </h3>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                id="assocNameInput"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engr. Shafiqur Rahman"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phone (Login ID) *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="assocPhoneInput"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {editingId ? 'New Password (Optional)' : 'Password *'}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="assocPassInput"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? 'Leave blank to preserve' : 'Create login password'}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="assocEmailInput"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="associate@hybridcivil.net"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Location / Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="assocAddressInput"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dhanmondi, Dhaka"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Partner Status
              </label>
              <select
                id="assocStatusSelect"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              >
                <option value="active">Active (Eligible for 5% Pool)</option>
                <option value="inactive">Inactive (Suspended)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              id="saveAssociateBtn"
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {editingId ? 'Update Associate' : 'Save Associate Partner'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Associate Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              Associate Directory ({filteredAssociates.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Active associates receive equal splits from company-wide 5% pools
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="searchAssocInput"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Name & Contact</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Total Earned</th>
                <th className="px-3.5 py-2.5">Paid Out</th>
                <th className="px-3.5 py-2.5">Balance Due</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssociates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No associates found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredAssociates.map((assoc) => {
                  const totals = calculateAssociateTotals(db, assoc.id);
                  const isActive = assoc.status === 'active';
                  return (
                    <tr
                      key={assoc.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-800">{assoc.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{assoc.phone}</span>
                          {assoc.email && (
                            <span className="text-slate-400">· {assoc.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" /> Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {formatMoney(totals.earned)}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                        {formatMoney(totals.paid)}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap">
                        {totals.due > 0 ? (
                          <span className="text-rose-600">{formatMoney(totals.due)}</span>
                        ) : (
                          <span className="text-emerald-600">৳0.00</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`edit-assoc-${assoc.id}`}
                            onClick={() => handleEditClick(assoc)}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Associate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-assoc-${assoc.id}`}
                            onClick={() => handleDeleteClick(assoc.id)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Associate"
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
  );
};
