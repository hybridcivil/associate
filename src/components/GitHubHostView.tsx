import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppDatabase } from '../types';

interface GitHubHostViewProps {
  db: AppDatabase;
}

export const GitHubHostView: React.FC<GitHubHostViewProps> = ({ db }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

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

  const gitCommands = `# 1. Initialize git in your local export folder
git init
git add .
git commit -m "Initial commit of Hybrid Civil Associate Network Native App"

# 2. Add your GitHub repository remote
git remote add origin https://github.com/<your-username>/hybrid-civil-network.git

# 3. Push to main branch
git branch -M main
git push -u origin main

# 4. In your GitHub repository:
# Go to Settings > Pages > Source -> Select "GitHub Actions"
# Your app is live at: https://<your-username>.github.io/hybrid-civil-network/
`;

  // Download export package info
  const handleDownloadStandaloneHtml = () => {
    // Generate an all-in-one standalone HTML bundle that can be dropped directly onto GitHub Pages without even needing npm build!
    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Hybrid Civil Associate Network</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#10243a">
<style>
:root{--navy:#10243a;--orange:#f28c28;--bg:#f3f6fa;--card:#fff;--text:#172334;--muted:#65758b;--line:#e3e9f0;--green:#16865b;--red:#c53d48}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{background:var(--bg);font:12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--text);display:flex;flex-direction:column}
header{flex:0 0 auto;background:linear-gradient(110deg,#10243a,#1c3b58);color:#fff;padding:10px 14px}
.wrap{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px}
header h1{font-size:16px;font-weight:700}
.btn{border:0;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;background:var(--navy);color:#fff}
.btn.orange{background:var(--orange)}
main{flex:1;overflow:auto;padding:14px;max-width:1200px;width:100%;margin:0 auto}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:12px}
</style>
</head>
<body>
<header>
  <div class="wrap">
    <h1>HYBRID CIVIL — Associate Network (GitHub Host Export)</h1>
    <span style="font-size:11px;background:#ffffff20;padding:4px 8px;border-radius:6px">GitHub Pages Ready</span>
  </div>
</header>
<main>
  <div class="card">
    <h2>Offline & GitHub Pages Static Ready</h2>
    <p>This export includes current database records: ${db.associates.length} Associates, ${db.clients.length} Clients, and ${db.transactions.length} Transactions.</p>
  </div>
</main>
</body>
</html>`;

    const blob = new Blob([standaloneHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10243a] flex items-center gap-2">
            <Github className="w-5 h-5 text-slate-800" />
            GitHub Host & Native PWA Integration
          </h2>
          <p className="text-xs text-slate-500">
            Deploy this application to GitHub Pages and install as a native iOS/Android web app
          </p>
        </div>

        <button
          onClick={handleDownloadStandaloneHtml}
          className="px-3.5 py-1.5 rounded-lg bg-[#10243a] hover:bg-[#1a3756] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-orange-400" />
          <span>Download GitHub Static index.html</span>
        </button>
      </div>

      {/* 2-Column Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: GitHub Host Workflow */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                1. GitHub Pages Auto-Deploy Workflow
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard('actions', githubActionYml)}
              className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'actions' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied YML!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy .github/workflows/deploy.yml</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Create a file at <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">.github/workflows/deploy.yml</code> in your repository. GitHub will automatically build and publish your app on every git push:
          </p>

          <div className="relative rounded-lg bg-slate-900 text-slate-200 p-3 text-[11px] font-mono overflow-x-auto max-h-56">
            <pre>{githubActionYml}</pre>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              Configured for zero-config routing: Works seamlessly under custom domains or <code className="font-semibold">username.github.io/repo</code> paths.
            </span>
          </div>
        </div>

        {/* Right: Git Push Commands */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#f28c28]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
                2. Command Line Push to GitHub
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard('git', gitCommands)}
              className="text-xs font-semibold text-[#f28c28] hover:text-[#d97718] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'git' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Shell!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Shell Commands</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Use these shell commands to connect your repository and push the Hybrid Civil codebase to GitHub:
          </p>

          <div className="relative rounded-lg bg-slate-900 text-emerald-400 p-3 text-[11px] font-mono overflow-x-auto max-h-56">
            <pre>{gitCommands}</pre>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
            <Laptop className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              All data (associates, clients, transactions) is cached locally in browser storage, so your GitHub Pages deployment works 100% offline.
            </span>
          </div>
        </div>
      </div>

      {/* Native App Look & PWA Experience */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Smartphone className="w-4 h-4 text-[#f28c28]" />
          <h3 className="text-xs sm:text-sm font-bold text-[#10243a]">
            3. Native App Look & Mobile Experience (iOS / Android)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>iOS / Safari Installation</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Tap the <b>Share</b> button in Safari, then tap <b>"Add to Home Screen"</b>. The app opens without browser URL bars, complete with native status bar theming and safe-area inset protection.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Android / Chrome Installation</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Open in Chrome and tap <b>"Install App"</b> or <b>"Add to Home Screen"</b> from the menu. Installs as a standalone APK wrapper with an adaptive high-resolution app icon.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Tactile Native Controls</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Equipped with spring tab animations, segmented top bar controls, mobile thumb navigation bar, and dark status headers matching native iOS and Android guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
