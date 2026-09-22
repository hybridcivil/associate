import React, { useState, useEffect } from 'react';
import {
  Github,
  Globe,
  Download,
  Copy,
  Check,
  Smartphone,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Laptop,
  UploadCloud,
  RefreshCw,
  Trash2,
  ArrowDownToLine,
  GitCommit,
  GitBranch,
  KeyRound,
  FileText,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Settings,
  Database,
  Users,
  Briefcase,
  Receipt,
  FileCheck,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { AppDatabase, GitHubConfig, GitHubCommitLog, GitHubRepoFile } from '../types';
import {
  loadGitHubConfig,
  saveGitHubConfig,
  loadGitHubLogs,
  saveGitHubLogs,
  generateRepositoryMarkdown,
  formatMoney,
  saveDatabase,
} from '../utils/storage';

interface GitHubHostViewProps {
  db: AppDatabase;
  onUpdateDb?: (updated: AppDatabase) => void;
}

export const GitHubHostView: React.FC<GitHubHostViewProps> = ({ db, onUpdateDb }) => {
  const [config, setConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [logs, setLogs] = useState<GitHubCommitLog[]>(() => loadGitHubLogs());
  const [repoFiles, setRepoFiles] = useState<GitHubRepoFile[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // File target selection
  const [selectedFileTarget, setSelectedFileTarget] = useState<string>('database');
  const [customPath, setCustomPath] = useState<string>('data/hybrid_civil_database.json');
  const [commitMessage, setCommitMessage] = useState<string>('Save application state to GitHub repository');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Operation loading and notifications
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [operationAction, setOperationAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
    url?: string;
  } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error', url?: string) => {
    setNotification({ text, type, url });
    setTimeout(() => setNotification(null), 6000);
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Generate content based on selected target
  const getFileContentForTarget = (target: string): { path: string; content: string; type: string } => {
    if (target === 'database') {
      return {
        path: 'data/hybrid_civil_database.json',
        content: JSON.stringify(db, null, 2),
        type: 'JSON (Full Database)',
      };
    }
    if (target === 'associates') {
      return {
        path: 'data/associates.json',
        content: JSON.stringify(db.associates, null, 2),
        type: 'JSON (Associates Roster)',
      };
    }
    if (target === 'clients') {
      return {
        path: 'data/clients.json',
        content: JSON.stringify(db.clients, null, 2),
        type: 'JSON (Client Contracts)',
      };
    }
    if (target === 'transactions_csv') {
      const rows = [
        ['Date', 'Associate_ID', 'Client_ID', 'Share_Type', 'Amount_BDT', 'Profit_BDT', 'Kind'],
        ...db.transactions.map((t) => [
          t.date,
          t.associateId,
          t.clientId,
          t.shareType,
          t.amount.toString(),
          (t.profit || 0).toString(),
          t.kind,
        ]),
      ];
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      return {
        path: 'data/transactions.csv',
        content: csv,
        type: 'CSV (Ledger)',
      };
    }
    if (target === 'markdown') {
      return {
        path: 'PROJECT_OVERVIEW.md',
        content: generateRepositoryMarkdown(db),
        type: 'Markdown Report',
      };
    }
    return {
      path: customPath || 'data/custom_export.json',
      content: JSON.stringify(db, null, 2),
      type: 'Custom JSON',
    };
  };

  const currentFile = getFileContentForTarget(selectedFileTarget);

  // Save config changes
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveGitHubConfig(config);
    setShowConfigModal(false);
    showNotice(`Repository configuration saved: ${config.owner}/${config.repo}@${config.branch}`, 'success');
    fetchRepositoryFiles();
  };

  // 1. PUSH / COMMIT TO GITHUB
  const handlePushToGitHub = async () => {
    if (!config.owner || !config.repo) {
      setShowConfigModal(true);
      showNotice('Please specify your GitHub Owner and Repository name first.', 'error');
      return;
    }

    setIsLoading(true);
    setOperationAction('push');

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.owner.trim(),
          repo: config.repo.trim(),
          branch: config.branch.trim() || 'main',
          path: currentFile.path,
          content: currentFile.content,
          message: commitMessage || `Push ${currentFile.path} from Hybrid Civil Network`,
          token: config.token.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to push file to GitHub.');
      }

      // Add to commit logs
      const newLog: GitHubCommitLog = {
        id: 'log-' + Date.now(),
        sha: data.commitSha || 'latest',
        message: commitMessage || `Push ${currentFile.path}`,
        action: data.action === 'update' ? 'update' : 'push',
        filePath: currentFile.path,
        date: new Date().toISOString(),
        status: 'success',
        htmlUrl: data.commitUrl,
        author: config.owner,
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      saveGitHubLogs(updatedLogs);

      showNotice(
        data.message || `Successfully committed and pushed ${currentFile.path} to GitHub!`,
        'success',
        data.commitUrl
      );

      fetchRepositoryFiles();
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Push failed. Please check your GitHub repository credentials.', 'error');
    } finally {
      setIsLoading(false);
      setOperationAction(null);
    }
  };

  // 2. QUICK UPDATE EXISTING FILE
  const handleUpdateFile = async (filePath?: string) => {
    const targetPath = filePath || currentFile.path;
    setIsLoading(true);
    setOperationAction('update');

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.owner.trim(),
          repo: config.repo.trim(),
          branch: config.branch.trim() || 'main',
          path: targetPath,
          content: currentFile.content,
          message: `Update ${targetPath} [Revision ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`,
          token: config.token.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to update ${targetPath} on GitHub.`);
      }

      const newLog: GitHubCommitLog = {
        id: 'log-' + Date.now(),
        sha: data.commitSha || 'update',
        message: `Update ${targetPath}`,
        action: 'update',
        filePath: targetPath,
        date: new Date().toISOString(),
        status: 'success',
        htmlUrl: data.commitUrl,
        author: config.owner,
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      saveGitHubLogs(updatedLogs);

      showNotice(
        data.message || `Successfully updated ${targetPath} on GitHub!`,
        'success',
        data.commitUrl
      );

      fetchRepositoryFiles();
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Update failed.', 'error');
    } finally {
      setIsLoading(false);
      setOperationAction(null);
    }
  };

  // 3. DELETE FILE FROM GITHUB
  const handleDeleteFile = async (filePath?: string) => {
    const targetPath = filePath || currentFile.path;
    if (
      !confirm(
        `Are you sure you want to delete "${targetPath}" from your GitHub repository (${config.owner}/${config.repo}@${config.branch})?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setOperationAction('delete');

    try {
      const res = await fetch('/api/github/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.owner.trim(),
          repo: config.repo.trim(),
          branch: config.branch.trim() || 'main',
          path: targetPath,
          message: `Delete ${targetPath} via Hybrid Civil Network`,
          token: config.token.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to delete ${targetPath} from GitHub.`);
      }

      const newLog: GitHubCommitLog = {
        id: 'log-' + Date.now(),
        sha: data.commitSha || 'del',
        message: `Delete ${targetPath}`,
        action: 'delete',
        filePath: targetPath,
        date: new Date().toISOString(),
        status: 'success',
        htmlUrl: data.commitUrl,
        author: config.owner,
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      saveGitHubLogs(updatedLogs);

      showNotice(
        data.message || `Deleted ${targetPath} from GitHub repository.`,
        'success',
        data.commitUrl
      );

      fetchRepositoryFiles();
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Delete operation failed.', 'error');
    } finally {
      setIsLoading(false);
      setOperationAction(null);
    }
  };

  // 4. PULL / IMPORT FILE FROM GITHUB
  const handlePullFromGitHub = async (filePath?: string) => {
    const targetPath = filePath || currentFile.path;
    setIsLoading(true);
    setOperationAction('pull');

    try {
      const res = await fetch('/api/github/file-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.owner.trim(),
          repo: config.repo.trim(),
          branch: config.branch.trim() || 'main',
          path: targetPath,
          token: config.token.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to fetch ${targetPath} from GitHub.`);
      }

      if (!data.exists && !data.isDemo) {
        throw new Error(`File ${targetPath} was not found on branch ${config.branch}.`);
      }

      if (data.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (parsed && Array.isArray(parsed.associates)) {
            if (onUpdateDb) {
              onUpdateDb(parsed);
            } else {
              saveDatabase(parsed);
            }
            showNotice(`Successfully pulled and loaded database from GitHub (${parsed.associates.length} associates, ${parsed.clients?.length || 0} clients)!`, 'success');
          } else {
            showNotice(`Pulled file content (${data.size || data.content.length} bytes).`, 'success');
          }
        } catch {
          showNotice(`Retrieved ${targetPath} from GitHub (${data.size} bytes).`, 'success');
        }
      } else {
        showNotice(`Checked ${targetPath} on GitHub. Ready for push/sync.`, 'success');
      }

      const newLog: GitHubCommitLog = {
        id: 'log-' + Date.now(),
        sha: data.sha?.substring(0, 7) || 'pull',
        message: `Pull ${targetPath}`,
        action: 'pull',
        filePath: targetPath,
        date: new Date().toISOString(),
        status: 'success',
        htmlUrl: data.html_url,
        author: config.owner,
      };

      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      saveGitHubLogs(updatedLogs);
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Pull operation failed.', 'error');
    } finally {
      setIsLoading(false);
      setOperationAction(null);
    }
  };

  // Fetch list of files in repository
  const fetchRepositoryFiles = async () => {
    if (!config.owner || !config.repo) return;
    try {
      const res = await fetch('/api/github/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.owner.trim(),
          repo: config.repo.trim(),
          branch: config.branch.trim() || 'main',
          path: 'data',
          token: config.token.trim(),
        }),
      });
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        setRepoFiles(data.files);
      }
    } catch {
      // Benign
    }
  };

  useEffect(() => {
    fetchRepositoryFiles();
  }, [config.owner, config.repo]);

  // GitHub Action YML template
  const githubActionYml = `name: Deploy Hybrid Civil to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Web Application
        run: npm run build
        env:
          VITE_BASE_PATH: '/\${{ github.event.repository.name }}/'

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const gitCommands = `# 1. Initialize git in your local project folder
git init
git add .
git commit -m "Save Hybrid Civil Associate Network information and code"

# 2. Add your GitHub repository remote
git remote add origin https://github.com/${config.owner}/${config.repo}.git

# 3. Push to main branch
git branch -M ${config.branch || 'main'}
git push -u origin ${config.branch || 'main'}

# 4. In your GitHub repository:
# Go to Settings > Pages > Source -> Select "GitHub Actions"
# App will be live at: https://${config.owner}.github.io/${config.repo}/
`;

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title & Connection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Github className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#10243a]">
                GitHub Repository Storage & Sync
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  config.token
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{config.token ? 'Live GitHub API Connected' : 'Simulated / Demo Git Mode'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Save, push, update, and delete application datasets, schemas, and reports directly in your GitHub repo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Repo Settings</span>
          </button>
          <a
            href={`https://github.com/${config.owner}/${config.repo}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#10243a] hover:bg-[#1a3756] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
            <span>Open Repo ({config.owner}/{config.repo})</span>
          </a>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          {notification.url && (
            <a
              href={notification.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline font-bold flex items-center gap-1"
            >
              <span>View Commit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Main Save & Action Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Information Target Selector & Push Controls */}
        <div className="lg:col-span-7 bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#f28c28]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                Save Information to GitHub (Push / Update / Delete)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Branch: {config.branch || 'main'}
            </span>
          </div>

          {/* Dataset Selector Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Select Dataset / Information to Save:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'database', label: 'Full Database JSON', icon: Database, path: 'data/hybrid_civil_database.json' },
                { id: 'associates', label: 'Associates Roster', icon: Users, path: 'data/associates.json' },
                { id: 'clients', label: 'Client Contracts', icon: Briefcase, path: 'data/clients.json' },
                { id: 'transactions_csv', label: 'Ledger CSV', icon: Receipt, path: 'data/transactions.csv' },
                { id: 'markdown', label: 'Overview Markdown', icon: FileText, path: 'PROJECT_OVERVIEW.md' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedFileTarget === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedFileTarget(item.id);
                      setCommitMessage(`Save ${item.path} to GitHub`);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#f28c28] bg-orange-50/40 text-[#10243a] shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-[#f28c28]' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-[11.5px] leading-tight">{item.label}</div>
                      <div className="text-[9.5px] text-slate-500 truncate max-w-[130px] font-mono mt-0.5">{item.path}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Target Path & Commit Message */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Target Repository Path
              </label>
              <div className="relative">
                <FileCode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={currentFile.path}
                  readOnly
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Git Commit Message *
              </label>
              <div className="relative">
                <GitCommit className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  id="gitCommitMessageInput"
                  type="text"
                  required
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g. Save updated associates and 90/5/5 ledger records"
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Live Content Preview Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Content Size: ~{(currentFile.content.length / 1024).toFixed(1)} KB ({currentFile.type})
            </span>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="text-[#f28c28] hover:text-[#d97718] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewOpen ? 'Hide Payload Preview' : 'Inspect File Payload'}</span>
            </button>
          </div>

          {isPreviewOpen && (
            <div className="rounded-lg bg-slate-900 text-slate-200 p-3 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
              <pre>{currentFile.content.substring(0, 3000)}</pre>
              {currentFile.content.length > 3000 && (
                <div className="text-slate-500 italic mt-1">... [truncated for display]</div>
              )}
            </div>
          )}

          {/* Primary Action Buttons: Push, Update, Delete, Pull */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {/* PUSH BUTTON */}
            <button
              id="githubPushBtn"
              type="button"
              disabled={isLoading}
              onClick={handlePushToGitHub}
              className="py-2.5 px-3 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading && operationAction === 'push' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>Push / Commit</span>
            </button>

            {/* UPDATE BUTTON */}
            <button
              id="githubUpdateBtn"
              type="button"
              disabled={isLoading}
              onClick={() => handleUpdateFile()}
              className="py-2.5 px-3 rounded-lg bg-[#10243a] hover:bg-[#1a3756] disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading && operationAction === 'update' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Update File</span>
            </button>

            {/* PULL BUTTON */}
            <button
              id="githubPullBtn"
              type="button"
              disabled={isLoading}
              onClick={() => handlePullFromGitHub()}
              className="py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
            >
              {isLoading && operationAction === 'pull' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Pull / Load</span>
            </button>

            {/* DELETE BUTTON */}
            <button
              id="githubDeleteBtn"
              type="button"
              disabled={isLoading}
              onClick={() => handleDeleteFile()}
              className="py-2.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-rose-200"
            >
              {isLoading && operationAction === 'delete' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Delete File</span>
            </button>
          </div>
        </div>

        {/* Right Column: Repository Files & Recent Activity Logs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Repository Files Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                  Repository Files in <code className="font-mono text-[11px]">data/</code>
                </h3>
              </div>
              <button
                onClick={fetchRepositoryFiles}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Refresh file list"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {repoFiles.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Click Push to save your first file into the repository!
                </div>
              ) : (
                repoFiles.map((f) => (
                  <div
                    key={f.path}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate text-[11.5px]">{f.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{f.path} · {f.size} B</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleUpdateFile(f.path)}
                        className="p-1 rounded hover:bg-slate-200 text-blue-600"
                        title="Update with latest app data"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePullFromGitHub(f.path)}
                        className="p-1 rounded hover:bg-slate-200 text-emerald-600"
                        title="Pull into app"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(f.path)}
                        className="p-1 rounded hover:bg-rose-100 text-rose-600"
                        title="Delete from GitHub"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity / Commit History */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                  Recent Git Activity Log
                </h3>
              </div>
              <span className="text-[10.5px] text-slate-400 font-semibold">
                {logs.length} operations
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {logs.map((log) => {
                const actionBadge =
                  log.action === 'push'
                    ? 'bg-emerald-100 text-emerald-800'
                    : log.action === 'update'
                    ? 'bg-blue-100 text-blue-800'
                    : log.action === 'delete'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-purple-100 text-purple-800';

                return (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${actionBadge}`}>
                          {log.action}
                        </span>
                        <span className="font-mono text-slate-500 font-bold">#{log.sha}</span>
                      </div>
                      <span className="text-slate-400">
                        {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium text-[11px] line-clamp-1">{log.message}</p>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{log.filePath}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CI/CD & Deploy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vercel Deployment Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-black text-white flex items-center justify-center font-bold text-[10px]">
                ▲
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                Vercel Full-Stack Deployment
              </h3>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  'vercel',
                  JSON.stringify(
                    {
                      version: 2,
                      buildCommand: 'vite build',
                      outputDirectory: 'dist',
                      framework: 'vite',
                      rewrites: [
                        { source: '/api/(.*)', destination: '/api/index' },
                        { source: '/api', destination: '/api/index' },
                        { source: '/((?!api/).*)', destination: '/index.html' },
                      ],
                    },
                    null,
                    2
                  )
                )
              }
              className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'vercel' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied vercel.json!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy vercel.json</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Configured for Vercel with automated dependency resolution (<code className="font-mono text-emerald-700">.npmrc</code> with <code className="font-mono text-emerald-700">legacy-peer-deps=true</code>) and Vercel Serverless Function support (<code className="font-mono text-slate-800">api/index.ts</code>).
          </p>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-[11.5px] text-slate-800 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vercel Configuration Verified:</span>
            </div>
            <ul className="text-[11px] list-disc list-inside text-slate-600 pl-1 space-y-0.5">
              <li><b>Build Command:</b> <code className="font-mono bg-white px-1 rounded border">vite build</code></li>
              <li><b>Output Directory:</b> <code className="font-mono bg-white px-1 rounded border">dist</code></li>
              <li><b>Serverless APIs:</b> <code className="font-mono bg-white px-1 rounded border">api/index.ts</code> handles <code className="font-mono text-blue-700">/api/*</code></li>
              <li><b>Client Routing:</b> SPA fallback to <code className="font-mono bg-white px-1 rounded border">/index.html</code></li>
              <li><b>Environment:</b> Add <code className="font-mono text-amber-700">GEMINI_API_KEY</code> in Vercel Settings for AI</li>
            </ul>
          </div>
        </div>

        {/* GitHub Action Workflow */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                GitHub Pages Auto-Deployment CI/CD
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard('actions', githubActionYml)}
              className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'actions' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Workflow!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy deploy.yml</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Whenever you push or update files to branch <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">{config.branch || 'main'}</code>, GitHub Actions builds and publishes your native web application automatically:
          </p>

          <div className="relative rounded-lg bg-slate-900 text-slate-200 p-3 text-[11px] font-mono overflow-x-auto max-h-48">
            <pre>{githubActionYml}</pre>
          </div>
        </div>

        {/* Command Line Commands */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#f28c28]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                Terminal Git Push Commands
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard('git', gitCommands)}
              className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'git' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Commands!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Shell</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            To synchronize your local project with the repository <code className="font-mono text-slate-800 font-bold">{config.owner}/{config.repo}</code>:
          </p>

          <div className="relative rounded-lg bg-slate-900 text-emerald-400 p-3 text-[11px] font-mono overflow-x-auto max-h-48">
            <pre>{gitCommands}</pre>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showConfigModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowConfigModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-[#10243a]" />
                <h3 className="text-sm font-bold text-slate-800">
                  GitHub Repository & API Settings
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  GitHub Username / Organization *
                </label>
                <input
                  type="text"
                  required
                  value={config.owner}
                  onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                  placeholder="e.g. engrkalilinux"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Repository Name *
                </label>
                <input
                  type="text"
                  required
                  value={config.repo}
                  onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                  placeholder="e.g. hybrid-civil-associate-network"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Branch *
                </label>
                <div className="relative">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={config.branch}
                    onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    placeholder="main"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=HybridCivilNetwork"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#f28c28] hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <span>Generate token</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder="ghp_xxxxxxxxxxxx (Optional for demo mode)"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Requires <code className="font-semibold text-slate-600">repo</code> scope. If left blank, the app runs in full simulated Git mode so you can test all operations safely.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#f28c28] hover:bg-[#e07f20] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Repository Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
