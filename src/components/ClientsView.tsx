import React, { useState } from 'react';
import { AppDatabase, Client } from '../types';
import { generateId, saveDatabase, formatMoney, recordDeletedClientId } from '../utils/storage';
import { deleteClientFromSupabase } from '../utils/supabase';
import {
  Briefcase,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  UserCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

interface ClientsViewProps {
  db: AppDatabase;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => Promise<any> | void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ db, onUpdateDb }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [project, setProject] = useState('');
  const [price, setPrice] = useState<string>('0');
  const [advance, setAdvance] = useState<string>('0');
  const [associateId, setAssociateId] = useState<string>('');
  const [date, setDate] = useState<string>(
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setProject('');
    setPrice('0');
    setAdvance('0');
    setAssociateId('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleEditClick = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setPhone(client.phone);
    setProject(client.project);
    setPrice(String(client.price || 0));
    setAdvance(String(client.advance || 0));
    setAssociateId(client.associateId || '');
    setDate(client.date || new Date().toISOString().slice(0, 10));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    const target = clientToDelete;
    setIsDeleting(true);

    try {
      recordDeletedClientId(target.id);

      try {
        await fetch(`/api/clients/${target.id}`, { method: 'DELETE' });
      } catch (e) {}
      deleteClientFromSupabase(target.id).catch(() => {});

      const updatedClients = db.clients.filter((c) => c.id !== target.id);
      const updatedDb: AppDatabase = {
        ...db,
        clients: updatedClients,
      };

      await onUpdateDb(updatedDb, `Delete client ${target.id}`);

      if (editingId === target.id) {
        resetForm();
      }

      showNotice(`Client agreement "${target.name}" removed successfully.`, 'success');
      setClientToDelete(null);
    } catch (err: any) {
      showNotice(`Failed to remove client: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !project.trim()) {
      showNotice(
        'Client Name, Phone, and Project/Service description are required.',
        'error'
      );
      return;
    }

    const priceNum = Math.max(0, parseFloat(price) || 0);
    const advanceNum = Math.max(0, parseFloat(advance) || 0);

    let updatedClients = [...db.clients];

    if (editingId) {
      const updated: Client = {
        id: editingId,
        name: name.trim(),
        phone: phone.trim(),
        project: project.trim(),
        price: priceNum,
        advance: advanceNum,
        associateId: associateId || undefined,
        date,
      };
      updatedClients = updatedClients.map((c) =>
        c.id === editingId ? updated : c
      );
      showNotice(`Client agreement "${name.trim()}" updated.`, 'success');
    } else {
      const newClient: Client = {
        id: 'client-' + generateId(),
        name: name.trim(),
        phone: phone.trim(),
        project: project.trim(),
        price: priceNum,
        advance: advanceNum,
        associateId: associateId || undefined,
        date,
      };
      updatedClients.push(newClient);
      showNotice(`Client "${name.trim()}" registered successfully.`, 'success');
    }

    const updatedDb: AppDatabase = {
      ...db,
      clients: updatedClients,
    };
    saveDatabase(updatedDb);
    onUpdateDb(updatedDb);
    resetForm();
  };

  const getAssociateName = (aid?: string) => {
    if (!aid) return 'Direct / Company';
    return db.associates.find((a) => a.id === aid)?.name || 'Direct';
  };

  const filteredClients = db.clients.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.project.toLowerCase().includes(q)
    );
  });

  const activeAssociates = db.associates.filter((a) => a.status === 'active');

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-500" />
            Client & Project Registry
          </h2>
          <p className="text-xs text-slate-500">
            Log structural design, soil testing, and construction consultancy contracts
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

      {/* Entry Form */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#f28c28]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              {editingId ? 'Edit Client Agreement' : 'New Client & Project Entry'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Client / Company Name *
              </label>
              <input
                id="clientNameInput"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Navana Real Estate Ltd."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contact Phone *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="clientPhoneInput"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Project / Service Scope *
              </label>
              <input
                id="clientProjectInput"
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. G+6 Structural Engineering Design & Soil Investigation"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Total Agreed Price (৳)
              </label>
              <input
                id="clientPriceInput"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Advance Paid (৳)
              </label>
              <input
                id="clientAdvanceInput"
                type="number"
                min="0"
                step="0.01"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Referred by Associate (5% Lead)
              </label>
              <div className="relative">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <select
                  id="clientAssociateSelect"
                  value={associateId}
                  onChange={(e) => setAssociateId(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                >
                  <option value="">— Direct Company Client —</option>
                  {activeAssociates.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contract Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="clientDateInput"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              id="saveClientBtn"
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {editingId ? 'Update Client Record' : 'Save Client Record'}
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

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
              Client Records ({filteredClients.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Select any client when distributing net project profit
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="searchClientsInput"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search client, phone, or service..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Client & Phone</th>
                <th className="px-3.5 py-2.5">Project / Service</th>
                <th className="px-3.5 py-2.5">Agreed Price</th>
                <th className="px-3.5 py-2.5">Advance</th>
                <th className="px-3.5 py-2.5">Balance</th>
                <th className="px-3.5 py-2.5">Referred By</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No client records found.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const clientDue = Math.max(0, client.price - client.advance);
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-800">{client.name}</div>
                        <div className="text-[11px] text-slate-500">{client.phone}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 max-w-[220px]">
                        <span className="line-clamp-2">{client.project}</span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {formatMoney(client.price)}
                      </td>
                      <td className="px-3.5 py-2.5 text-emerald-600 font-medium whitespace-nowrap">
                        {formatMoney(client.advance)}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap">
                        {clientDue > 0 ? (
                          <span className="text-rose-600">{formatMoney(clientDue)}</span>
                        ) : (
                          <span className="text-emerald-600">Paid in Full</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {getAssociateName(client.associateId)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`edit-client-${client.id}`}
                            onClick={() => handleEditClick(client)}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Client"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-client-${client.id}`}
                            onClick={() => handleDeleteClick(client)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Client"
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

      {/* Modern In-App Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0d1f33]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Remove Client Agreement</h3>
                  <p className="text-xs text-slate-500">
                    Agreement record deletion
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-slate-700 space-y-1">
                <p>
                  Are you sure you want to remove <span className="font-bold text-rose-900">{clientToDelete.name}</span> ({clientToDelete.project})?
                </p>
                <p className="text-[11px] text-slate-500">
                  Past commission allocations and transaction history will remain preserved.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setClientToDelete(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteClient}
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
                      <span>Yes, Remove</span>
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
