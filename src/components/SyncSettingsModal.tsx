import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Radio,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  Layers,
  UploadCloud,
  FileCode,
  Github,
  Zap,
} from 'lucide-react';
import { AppDatabase, SupabaseConfig, GitHubConfig } from '../types';
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  fetchServerSupabaseConfig,
  saveServerSupabaseConfig,
  saveToSupabase,
  loadGitHubConfig,
  saveGitHubConfig,
  fetchServerGitHubConfig,
  saveServerGitHubConfig,
} from '../utils/storage';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onForceSync: () => Promise<void>;
  onForcePush: () => Promise<void>;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  db,
  onForceSync,
  onForcePush,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'migrations' | 'github'>('supabase');

  // Supabase State
  const [sbConfig, setSbConfig] = useState<SupabaseConfig>(() => loadSupabaseConfig());
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTestingSb, setIsTestingSb] = useState<boolean>(false);
  const [sbTestResult, setSbTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    tablesFound?: string[];
  } | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // GitHub State (Secondary)
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [inputGhToken, setInputGhToken] = useState<string>('');
  const [showGhToken, setShowGhToken] = useState<boolean>(false);

  // General State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const localSb = loadSupabaseConfig();
      setSbConfig(localSb);
      setInputUrl(localSb.url || '');
      setInputKey(localSb.anonKey || '');
      setSbTestResult(null);
      setSeedResult(null);

      // Load server-side Supabase configuration
      fetchServerSupabaseConfig().then((srv) => {
        if (srv.url && !localSb.url) {
          setInputUrl(srv.url);
        }
        if (srv.hasKey && !localSb.anonKey && srv.keyMasked) {
          setInputKey(srv.keyMasked);
        }
      });

      // Load GitHub settings
      const localGh = loadGitHubConfig();
      setGhConfig(localGh);
      setInputGhToken(localGh.token || '');
      fetchServerGitHubConfig().then((srv) => {
        if (srv.hasToken && !localGh.token && srv.tokenMasked) {
          setInputGhToken(srv.tokenMasked);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    setSbTestResult(null);
    try {
      const result = await testSupabaseConnection(inputUrl.trim(), inputKey.trim());
      setSbTestResult(result);
    } catch (e: any) {
      setSbTestResult({
        success: false,
        message: 'Network test failed',
        details: e.message || 'Could not contact Supabase URL.',
      });
    } finally {
      setIsTestingSb(false);
    }
  };

  const handleSeedSupabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      // First save configuration if modified
      const currentConfig: SupabaseConfig = {
        url: inputUrl.trim(),
        anonKey: inputKey.trim(),
        autoSync: true,
      };
      saveSupabaseConfig(currentConfig);
      await saveServerSupabaseConfig(currentConfig);

      // Execute seed directly via Supabase client and server
      const clientRes = await saveToSupabase(db);
      const serverRes = await fetch('/api/supabase/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: db }),
      }).then((r) => r.json()).catch(() => null);

      if (clientRes.success || serverRes?.success) {
        setSeedResult({
          success: true,
          message: `Successfully seeded ${db.associates.length} associates, ${db.clients.length} clients, ${db.messages.length} messages to Supabase!`,
        });
      } else {
        setSeedResult({
          success: false,
          message: clientRes.error || serverRes?.error || 'Failed to seed tables. Check if tables are created first.',
        });
      }
    } catch (e: any) {
      setSeedResult({
        success: false,
        message: e.message || 'Seeding failed.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Save Supabase config
      const cleanUrl = inputUrl.trim();
      const cleanKey = inputKey.trim();
      const newSbConfig: SupabaseConfig = {
        url: cleanUrl,
        anonKey: cleanKey,
        autoSync: true,
      };
      saveSupabaseConfig(newSbConfig);
      setSbConfig(newSbConfig);
      await saveServerSupabaseConfig(newSbConfig);

      // 2. Save GitHub config
      const cleanGhToken = inputGhToken.trim();
      const newGhConfig: GitHubConfig = {
        ...ghConfig,
        token: cleanGhToken,
      };
      saveGitHubConfig(newGhConfig);
      setGhConfig(newGhConfig);
      await saveServerGitHubConfig(newGhConfig);

      setSbTestResult({
        success: true,
        message: 'Supabase configuration saved! Real-time synchronization active.',
      });

      // Trigger authoritative pull to sync
      setTimeout(() => {
        onForceSync();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const SCHEMA_SQL = `-- HYBRID CIVIL — SUPABASE SQL SCHEMA
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)

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

-- Enable Row Level Security & Public Access
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

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0d1b2a] via-[#10243a] to-[#0d2a23] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Database & Supabase Sync</h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Supabase
                </span>
              </div>
              <p className="text-xs text-slate-300">
                PostgreSQL persistence connected to your GitHub repository
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'supabase'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Supabase Connection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('migrations')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'migrations'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            SQL Schema & Migrations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'github'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            GitHub Link (Optional)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              {/* Highlight Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-emerald-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[13px] text-emerald-900">
                    Supabase PostgreSQL Connected via GitHub
                  </p>
                  <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                    Instead of writing raw JSON files to GitHub, your application persists directly to your Supabase PostgreSQL database tables (<code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">associates</code>, <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">clients</code>, <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">transactions</code>, <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">payments</code>, <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">messages</code>) with zero-latency live sync.
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Found in Supabase Dashboard → <span className="font-semibold">Project Settings</span> → <span className="font-semibold">API</span> → Project URL.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supabase API Key (Anon or Service Role Key)
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Found under Project Settings → API → <span className="font-semibold">Project API keys</span> (anon/public or service_role).
                  </p>
                </div>
              </div>

              {/* Action Buttons: Test & Seed */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={isTestingSb || !inputUrl.trim() || !inputKey.trim()}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSb ? 'animate-spin' : ''}`} />
                  {isTestingSb ? 'Connecting...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleSeedSupabase}
                  disabled={isSeeding || !inputUrl.trim() || !inputKey.trim()}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                  {isSeeding ? 'Seeding Tables...' : 'Seed Current Data to Supabase'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await onForceSync();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Pull Fresh State
                </button>
              </div>

              {/* Test Result Feedback */}
              {sbTestResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    sbTestResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {sbTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-bold text-[12px]">{sbTestResult.message}</p>
                    {sbTestResult.details && (
                      <p className="text-[11px] opacity-90">{sbTestResult.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Seed Result Feedback */}
              {seedResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    seedResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {seedResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-bold text-[12px]">{seedResult.message}</p>
                  </div>
                </div>
              )}

              {/* Current Local Database Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Current Ready Records to Sync
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Ready in memory
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="font-bold text-slate-800 text-sm">{db.associates.length}</div>
                    <div className="text-[10.5px] text-slate-500">Associates</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="font-bold text-slate-800 text-sm">{db.clients.length}</div>
                    <div className="text-[10.5px] text-slate-500">Clients</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="font-bold text-slate-800 text-sm">{db.transactions.length}</div>
                    <div className="text-[10.5px] text-slate-500">Transactions</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="font-bold text-slate-800 text-sm">{db.messages.length}</div>
                    <div className="text-[10.5px] text-slate-500">Messages</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MIGRATIONS & SQL */}
          {activeTab === 'migrations' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-blue-600" />
                  Automatic GitHub & Supabase Migration Link
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Your project already includes the migration file in <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">supabase/migrations/20260927000000_create_hybrid_civil_schema.sql</code>. Because your Supabase is linked with GitHub, commits to main branch can apply migrations automatically.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Supabase PostgreSQL DDL Script
                </span>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL to Clipboard</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[220px] leading-relaxed border border-slate-800">
                  {SCHEMA_SQL}
                </pre>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Tip: If your tables aren't created yet, copy this script and paste it into <span className="font-medium text-slate-700">Supabase Dashboard → SQL Editor → New query → Run</span>.
              </p>
            </div>
          )}

          {/* TAB 3: GITHUB OPTIONAL */}
          {activeTab === 'github' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-[11.5px] leading-relaxed">
                Supabase is now your primary real-time database. You can optionally configure your GitHub Personal Access Token if you also want commits recorded in your GitHub repository.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Repository Owner
                  </label>
                  <input
                    type="text"
                    value={ghConfig.owner}
                    onChange={(e) => setGhConfig({ ...ghConfig, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={ghConfig.repo}
                    onChange={(e) => setGhConfig({ ...ghConfig, repo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GitHub Personal Access Token (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showGhToken ? 'text' : 'password'}
                    value={inputGhToken}
                    onChange={(e) => setInputGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGhToken(!showGhToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showGhToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {sbConfig.url ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Radio className="w-3 h-3 animate-pulse" />
                Supabase configured
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                Enter your Supabase URL & Key above
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving...' : 'Save & Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
