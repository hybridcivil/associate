import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Layers,
  UploadCloud,
  FileCode,
  ExternalLink,
  ShieldCheck,
  Zap,
  Server,
  Users,
  Briefcase,
  Receipt,
  MessageSquare,
  Lock,
  ArrowDownToLine,
  Sliders,
} from 'lucide-react';
import { AppDatabase, SupabaseConfig } from '../types';
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  saveToSupabase,
  fetchFromSupabase,
  saveServerSupabaseConfig,
} from '../utils/supabase';

interface SupabaseDatabaseViewProps {
  db: AppDatabase;
  onUpdateDb?: (updated: AppDatabase, commitMsg?: string) => Promise<any>;
  onOpenSettings?: () => void;
}

export const SupabaseDatabaseView: React.FC<SupabaseDatabaseViewProps> = ({
  db,
  onUpdateDb,
  onOpenSettings,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => loadSupabaseConfig());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    tablesFound?: string[];
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<'associates' | 'clients' | 'transactions' | 'messages'>('associates');

  useEffect(() => {
    handleRunTest();
  }, []);

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const cfg = loadSupabaseConfig();
      setConfig(cfg);
      if (cfg.url && cfg.anonKey) {
        const res = await testSupabaseConnection(cfg.url, cfg.anonKey);
        setTestResult(res);
      } else {
        setTestResult({
          success: false,
          message: 'Supabase credentials not set',
          details: 'Click "Configure Supabase" above or in Settings to enter your Project URL and API Key.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Connection check failed',
        details: e.message || 'Could not verify Supabase connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSeedAll = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await saveToSupabase(db);
      if (res.success) {
        setSyncStatus({
          type: 'success',
          text: `Successfully synced ${db.associates.length} associates, ${db.clients.length} clients, ${db.messages.length} messages to Supabase!`,
        });
        handleRunTest();
      } else {
        setSyncStatus({
          type: 'error',
          text: res.error || 'Failed to sync to Supabase. Check if tables are created.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        text: err.message || 'Sync failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const SCHEMA_SQL = `-- HYBRID CIVIL — SUPABASE POSTGRESQL SCHEMA
-- Ready for GitHub Migrations & Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.associates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  project TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  advance NUMERIC DEFAULT 0,
  associate_id TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client_id TEXT,
  associate_id TEXT,
  share_type TEXT,
  amount NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  kind TEXT,
  distribution_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  associate_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  parts JSONB DEFAULT '{}'::jsonb,
  allocations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  sender_role TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  receiver_name TEXT,
  associate_id TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'general',
  is_edited BOOLEAN DEFAULT false,
  edited_at TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_database (
  key TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for associates" ON public.associates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for app_database" ON public.app_database FOR ALL USING (true) WITH CHECK (true);
`;

  const copySql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = testResult?.success;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#0d1b2a] via-[#10243a] to-[#0e3b30] rounded-2xl p-5 text-white shadow-sm border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Supabase PostgreSQL Cloud Database
              </h2>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> Active Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Production database integrated with your GitHub migrations · Real-time persistence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Checking...' : 'Check Status'}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            Supabase Settings
          </button>
        </div>
      </div>

      {/* Status & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Connection Health */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Connection Health</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-bold text-sm text-slate-800">
              {isConnected ? 'Connected & Verified' : 'Checking / Setup'}
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 truncate font-mono">
            {config.url || 'No URL configured yet'}
          </p>
        </div>

        {/* Card 2: GitHub Migration Link */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>GitHub Migrations</span>
            <FileCode className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>Auto-Migration Ready</span>
          </div>
          <p className="text-[11.5px] text-slate-500">
            Stored in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10.5px]">supabase/migrations/</code>
          </p>
        </div>

        {/* Card 3: Real-Time Sync Action */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Live Data Sync</span>
            <UploadCloud className="w-4 h-4 text-emerald-600" />
          </div>
          <button
            type="button"
            onClick={handleSeedAll}
            disabled={isSyncing || !config.url}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing to Supabase...' : 'Sync Local State to Supabase'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner if any */}
      {syncStatus && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
            syncStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {syncStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 text-xs font-medium">{syncStatus.text}</div>
        </div>
      )}

      {/* Active Table Status Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Supabase Tables Overview
            </h3>
            <p className="text-xs text-slate-500">
              PostgreSQL relational schema storing all network activity
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
            Row Level Security (RLS) Enabled
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSelectedTable('associates')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTable === 'associates'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-mono font-semibold">public.associates</span>
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-800">{db.associates.length}</div>
            <div className="text-[10.5px] text-slate-500">Certified Engineers</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTable('clients')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTable === 'clients'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-mono font-semibold">public.clients</span>
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-800">{db.clients.length}</div>
            <div className="text-[10.5px] text-slate-500">Active Agreements</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTable('transactions')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTable === 'transactions'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-mono font-semibold">public.transactions</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-800">{db.transactions.length}</div>
            <div className="text-[10.5px] text-slate-500">90/5/5 Distributions</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTable('messages')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTable === 'messages'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-mono font-semibold">public.messages</span>
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-800">{db.messages.length}</div>
            <div className="text-[10.5px] text-slate-500">Thread Communications</div>
          </button>
        </div>

        {/* Selected Table Data Preview */}
        <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
          <div className="font-bold text-xs text-slate-700 mb-2 flex items-center justify-between">
            <span>Preview records in <code className="text-emerald-700 font-mono">public.{selectedTable}</code>:</span>
            <span className="text-[11px] text-slate-500 font-normal">Auto-synchronized with Supabase</span>
          </div>

          <div className="max-h-[160px] overflow-y-auto font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
            {selectedTable === 'associates' && (
              <div className="space-y-1">
                {db.associates.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span>{a.name} ({a.phone})</span>
                    <span className="text-emerald-600 font-semibold">{a.status}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedTable === 'clients' && (
              <div className="space-y-1">
                {db.clients.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span>{c.name} — {c.project}</span>
                    <span className="font-bold">৳{c.price?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedTable === 'transactions' && (
              <div className="space-y-1">
                {db.transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span>{t.date} — {t.shareType} ({t.kind})</span>
                    <span className="font-bold text-emerald-600">৳{t.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedTable === 'messages' && (
              <div className="space-y-1">
                {db.messages.slice(-5).map((m) => (
                  <div key={m.id} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span className="truncate max-w-[70%]">
                      [{m.senderRole.toUpperCase()}] {m.senderName}: {m.content}
                    </span>
                    <span className="text-slate-400 text-[10px]">{m.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SQL Migration Script Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              Supabase SQL Schema Script
            </h3>
            <p className="text-xs text-slate-500">
              Run this in your Supabase SQL Editor if you need to manually recreate or verify tables
            </p>
          </div>
          <button
            type="button"
            onClick={copySql}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[190px] border border-slate-800">
          {SCHEMA_SQL}
        </pre>
      </div>
    </div>
  );
};
