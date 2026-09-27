import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppDatabase, Associate, Client, Transaction, Payment, Message } from '../types';

export const SUPABASE_CONFIG_KEY = 'hybridCivilSupabaseConfig_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export interface SupabaseTestResult {
  success: boolean;
  message: string;
  details?: string;
  tablesFound?: string[];
  mode?: 'tables' | 'store' | 'none';
}

// Global cached client instance
let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const DEFAULT_SUPABASE_URL = 'https://fyfpkmqdhgnvyrrinuao.supabase.co';

/**
 * Loads Supabase configuration from localStorage or Vite environment variables
 */
export function loadSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let stored: Partial<SupabaseConfig> = {};
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse Supabase config from localStorage:', e);
  }

  return {
    url: stored.url || envUrl || DEFAULT_SUPABASE_URL,
    anonKey: stored.anonKey || envKey || '',
    autoSync: stored.autoSync !== undefined ? stored.autoSync : true,
  };
}

/**
 * Saves Supabase configuration to localStorage and invalidates client cache
 */
export function saveSupabaseConfig(config: SupabaseConfig) {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    if (config.url !== lastUsedUrl || config.anonKey !== lastUsedKey) {
      cachedClient = null;
    }
  } catch (e) {
    console.error('Failed to save Supabase config:', e);
  }
}

function getLocalDeletedAssociateIds(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hybridCivilDeletedAssocs_v1') : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function getLocalDeletedClientIds(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hybridCivilDeletedClients_v1') : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function getLocalDeletedTransactionIds(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hybridCivilDeletedTxs_v1') : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

export async function deleteAssociateFromSupabase(assocId: string): Promise<boolean> {
  const cfg = loadSupabaseConfig();
  const client = getSupabaseClient(cfg.url, cfg.anonKey);
  if (!client || !assocId) return false;
  try {
    const { error } = await client.from('associates').delete().eq('id', assocId);
    return !error;
  } catch (err) {
    console.warn('Failed to delete associate from Supabase:', err);
    return false;
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<boolean> {
  const cfg = loadSupabaseConfig();
  const client = getSupabaseClient(cfg.url, cfg.anonKey);
  if (!client || !clientId) return false;
  try {
    const { error } = await client.from('clients').delete().eq('id', clientId);
    return !error;
  } catch (err) {
    console.warn('Failed to delete client from Supabase:', err);
    return false;
  }
}

export async function deleteTransactionFromSupabase(txId: string): Promise<boolean> {
  const cfg = loadSupabaseConfig();
  const client = getSupabaseClient(cfg.url, cfg.anonKey);
  if (!client || !txId) return false;
  try {
    const { error } = await client.from('transactions').delete().eq('id', txId);
    return !error;
  } catch (err) {
    console.warn('Failed to delete transaction from Supabase:', err);
    return false;
  }
}

export async function deleteTransactionsFromSupabase(txIds: string[]): Promise<boolean> {
  const cfg = loadSupabaseConfig();
  const client = getSupabaseClient(cfg.url, cfg.anonKey);
  if (!client || !txIds || txIds.length === 0) return false;
  try {
    const { error } = await client.from('transactions').delete().in('id', txIds);
    return !error;
  } catch (err) {
    console.warn('Failed to delete transactions from Supabase:', err);
    return false;
  }
}

/**
 * Returns an initialized SupabaseClient, or null if configuration is missing
 */
export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const cfg = loadSupabaseConfig();
  const url = (customUrl || cfg.url || '').trim();
  const key = (customKey || cfg.anonKey || '').trim();

  if (!url || !key) return null;

  if (cachedClient && url === lastUsedUrl && key === lastUsedKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

/**
 * Fetch server-side Supabase configuration
 */
export async function fetchServerSupabaseConfig(): Promise<{
  success: boolean;
  url: string;
  hasKey: boolean;
  publishableKey?: string;
  keyMasked: string | null;
  autoSync: boolean;
}> {
  try {
    const res = await fetch('/api/supabase/config', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.publishableKey) {
        const cur = loadSupabaseConfig();
        if (!cur.anonKey) {
          saveSupabaseConfig({
            url: data.url || cur.url || DEFAULT_SUPABASE_URL,
            anonKey: data.publishableKey,
            autoSync: data.autoSync ?? true,
          });
        }
      }
      return data;
    }
  } catch (e) {
    console.warn('Could not fetch server Supabase config:', e);
  }
  return {
    success: false,
    url: '',
    hasKey: false,
    publishableKey: '',
    keyMasked: null,
    autoSync: true,
  };
}

/**
 * Save server-side Supabase configuration
 */
export async function saveServerSupabaseConfig(config: {
  url?: string;
  anonKey?: string;
  autoSync?: boolean;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to save server Supabase config:', e);
    return false;
  }
}

/**
 * Test connectivity with Supabase project
 */
export async function testSupabaseConnection(
  urlInput?: string,
  keyInput?: string
): Promise<SupabaseTestResult> {
  const cfg = loadSupabaseConfig();
  const url = (urlInput || cfg.url || '').trim();
  const key = (keyInput || cfg.anonKey || '').trim();

  if (!url) {
    return {
      success: false,
      message: 'Supabase Project URL is required',
      details: 'Example: https://abcdefghijklm.supabase.co',
    };
  }

  if (!key) {
    return {
      success: false,
      message: 'Supabase API Key (Anon or Service) is required',
      details: 'Find your anon key in Supabase Dashboard > Project Settings > API',
    };
  }

  try {
    const client = getSupabaseClient(url, key);
    if (!client) {
      return { success: false, message: 'Invalid URL format' };
    }

    const tablesFound: string[] = [];

    // Probe associates table
    const { error: assocErr } = await client
      .from('associates')
      .select('id')
      .limit(1);

    if (!assocErr) {
      tablesFound.push('associates');
    }

    // Probe clients table
    const { error: clientErr } = await client.from('clients').select('id').limit(1);
    if (!clientErr) tablesFound.push('clients');

    // Probe transactions table
    const { error: txErr } = await client.from('transactions').select('id').limit(1);
    if (!txErr) tablesFound.push('transactions');

    // Probe payments table
    const { error: payErr } = await client.from('payments').select('id').limit(1);
    if (!payErr) tablesFound.push('payments');

    // Probe messages table
    const { error: msgErr } = await client.from('messages').select('id').limit(1);
    if (!msgErr) tablesFound.push('messages');

    // Probe app_database store
    const { error: storeErr } = await client.from('app_database').select('key').limit(1);
    if (!storeErr) tablesFound.push('app_database');

    if (tablesFound.length > 0) {
      return {
        success: true,
        message: 'Successfully connected to Supabase!',
        details: `Active tables verified: ${tablesFound.join(', ')}`,
        tablesFound,
        mode: tablesFound.includes('associates') ? 'tables' : 'store',
      };
    }

    // If tables don't exist yet, probe rest endpoint to verify valid connection credentials
    const pingRes = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (pingRes.ok || pingRes.status === 200 || pingRes.status === 404) {
      return {
        success: true,
        message: 'Connection to Supabase successful!',
        details:
          'Supabase project credentials are valid. Run the migration SQL in Supabase SQL editor or click "Seed to Supabase" to create tables.',
        tablesFound: [],
        mode: 'none',
      };
    } else if (pingRes.status === 401) {
      return {
        success: false,
        message: 'Supabase Authentication Failed (401)',
        details: 'The anon key or service role key provided is invalid or expired.',
      };
    } else {
      return {
        success: false,
        message: `Supabase returned HTTP ${pingRes.status}`,
        details: 'Please check your Project URL and API Key.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Failed to contact Supabase',
      details: err.message || 'Network error or invalid Supabase URL.',
    };
  }
}

/**
 * Loads entire database from Supabase tables or app_database snapshot
 */
export async function fetchFromSupabase(): Promise<{
  success: boolean;
  data?: AppDatabase;
  source: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, source: 'supabase', error: 'Supabase client not configured' };
  }

  try {
    // 1. Try relational tables first
    const [assocRes, clientRes, txRes, payRes, msgRes, settingsRes] = await Promise.all([
      client.from('associates').select('*'),
      client.from('clients').select('*'),
      client.from('transactions').select('*'),
      client.from('payments').select('*'),
      client.from('messages').select('*').order('timestamp', { ascending: true }),
      client.from('system_settings').select('*'),
    ]);

    const hasTables =
      !assocRes.error &&
      !clientRes.error &&
      !txRes.error &&
      !payRes.error &&
      !msgRes.error;

    if (hasTables) {
      const adminSetting = (settingsRes.data || []).find((s: any) => s.key === 'admin');
      const adminCreds = adminSetting ? adminSetting.value : { username: 'admin', password: 'admin123' };

      const deletedAssocIds = getLocalDeletedAssociateIds();
      const associates: Associate[] = (assocRes.data || [])
        .filter((a: any) => a && !deletedAssocIds.has(a.id))
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          password: a.password || 'assoc123',
          email: a.email || '',
          address: a.address || '',
          status: a.status || 'active',
        }));

      const deletedClientIds = getLocalDeletedClientIds();
      const clients: Client[] = (clientRes.data || [])
        .filter((c: any) => c && !deletedClientIds.has(c.id))
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          project: c.project,
          price: Number(c.price || 0),
          advance: Number(c.advance || 0),
          associateId: c.associate_id || undefined,
          date: c.date,
        }));

      const deletedTxIds = getLocalDeletedTransactionIds();
      const transactions: Transaction[] = (txRes.data || [])
        .filter((t: any) => t && !deletedTxIds.has(t.id))
        .map((t: any) => ({
          id: t.id,
          date: t.date,
          clientId: t.client_id,
          associateId: t.associate_id,
          shareType: t.share_type,
          amount: Number(t.amount || 0),
          profit: Number(t.profit || 0),
          kind: t.kind,
          distributionId: t.distribution_id || undefined,
        }));

      const payments: Payment[] = (payRes.data || []).map((p: any) => ({
        id: p.id,
        associateId: p.associate_id,
        date: p.date,
        amount: Number(p.amount || 0),
        parts: p.parts || {},
        allocations: Array.isArray(p.allocations) ? p.allocations : [],
      }));

      const messages: Message[] = (msgRes.data || []).map((m: any) => ({
        id: m.id,
        senderRole: m.sender_role,
        senderId: m.sender_id,
        senderName: m.sender_name,
        receiverId: m.receiver_id,
        receiverName: m.receiver_name || undefined,
        associateId: m.associate_id,
        subject: m.subject || undefined,
        content: m.content,
        timestamp: m.timestamp,
        read: Boolean(m.read),
        priority: m.priority || 'normal',
        category: m.category || 'general',
        isEdited: Boolean(m.is_edited),
        editedAt: m.edited_at || undefined,
      }));

      if (associates.length > 0 || clients.length > 0 || messages.length > 0) {
        return {
          success: true,
          source: 'supabase_relational',
          data: {
            admin: adminCreds,
            associates,
            clients,
            transactions,
            payments,
            messages,
          },
        };
      }
    }

    // 2. Fallback check for single app_database store
    const { data: storeData, error: storeErr } = await client
      .from('app_database')
      .select('data')
      .eq('key', 'main')
      .maybeSingle();

    if (!storeErr && storeData?.data) {
      return {
        success: true,
        source: 'supabase_store',
        data: storeData.data,
      };
    }

    return {
      success: false,
      source: 'supabase',
      error: 'No tables or records found in Supabase project',
    };
  } catch (err: any) {
    console.error('Error fetching database from Supabase:', err);
    return {
      success: false,
      source: 'supabase',
      error: err.message || 'Failed to fetch from Supabase',
    };
  }
}

/**
 * Saves and upserts database to Supabase (both relational tables and snapshot backup)
 */
export async function saveToSupabase(
  db: AppDatabase,
  deletedAssocId?: string,
  deletedClientId?: string,
  deletedTxIds?: string[]
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    // Delete any explicitly removed entities directly from relational tables
    const deleteTasks: Promise<any>[] = [];
    if (deletedAssocId) {
      deleteTasks.push(Promise.resolve(client.from('associates').delete().eq('id', deletedAssocId)));
    }
    const localDeletedAssocIds = getLocalDeletedAssociateIds();
    for (const delId of localDeletedAssocIds) {
      deleteTasks.push(Promise.resolve(client.from('associates').delete().eq('id', delId)));
    }

    if (deletedClientId) {
      deleteTasks.push(Promise.resolve(client.from('clients').delete().eq('id', deletedClientId)));
    }
    const localDeletedClientIds = getLocalDeletedClientIds();
    for (const delId of localDeletedClientIds) {
      deleteTasks.push(Promise.resolve(client.from('clients').delete().eq('id', delId)));
    }

    if (deletedTxIds && deletedTxIds.length > 0) {
      deleteTasks.push(Promise.resolve(client.from('transactions').delete().in('id', deletedTxIds)));
    }
    const localDeletedTxIds = getLocalDeletedTransactionIds();
    if (localDeletedTxIds.size > 0) {
      deleteTasks.push(Promise.resolve(client.from('transactions').delete().in('id', Array.from(localDeletedTxIds))));
    }

    if (deleteTasks.length > 0) {
      await Promise.allSettled(deleteTasks);
    }

    // 1. Upsert snapshot into app_database
    const storePromise = client.from('app_database').upsert(
      {
        key: 'main',
        data: db,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    // 2. Format records for relational tables
    const associatesRows = (db.associates || []).map((a) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      password: a.password || 'assoc123',
      email: a.email || null,
      address: a.address || null,
      status: a.status || 'active',
      updated_at: new Date().toISOString(),
    }));

    const clientsRows = (db.clients || []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      project: c.project,
      price: c.price || 0,
      advance: c.advance || 0,
      associate_id: c.associateId || null,
      date: c.date,
      updated_at: new Date().toISOString(),
    }));

    const transactionsRows = (db.transactions || []).map((t) => ({
      id: t.id,
      date: t.date,
      client_id: t.clientId,
      associate_id: t.associateId,
      share_type: t.shareType,
      amount: t.amount || 0,
      profit: t.profit || 0,
      kind: t.kind,
      distribution_id: t.distributionId || null,
    }));

    const paymentsRows = (db.payments || []).map((p) => ({
      id: p.id,
      associate_id: p.associateId,
      date: p.date,
      amount: p.amount || 0,
      parts: p.parts || {},
      allocations: p.allocations || [],
    }));

    const messagesRows = (db.messages || []).map((m) => ({
      id: m.id,
      sender_role: m.senderRole || 'admin',
      sender_id: m.senderId || 'admin',
      sender_name: m.senderName || 'Admin',
      receiver_id: m.receiverId || 'all',
      receiver_name: m.receiverName || null,
      associate_id: m.associateId || 'assoc-1',
      subject: m.subject || null,
      content: m.content || '',
      timestamp: m.timestamp || new Date().toISOString(),
      read: Boolean(m.read),
      priority: m.priority || 'normal',
      category: m.category || 'general',
      is_edited: Boolean(m.isEdited),
      edited_at: m.editedAt || null,
    }));

    const settingsRows = [
      { key: 'admin', value: db.admin, updated_at: new Date().toISOString() },
    ];

    const results = await Promise.allSettled([
      storePromise,
      associatesRows.length > 0
        ? client.from('associates').upsert(associatesRows, { onConflict: 'id' })
        : Promise.resolve(),
      clientsRows.length > 0
        ? client.from('clients').upsert(clientsRows, { onConflict: 'id' })
        : Promise.resolve(),
      transactionsRows.length > 0
        ? client.from('transactions').upsert(transactionsRows, { onConflict: 'id' })
        : Promise.resolve(),
      paymentsRows.length > 0
        ? client.from('payments').upsert(paymentsRows, { onConflict: 'id' })
        : Promise.resolve(),
      messagesRows.length > 0
        ? client.from('messages').upsert(messagesRows, { onConflict: 'id' })
        : Promise.resolve(),
      client.from('system_settings').upsert(settingsRows, { onConflict: 'key' }),
    ]);

    const hasAnySuccess = results.some((r) => r.status === 'fulfilled');

    if (hasAnySuccess) {
      return {
        success: true,
        message: 'Successfully saved to Supabase',
      };
    } else {
      return {
        success: false,
        error: 'Failed to write data to Supabase',
      };
    }
  } catch (err: any) {
    console.error('Error saving database to Supabase:', err);
    return {
      success: false,
      error: err.message || 'Failed to save to Supabase',
    };
  }
}
