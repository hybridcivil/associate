import React, { useState, useMemo } from 'react';
import { AppDatabase, Session, Contact } from '../types';
import { generateId, recordDeletedContactId } from '../utils/storage';
import {
  BookUser,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  MapPin,
  Trash2,
  Edit2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Users,
  Briefcase,
  HardHat,
  Compass,
  FileText,
  MessageCircle,
  AlertTriangle,
  X,
  UserCheck,
  Download,
} from 'lucide-react';

interface ContactsViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => Promise<any> | void;
}

const CATEGORY_CONFIG: Record<
  Contact['category'],
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  client: {
    label: 'Client / Project Lead',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Briefcase,
  },
  contractor: {
    label: 'Contractor / Builder',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: HardHat,
  },
  engineer: {
    label: 'Civil Engineer',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Compass,
  },
  consultant: {
    label: 'Consultant / Specialist',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Users,
  },
  vendor: {
    label: 'Material Supplier / Vendor',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Building2,
  },
  official: {
    label: 'Government / Municipal Official',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: FileText,
  },
  other: {
    label: 'General Contact',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: BookUser,
  },
};

const OFFICIAL_FB_URL = 'https://fb.com/hybridcivil';

export const ContactsView: React.FC<ContactsViewProps> = ({ db, session, onUpdateDb }) => {
  const isAdmin = session.role === 'admin';
  const currentAssociateId = session.id;

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssociateFilter, setSelectedAssociateFilter] = useState<string>('all');

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fbCopied, setFbCopied] = useState(false);

  // Form input fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [category, setCategory] = useState<Contact['category']>('client');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedAssociateId, setAssignedAssociateId] = useState<string>(
    isAdmin ? (db.associates[0]?.id || '') : (currentAssociateId || '')
  );

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopyFb = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(OFFICIAL_FB_URL);
      }
      setFbCopied(true);
      showNotice('Official Facebook link copied to clipboard: ' + OFFICIAL_FB_URL, 'success');
      setTimeout(() => setFbCopied(false), 2500);
    } catch {
      showNotice('Link: ' + OFFICIAL_FB_URL, 'success');
    }
  };

  const handleShareFb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hybrid Civil Network',
          text: 'Check out the official Hybrid Civil page & engineering updates!',
          url: OFFICIAL_FB_URL,
        });
        return;
      } catch {}
    }
    // Fallback: open Facebook sharer
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(OFFICIAL_FB_URL)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Contacts dataset filtered by role
  const allContacts = useMemo(() => {
    return Array.isArray(db.contacts) ? db.contacts : [];
  }, [db.contacts]);

  // For Admin: view all contacts. For Associate: view their own created contacts
  const roleBaseContacts = useMemo(() => {
    if (isAdmin) {
      return allContacts;
    }
    return allContacts.filter((c) => c.associateId === currentAssociateId);
  }, [isAdmin, allContacts, currentAssociateId]);

  // Filtered contacts based on search, category, and associate filter
  const filteredContacts = useMemo(() => {
    return roleBaseContacts.filter((c) => {
      // Category filter
      if (selectedCategory !== 'all' && c.category !== selectedCategory) {
        return false;
      }
      // Associate filter (for Admin)
      if (isAdmin && selectedAssociateFilter !== 'all' && c.associateId !== selectedAssociateFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(query);
        const matchesPhone = (c.phone || '').toLowerCase().includes(query);
        const matchesOrg = (c.organization || '').toLowerCase().includes(query);
        const matchesDesignation = (c.designation || '').toLowerCase().includes(query);
        const matchesNotes = (c.notes || '').toLowerCase().includes(query);
        const matchesAssoc = (c.associateName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesOrg && !matchesDesignation && !matchesNotes && !matchesAssoc) {
          return false;
        }
      }
      return true;
    });
  }, [roleBaseContacts, selectedCategory, isAdmin, selectedAssociateFilter, searchTerm]);

  // Open modal for new contact
  const handleOpenNewModal = () => {
    setEditingContact(null);
    setName('');
    setPhone('');
    setEmail('');
    setOrganization('');
    setDesignation('');
    setCategory('client');
    setAddress('');
    setNotes('');
    setAssignedAssociateId(isAdmin ? (db.associates[0]?.id || '') : (currentAssociateId || ''));
    setIsModalOpen(true);
  };

  // Open modal to edit existing contact
  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setEmail(contact.email || '');
    setOrganization(contact.organization || '');
    setDesignation(contact.designation || '');
    setCategory(contact.category || 'client');
    setAddress(contact.address || '');
    setNotes(contact.notes || '');
    setAssignedAssociateId(contact.associateId);
    setIsModalOpen(true);
  };

  // Handle Save (Add or Edit)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotice('Contact name is required.', 'error');
      return;
    }
    if (!phone.trim()) {
      showNotice('Contact phone number is required.', 'error');
      return;
    }

    const effectiveAssocId = isAdmin ? assignedAssociateId : (currentAssociateId || 'assoc');
    const assocRecord = db.associates.find((a) => a.id === effectiveAssocId);
    const assocName = assocRecord ? assocRecord.name : session.name;

    let updatedContacts: Contact[];
    let commitMessage: string;

    if (editingContact) {
      // Edit
      const updated: Contact = {
        ...editingContact,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
        category,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        associateId: effectiveAssocId,
        associateName: assocName,
        updatedAt: new Date().toISOString(),
      };
      updatedContacts = allContacts.map((c) => (c.id === editingContact.id ? updated : c));
      commitMessage = `Update contact ${updated.name} (${updated.id})`;
    } else {
      // New
      const newContact: Contact = {
        id: 'contact-' + generateId(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
        category,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        associateId: effectiveAssocId,
        associateName: assocName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedContacts = [newContact, ...allContacts];
      commitMessage = `Add contact ${newContact.name} by ${session.name}`;
    }

    const updatedDb: AppDatabase = {
      ...db,
      contacts: updatedContacts,
    };

    onUpdateDb(updatedDb, commitMessage);
    setIsModalOpen(false);
    showNotice(
      editingContact ? `Contact "${name}" updated successfully.` : `New contact "${name}" added to directory.`,
      'success'
    );
  };

  // Handle Delete
  const confirmDeleteContact = () => {
    if (!contactToDelete) return;
    const target = contactToDelete;

    recordDeletedContactId(target.id);

    const updatedContacts = allContacts.filter((c) => c.id !== target.id);
    const updatedDb: AppDatabase = {
      ...db,
      contacts: updatedContacts,
    };

    onUpdateDb(updatedDb, `Delete contact ${target.id}`);
    setContactToDelete(null);
    showNotice(`Contact "${target.name}" removed from directory.`, 'success');
  };

  // Copy contact info to clipboard
  const handleCopyContactDetails = (c: Contact) => {
    const text = `${c.name}\nPhone: ${c.phone}${c.email ? '\nEmail: ' + c.email : ''}${
      c.organization ? '\nOrg: ' + c.organization : ''
    }${c.designation ? '\nDesignation: ' + c.designation : ''}${c.address ? '\nAddress: ' + c.address : ''}${
      c.notes ? '\nNotes: ' + c.notes : ''
    }`;
    navigator.clipboard?.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotice(`Contact details for "${c.name}" copied to clipboard!`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredContacts.length === 0) {
      showNotice('No contacts to export.', 'error');
      return;
    }
    const headers = ['Name', 'Phone', 'Email', 'Category', 'Organization', 'Designation', 'Address', 'Added By', 'Created At'];
    const rows = filteredContacts.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.category}"`,
      `"${(c.organization || '').replace(/"/g, '""')}"`,
      `"${(c.designation || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.associateName || '').replace(/"/g, '""')}"`,
      `"${c.createdAt || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hybrid_civil_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Contacts exported to CSV successfully.');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Official Facebook Link Sharing Banner */}
      <div className="bg-gradient-to-r from-[#1877F2] via-[#166FE5] to-[#0D53B5] rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1877F2] flex items-center justify-center font-black text-xl flex-shrink-0 shadow-md">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Official Community Page
                </span>
                <span className="text-xs text-blue-100 hidden sm:inline">fb.com/hybridcivil</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-white mt-0.5">
                Share Hybrid Civil with Your Clients & Contacts
              </h3>
              <p className="text-xs text-blue-100 max-w-xl">
                Promote our civil consultancy, share engineering updates, and refer project owners to{' '}
                <a
                  href={OFFICIAL_FB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:text-white"
                >
                  https://fb.com/hybridcivil
                </a>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              id="shareFbBtn"
              onClick={handleShareFb}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#1877F2] hover:bg-blue-50 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
              <span>Share to FB</span>
            </button>

            <button
              id="copyFbBtn"
              onClick={handleCopyFb}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy official link to clipboard"
            >
              {fbCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{fbCopied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <a
              id="visitFbBtn"
              href={OFFICIAL_FB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Visit Page</span>
            </a>
          </div>
        </div>
      </div>

      {/* View Header with stats and Create button */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <BookUser className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#10243a]">
                {isAdmin ? 'All Associates Contacts Directory' : 'My Professional Contacts Directory'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Master repository of all client, contractor, engineer, and vendor contacts added by associates.'
                  : 'Manage your direct project leads, engineers, material vendors, and contractors in one place.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export contacts as CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            id="newContactBtn"
            onClick={handleOpenNewModal}
            className="px-3.5 py-2 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Contact</span>
          </button>
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
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by contact name, phone, company, role, or notes..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder:text-slate-400 transition-all"
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

          {/* Admin Associate Filter */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={selectedAssociateFilter}
                onChange={(e) => setSelectedAssociateFilter(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              >
                <option value="all">All Associates ({db.associates.length})</option>
                {db.associates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({allContacts.filter((c) => c.associateId === a.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#10243a] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories ({roleBaseContacts.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
            const count = roleBaseContacts.filter((c) => c.category === catKey).length;
            const Icon = config.icon;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === catKey
                    ? 'bg-[#f28c28] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{config.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === catKey ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Grid / List */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-3">
          <BookUser className="w-12 h-12 text-slate-300 mx-auto stroke-[1.5]" />
          <div>
            <h4 className="text-sm font-bold text-slate-700">No Contacts Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              {searchTerm || selectedCategory !== 'all' || (isAdmin && selectedAssociateFilter !== 'all')
                ? 'No contacts match your current search or category filter. Try clearing filters.'
                : 'Your contact directory is currently empty. Click "+ Add Contact" to build your civil network.'}
            </p>
          </div>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 rounded-xl bg-[#f28c28] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-[#e07f20] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Contact</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredContacts.map((contact) => {
            const catConfig = CATEGORY_CONFIG[contact.category] || CATEGORY_CONFIG.other;
            const CatIcon = catConfig.icon;
            const canModify = isAdmin || contact.associateId === currentAssociateId;

            return (
              <div
                key={contact.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-4 flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top category & associate badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${catConfig.badgeClass}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{catConfig.label}</span>
                    </span>

                    {isAdmin && (
                      <span
                        className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]"
                        title={`Added by ${contact.associateName || 'Associate'}`}
                      >
                        By: {contact.associateName || 'Associate'}
                      </span>
                    )}
                  </div>

                  {/* Contact Name & Designation */}
                  <div className="mb-2.5">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                      {contact.name}
                    </h3>
                    {(contact.designation || contact.organization) && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {contact.designation}
                        {contact.designation && contact.organization ? ' · ' : ''}
                        <span className="text-slate-700 font-semibold">{contact.organization}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone & Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${contact.phone}`}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] transition-colors"
                          title="Call directly"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors"
                          title="Message on WhatsApp"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>

                    {contact.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline truncate"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}

                    {contact.address && (
                      <div className="flex items-start gap-1.5 text-slate-500 text-[11px] line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{contact.address}</span>
                      </div>
                    )}

                    {contact.notes && (
                      <p className="text-[11px] text-slate-600 bg-white/80 p-1.5 rounded border border-slate-200/60 mt-1 line-clamp-2 italic">
                        "{contact.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyContactDetails(contact)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                      title="Copy all contact details"
                    >
                      {copiedId === contact.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const shareText = `Civil Contact: ${contact.name} (${contact.phone}) - ${
                          contact.organization || ''
                        }\nHybrid Civil: ${OFFICIAL_FB_URL}`;
                        navigator.clipboard?.writeText(shareText);
                        showNotice(`Copied contact & Hybrid Civil link to share!`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-[#1877F2] transition-colors"
                      title="Share contact with Hybrid Civil FB link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(contact)}
                        className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setContactToDelete(contact)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <BookUser className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {editingContact ? 'Edit Contact' : 'Add New Directory Contact'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Save client, engineer, contractor, or partner contact info
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-3.5 text-xs">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engr. Shafiqul Alam"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 01711-223344"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Category & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Contact['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, c]) => (
                      <option key={k} value={k}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Organization & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Delta Builders Ltd."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Project Director / Site Engr."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Address / Location */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location / Site Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Mirpur DOHS / Chattogram Port area"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Contact for foundation testing quotation, rebar supply terms, or site coordination."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>

              {/* Admin Associate Assignment */}
              {isAdmin && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Associate Creator
                  </label>
                  <select
                    value={assignedAssociateId}
                    onChange={(e) => setAssignedAssociateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  >
                    {db.associates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f28c28] hover:bg-[#e07f20] text-white font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  {editingContact ? 'Save Changes' : 'Add to Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Contact?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-700">"{contactToDelete.name}"</span> ({contactToDelete.phone}) from the directory?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setContactToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteContact}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
