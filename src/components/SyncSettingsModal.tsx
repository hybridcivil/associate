import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Radio,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppDatabase, GitHubConfig } from '../types';
import {
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
  const [config, setConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [serverHasToken, setServerHasToken] = useState<boolean>(false);
  const [serverTokenMasked, setServerTokenMasked] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const localCfg = loadGitHubConfig();
      setConfig(localCfg);
      setInputToken(localCfg.token || '');
      setTestResult(null);

      // Load server status
      fetchServerGitHubConfig().then((srv) => {
        setServerHasToken(srv.hasToken);
        setServerTokenMasked(srv.tokenMasked);
        if (srv.hasToken && !localCfg.token) {
          setInputToken(srv.tokenMasked || '');
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const tokenToTest = inputToken.trim() || config.token;
      const res = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/data/hybrid_civil_database.json?ref=${config.branch}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'HybridCivil-App',
            ...(tokenToTest ? { Authorization: `token ${tokenToTest}` } : {}),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Successfully connected to ${config.owner}/${config.repo}!`,
          details: `Latest SHA: ${data.sha?.substring(0, 7)} · File size: ${(data.size / 1024).toFixed(1)} KB`,
        });
      } else if (res.status === 401) {
        setTestResult({
          success: false,
          message: 'GitHub Authentication Failed (401 Bad Credentials)',
          details: 'The Personal Access Token provided is invalid or expired.',
        });
      } else if (res.status === 404) {
        setTestResult({
          success: false,
          message: 'Repository or file not found (404)',
          details: `Make sure https://github.com/${config.owner}/${config.repo} exists.`,
        });
      } else {
        setTestResult({
          success: false,
          message: `GitHub returned status ${res.status}`,
          details: 'Please check repository name and branch permissions.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Network connection check failed',
        details: e.message || 'Could not contact GitHub API.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanToken = inputToken.trim();
      const newConfig: GitHubConfig = {
        ...config,
        token: cleanToken,
      };
      saveGitHubConfig(newConfig);
      setConfig(newConfig);

      // Save to server data/github_config.json
      await saveServerGitHubConfig({
        owner: newConfig.owner,
        repo: newConfig.repo,
        branch: newConfig.branch,
        token: cleanToken,
      });

      setServerHasToken(!!cleanToken);
      setTestResult({
        success: true,
        message: 'Settings saved! Real-time auto push & pull are active.',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Failed to save configuration',
        details: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#10243a] text-white w-full max-w-lg rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Live Auto Push & Pull Sync
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Connected to GitHub repository: <span className="font-mono text-orange-300">{config.owner}/{config.repo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-[11px]">Auto-Pull</span>
              </div>
              <p className="text-emerald-400 font-bold text-xs">1.5s Live Interval</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Fetches edits & new messages automatically</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Github className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-semibold text-[11px]">Auto-Push</span>
              </div>
              <p className="text-orange-400 font-bold text-xs">
                {serverHasToken || config.token ? 'GitHub Remote Synced' : 'Local Repository Only'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {serverHasToken || config.token ? 'Pushes commits instantly' : 'Add token below to push to GitHub'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveConfig} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11.5px] font-semibold text-slate-200 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                  GitHub Personal Access Token (PAT)
                </label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=HybridCivilNetwork"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 hover:underline"
                >
                  Generate Token <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Requires 'repo' scope)"
                  className="w-full bg-slate-900 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Saved securely on the server (<code className="text-slate-300">data/github_config.json</code>). Used automatically for all message, associate, client, and transaction updates.
              </p>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.details && (
                    <p className="text-[10.5px] opacity-80 mt-0.5 font-mono">{testResult.details}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await onForceSync();
                    setTestResult({ success: true, message: 'Database refreshed from remote repository!' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Pull Now
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
