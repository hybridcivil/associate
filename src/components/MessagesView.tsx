import React, { useState, useEffect, useRef } from 'react';
import { AppDatabase, Session, Message } from '../types';
import {
  generateId,
  calculateAssociateTotals,
  formatMoney,
} from '../utils/storage';
import {
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Search,
  Check,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  FileText,
  BadgeAlert,
  ChevronRight,
  Filter,
  DollarSign,
  Briefcase,
  Compass,
  HardHat,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MessagesViewProps {
  db: AppDatabase;
  session: Session;
  onUpdateDb: (updated: AppDatabase, commitMsg?: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  db,
  session,
  onUpdateDb,
}) => {
  const isAdmin = session.role === 'admin';

  // Active selected thread (associateId) for Admin
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>(() => {
    if (isAdmin) {
      // Default to associate who has the most recent message, or first associate
      const sorted = [...(db.associates || [])].sort((a, b) => {
        const aMsgs = (db.messages || []).filter(
          (m) =>
            m.associateId === a.id ||
            m.senderId === a.id ||
            m.receiverId === a.id
        );
        const bMsgs = (db.messages || []).filter(
          (m) =>
            m.associateId === b.id ||
            m.senderId === b.id ||
            m.receiverId === b.id
        );
        const aLast = aMsgs.length ? new Date(aMsgs[aMsgs.length - 1].timestamp).getTime() : 0;
        const bLast = bMsgs.length ? new Date(bMsgs[bMsgs.length - 1].timestamp).getTime() : 0;
        return bLast - aLast;
      });
      return sorted[0]?.id || '';
    }
    return session.id || '';
  });

  // Admin filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'urgent'>('all');

  // Compose message states
  const [newMessageText, setNewMessageText] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<
    'general' | 'payment' | 'project' | 'site_visit' | 'technical'
  >('general');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Scroll to bottom when messages update or thread changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedAssociateId, db.messages.length]);

  // Mark unread messages as read when viewed
  useEffect(() => {
    if (isAdmin && selectedAssociateId) {
      const hasUnreadFromAssociate = (db.messages || []).some(
        (m) =>
          (m.associateId === selectedAssociateId || m.senderId === selectedAssociateId) &&
          m.senderRole === 'associate' &&
          !m.read
      );

      if (hasUnreadFromAssociate) {
        const updatedMessages = (db.messages || []).map((m) => {
          if (
            (m.associateId === selectedAssociateId || m.senderId === selectedAssociateId) &&
            m.senderRole === 'associate' &&
            !m.read
          ) {
            return { ...m, read: true };
          }
          return m;
        });

        const updatedDb = { ...db, messages: updatedMessages };
        onUpdateDb(updatedDb, `Mark messages as read for ${selectedAssociateId}`);
      }
    } else if (!isAdmin && session.id) {
      const hasUnreadFromAdmin = (db.messages || []).some(
        (m) =>
          (m.associateId === session.id || m.receiverId === session.id) &&
          m.senderRole === 'admin' &&
          !m.read
      );

      if (hasUnreadFromAdmin) {
        const updatedMessages = (db.messages || []).map((m) => {
          if (
            (m.associateId === session.id || m.receiverId === session.id) &&
            m.senderRole === 'admin' &&
            !m.read
          ) {
            return { ...m, read: true };
          }
          return m;
        });

        const updatedDb = { ...db, messages: updatedMessages };
        onUpdateDb(updatedDb, `Mark messages as read for associate`);
      }
    }
  }, [selectedAssociateId, isAdmin, session.id]);

  // Current active associate for thread
  const activeAssociateId = isAdmin ? selectedAssociateId : session.id || '';
  const activeAssociate = (db.associates || []).find((a) => a.id === activeAssociateId);
  const activeAssociateTotals = activeAssociate
    ? calculateAssociateTotals(db, activeAssociate.id)
    : { earned: 0, paid: 0, due: 0 };

  // Messages in active thread (robust matching by associateId, senderId, or receiverId)
  const threadMessages = (db.messages || [])
    .filter(
      (m) =>
        m.associateId === activeAssociateId ||
        m.senderId === activeAssociateId ||
        m.receiverId === activeAssociateId
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  // Quick reply options for Admin
  const adminQuickReplies = [
    'Wa Alaikum Assalam. The disbursement voucher has been processed.',
    'Drawings and structural calculations have been verified and approved.',
    'Please forward the client signed site progress measurement sheet.',
    'Commission distribution for this project agreement is confirmed.',
    'Site inspection visit is scheduled. Please coordinate with site engineer.',
  ];

  // Quick topic templates for Associate
  const associateQuickTopics = [
    {
      label: '💰 Commission Due Inquiry',
      category: 'payment' as const,
      subject: 'Inquiry on Project Profit Distribution & Due Balance',
      text: 'Assalamu Alaikum Management, could you please confirm the payment schedule for my accrued associate profit share balance?',
    },
    {
      label: '📐 Drawing Detailing Review',
      category: 'technical' as const,
      subject: 'Structural Detailing & Code Verification Review',
      text: 'Dear Admin, I have finalized the structural revision according to BNBC-2020. Please check and provide clearance to issue to the site.',
    },
    {
      label: '🤝 New Client Referral',
      category: 'project' as const,
      subject: 'New Client Project Referral Lead',
      text: 'I have a prospective civil client interested in consultancy & structural supervision. Requesting agreement terms and advance quota.',
    },
    {
      label: '🏗️ Site Clearance Status',
      category: 'site_visit' as const,
      subject: 'Site Inspection & Soil Clearance Report',
      text: 'Site inspection was conducted today. Subsoil conditions and foundation excavations are ready for technical sign-off.',
    },
    {
      label: '⚠️ Urgent Site Issue',
      category: 'technical' as const,
      urgent: true,
      subject: 'URGENT: Technical Discrepancy on Active Site',
      text: 'Urgent attention required: Site team noticed column rebar deviation on site. Immediate management guidance needed.',
    },
  ];

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = newMessageText.trim();
    if (!content) return;

    if (!activeAssociateId) {
      showNotice('Please select an associate thread to message.', 'error');
      return;
    }

    setIsSending(true);

    const newMsg: Message = {
      id: 'msg-' + generateId(),
      senderRole: isAdmin ? 'admin' : 'associate',
      senderId: isAdmin ? 'admin' : (session.id || 'assoc'),
      senderName: isAdmin ? 'Administrator' : session.name,
      receiverId: isAdmin ? activeAssociateId : 'admin',
      receiverName: isAdmin
        ? (activeAssociate?.name || 'Associate')
        : 'Administrator',
      associateId: activeAssociateId,
      subject: newSubject.trim() || undefined,
      content,
      timestamp: new Date().toISOString(),
      read: false,
      priority: isUrgent ? 'urgent' : 'normal',
      category: newCategory,
    };

    // If admin replies, also mark any previous associate messages in thread as read
    const updatedMessages = isAdmin
      ? [
          ...(db.messages || []).map((m) =>
            (m.associateId === activeAssociateId || m.senderId === activeAssociateId) &&
            m.senderRole === 'associate' &&
            !m.read
              ? { ...m, read: true }
              : m
          ),
          newMsg,
        ]
      : [...(db.messages || []), newMsg];

    const updatedDb: AppDatabase = {
      ...db,
      messages: updatedMessages,
    };

    const commitMsg = `Message: ${isAdmin ? 'Admin' : session.name} -> ${
      isAdmin ? activeAssociate?.name : 'Admin'
    } [${newMsg.subject || 'Thread'}]`;

    // Single source of truth update - auto persists to cache, server repo and GitHub
    onUpdateDb(updatedDb, commitMsg);

    setNewMessageText('');
    setNewSubject('');
    setIsUrgent(false);
    setIsSending(false);

    showNotice(
      isAdmin
        ? `Reply dispatched to ${activeAssociate?.name || 'Associate'}.`
        : 'Message delivered to Administrator.',
      'success'
    );
  };

  // Delete message (Admin only)
  const handleDeleteMessage = (msgId: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this message record?')) return;

    const updatedMessages = (db.messages || []).filter((m) => m.id !== msgId);
    const updatedDb = { ...db, messages: updatedMessages };
    onUpdateDb(updatedDb, `Delete message ${msgId} by Administrator`);
    showNotice('Message removed from thread.', 'success');
  };

  // Admin: Associates thread list with unread counter and search filter
  const associateThreads = (db.associates || [])
    .map((assoc) => {
      const msgs = (db.messages || []).filter(
        (m) =>
          m.associateId === assoc.id ||
          m.senderId === assoc.id ||
          m.receiverId === assoc.id
      );
      const unreadCount = msgs.filter(
        (m) => m.senderRole === 'associate' && !m.read
      ).length;
      const hasUrgent = msgs.some((m) => m.priority === 'urgent' && !m.read);
      const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

      return {
        associate: assoc,
        messagesCount: msgs.length,
        unreadCount,
        hasUrgent,
        lastMessage: lastMsg,
      };
    })
    .filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.associate.name.toLowerCase().includes(term) ||
        item.associate.phone.includes(term) ||
        (item.lastMessage?.content || '').toLowerCase().includes(term)
      );
    })
    .filter((item) => {
      if (filterType === 'unread') return item.unreadCount > 0;
      if (filterType === 'urgent') return item.hasUrgent;
      return true;
    })
    .sort((a, b) => {
      // Prioritize unread/urgent, then recent timestamp
      if (a.hasUrgent && !b.hasUrgent) return -1;
      if (!a.hasUrgent && b.hasUrgent) return 1;
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const timeA = a.lastMessage
        ? new Date(a.lastMessage.timestamp).getTime()
        : 0;
      const timeB = b.lastMessage
        ? new Date(b.lastMessage.timestamp).getTime()
        : 0;
      return timeB - timeA;
    });

  const totalUnreadForAdmin = db.messages.filter(
    (m) => m.senderRole === 'associate' && !m.read
  ).length;

  const totalUrgentForAdmin = db.messages.filter(
    (m) => m.senderRole === 'associate' && m.priority === 'urgent' && !m.read
  ).length;

  return (
    <div className="space-y-3 pb-20 md:pb-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#10243a] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            {isAdmin ? 'Associate Messages & Helpdesk' : 'Direct Message to Management'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isAdmin
              ? 'Real-time inquiries, technical requests, and disbursement questions from associates'
              : 'Submit questions regarding 90/5/5 profit distribution, project clearance, or technical support'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              {totalUnreadForAdmin > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10.5px] font-bold border border-orange-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {totalUnreadForAdmin} Unread
                </span>
              )}
              {totalUrgentForAdmin > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10.5px] font-bold border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {totalUrgentForAdmin} Urgent
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin Desk Online</span>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
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

      {/* Main Messaging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column: Associate Threads Roster (Admin only) */}
        {isAdmin && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[620px]">
            {/* Thread Search & Filters */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search associate or message..."
                  className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`flex-1 py-1 text-[10.5px] rounded font-semibold text-center transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-[#10243a] shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All ({db.associates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('unread')}
                  className={`flex-1 py-1 text-[10.5px] rounded font-semibold text-center transition-colors cursor-pointer ${
                    filterType === 'unread'
                      ? 'bg-white text-orange-600 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Unread ({totalUnreadForAdmin})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('urgent')}
                  className={`flex-1 py-1 text-[10.5px] rounded font-semibold text-center transition-colors cursor-pointer ${
                    filterType === 'urgent'
                      ? 'bg-white text-rose-600 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Urgent ({totalUrgentForAdmin})
                </button>
              </div>
            </div>

            {/* Associate List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {associateThreads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No associate threads found.
                </div>
              ) : (
                associateThreads.map((item) => {
                  const isSelected = selectedAssociateId === item.associate.id;
                  const formattedTime = item.lastMessage
                    ? new Date(item.lastMessage.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '';

                  return (
                    <button
                      key={item.associate.id}
                      onClick={() => setSelectedAssociateId(item.associate.id)}
                      className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-orange-50/80 border-l-3 border-orange-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10243a] to-[#204060] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                        {item.associate.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-[#10243a]' : 'text-slate-800'
                            }`}
                          >
                            {item.associate.name}
                          </span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                            {formattedTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.associate.phone}
                          </span>
                          {item.hasUrgent && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                              Urgent
                            </span>
                          )}
                          {item.unreadCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[9.5px] font-bold">
                              {item.unreadCount}
                            </span>
                          )}
                        </div>

                        {item.lastMessage ? (
                          <p className="text-[11px] text-slate-500 truncate mt-1">
                            <span className="font-semibold text-slate-600">
                              {item.lastMessage.senderRole === 'admin' ? 'You: ' : ''}
                            </span>
                            {item.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-[10.5px] text-slate-400 italic mt-1">
                            No messages yet
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right / Main Column: Active Conversation & Composer */}
        <div
          className={`${
            isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[620px] overflow-hidden`}
        >
          {/* Thread Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#f28c28] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {isAdmin
                  ? activeAssociate?.name.substring(0, 2).toUpperCase() || 'AS'
                  : 'HC'}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#10243a] flex items-center gap-1.5">
                  {isAdmin
                    ? activeAssociate?.name || 'Select an Associate Thread'
                    : 'Hybrid Civil Administration Desk'}
                  {isAdmin && activeAssociate && (
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                        activeAssociate.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {activeAssociate.status}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                  {isAdmin && activeAssociate ? (
                    <>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {activeAssociate.phone}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">
                        Earned: {formatMoney(activeAssociateTotals.earned)}
                      </span>
                      <span>·</span>
                      <span className="text-rose-700 font-semibold">
                        Due: {formatMoney(activeAssociateTotals.due)}
                      </span>
                    </>
                  ) : (
                    <span>
                      Associate Support Channel · Direct line to Principal Civil Engineers & Management
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && activeAssociate && (
              <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                {threadMessages.length} Messages
              </span>
            )}
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#f8fafc]">
            {threadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-10 h-10 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  {isAdmin
                    ? 'No messages with this associate yet'
                    : 'No conversation history with Management yet'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  {isAdmin
                    ? 'Type a message below to send an update, disbursement confirmation, or work review.'
                    : 'Use the inquiry composer below to ask about 90/5/5 profit shares, project clearances, or technical questions.'}
                </p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isFromMe = isAdmin
                  ? msg.senderRole === 'admin'
                  : msg.senderRole === 'associate';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${
                      isFromMe ? 'items-end' : 'items-start'
                    } group`}
                  >
                    {/* Sender & timestamp header */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      <span className="font-semibold text-slate-600">
                        {isFromMe ? 'You' : msg.senderName}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {msg.priority === 'urgent' && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9px] flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Urgent
                        </span>
                      )}
                      {msg.category && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 text-[9px] uppercase font-medium">
                          {msg.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Message Bubble Card */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs text-xs ${
                        isFromMe
                          ? 'bg-[#10243a] text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}
                    >
                      {msg.subject && (
                        <div
                          className={`font-bold mb-1 pb-1 border-b text-[11.5px] ${
                            isFromMe
                              ? 'border-white/15 text-orange-300'
                              : 'border-slate-100 text-[#10243a]'
                          }`}
                        >
                          {msg.subject}
                        </div>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed select-text text-[12px]">
                        {msg.content}
                      </p>

                      <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] opacity-75">
                        {isFromMe ? (
                          msg.read ? (
                            <span className="flex items-center gap-0.5 text-emerald-400">
                              <CheckCheck className="w-3 h-3" /> Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-slate-300">
                              <Check className="w-3 h-3" /> Sent
                            </span>
                          )
                        ) : null}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-500 ml-2 p-0.5"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply / Templates Pill Bar */}
          <div className="px-3 pt-2 pb-1 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex-shrink-0">
                Quick {isAdmin ? 'Replies' : 'Templates'}:
              </span>
              {isAdmin
                ? adminQuickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewMessageText(reply)}
                      className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
                    >
                      {reply.substring(0, 30)}...
                    </button>
                  ))
                : associateQuickTopics.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewSubject(item.subject);
                        setNewCategory(item.category);
                        setNewMessageText(item.text);
                        if (item.urgent) setIsUrgent(true);
                      }}
                      className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-700 font-medium transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
            </div>
          </div>

          {/* Composer Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-200 bg-white space-y-2"
          >
            {/* Subject, Category & Urgent row for associate */}
            {!isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Subject / Topic (optional)..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="general">General Query</option>
                    <option value="payment">Profit / Payment</option>
                    <option value="project">Client / Project</option>
                    <option value="technical">Structural / Drawing</option>
                    <option value="site_visit">Site Clearance</option>
                  </select>
                </div>

                <div className="sm:col-span-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isUrgent
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className={`w-3 h-3 ${isUrgent ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>{isUrgent ? 'Urgent Priority' : 'Normal Priority'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Message Body & Send Button */}
            <div className="flex items-end gap-2">
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder={
                  isAdmin
                    ? `Reply to ${activeAssociate?.name || 'Associate'} (Ctrl+Enter to send)...`
                    : 'Write your message to Administrator (Ctrl+Enter to send)...'
                }
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none bg-slate-50/50"
              />

              <button
                type="submit"
                disabled={isSending || !newMessageText.trim()}
                className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer ${
                  !newMessageText.trim() || isSending
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#f28c28] hover:bg-[#e07f20]'
                }`}
              >
                {isSending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
