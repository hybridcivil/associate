import {
  Associate,
  Client,
  Transaction,
  Payment,
  Session,
  AppDatabase,
  Message,
  GitHubConfig,
  GitHubCommitLog,
} from '../types';

export const STORAGE_KEY = 'hybridCivilAssociateNetwork_v2';
export const SESSION_KEY = 'hybridCivilSession_auth';
export const GITHUB_CONFIG_KEY = 'hybridCivilGitHubConfig_v1';
export const GITHUB_LOGS_KEY = 'hybridCivilGitHubLogs_v1';

export type { AppDatabase };

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function formatMoney(amount: number): string {
  return '৳' + (Number(amount) || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const INITIAL_DATA: AppDatabase = {
  admin: { username: 'admin', password: 'admin123' },
  associates: [
    {
      id: 'assoc-1',
      name: 'Engr. Tanvir Ahmed',
      phone: '01711000111',
      password: 'assoc123',
      email: 'tanvir.civil@hybridcivil.net',
      address: 'Mirpur DOHS, Dhaka',
      status: 'active',
    },
    {
      id: 'assoc-2',
      name: 'Engr. Nadia Sultana',
      phone: '01822000222',
      password: 'assoc123',
      email: 'nadia.struct@hybridcivil.net',
      address: 'Uttara Sector 7, Dhaka',
      status: 'active',
    },
    {
      id: 'assoc-3',
      name: 'Engr. Rakibul Hasan',
      phone: '01933000333',
      password: 'assoc123',
      email: 'rakibul@hybridcivil.net',
      address: 'Agrabad, Chattogram',
      status: 'active',
    },
    {
      id: 'assoc-4',
      name: 'Ar. Farhana Kabir',
      phone: '01644000444',
      password: 'assoc123',
      email: 'farhana.design@hybridcivil.net',
      address: 'Banani, Dhaka',
      status: 'active',
    },
    {
      id: 'assoc-mud4mz7mj22up8',
      name: 'xyz',
      phone: '2207',
      password: '2208',
      email: 'ffg@gg.com',
      address: 'Dhaka, Bangladesh',
      status: 'active',
    },
  ],
  clients: [
    {
      id: 'client-1',
      name: 'Al-Madina Real Estate Ltd.',
      phone: '01755123456',
      project: 'G+9 Commercial & Residential Complex',
      price: 280000,
      advance: 140000,
      associateId: 'assoc-1',
      date: '2026-03-10',
    },
    {
      id: 'client-2',
      name: 'Beximco Industrial Park',
      phone: '01866234567',
      project: 'Steel Shed Foundation & Substructure Analysis',
      price: 450000,
      advance: 250000,
      associateId: 'assoc-2',
      date: '2026-03-15',
    },
    {
      id: 'client-3',
      name: 'Dr. Rafiqul Islam Residence',
      phone: '01977345678',
      project: 'Soil Investigation & G+4 Structural Design',
      price: 180000,
      advance: 90000,
      associateId: 'assoc-4',
      date: '2026-03-18',
    },
    {
      id: 'client-muczs9yo18tbrw',
      name: 'abc',
      phone: '2888',
      project: 'ffgh',
      price: 100,
      advance: 50,
      associateId: 'assoc-1',
      date: '2026-09-22',
    },
  ],
  transactions: [
    {
      id: 'tx-1',
      date: '2026-03-12',
      clientId: 'client-1',
      associateId: 'assoc-1',
      shareType: 'Selected associate 5%',
      amount: 4500,
      profit: 90000,
      kind: 'referral',
    },
    {
      id: 'tx-2',
      date: '2026-03-12',
      clientId: 'client-1',
      associateId: 'assoc-2',
      shareType: 'Equal distribution 5% pool',
      amount: 1500,
      profit: 90000,
      kind: 'equal',
      distributionId: 'tx-1',
    },
    {
      id: 'tx-3',
      date: '2026-03-12',
      clientId: 'client-1',
      associateId: 'assoc-3',
      shareType: 'Equal distribution 5% pool',
      amount: 1500,
      profit: 90000,
      kind: 'equal',
      distributionId: 'tx-1',
    },
    {
      id: 'tx-4',
      date: '2026-03-12',
      clientId: 'client-1',
      associateId: 'assoc-4',
      shareType: 'Equal distribution 5% pool',
      amount: 1500,
      profit: 90000,
      kind: 'equal',
      distributionId: 'tx-1',
    },
    {
      id: 'tx-5',
      date: '2026-03-16',
      clientId: 'client-2',
      associateId: 'assoc-2',
      shareType: 'Selected associate 5%',
      amount: 7500,
      profit: 150000,
      kind: 'referral',
    },
    {
      id: 'tx-6',
      date: '2026-03-16',
      clientId: 'client-2',
      associateId: 'assoc-1',
      shareType: 'Equal distribution 5% pool',
      amount: 2500,
      profit: 150000,
      kind: 'equal',
      distributionId: 'tx-5',
    },
    {
      id: 'tx-7',
      date: '2026-03-16',
      clientId: 'client-2',
      associateId: 'assoc-3',
      shareType: 'Equal distribution 5% pool',
      amount: 2500,
      profit: 150000,
      kind: 'equal',
      distributionId: 'tx-5',
    },
    {
      id: 'tx-8',
      date: '2026-03-16',
      clientId: 'client-2',
      associateId: 'assoc-4',
      shareType: 'Equal distribution 5% pool',
      amount: 2500,
      profit: 150000,
      kind: 'equal',
      distributionId: 'tx-5',
    },
  ],
  payments: [
    {
      id: 'pay-1',
      associateId: 'assoc-1',
      date: '2026-03-14',
      amount: 4500,
      parts: { 'tx-1': 4500 },
      allocations: ['tx-1'],
    },
    {
      id: 'pay-2',
      associateId: 'assoc-2',
      date: '2026-03-18',
      amount: 5000,
      parts: { 'tx-2': 1500, 'tx-5': 3500 },
      allocations: ['tx-2', 'tx-5'],
    },
  ],
  messages: [
    {
      id: 'msg-1',
      senderRole: 'associate',
      senderId: 'assoc-1',
      senderName: 'Engr. Tanvir Ahmed',
      receiverId: 'admin',
      receiverName: 'Administrator',
      associateId: 'assoc-1',
      subject: 'Inquiry on Bashundhara Project 5% Advance Commission',
      content: 'Assalamu Alaikum Admin, I wanted to confirm if the 5% direct commission for the Bashundhara Commercial project advance has been processed for the current billing cycle.',
      timestamp: '2026-03-16T10:30:00Z',
      read: true,
      priority: 'normal',
      category: 'payment',
    },
    {
      id: 'msg-2',
      senderRole: 'admin',
      senderId: 'admin',
      senderName: 'Administrator',
      receiverId: 'assoc-1',
      receiverName: 'Engr. Tanvir Ahmed',
      associateId: 'assoc-1',
      subject: 'Re: Inquiry on Bashundhara Project 5% Advance Commission',
      content: 'Wa Alaikum Assalam Tanvir. Yes, ৳4,500 has been credited to your transaction ledger and the partial payment voucher is issued. You can check the Transactions tab.',
      timestamp: '2026-03-16T11:45:00Z',
      read: true,
      priority: 'normal',
      category: 'payment',
    },
    {
      id: 'msg-3',
      senderRole: 'associate',
      senderId: 'assoc-2',
      senderName: 'Engr. Nadia Sultana',
      receiverId: 'admin',
      receiverName: 'Administrator',
      associateId: 'assoc-2',
      subject: 'Structural Detailing Sheet Approval for Mirpur Site',
      content: 'Dear Admin, the revised structural detailing sheets with BNBC-2020 seismic provisions for Mirpur site have been finalized. Please let me know once approved so we can issue to site engineer.',
      timestamp: '2026-03-18T09:15:00Z',
      read: true,
      priority: 'urgent',
      category: 'technical',
    },
    {
      id: 'msg-mud501rbotcxke',
      senderRole: 'admin',
      senderId: 'admin',
      senderName: 'Administrator',
      receiverId: 'assoc-mud4mz7mj22up8',
      receiverName: 'xyz',
      associateId: 'assoc-mud4mz7mj22up8',
      content: 'hi',
      timestamp: '2026-09-22T20:39:00.839Z',
      read: true,
      priority: 'normal',
      category: 'general',
    },
    {
      id: 'msg-mud5qe5tdh59ar',
      senderRole: 'associate',
      senderId: 'assoc-mud4mz7mj22up8',
      senderName: 'xyz',
      receiverId: 'admin',
      receiverName: 'Administrator',
      associateId: 'assoc-mud4mz7mj22up8',
      content: 'need payment',
      timestamp: '2026-09-22T20:59:29.969Z',
      read: true,
      priority: 'normal',
      category: 'payment',
    },
    {
      id: 'msg-mudwgze49bchr4',
      senderRole: 'admin',
      senderId: 'admin',
      senderName: 'Administrator',
      receiverId: 'assoc-mud4mz7mj22up8',
      receiverName: 'xyz',
      associateId: 'assoc-mud4mz7mj22up8',
      content: 'hi',
      timestamp: '2026-09-23T09:28:00.556Z',
      read: true,
      priority: 'normal',
      category: 'general',
    },
  ],
};

/**
 * Merge two databases non-destructively so NO messages or records are ever lost.
 */
export function mergeDatabases(localDb: AppDatabase, remoteDb: AppDatabase): AppDatabase {
  if (!localDb) return remoteDb || INITIAL_DATA;
  if (!remoteDb) return localDb || INITIAL_DATA;

  // 1. Merge associates (union by id)
  const associateMap = new Map<string, any>();
  for (const a of (localDb.associates || [])) {
    if (a && a.id) associateMap.set(a.id, a);
  }
  for (const a of (remoteDb.associates || [])) {
    if (a && a.id) {
      const existing = associateMap.get(a.id);
      associateMap.set(a.id, existing ? { ...existing, ...a } : a);
    }
  }

  // 2. Merge clients (union by id)
  const clientMap = new Map<string, any>();
  for (const c of (localDb.clients || [])) {
    if (c && c.id) clientMap.set(c.id, c);
  }
  for (const c of (remoteDb.clients || [])) {
    if (c && c.id) {
      const existing = clientMap.get(c.id);
      clientMap.set(c.id, existing ? { ...existing, ...c } : c);
    }
  }

  // 3. Merge transactions (union by id)
  const txMap = new Map<string, any>();
  for (const t of (localDb.transactions || [])) {
    if (t && t.id) txMap.set(t.id, t);
  }
  for (const t of (remoteDb.transactions || [])) {
    if (t && t.id) txMap.set(t.id, t);
  }

  // 4. Merge payments (union by id)
  const payMap = new Map<string, any>();
  for (const p of (localDb.payments || [])) {
    if (p && p.id) payMap.set(p.id, p);
  }
  for (const p of (remoteDb.payments || [])) {
    if (p && p.id) payMap.set(p.id, p);
  }

  // 5. Merge messages (union by id) - CRITICAL: NEVER DELETE ANY MESSAGE!
  const msgMap = new Map<string, any>();
  for (const m of (localDb.messages || [])) {
    if (m && m.id) msgMap.set(m.id, m);
  }
  for (const m of (remoteDb.messages || [])) {
    if (m && m.id) {
      const existing = msgMap.get(m.id);
      if (existing) {
        msgMap.set(m.id, {
          ...existing,
          ...m,
          read: existing.read || m.read,
        });
      } else {
        msgMap.set(m.id, m);
      }
    }
  }
  const mergedMessages = Array.from(msgMap.values()).sort(
    (a: any, b: any) =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );

  return {
    admin: remoteDb.admin || localDb.admin || INITIAL_DATA.admin,
    associates: Array.from(associateMap.values()),
    clients: Array.from(clientMap.values()),
    transactions: Array.from(txMap.values()),
    payments: Array.from(payMap.values()),
    messages: mergedMessages,
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.associates)) {
        if (!Array.isArray(parsed.messages)) {
          parsed.messages = INITIAL_DATA.messages || [];
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  return INITIAL_DATA;
}

/**
 * Loads database authoritatively from GitHub or server repository.
 * Keeps localStorage cache up-to-date as an instant offline backup.
 */
export async function fetchAuthoritativeDatabase(): Promise<{
  success: boolean;
  data: AppDatabase;
  source: string;
  sha?: string;
}> {
  try {
    const config = loadGitHubConfig();
    const params = new URLSearchParams();
    if (config?.owner) params.set('owner', config.owner);
    if (config?.repo) params.set('repo', config.repo);
    if (config?.branch) params.set('branch', config.branch);
    if (config?.token) params.set('token', config.token);

    params.set('_t', Date.now().toString());

    const res = await fetch(`/api/database?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data.associates)) {
        if (!Array.isArray(json.data.messages)) {
          json.data.messages = INITIAL_DATA.messages || [];
        }
        if (!Array.isArray(json.data.clients)) {
          json.data.clients = [];
        }
        if (!Array.isArray(json.data.transactions)) {
          json.data.transactions = [];
        }
        if (!Array.isArray(json.data.payments)) {
          json.data.payments = [];
        }

        const authoritativeData: AppDatabase = {
          admin: json.data.admin || INITIAL_DATA.admin,
          associates: Array.isArray(json.data.associates) ? json.data.associates : [],
          clients: Array.isArray(json.data.clients) ? json.data.clients : [],
          transactions: Array.isArray(json.data.transactions) ? json.data.transactions : [],
          payments: Array.isArray(json.data.payments) ? json.data.payments : [],
          messages: Array.isArray(json.data.messages) ? json.data.messages : [],
        };

        // Cache locally for offline resilience
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authoritativeData));
        } catch (e) {}

        return {
          success: true,
          data: authoritativeData,
          source: json.source || 'github',
          sha: json.sha,
        };
      }
    }
  } catch (e) {
    console.warn('Could not fetch authoritative database from GitHub/server:', e);
  }

  return {
    success: false,
    data: loadDatabase(),
    source: 'local_cache',
  };
}

/**
 * Saves database directly to GitHub and server repository.
 * Also keeps an offline backup in localStorage.
 */
export async function saveDatabase(data: AppDatabase, commitMessage?: string): Promise<{
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  message?: string;
  authError?: boolean;
  warning?: string;
}> {
  // 1. Instant local cache update so UI is immediately updated
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Local cache save error:', e);
  }

  // 2. Authoritative save to GitHub & server repository
  try {
    const config = loadGitHubConfig();
    const res = await fetch('/api/database/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        message: commitMessage || `Update database state [${new Date().toLocaleTimeString()}]`,
        owner: config?.owner || 'hybridcivil',
        repo: config?.repo || 'associate',
        branch: config?.branch || 'main',
        token: config?.token || '',
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.github?.commitSha) {
        const newLog: GitHubCommitLog = {
          id: 'log-' + Date.now(),
          sha: json.github.commitSha,
          message: commitMessage || 'Auto-sync database to GitHub repository',
          action: 'update',
          filePath: 'data/hybrid_civil_database.json',
          date: new Date().toISOString(),
          status: 'success',
          htmlUrl: json.github.commitUrl,
          author: config?.owner || 'hybridcivil',
        };
        const existing = loadGitHubLogs();
        saveGitHubLogs([newLog, ...existing]);
      }
      return {
        success: true,
        commitSha: json.github?.commitSha,
        commitUrl: json.github?.commitUrl,
        message: json.message || 'Auto-pushed to GitHub repository',
        authError: json.github?.authError,
        warning: json.github?.warning,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Saved locally, GitHub sync failed',
    };
  }

  return { success: false, message: 'Saved to local cache' };
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveSession(session: Session | null) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function calculateAssociateTotals(
  db: AppDatabase,
  associateId: string
): { earned: number; paid: number; due: number } {
  const earned = db.transactions
    .filter((t) => t.associateId === associateId)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const paid = db.payments
    .filter((p) => p.associateId === associateId)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    earned,
    paid,
    due: Math.max(0, earned - paid),
  };
}

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: 'hybridcivil',
  repo: 'associate',
  branch: 'main',
  token: '',
  filePath: 'data/hybrid_civil_database.json',
  autoSync: true,
};

export function loadGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old placeholder default to correct repo if needed
      if (!parsed.owner || parsed.owner === 'engrkalilinux' || parsed.repo === 'hybrid-civil-associate-network') {
        parsed.owner = 'hybridcivil';
        parsed.repo = 'associate';
        saveGitHubConfig(parsed);
      }
      return { ...DEFAULT_GITHUB_CONFIG, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_GITHUB_CONFIG;
}

export function saveGitHubConfig(config: GitHubConfig) {
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}
}

export function loadGitHubLogs(): GitHubCommitLog[] {
  try {
    const raw = localStorage.getItem(GITHUB_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      id: 'init-log',
      sha: 'a4f91b0',
      message: 'Initial project setup & structure for Hybrid Civil Associate Network',
      action: 'push',
      filePath: 'data/hybrid_civil_database.json',
      date: new Date(Date.now() - 3600000).toISOString(),
      status: 'success',
      author: 'hybridcivil',
    },
  ];
}

export function saveGitHubLogs(logs: GitHubCommitLog[]) {
  try {
    localStorage.setItem(GITHUB_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
  } catch (e) {}
}

export async function fetchServerGitHubConfig(): Promise<{
  owner: string;
  repo: string;
  branch: string;
  hasToken: boolean;
  tokenMasked: string | null;
}> {
  try {
    const res = await fetch(`/api/github/config?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return { owner: 'hybridcivil', repo: 'associate', branch: 'main', hasToken: false, tokenMasked: null };
}

export async function saveServerGitHubConfig(payload: {
  owner?: string;
  repo?: string;
  branch?: string;
  token?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/github/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Auto-sync application database to GitHub repository.
 * Invoked on critical actions like associate password updates, payments, and messaging.
 */
export async function syncDatabaseToGitHub(
  db: AppDatabase,
  commitMessage: string
): Promise<{
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  message?: string;
  error?: string;
  authError?: boolean;
}> {
  try {
    const config = loadGitHubConfig();
    if (!config || !config.owner || !config.repo) {
      return { success: false, message: 'GitHub repository not configured in GitHub Host settings.' };
    }

    if (config.autoSync === false) {
      return { success: false, message: 'GitHub Auto-Sync is paused in repository settings.' };
    }

    const targetPath = config.filePath || 'data/hybrid_civil_database.json';
    const res = await fetch('/api/github/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: config.owner.trim(),
        repo: config.repo.trim(),
        branch: config.branch.trim() || 'main',
        path: targetPath,
        content: JSON.stringify(db, null, 2),
        message: commitMessage || `Auto-sync Hybrid Civil Network state`,
        token: config.token ? config.token.trim() : '',
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error || 'Failed to push to GitHub',
        authError: data.authError,
      };
    }

    const newLog: GitHubCommitLog = {
      id: 'log-' + Date.now(),
      sha: data.commitSha || 'latest',
      message: commitMessage,
      action: 'update',
      filePath: targetPath,
      date: new Date().toISOString(),
      status: 'success',
      htmlUrl: data.commitUrl,
      author: config.owner,
    };

    const existingLogs = loadGitHubLogs();
    saveGitHubLogs([newLog, ...existingLogs]);

    return {
      success: true,
      commitSha: data.commitSha || 'latest',
      commitUrl: data.commitUrl,
      message: data.message || `Successfully pushed update to ${config.owner}/${config.repo}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Auto-sync failed' };
  }
}

// Generate formatted Markdown overview for GitHub repository
export function generateRepositoryMarkdown(db: AppDatabase): string {
  const activeAssociates = db.associates.filter((a) => a.status === 'active');
  const totalProfitDistributed = db.transactions
    .filter((t) => t.kind === 'referral')
    .reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalEarnedByAssociates = db.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDisbursed = db.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingDues = Math.max(0, totalEarnedByAssociates - totalDisbursed);

  return `# HYBRID CIVIL — Associate Network Repository
*Comprehensive Civil Engineering Consultancy & 90/5/5 Profit Distribution System*

**Updated On:** ${new Date().toUTCString()}

---

## 🏗️ Executive Summary
- **Active Civil Engineering Associates:** ${activeAssociates.length}
- **Client & Project Agreements:** ${db.clients.length}
- **Total Net Project Profit Accounted:** ৳${totalProfitDistributed.toLocaleString('en-BD')}
- **Associate Earnings (Direct 5% + Equal 5% Pool):** ৳${totalEarnedByAssociates.toLocaleString('en-BD')}
- **Total Disbursements Completed:** ৳${totalDisbursed.toLocaleString('en-BD')}
- **Outstanding Balance Due:** ৳${pendingDues.toLocaleString('en-BD')}

---

## 📊 90 / 5 / 5 Business Protocol
1. **90% Company Operations & Equipment Reserve**: Covers company infrastructure, licenses, equipment calibration, and project execution.
2. **5% Direct Lead Associate Commission**: Rewarded to the associate who brought in or directly leads the project agreement.
3. **5% Equal Partner Pool**: Evenly distributed among all remaining active engineering partners in good standing.

---

## 👥 Certified Associate Roster
| Associate Name | Phone | Email | Status |
| :--- | :--- | :--- | :--- |
${db.associates
  .map((a) => `| **${a.name}** | \`${a.phone}\` | ${a.email || 'N/A'} | ${a.status.toUpperCase()} |`)
  .join('\n')}

---

## 💼 Active Client Projects
| Client Name | Phone | Service / Scope | Price (BDT) | Advance Paid |
| :--- | :--- | :--- | :--- | :--- |
${db.clients
  .map(
    (c) =>
      `| **${c.name}** | \`${c.phone}\` | ${c.project} | ৳${c.price.toLocaleString('en-BD')} | ৳${c.advance.toLocaleString('en-BD')} |`
  )
  .join('\n')}

---
*Generated automatically by Hybrid Civil Associate Network Web App.*
`;
}
