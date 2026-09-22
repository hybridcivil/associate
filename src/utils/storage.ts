import { Associate, Client, Transaction, Payment, Session, AppDatabase } from '../types';

export const STORAGE_KEY = 'hybridCivilAssociateNetwork_v2';
export const SESSION_KEY = 'hybridCivilSession';

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
