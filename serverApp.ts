import express, { Express, Router } from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "15mb" }));

  // Helper for GitHub headers
  const getGitHubHeaders = (token?: string) => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "HybridCivil-Network-App",
    };
    if (token && typeof token === "string" && token.trim()) {
      const cleanToken = token.trim();
      headers["Authorization"] = cleanToken.startsWith("Bearer ") || cleanToken.startsWith("token ")
        ? cleanToken
        : `token ${cleanToken}`;
    }
    return headers;
  };

  const router = Router();

  // Health check endpoint
  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Hybrid Civil Associate Network API",
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Helper to generate PROJECT_OVERVIEW.md from database object
  const generateOverviewMarkdown = (db: any): string => {
    const associates = Array.isArray(db.associates) ? db.associates : [];
    const clients = Array.isArray(db.clients) ? db.clients : [];
    const transactions = Array.isArray(db.transactions) ? db.transactions : [];
    const payments = Array.isArray(db.payments) ? db.payments : [];

    const activeAssociates = associates.filter((a: any) => a.status === "active");
    const totalProfit = transactions
      .filter((t: any) => t.kind === "referral")
      .reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const totalEarned = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalDue = Math.max(0, totalEarned - totalPaid);

    return `# HYBRID CIVIL — Associate Network Repository
*Comprehensive Civil Engineering Consultancy & 90/5/5 Profit Distribution System*

**Updated On:** ${new Date().toUTCString()}

---

## 🏗️ Executive Summary
- **Active Civil Engineering Associates:** ${activeAssociates.length}
- **Client & Project Agreements:** ${clients.length}
- **Total Net Project Profit Accounted:** ৳${totalProfit.toLocaleString("en-BD")}
- **Associate Earnings (Direct 5% + Equal 5% Pool):** ৳${totalEarned.toLocaleString("en-BD")}
- **Total Disbursements Completed:** ৳${totalPaid.toLocaleString("en-BD")}
- **Outstanding Balance Due:** ৳${totalDue.toLocaleString("en-BD")}

---

## 📊 90 / 5 / 5 Business Protocol
1. **90% Company Operations & Equipment Reserve**: Covers company infrastructure, licenses, equipment calibration, and project execution.
2. **5% Direct Lead Associate Commission**: Rewarded to the associate who brought in or directly leads the project agreement.
3. **5% Equal Partner Pool**: Evenly distributed among all remaining active engineering partners in good standing.

---

## 👥 Certified Associate Roster
| Associate Name | Phone | Email | Status |
| :--- | :--- | :--- | :--- |
${associates
  .map(
    (a: any) =>
      `| **${a.name}** | \`${a.phone}\` | ${a.email || "N/A"} | ${String(a.status || "active").toUpperCase()} |`
  )
  .join("\n")}

---

## 💼 Active Client Projects
| Client Name | Phone | Service / Scope | Price (BDT) | Advance Paid |
| :--- | :--- | :--- | :--- | :--- |
${clients
  .map(
    (c: any) =>
      `| **${c.name}** | \`${c.phone}\` | ${c.project} | ৳${Number(c.price || 0).toLocaleString("en-BD")} | ৳${Number(c.advance || 0).toLocaleString("en-BD")} |`
  )
  .join("\n")}

---
*Generated automatically by Hybrid Civil Associate Network Web App.*
`;
  };

  // Helper for server-side deleted message tracking
  const DELETED_MESSAGES_FILE = path.join(process.cwd(), "data", "deleted_messages.json");
  const getServerDeletedMsgIds = (): Set<string> => {
    try {
      if (fs.existsSync(DELETED_MESSAGES_FILE)) {
        const raw = fs.readFileSync(DELETED_MESSAGES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const recordServerDeletedMsgId = (id: string) => {
    try {
      const set = getServerDeletedMsgIds();
      set.add(id);
      fs.mkdirSync(path.dirname(DELETED_MESSAGES_FILE), { recursive: true });
      fs.writeFileSync(DELETED_MESSAGES_FILE, JSON.stringify(Array.from(set).slice(-300)), "utf-8");
    } catch {}
  };

  const DELETED_ASSOCIATES_FILE = path.join(process.cwd(), "data", "deleted_associates.json");
  const getServerDeletedAssocIds = (): Set<string> => {
    try {
      if (fs.existsSync(DELETED_ASSOCIATES_FILE)) {
        const raw = fs.readFileSync(DELETED_ASSOCIATES_FILE, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  };

  const recordServerDeletedAssocId = (id: string) => {
    try {
      const set = getServerDeletedAssocIds();
      set.add(id);
      fs.mkdirSync(path.dirname(DELETED_ASSOCIATES_FILE), { recursive: true });
      fs.writeFileSync(DELETED_ASSOCIATES_FILE, JSON.stringify(Array.from(set).slice(-300)), "utf-8");
    } catch {}
  };

  const DELETED_CLIENTS_FILE = path.join(process.cwd(), "data", "deleted_clients.json");
  const getServerDeletedClientIds = (): Set<string> => {
    try {
      if (fs.existsSync(DELETED_CLIENTS_FILE)) {
        const raw = fs.readFileSync(DELETED_CLIENTS_FILE, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  };

  const recordServerDeletedClientId = (id: string) => {
    try {
      const set = getServerDeletedClientIds();
      set.add(id);
      fs.mkdirSync(path.dirname(DELETED_CLIENTS_FILE), { recursive: true });
      fs.writeFileSync(DELETED_CLIENTS_FILE, JSON.stringify(Array.from(set).slice(-300)), "utf-8");
    } catch {}
  };

  const DELETED_TRANSACTIONS_FILE = path.join(process.cwd(), "data", "deleted_transactions.json");
  const getServerDeletedTxIds = (): Set<string> => {
    try {
      if (fs.existsSync(DELETED_TRANSACTIONS_FILE)) {
        const raw = fs.readFileSync(DELETED_TRANSACTIONS_FILE, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  };

  const recordServerDeletedTxId = (id: string) => {
    try {
      const set = getServerDeletedTxIds();
      set.add(id);
      fs.mkdirSync(path.dirname(DELETED_TRANSACTIONS_FILE), { recursive: true });
      fs.writeFileSync(DELETED_TRANSACTIONS_FILE, JSON.stringify(Array.from(set).slice(-300)), "utf-8");
    } catch {}
  };

  const recordServerDeletedTxIds = (ids: string[]) => {
    try {
      const set = getServerDeletedTxIds();
      for (const id of ids) set.add(id);
      fs.mkdirSync(path.dirname(DELETED_TRANSACTIONS_FILE), { recursive: true });
      fs.writeFileSync(DELETED_TRANSACTIONS_FILE, JSON.stringify(Array.from(set).slice(-300)), "utf-8");
    } catch {}
  };

  // Helper to merge databases non-destructively so NO messages or records are ever lost
  const mergeDatabases = (
    localDb: any,
    incomingDb: any,
    deletedMsgId?: string,
    deletedAssocId?: string,
    deletedClientId?: string,
    deletedTxId?: string | string[]
  ): any => {
    if (!localDb) return incomingDb || {};
    if (!incomingDb) return localDb || {};

    // 1. Merge associates (union by id, preserve updated password and details)
    const associateMap = new Map<string, any>();
    for (const a of (localDb.associates || [])) {
      if (a && a.id) associateMap.set(a.id, a);
    }
    for (const a of (incomingDb.associates || [])) {
      if (a && a.id) {
        const existing = associateMap.get(a.id);
        associateMap.set(a.id, existing ? { ...existing, ...a } : a);
      }
    }

    if (deletedAssocId) {
      recordServerDeletedAssocId(deletedAssocId);
      associateMap.delete(deletedAssocId);
    }
    const deletedAssocs = getServerDeletedAssocIds();
    for (const delId of deletedAssocs) {
      associateMap.delete(delId);
    }

    // 2. Merge clients (union by id)
    const clientMap = new Map<string, any>();
    for (const c of (localDb.clients || [])) {
      if (c && c.id) clientMap.set(c.id, c);
    }
    for (const c of (incomingDb.clients || [])) {
      if (c && c.id) {
        const existing = clientMap.get(c.id);
        clientMap.set(c.id, existing ? { ...existing, ...c } : c);
      }
    }

    if (deletedClientId) {
      recordServerDeletedClientId(deletedClientId);
      clientMap.delete(deletedClientId);
    }
    const deletedClients = getServerDeletedClientIds();
    for (const delId of deletedClients) {
      clientMap.delete(delId);
    }

    // 3. Merge transactions (union by id)
    const txMap = new Map<string, any>();
    for (const t of (localDb.transactions || [])) {
      if (t && t.id) txMap.set(t.id, t);
    }
    for (const t of (incomingDb.transactions || [])) {
      if (t && t.id) txMap.set(t.id, t);
    }

    if (deletedTxId) {
      if (Array.isArray(deletedTxId)) {
        recordServerDeletedTxIds(deletedTxId);
        for (const id of deletedTxId) txMap.delete(id);
      } else {
        recordServerDeletedTxId(deletedTxId);
        txMap.delete(deletedTxId);
      }
    }
    const deletedTxs = getServerDeletedTxIds();
    for (const delId of deletedTxs) {
      txMap.delete(delId);
    }

    // 4. Merge payments (union by id)
    const payMap = new Map<string, any>();
    for (const p of (localDb.payments || [])) {
      if (p && p.id) payMap.set(p.id, p);
    }
    for (const p of (incomingDb.payments || [])) {
      if (p && p.id) payMap.set(p.id, p);
    }

    // 5. Merge messages (union by id) - CRITICAL: NEVER DELETE ANY MESSAGE UNLESS EXPLICITLY REMOVED!
    const msgMap = new Map<string, any>();
    for (const m of (localDb.messages || [])) {
      if (m && m.id) msgMap.set(m.id, m);
    }
    for (const m of (incomingDb.messages || [])) {
      if (m && m.id) {
        const existing = msgMap.get(m.id);
        if (existing) {
          const existingEditTime = existing.editedAt ? new Date(existing.editedAt).getTime() : 0;
          const incomingEditTime = m.editedAt ? new Date(m.editedAt).getTime() : 0;
          const newer = incomingEditTime >= existingEditTime ? m : existing;
          msgMap.set(m.id, {
            ...existing,
            ...m,
            ...newer,
            read: Boolean(existing.read || m.read),
          });
        } else {
          msgMap.set(m.id, m);
        }
      }
    }

    if (deletedMsgId) {
      recordServerDeletedMsgId(deletedMsgId);
      msgMap.delete(deletedMsgId);
    }

    // Filter out all known deleted message IDs
    const serverDeletedIds = getServerDeletedMsgIds();
    for (const delId of serverDeletedIds) {
      msgMap.delete(delId);
    }

    const mergedMessages = Array.from(msgMap.values()).sort(
      (a: any, b: any) =>
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );

    return {
      admin: incomingDb.admin || localDb.admin || { username: "admin", password: "admin123" },
      associates: Array.from(associateMap.values()),
      clients: Array.from(clientMap.values()),
      transactions: Array.from(txMap.values()),
      payments: Array.from(payMap.values()),
      messages: mergedMessages,
    };
  };

  // ==========================================
  // SUPABASE CONFIGURATION & DATA ENGINE
  // ==========================================
  const SUPABASE_CONFIG_FILE = path.join(process.cwd(), "data", "supabase_config.json");
  let serverSupabaseClient: SupabaseClient | null = null;
  let serverSupabaseUrl = "";
  let serverSupabaseKey = "";

  const getServerSupabaseConfig = (): {
    url: string;
    anonKey: string;
    publishableKey?: string;
    serviceRoleKey?: string;
    autoSync: boolean;
  } => {
    let config = {
      url:
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        "https://fyfpkmqdhgnvyrrinuao.supabase.co",
      anonKey:
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "",
      publishableKey:
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "",
      serviceRoleKey:
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        "",
      autoSync: true,
    };
    if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(SUPABASE_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          config = { ...config, ...parsed };
        }
      } catch {}
    }
    return config;
  };

  const saveServerSupabaseConfig = async (
    newConfig: Partial<{ url: string; anonKey: string; autoSync: boolean }>
  ) => {
    const current = getServerSupabaseConfig();
    const merged = { ...current, ...newConfig };
    await fs.promises.mkdir(path.dirname(SUPABASE_CONFIG_FILE), { recursive: true });
    await fs.promises.writeFile(SUPABASE_CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
    serverSupabaseClient = null;
    return merged;
  };

  const getServerSupabaseClient = (): SupabaseClient | null => {
    const cfg = getServerSupabaseConfig();
    const url = (cfg.url || "").trim();
    const key = (cfg.anonKey || "").trim();
    if (!url || !key) return null;
    if (serverSupabaseClient && url === serverSupabaseUrl && key === serverSupabaseKey) {
      return serverSupabaseClient;
    }
    try {
      serverSupabaseClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      serverSupabaseUrl = url;
      serverSupabaseKey = key;
      return serverSupabaseClient;
    } catch (err) {
      console.warn("Failed to create server Supabase client:", err);
      return null;
    }
  };

  const fetchSupabaseServerDatabase = async (): Promise<any | null> => {
    const client = getServerSupabaseClient();
    if (!client) return null;
    try {
      const [assocRes, clientRes, txRes, payRes, msgRes, settingsRes] = await Promise.all([
        client.from("associates").select("*"),
        client.from("clients").select("*"),
        client.from("transactions").select("*"),
        client.from("payments").select("*"),
        client.from("messages").select("*").order("timestamp", { ascending: true }),
        client.from("system_settings").select("*"),
      ]);

      const hasTables =
        !assocRes.error &&
        !clientRes.error &&
        !txRes.error &&
        !payRes.error &&
        !msgRes.error;

      if (hasTables) {
        const adminSetting = (settingsRes.data || []).find((s: any) => s.key === "admin");
        const adminCreds = adminSetting
          ? adminSetting.value
          : { username: "admin", password: "admin123" };

        const deletedAssocIds = getServerDeletedAssocIds();
        const associates = (assocRes.data || [])
          .filter((a: any) => a && !deletedAssocIds.has(a.id))
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            phone: a.phone,
            password: a.password || "assoc123",
            email: a.email || "",
            address: a.address || "",
            status: a.status || "active",
          }));

        const deletedClientIds = getServerDeletedClientIds();
        const clients = (clientRes.data || [])
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

        const deletedTxIds = getServerDeletedTxIds();
        const transactions = (txRes.data || [])
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

        const payments = (payRes.data || []).map((p: any) => ({
          id: p.id,
          associateId: p.associate_id,
          date: p.date,
          amount: Number(p.amount || 0),
          parts: p.parts || {},
          allocations: Array.isArray(p.allocations) ? p.allocations : [],
        }));

        const messages = (msgRes.data || []).map((m: any) => ({
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
          priority: m.priority || "normal",
          category: m.category || "general",
          isEdited: Boolean(m.is_edited),
          editedAt: m.edited_at || undefined,
        }));

        if (associates.length > 0 || clients.length > 0 || messages.length > 0) {
          return {
            admin: adminCreds,
            associates,
            clients,
            transactions,
            payments,
            messages,
          };
        }
      }

      // Check unified app_database store
      const { data: storeData, error: storeErr } = await client
        .from("app_database")
        .select("data")
        .eq("key", "main")
        .maybeSingle();

      if (!storeErr && storeData?.data) {
        return storeData.data;
      }
    } catch (e) {
      console.warn("Could not fetch database from Supabase on server:", e);
    }
    return null;
  };

  const saveSupabaseServerDatabase = async (
    validatedDb: any,
    deletedAssocId?: string,
    deletedClientId?: string,
    deletedTxIds?: string[]
  ): Promise<boolean> => {
    const client = getServerSupabaseClient();
    if (!client) return false;
    try {
      if (deletedAssocId) {
        await client.from("associates").delete().eq("id", deletedAssocId);
      }
      const deletedAssocs = getServerDeletedAssocIds();
      for (const delId of deletedAssocs) {
        await client.from("associates").delete().eq("id", delId);
      }

      if (deletedClientId) {
        await client.from("clients").delete().eq("id", deletedClientId);
      }
      const deletedClients = getServerDeletedClientIds();
      for (const delId of deletedClients) {
        await client.from("clients").delete().eq("id", delId);
      }

      if (deletedTxIds && deletedTxIds.length > 0) {
        await client.from("transactions").delete().in("id", deletedTxIds);
      }
      const deletedTxs = getServerDeletedTxIds();
      for (const delId of deletedTxs) {
        await client.from("transactions").delete().eq("id", delId);
      }

      const storePromise = client.from("app_database").upsert(
        {
          key: "main",
          data: validatedDb,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      const associatesRows = (validatedDb.associates || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        password: a.password || "assoc123",
        email: a.email || null,
        address: a.address || null,
        status: a.status || "active",
        updated_at: new Date().toISOString(),
      }));

      const clientsRows = (validatedDb.clients || []).map((c: any) => ({
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

      const transactionsRows = (validatedDb.transactions || []).map((t: any) => ({
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

      const paymentsRows = (validatedDb.payments || []).map((p: any) => ({
        id: p.id,
        associate_id: p.associateId,
        date: p.date,
        amount: p.amount || 0,
        parts: p.parts || {},
        allocations: p.allocations || [],
      }));

      const messagesRows = (validatedDb.messages || []).map((m: any) => ({
        id: m.id,
        sender_role: m.senderRole || "admin",
        sender_id: m.senderId || "admin",
        sender_name: m.senderName || "Admin",
        receiver_id: m.receiverId || "all",
        receiver_name: m.receiverName || null,
        associate_id: m.associateId || "assoc-1",
        subject: m.subject || null,
        content: m.content || "",
        timestamp: m.timestamp || new Date().toISOString(),
        read: Boolean(m.read),
        priority: m.priority || "normal",
        category: m.category || "general",
        is_edited: Boolean(m.isEdited),
        edited_at: m.editedAt || null,
      }));

      const settingsRows = [
        { key: "admin", value: validatedDb.admin, updated_at: new Date().toISOString() },
      ];

      const results = await Promise.allSettled([
        storePromise,
        associatesRows.length > 0
          ? client.from("associates").upsert(associatesRows, { onConflict: "id" })
          : Promise.resolve(),
        clientsRows.length > 0
          ? client.from("clients").upsert(clientsRows, { onConflict: "id" })
          : Promise.resolve(),
        transactionsRows.length > 0
          ? client.from("transactions").upsert(transactionsRows, { onConflict: "id" })
          : Promise.resolve(),
        paymentsRows.length > 0
          ? client.from("payments").upsert(paymentsRows, { onConflict: "id" })
          : Promise.resolve(),
        messagesRows.length > 0
          ? client.from("messages").upsert(messagesRows, { onConflict: "id" })
          : Promise.resolve(),
        client.from("system_settings").upsert(settingsRows, { onConflict: "key" }),
      ]);

      return results.some((r) => r.status === "fulfilled");
    } catch (e) {
      console.warn("Error saving to Supabase on server:", e);
      return false;
    }
  };

  // Helper for server-side GitHub configuration
  const GITHUB_CONFIG_FILE = path.join(process.cwd(), "data", "github_config.json");
  let lastKnownGitHubSha: string | null = null;

  const getServerGitHubConfig = (): { owner: string; repo: string; branch: string; token: string } => {
    let config = {
      owner: process.env.GITHUB_OWNER || "hybridcivil",
      repo: process.env.GITHUB_REPO || "associate",
      branch: process.env.GITHUB_BRANCH || "main",
      token: process.env.GITHUB_TOKEN || "",
    };
    if (fs.existsSync(GITHUB_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(GITHUB_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          config = { ...config, ...parsed };
        }
      } catch {}
    }
    return config;
  };

  const saveServerGitHubConfig = async (newConfig: Partial<{ owner: string; repo: string; branch: string; token: string }>) => {
    const current = getServerGitHubConfig();
    const merged = { ...current, ...newConfig };
    await fs.promises.mkdir(path.dirname(GITHUB_CONFIG_FILE), { recursive: true });
    await fs.promises.writeFile(GITHUB_CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  };

  // Helper to fetch latest data/hybrid_civil_database.json from GitHub
  const fetchGitHubDatabase = async (
    owner: string,
    repo: string,
    branch: string,
    token: string
  ): Promise<{ sha: string; data: any } | null> => {
    if (!owner || !repo) return null;
    const cleanPath = "data/hybrid_civil_database.json";
    const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}&_cb=${Date.now()}`;
    const headers = {
      ...getGitHubHeaders(token),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    };
    const ghRes = await fetch(ghUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!ghRes.ok) {
      return null;
    }
    const ghData = (await ghRes.json()) as any;
    if (ghData.content && ghData.encoding === "base64") {
      const decoded = Buffer.from(ghData.content, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      return { sha: ghData.sha, data: parsed };
    }
    return null;
  };

  // ==========================================
  // AUTHORITATIVE DATABASE API (SUPABASE / DISK / GITHUB)
  // ==========================================

  // GET /database - Load authoritative database directly from Supabase, or local repository fallback
  router.get("/database", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      let localDb: any = null;
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          localDb = JSON.parse(fileContent);
          const delAssocs = getServerDeletedAssocIds();
          if (delAssocs.size > 0 && Array.isArray(localDb.associates)) {
            localDb.associates = localDb.associates.filter((a: any) => a && !delAssocs.has(a.id));
          }
          const delClients = getServerDeletedClientIds();
          if (delClients.size > 0 && Array.isArray(localDb.clients)) {
            localDb.clients = localDb.clients.filter((c: any) => c && !delClients.has(c.id));
          }
          const delTxs = getServerDeletedTxIds();
          if (delTxs.size > 0 && Array.isArray(localDb.transactions)) {
            localDb.transactions = localDb.transactions.filter((t: any) => t && !delTxs.has(t.id));
          }
        } catch (e) {}
      }

      // 0. Primary Authoritative check: When Supabase is configured, fetch latest data from Supabase!
      const supabaseConfig = getServerSupabaseConfig();
      if (supabaseConfig.url && supabaseConfig.anonKey) {
        try {
          const supabaseData = await fetchSupabaseServerDatabase();
          if (supabaseData && (Array.isArray(supabaseData.associates) || Array.isArray(supabaseData.messages))) {
            let dataToUse = supabaseData;
            if (localDb) {
              dataToUse = mergeDatabases(supabaseData, localDb);
            }
            await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
            await fs.promises.writeFile(dbFilePath, JSON.stringify(dataToUse, null, 2), "utf-8");

            return res.json({
              success: true,
              source: "supabase",
              data: dataToUse,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (sbErr) {
          console.warn("Could not fetch database directly from Supabase, falling back:", sbErr);
        }
      }

      // 1. Secondary check: GitHub API
      const serverConfig = getServerGitHubConfig();
      const owner = (req.query.owner as string) || serverConfig.owner || "hybridcivil";
      const repo = (req.query.repo as string) || serverConfig.repo || "associate";
      const branch = (req.query.branch as string) || serverConfig.branch || "main";
      const effectiveToken = serverConfig.token || (req.query.token as string) || "";

      if (effectiveToken && effectiveToken.trim() && owner && repo) {
        try {
          const remoteResult = await fetchGitHubDatabase(owner, repo, branch, effectiveToken);
          if (remoteResult && remoteResult.data) {
            lastKnownGitHubSha = remoteResult.sha;

            let dataToUse = remoteResult.data;
            if (localDb) {
              dataToUse = mergeDatabases(remoteResult.data, localDb);
            }

            await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
            await fs.promises.writeFile(dbFilePath, JSON.stringify(dataToUse, null, 2), "utf-8");

            return res.json({
              success: true,
              source: "github",
              sha: remoteResult.sha,
              data: dataToUse,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (ghErr) {
          console.warn("Could not fetch database directly from GitHub API, falling back to local file:", ghErr);
        }
      }

      // 2. Fallback read from local repository file: data/hybrid_civil_database.json
      if (localDb) {
        return res.json({
          success: true,
          source: "local_repository",
          sha: lastKnownGitHubSha || "local",
          data: localDb,
          updatedAt: new Date().toISOString(),
        });
      }

      return res.status(404).json({ error: "Database file not found on server or remote." });
    } catch (err: any) {
      console.error("Failed to load database:", err);
      res.status(500).json({ error: err.message || "Failed to load database." });
    }
  });

  // POST /database/save - Authoritative save to Supabase and local repository
  router.post("/database/save", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const {
        data,
        message,
        owner,
        repo,
        branch = "main",
        token = "",
      } = req.body;

      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Database data payload is required." });
      }

      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      let currentLocalDb: any = null;
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          currentLocalDb = JSON.parse(fileContent);
        } catch (e) {}
      }

      // Check if this save is an explicit message, associate, client, or transaction deletion
      const deleteMatch = typeof message === "string" && message.match(/Delete message ([a-zA-Z0-9_-]+)/);
      const deletedMsgId = deleteMatch ? deleteMatch[1] : req.body.deletedMsgId;

      const deleteAssocMatch = typeof message === "string" && message.match(/Delete associate ([a-zA-Z0-9_-]+)/);
      const deletedAssocId = deleteAssocMatch ? deleteAssocMatch[1] : req.body.deletedAssocId;

      const deleteClientMatch = typeof message === "string" && message.match(/Delete client ([a-zA-Z0-9_-]+)/);
      const deletedClientId = deleteClientMatch ? deleteClientMatch[1] : req.body.deletedClientId;

      const deleteTxMatch = typeof message === "string" && message.match(/Delete transaction ([a-zA-Z0-9_-]+)/);
      const singleTxId = deleteTxMatch ? deleteTxMatch[1] : undefined;

      const deleteTxsMatch = typeof message === "string" && message.match(/Delete transactions ([a-zA-Z0-9_,-]+)/);
      const multiTxIds = deleteTxsMatch ? deleteTxsMatch[1].split(",") : undefined;

      const deletedTxIds = multiTxIds || (singleTxId ? [singleTxId] : req.body.deletedTxIds);

      if (deletedAssocId) recordServerDeletedAssocId(deletedAssocId);
      if (deletedClientId) recordServerDeletedClientId(deletedClientId);
      if (deletedTxIds) recordServerDeletedTxIds(Array.isArray(deletedTxIds) ? deletedTxIds : [deletedTxIds]);

      // Step 1: Read latest from Supabase if configured
      let remoteDb: any = null;
      const serverSbCfg = getServerSupabaseConfig();
      if (serverSbCfg.url && serverSbCfg.anonKey) {
        try {
          remoteDb = await fetchSupabaseServerDatabase();
        } catch (sbErr) {
          console.warn("Could not fetch remote from Supabase before save:", sbErr);
        }
      }

      // Step 2: Merge the incoming database non-destructively
      const baseDb = remoteDb || currentLocalDb;
      let mergedDb = mergeDatabases(baseDb, data, deletedMsgId, deletedAssocId, deletedClientId, deletedTxIds);
      if (currentLocalDb && baseDb !== currentLocalDb) {
        mergedDb = mergeDatabases(mergedDb, currentLocalDb, deletedMsgId, deletedAssocId, deletedClientId, deletedTxIds);
      }

      // Sanitize and validate merged database structure
      let validatedAssociates = Array.isArray(mergedDb.associates) ? mergedDb.associates : [];
      if (deletedAssocId) {
        validatedAssociates = validatedAssociates.filter((a: any) => a && a.id !== deletedAssocId);
      }
      let validatedClients = Array.isArray(mergedDb.clients) ? mergedDb.clients : [];
      if (deletedClientId) {
        validatedClients = validatedClients.filter((c: any) => c && c.id !== deletedClientId);
      }
      let validatedTransactions = Array.isArray(mergedDb.transactions) ? mergedDb.transactions : [];
      if (deletedTxIds) {
        const delSet = new Set(Array.isArray(deletedTxIds) ? deletedTxIds : [deletedTxIds]);
        validatedTransactions = validatedTransactions.filter((t: any) => t && !delSet.has(t.id));
      }

      const validatedDb = {
        admin: mergedDb.admin || { username: "admin", password: "admin123" },
        associates: validatedAssociates,
        clients: validatedClients,
        transactions: validatedTransactions,
        payments: Array.isArray(mergedDb.payments) ? mergedDb.payments : [],
        messages: Array.isArray(mergedDb.messages) ? mergedDb.messages : [],
      };

      // Step 3: Write the merged database locally
      const jsonString = JSON.stringify(validatedDb, null, 2);
      await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
      await fs.promises.writeFile(dbFilePath, jsonString, "utf-8");

      // Also update PROJECT_OVERVIEW.md locally
      const overviewMd = generateOverviewMarkdown(validatedDb);
      const overviewPath = path.join(process.cwd(), "PROJECT_OVERVIEW.md");
      await fs.promises.writeFile(overviewPath, overviewMd, "utf-8");

      // Step 3.5: Push to Supabase!
      let supabaseSaved = false;
      if (serverSbCfg.url && serverSbCfg.anonKey) {
        try {
          supabaseSaved = await saveSupabaseServerDatabase(
            validatedDb,
            deletedAssocId,
            deletedClientId,
            deletedTxIds ? (Array.isArray(deletedTxIds) ? deletedTxIds : [deletedTxIds]) : undefined
          );
        } catch (sbSaveErr) {
          console.warn("Supabase save attempt failed on server:", sbSaveErr);
        }
      }

      // Step 4: Optional GitHub push if configured
      let localSaved: boolean = true;
      let githubSaved: boolean = false;
      let githubCommitSha: string | null = null;
      let githubCommitUrl: string | null = null;
      let warning: string | undefined = undefined;

      const serverGhConfig = getServerGitHubConfig();
      const effectiveGhToken = serverGhConfig.token || (token && token.trim()) || "";
      const effectiveOwner = owner || serverGhConfig.owner || "hybridcivil";
      const effectiveRepo = repo || serverGhConfig.repo || "associate";

      if (effectiveGhToken && effectiveOwner && effectiveRepo) {
        try {
          const cleanPath = "data/hybrid_civil_database.json";
          const putUrl = `https://api.github.com/repos/${effectiveOwner}/${effectiveRepo}/contents/${cleanPath}`;
          const putPayload: any = {
            message: message || `Update database state [${new Date().toISOString()}]`,
            content: Buffer.from(jsonString).toString("base64"),
            branch: branch || "main",
          };
          if (lastKnownGitHubSha) putPayload.sha = lastKnownGitHubSha;

          const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: {
              ...getGitHubHeaders(effectiveGhToken),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(putPayload),
            signal: AbortSignal.timeout(8000),
          });

          if (putRes.ok) {
            const resData = await putRes.json();
            githubSaved = true;
            lastKnownGitHubSha = resData.content?.sha || resData.commit?.sha || null;
            githubCommitSha = resData.commit?.sha?.substring(0, 7) || "latest";
            githubCommitUrl = resData.commit?.html_url || `https://github.com/${effectiveOwner}/${effectiveRepo}`;
          }
        } catch (ghErr) {
          console.warn("Secondary GitHub push note:", ghErr);
        }
      }

      res.json({
        success: localSaved,
        localSaved,
        supabaseSaved,
        githubSaved,
        githubCommitSha,
        githubCommitUrl,
        warning,
        message: supabaseSaved
          ? "Synced to Supabase"
          : githubSaved
          ? "Synced to GitHub"
          : "Saved locally",
        supabase: {
          success: supabaseSaved,
          savedToSupabase: supabaseSaved,
        },
        github: {
          success: githubSaved,
          pushedToGitHub: githubSaved,
          commitSha: githubCommitSha,
          commitUrl: githubCommitUrl,
        },
        data: validatedDb,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Failed to save database:", err);
      res.status(500).json({
        localSaved: false,
        supabaseSaved: false,
        githubSaved: false,
        error: err.message || "Failed to save database.",
      });
    }
  });

  // DELETE /associates/:id
  router.delete("/associates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "Associate ID is required." });

      recordServerDeletedAssocId(id);

      // 1. Delete from Supabase
      const client = getServerSupabaseClient();
      if (client) {
        try {
          await client.from("associates").delete().eq("id", id);
        } catch (e) {
          console.warn("Could not delete associate from Supabase:", e);
        }
      }

      // 2. Delete from local JSON database
      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          const currentLocalDb = JSON.parse(fileContent);
          if (Array.isArray(currentLocalDb.associates)) {
            currentLocalDb.associates = currentLocalDb.associates.filter((a: any) => a && a.id !== id);
            await fs.promises.writeFile(dbFilePath, JSON.stringify(currentLocalDb, null, 2), "utf-8");
          }
        } catch (e) {}
      }

      res.json({ success: true, message: `Associate ${id} deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete associate." });
    }
  });

  router.post("/associates/delete", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Associate ID is required." });

      recordServerDeletedAssocId(id);

      const client = getServerSupabaseClient();
      if (client) {
        try {
          await client.from("associates").delete().eq("id", id);
        } catch (e) {
          console.warn("Could not delete associate from Supabase:", e);
        }
      }

      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          const currentLocalDb = JSON.parse(fileContent);
          if (Array.isArray(currentLocalDb.associates)) {
            currentLocalDb.associates = currentLocalDb.associates.filter((a: any) => a && a.id !== id);
            await fs.promises.writeFile(dbFilePath, JSON.stringify(currentLocalDb, null, 2), "utf-8");
          }
        } catch (e) {}
      }

      res.json({ success: true, message: `Associate ${id} deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete associate." });
    }
  });

  // DELETE /transactions/:id
  router.delete("/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "Transaction ID is required." });

      recordServerDeletedTxId(id);

      // 1. Delete from Supabase table
      const client = getServerSupabaseClient();
      if (client) {
        try {
          await client.from("transactions").delete().eq("id", id);
        } catch (e) {
          console.warn("Could not delete transaction from Supabase:", e);
        }
      }

      // 2. Delete from local JSON database & cleanup payments
      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          const currentLocalDb = JSON.parse(fileContent);
          if (Array.isArray(currentLocalDb.transactions)) {
            currentLocalDb.transactions = currentLocalDb.transactions.filter((t: any) => t && t.id !== id);
          }
          if (Array.isArray(currentLocalDb.payments)) {
            for (const p of currentLocalDb.payments) {
              if (p && p.parts && p.parts[id]) {
                delete p.parts[id];
              }
            }
          }
          await fs.promises.writeFile(dbFilePath, JSON.stringify(currentLocalDb, null, 2), "utf-8");
        } catch (e) {}
      }

      res.json({ success: true, message: `Transaction ${id} deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete transaction." });
    }
  });

  router.post("/transactions/delete", async (req, res) => {
    try {
      const { ids, id } = req.body;
      const targetIds: string[] = Array.isArray(ids) ? ids : (id ? [id] : []);
      if (targetIds.length === 0) return res.status(400).json({ error: "Transaction ID(s) required." });

      recordServerDeletedTxIds(targetIds);

      const client = getServerSupabaseClient();
      if (client) {
        try {
          await client.from("transactions").delete().in("id", targetIds);
        } catch (e) {
          console.warn("Could not delete transactions from Supabase:", e);
        }
      }

      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          const currentLocalDb = JSON.parse(fileContent);
          const delSet = new Set(targetIds);
          if (Array.isArray(currentLocalDb.transactions)) {
            currentLocalDb.transactions = currentLocalDb.transactions.filter((t: any) => t && !delSet.has(t.id));
          }
          if (Array.isArray(currentLocalDb.payments)) {
            for (const p of currentLocalDb.payments) {
              if (p && p.parts) {
                for (const tid of targetIds) {
                  delete p.parts[tid];
                }
              }
            }
          }
          await fs.promises.writeFile(dbFilePath, JSON.stringify(currentLocalDb, null, 2), "utf-8");
        } catch (e) {}
      }

      res.json({ success: true, message: `Transactions deleted.`, count: targetIds.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete transactions." });
    }
  });

  // ==========================================
  // SUPABASE CONFIG & TEST ENDPOINTS
  // ==========================================

  // GET /supabase/config
  router.get("/supabase/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const config = getServerSupabaseConfig();
    res.json({
      success: true,
      url: config.url,
      hasKey: !!config.anonKey,
      publishableKey: config.publishableKey || config.anonKey,
      keyMasked: config.anonKey
        ? `${config.anonKey.substring(0, 5)}...${config.anonKey.substring(config.anonKey.length - 4)}`
        : null,
      autoSync: config.autoSync,
    });
  });

  // POST /supabase/config
  router.post("/supabase/config", async (req, res) => {
    try {
      const { url, anonKey, autoSync } = req.body;
      const updated = await saveServerSupabaseConfig({
        ...(url !== undefined ? { url } : {}),
        ...(anonKey !== undefined ? { anonKey } : {}),
        ...(autoSync !== undefined ? { autoSync } : {}),
      });
      res.json({
        success: true,
        url: updated.url,
        hasKey: !!updated.anonKey,
        autoSync: updated.autoSync,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save Supabase config." });
    }
  });

  // POST /supabase/test
  router.post("/supabase/test", async (req, res) => {
    try {
      const { url: reqUrl, anonKey: reqKey } = req.body;
      const currentCfg = getServerSupabaseConfig();
      const testUrl = (reqUrl || currentCfg.url || "").trim();
      const testKey = (reqKey || currentCfg.anonKey || "").trim();

      if (!testUrl || !testKey) {
        return res.status(400).json({
          success: false,
          error: "Supabase URL and API Key are required.",
        });
      }

      const client = createClient(testUrl, testKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const tablesFound: string[] = [];
      const { error: assocErr } = await client.from("associates").select("id").limit(1);
      if (!assocErr) tablesFound.push("associates");

      const { error: clientErr } = await client.from("clients").select("id").limit(1);
      if (!clientErr) tablesFound.push("clients");

      const { error: txErr } = await client.from("transactions").select("id").limit(1);
      if (!txErr) tablesFound.push("transactions");

      const { error: payErr } = await client.from("payments").select("id").limit(1);
      if (!payErr) tablesFound.push("payments");

      const { error: msgErr } = await client.from("messages").select("id").limit(1);
      if (!msgErr) tablesFound.push("messages");

      const { error: storeErr } = await client.from("app_database").select("key").limit(1);
      if (!storeErr) tablesFound.push("app_database");

      res.json({
        success: true,
        tablesFound,
        mode: tablesFound.includes("associates") ? "tables" : tablesFound.includes("app_database") ? "store" : "connected_no_tables",
        message: tablesFound.length > 0
          ? `Connected to Supabase! Active tables: ${tablesFound.join(", ")}`
          : "Connected to Supabase! Run the migration SQL or click Seed to create tables.",
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to connect to Supabase.",
      });
    }
  });

  // POST /supabase/seed - Seed current server database into Supabase
  router.post("/supabase/seed", async (req, res) => {
    try {
      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      let dataToSeed = req.body.data;
      if (!dataToSeed && fs.existsSync(dbFilePath)) {
        const raw = await fs.promises.readFile(dbFilePath, "utf-8");
        dataToSeed = JSON.parse(raw);
      }
      if (!dataToSeed) {
        return res.status(400).json({ error: "No database data found to seed." });
      }

      const ok = await saveSupabaseServerDatabase(dataToSeed);
      if (ok) {
        return res.json({ success: true, message: "Successfully seeded database to Supabase!" });
      } else {
        return res.status(500).json({ error: "Supabase client not configured or operation failed." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to seed Supabase database." });
    }
  });

  // ==========================================
  // GITHUB CONFIG ENDPOINTS (Retained for backwards compatibility)
  // ==========================================

  // GET /github/config
  router.get("/github/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const config = getServerGitHubConfig();
    res.json({
      success: true,
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      hasToken: !!config.token,
      tokenMasked: config.token ? `${config.token.substring(0, 4)}...${config.token.substring(config.token.length - 4)}` : null,
    });
  });

  // POST /github/config
  router.post("/github/config", async (req, res) => {
    try {
      const { owner, repo, branch, token } = req.body;
      const updated = await saveServerGitHubConfig({
        ...(owner ? { owner } : {}),
        ...(repo ? { repo } : {}),
        ...(branch ? { branch } : {}),
        ...(token !== undefined ? { token } : {}),
      });
      res.json({
        success: true,
        owner: updated.owner,
        repo: updated.repo,
        branch: updated.branch,
        hasToken: !!updated.token,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save GitHub config." });
    }
  });

  // ==========================================
  // REAL-TIME USER PRESENCE & LOGIN TRACKING
  // ==========================================
  interface PresenceUserRecord {
    id: string;
    role: "admin" | "associate";
    name: string;
    phone?: string;
    lastSeen: number;
    loginTime: number;
  }
  const activeSessions = new Map<string, PresenceUserRecord>();

  // POST /presence/heartbeat
  router.post("/presence/heartbeat", (req, res) => {
    try {
      const { id, role, name, phone } = req.body;
      if (!id || !role || !name) {
        return res.status(400).json({ error: "Missing required session parameters." });
      }
      const now = Date.now();
      const existing = activeSessions.get(id);
      activeSessions.set(id, {
        id,
        role,
        name,
        phone: phone || "",
        lastSeen: now,
        loginTime: existing ? existing.loginTime : now,
      });

      // Cleanup stale sessions older than 35s
      for (const [key, user] of activeSessions.entries()) {
        if (now - user.lastSeen > 35000) {
          activeSessions.delete(key);
        }
      }

      res.json({ success: true, count: activeSessions.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Heartbeat error" });
    }
  });

  // POST /presence/logout
  router.post("/presence/logout", (req, res) => {
    try {
      const { id } = req.body;
      if (id) {
        activeSessions.delete(id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Logout error" });
    }
  });

  // GET /presence
  router.get("/presence", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const now = Date.now();
    for (const [key, user] of activeSessions.entries()) {
      if (now - user.lastSeen > 35000) {
        activeSessions.delete(key);
      }
    }
    const onlineList = Array.from(activeSessions.values());
    res.json({
      success: true,
      onlineUsers: onlineList,
      activeCount: onlineList.length,
      timestamp: now,
    });
  });

  // Mount router at both '/api' and '/'
  app.use("/api", router);
  app.use("/", router);

  return app;
}
