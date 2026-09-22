import { Associate, Client, Transaction, Payment, Session, AppDatabase } from '../types';

export const STORAGE_KEY = 'hybridCivilAssociateNetwork_v2';
export const SESSION_KEY = 'hybridCivilSession_auth';

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
};

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.associates)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  // Initialize default
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
  return INITIAL_DATA;
}

export function saveDatabase(data: AppDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
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

export const GITHUB_CONFIG_KEY = 'hybridCivilGitHubConfig_v1';
export const GITHUB_LOGS_KEY = 'hybridCivilGitHubLogs_v1';

import { GitHubConfig, GitHubCommitLog } from '../types';

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: 'engrkalilinux',
  repo: 'hybrid-civil-associate-network',
  branch: 'main',
  token: '',
  filePath: 'data/hybrid_civil_database.json',
  autoSync: false,
};

export function loadGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (raw) return { ...DEFAULT_GITHUB_CONFIG, ...JSON.parse(raw) };
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
      author: 'engrkalilinux',
    },
  ];
}

export function saveGitHubLogs(logs: GitHubCommitLog[]) {
  try {
    localStorage.setItem(GITHUB_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
  } catch (e) {}
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
