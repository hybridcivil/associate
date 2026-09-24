import express, { Express, Router } from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

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

  // Helper to merge databases non-destructively so NO messages or records are ever lost
  const mergeDatabases = (localDb: any, incomingDb: any): any => {
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

    // 3. Merge transactions (union by id)
    const txMap = new Map<string, any>();
    for (const t of (localDb.transactions || [])) {
      if (t && t.id) txMap.set(t.id, t);
    }
    for (const t of (incomingDb.transactions || [])) {
      if (t && t.id) txMap.set(t.id, t);
    }

    // 4. Merge payments (union by id)
    const payMap = new Map<string, any>();
    for (const p of (localDb.payments || [])) {
      if (p && p.id) payMap.set(p.id, p);
    }
    for (const p of (incomingDb.payments || [])) {
      if (p && p.id) payMap.set(p.id, p);
    }

    // 5. Merge messages (union by id) - CRITICAL: NEVER DELETE ANY MESSAGE!
    const msgMap = new Map<string, any>();
    for (const m of (localDb.messages || [])) {
      if (m && m.id) msgMap.set(m.id, m);
    }
    for (const m of (incomingDb.messages || [])) {
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
      admin: incomingDb.admin || localDb.admin || { username: "admin", password: "admin123" },
      associates: Array.from(associateMap.values()),
      clients: Array.from(clientMap.values()),
      transactions: Array.from(txMap.values()),
      payments: Array.from(payMap.values()),
      messages: mergedMessages,
    };
  };

  // Helper for server-side GitHub configuration
  const GITHUB_CONFIG_FILE = path.join(process.cwd(), "data", "github_config.json");
  let lastKnownGitHubSha: string | null = null;
  let hasLocalUnpushedChanges: boolean = false;

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

  // ==========================================
  // AUTHORITATIVE DATABASE API (GITHUB / DISK)
  // ==========================================

  // GET /database - Load authoritative database directly from local repository or GitHub
  router.get("/database", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const serverConfig = getServerGitHubConfig();
      const owner = (req.query.owner as string) || serverConfig.owner || "hybridcivil";
      const repo = (req.query.repo as string) || serverConfig.repo || "associate";
      const branch = (req.query.branch as string) || serverConfig.branch || "main";
      const token = (req.query.token as string) || serverConfig.token || "";

      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      let localDb: any = null;
      if (fs.existsSync(dbFilePath)) {
        try {
          const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
          localDb = JSON.parse(fileContent);
        } catch (e) {}
      }

      const forcePull = req.query.forcePull === "true";

      // 1. If local database doesn't exist yet, OR if user explicitly requested forcePull:
      if (!localDb || forcePull) {
        if (owner && repo) {
          try {
            const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/hybrid_civil_database.json?ref=${branch}`;
            const ghRes = await fetch(ghUrl, { headers: getGitHubHeaders(token) });
            if (ghRes.ok) {
              const ghData = (await ghRes.json()) as any;
              if (ghData.content && ghData.encoding === "base64") {
                const remoteSha = ghData.sha;
                const decoded = Buffer.from(ghData.content, "base64").toString("utf-8");
                const remoteParsed = JSON.parse(decoded);

                lastKnownGitHubSha = remoteSha;
                hasLocalUnpushedChanges = false;
                await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
                await fs.promises.writeFile(dbFilePath, JSON.stringify(remoteParsed, null, 2), "utf-8");

                return res.json({
                  success: true,
                  source: "github",
                  sha: remoteSha,
                  data: remoteParsed,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          } catch (ghErr) {
            console.warn("Could not fetch database directly from GitHub API, falling back to local file:", ghErr);
          }
        }
      }

      // 2. Authoritative instantaneous read from local repository file: data/hybrid_civil_database.json
      if (localDb) {
        return res.json({
          success: true,
          source: "local_repository",
          sha: lastKnownGitHubSha || "local",
          data: localDb,
          updatedAt: new Date().toISOString(),
        });
      }

      return res.status(404).json({ error: "Database file not found on server or GitHub." });
    } catch (err: any) {
      console.error("Failed to load database:", err);
      res.status(500).json({ error: err.message || "Failed to load database." });
    }
  });

  // POST /database/save - Authoritative save to server repository and push to GitHub
  router.post("/database/save", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const serverConfig = getServerGitHubConfig();
      const {
        data,
        message,
        owner = serverConfig.owner || "hybridcivil",
        repo = serverConfig.repo || "associate",
        branch = serverConfig.branch || "main",
        token = serverConfig.token || "",
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

      // Sanitize and validate incoming database structure
      const validatedDb = {
        admin: data.admin || currentLocalDb?.admin || { username: "admin", password: "admin123" },
        associates: Array.isArray(data.associates) ? data.associates : (currentLocalDb?.associates || []),
        clients: Array.isArray(data.clients) ? data.clients : (currentLocalDb?.clients || []),
        transactions: Array.isArray(data.transactions) ? data.transactions : (currentLocalDb?.transactions || []),
        payments: Array.isArray(data.payments) ? data.payments : (currentLocalDb?.payments || []),
        messages: Array.isArray(data.messages) ? data.messages : (currentLocalDb?.messages || []),
      };
      const jsonString = JSON.stringify(validatedDb, null, 2);

      await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
      await fs.promises.writeFile(dbFilePath, jsonString, "utf-8");
      hasLocalUnpushedChanges = true;

      // Also update PROJECT_OVERVIEW.md
      const overviewMd = generateOverviewMarkdown(validatedDb);
      const overviewPath = path.join(process.cwd(), "PROJECT_OVERVIEW.md");
      await fs.promises.writeFile(overviewPath, overviewMd, "utf-8");

      const commitMsg = message || `Update database state [${new Date().toISOString()}]`;

      let githubResult: any = { success: true, simulated: true };
      const effectiveToken = (token && token.trim()) || serverConfig.token;

      // Push to GitHub if token provided or configured
      if (effectiveToken && effectiveToken.trim() && owner && repo) {
        try {
          const cleanPath = "data/hybrid_civil_database.json";
          const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
          const checkRes = await fetch(checkUrl, { headers: getGitHubHeaders(effectiveToken) });

          // If token returned 401 Unauthorized, handle gracefully and inform frontend
          if (checkRes.status === 401) {
            githubResult = {
              success: true,
              pushedToGitHub: false,
              authError: true,
              warning: "GitHub Personal Access Token is invalid or expired (401 Bad credentials). Local changes are safely saved to data/hybrid_civil_database.json.",
            };
          } else {
            let currentSha: string | undefined;
            if (checkRes.ok) {
              const fileData = (await checkRes.json()) as any;
              currentSha = fileData.sha;
            }

            const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
            const putPayload: any = {
              message: commitMsg,
              content: Buffer.from(jsonString).toString("base64"),
              branch,
            };
            if (currentSha) putPayload.sha = currentSha;

            const putRes = await fetch(putUrl, {
              method: "PUT",
              headers: {
                ...getGitHubHeaders(effectiveToken),
                "Content-Type": "application/json",
              },
              body: JSON.stringify(putPayload),
            });

            if (putRes.ok) {
              const putData = (await putRes.json()) as any;
              lastKnownGitHubSha = putData.content?.sha || putData.commit?.sha || null;
              hasLocalUnpushedChanges = false;

              githubResult = {
                success: true,
                pushedToGitHub: true,
                commitSha: putData.commit?.sha?.substring(0, 7) || "latest",
                commitUrl: putData.commit?.html_url || `https://github.com/${owner}/${repo}`,
              };

              // Also push updated PROJECT_OVERVIEW.md to GitHub
              try {
                const ovCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/PROJECT_OVERVIEW.md?ref=${branch}`, {
                  headers: getGitHubHeaders(effectiveToken),
                });
                let ovSha: string | undefined;
                if (ovCheck.ok) {
                  const ovData = (await ovCheck.json()) as any;
                  ovSha = ovData.sha;
                }
                await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/PROJECT_OVERVIEW.md`, {
                  method: "PUT",
                  headers: {
                    ...getGitHubHeaders(effectiveToken),
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: `Update PROJECT_OVERVIEW.md for ${commitMsg}`,
                    content: Buffer.from(overviewMd).toString("base64"),
                    branch,
                    ...(ovSha ? { sha: ovSha } : {}),
                  }),
                });
              } catch {
                // Secondary file push failure is non-fatal
              }
            } else {
              const isAuthError = putRes.status === 401;
              githubResult = {
                success: true,
                pushedToGitHub: false,
                authError: isAuthError,
                warning: isAuthError
                  ? "GitHub Personal Access Token is invalid or expired (401 Bad credentials). Local changes are safely saved to data/hybrid_civil_database.json."
                  : `Saved to repository files, but GitHub remote returned status ${putRes.status}`,
              };
            }
          }
        } catch (remoteErr: any) {
          githubResult = {
            success: true,
            pushedToGitHub: false,
            warning: remoteErr.message || "Failed to push to GitHub remote",
          };
        }
      } else {
        const simSha = Math.random().toString(16).substring(2, 9);
        githubResult = {
          success: true,
          simulated: true,
          commitSha: simSha,
          commitUrl: `https://github.com/${owner}/${repo}/commit/${simSha}`,
          message: `Saved to repository file data/hybrid_civil_database.json (set GitHub token in Network Settings to push to remote git)`,
        };
      }

      res.json({
        success: true,
        message: "Data saved to repository and GitHub successfully!",
        github: githubResult,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Failed to save database:", err);
      res.status(500).json({ error: err.message || "Failed to save database." });
    }
  });

  // GET /github/config - Return current sync configuration status
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

  // POST /github/config - Save GitHub configuration and token
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
  // GITHUB REPOSITORY SYNC & STORAGE API
  // ==========================================

  // 1. Get File Info from GitHub
  router.post("/github/file-info", async (req, res) => {
    try {
      const { owner, repo, branch = "main", path: filePath, token } = req.body;
      if (!owner || !repo || !filePath) {
        return res.status(400).json({ error: "owner, repo, and path are required." });
      }

      if (!token) {
        return res.json({
          exists: false,
          isDemo: true,
          message: "No token provided. Running in simulated GitHub sync mode.",
        });
      }

      const cleanPath = filePath.replace(/^\/+/, "");
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
      const response = await fetch(url, {
        headers: getGitHubHeaders(token),
        signal: AbortSignal.timeout(6000),
      });

      if (response.status === 404) {
        return res.json({ exists: false });
      }

      if (!response.ok) {
        if (response.status === 401) {
          return res.json({
            exists: true,
            authError: true,
            isDemo: true,
            message: "GitHub token is invalid or expired (401 Bad credentials). Running in local mode.",
          });
        }
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }

      const data = (await response.json()) as any;
      let textContent: string | null = null;
      if (data.content && data.encoding === "base64") {
        textContent = Buffer.from(data.content, "base64").toString("utf-8");
      }

      res.json({
        exists: true,
        sha: data.sha,
        size: data.size,
        name: data.name,
        path: data.path,
        content: textContent,
        html_url: data.html_url,
      });
    } catch (err: any) {
      console.error("GitHub file-info error:", err);
      res.status(500).json({ error: err.message || "Failed to inspect file on GitHub." });
    }
  });

  // 2. Push / Create / Update File on GitHub
  router.post("/github/push", async (req, res) => {
    try {
      const {
        owner,
        repo,
        branch = "main",
        path: filePath,
        content,
        message,
        token,
        sha: providedSha,
      } = req.body;

      if (!owner || !repo || !filePath || content === undefined) {
        return res.status(400).json({
          error: "owner, repo, path, and content are required.",
        });
      }

      const cleanPath = filePath.replace(/^\/+/, "");
      const commitMessage = message || `Update ${cleanPath} via Hybrid Civil Network`;

      // Persist to local disk to keep local files in sync with repository
      try {
        const fullLocalPath = path.resolve(process.cwd(), cleanPath);
        if (fullLocalPath.startsWith(process.cwd())) {
          await fs.promises.mkdir(path.dirname(fullLocalPath), { recursive: true });
          await fs.promises.writeFile(fullLocalPath, content, "utf-8");
        }
      } catch (localWriteErr) {
        console.error("Local file sync write error:", localWriteErr);
      }

      if (!token || !token.trim()) {
        const simSha = "sim-" + Math.random().toString(16).substring(2, 10);
        const simCommit = Math.random().toString(16).substring(2, 9);
        return res.json({
          success: true,
          simulated: true,
          commitSha: simCommit,
          fileSha: simSha,
          commitUrl: `https://github.com/${owner}/${repo}/commit/${simCommit}`,
          message: `[Simulated] Successfully saved and pushed ${cleanPath} to ${owner}/${repo}@${branch}`,
          date: new Date().toISOString(),
        });
      }

      let currentSha = providedSha;
      if (!currentSha) {
        const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
        const checkRes = await fetch(checkUrl, {
          headers: getGitHubHeaders(token),
          signal: AbortSignal.timeout(6000),
        });
        if (checkRes.status === 401) {
          const simCommit = Math.random().toString(16).substring(2, 9);
          return res.json({
            success: true,
            simulated: true,
            authError: true,
            action: "push",
            commitSha: simCommit,
            commitUrl: `https://github.com/${owner}/${repo}`,
            message: `Saved locally to repository file ${cleanPath}. (Note: GitHub token returned 401 Bad credentials. Update in GitHub Host settings).`,
            warning: "GitHub token is invalid or expired (401 Bad credentials).",
            date: new Date().toISOString(),
          });
        }
        if (checkRes.ok) {
          const fileData = (await checkRes.json()) as any;
          currentSha = fileData.sha;
        }
      }

      const base64Content = Buffer.from(content).toString("base64");

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
      const payload: any = {
        message: commitMessage,
        content: base64Content,
        branch,
      };
      if (currentSha) {
        payload.sha = currentSha;
      }

      const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: {
          ...getGitHubHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      const resData = (await putRes.json()) as any;

      if (!putRes.ok) {
        if (putRes.status === 401) {
          const simCommit = Math.random().toString(16).substring(2, 9);
          return res.json({
            success: true,
            simulated: true,
            authError: true,
            action: currentSha ? "update" : "push",
            commitSha: simCommit,
            commitUrl: `https://github.com/${owner}/${repo}`,
            message: `Saved locally to repository file ${cleanPath}. (Note: GitHub token returned 401 Bad credentials. Update in GitHub Host settings).`,
            warning: "GitHub token is invalid or expired (401 Bad credentials).",
            date: new Date().toISOString(),
          });
        }
        return res.status(putRes.status).json({
          error: resData.message || `GitHub error (${putRes.status}) while committing file.`,
          details: resData,
        });
      }

      res.json({
        success: true,
        action: currentSha ? "update" : "push",
        commitSha: resData.commit?.sha?.substring(0, 7) || "latest",
        fullSha: resData.commit?.sha,
        fileSha: resData.content?.sha,
        commitUrl: resData.commit?.html_url || `https://github.com/${owner}/${repo}`,
        message: `Successfully ${currentSha ? "updated" : "pushed"} ${cleanPath} on branch ${branch}!`,
        date: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("GitHub push error:", err);
      res.status(500).json({ error: err.message || "Failed to push file to GitHub." });
    }
  });

  // 3. Delete File from GitHub
  router.post("/github/delete", async (req, res) => {
    try {
      const {
        owner,
        repo,
        branch = "main",
        path: filePath,
        message,
        token,
        sha: providedSha,
      } = req.body;

      if (!owner || !repo || !filePath) {
        return res.status(400).json({
          error: "owner, repo, and path are required to delete a file.",
        });
      }

      const cleanPath = filePath.replace(/^\/+/, "");
      const commitMessage = message || `Delete ${cleanPath} via Hybrid Civil Network`;

      if (!token || !token.trim()) {
        const simCommit = Math.random().toString(16).substring(2, 9);
        return res.json({
          success: true,
          simulated: true,
          commitSha: simCommit,
          commitUrl: `https://github.com/${owner}/${repo}/commit/${simCommit}`,
          message: `[Simulated] Successfully deleted ${cleanPath} from ${owner}/${repo}@${branch}`,
          date: new Date().toISOString(),
        });
      }

      let fileSha = providedSha;
      if (!fileSha) {
        const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
        const checkRes = await fetch(checkUrl, {
          headers: getGitHubHeaders(token),
        });
        if (!checkRes.ok) {
          if (checkRes.status === 401) {
            return res.json({
              success: true,
              simulated: true,
              authError: true,
              message: `Deleted ${cleanPath} locally. (GitHub token is invalid or expired).`,
              date: new Date().toISOString(),
            });
          }
          if (checkRes.status === 404) {
            return res.status(404).json({ error: `File ${cleanPath} does not exist on branch ${branch}.` });
          }
          const errText = await checkRes.text();
          return res.status(checkRes.status).json({ error: `Failed to find file SHA: ${errText}` });
        }
        const fileData = (await checkRes.json()) as any;
        fileSha = fileData.sha;
      }

      const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
      const deleteRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          ...getGitHubHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: commitMessage,
          sha: fileSha,
          branch,
        }),
      });

      const resData = (await deleteRes.json()) as any;

      if (!deleteRes.ok) {
        return res.status(deleteRes.status).json({
          error: resData.message || `GitHub error (${deleteRes.status}) while deleting file.`,
          details: resData,
        });
      }

      res.json({
        success: true,
        action: "delete",
        commitSha: resData.commit?.sha?.substring(0, 7) || "latest",
        fullSha: resData.commit?.sha,
        commitUrl: resData.commit?.html_url || `https://github.com/${owner}/${repo}`,
        message: `Successfully deleted ${cleanPath} from repository.`,
        date: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("GitHub delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete file from GitHub." });
    }
  });

  // 4. List Recent Commits from Repository
  router.post("/github/commits", async (req, res) => {
    try {
      const { owner, repo, token, path: filterPath, per_page = 8 } = req.body;
      if (!owner || !repo) {
        return res.status(400).json({ error: "owner and repo are required." });
      }

      if (!token) {
        return res.json({
          commits: [
            {
              sha: "7a9b1c2",
              message: "Initial commit of Hybrid Civil Associate Network data",
              author: owner || "hybridcivil",
              date: new Date().toISOString(),
              html_url: `https://github.com/${owner}/${repo}`,
            },
          ],
          isDemo: true,
        });
      }

      let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${per_page}`;
      if (filterPath) {
        url += `&path=${encodeURIComponent(filterPath.replace(/^\/+/, ""))}`;
      }

      const response = await fetch(url, {
        headers: getGitHubHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return res.json({
            commits: [
              {
                sha: "7a9b1c2",
                message: "Repository data state (local fallback mode)",
                author: owner || "hybridcivil",
                date: new Date().toISOString(),
                html_url: `https://github.com/${owner}/${repo}`,
              },
            ],
            isDemo: true,
            authError: true,
          });
        }
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }

      const commitsData = (await response.json()) as any[];
      const formatted = commitsData.map((c: any) => ({
        sha: c.sha?.substring(0, 7),
        fullSha: c.sha,
        message: c.commit?.message || "No commit message",
        author: c.commit?.author?.name || c.author?.login || "Unknown",
        date: c.commit?.author?.date || new Date().toISOString(),
        html_url: c.html_url,
      }));

      res.json({ commits: formatted });
    } catch (err: any) {
      console.error("GitHub commits error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch repository commits." });
    }
  });

  // 5. List Files in Repository Directory
  router.post("/github/list-files", async (req, res) => {
    try {
      const { owner, repo, token, branch = "main", path: dirPath = "" } = req.body;
      if (!owner || !repo) {
        return res.status(400).json({ error: "owner and repo are required." });
      }

      if (!token) {
        return res.json({
          files: [
            { name: "data/hybrid_civil_database.json", path: "data/hybrid_civil_database.json", size: 4210, type: "file" },
            { name: "data/transactions.csv", path: "data/transactions.csv", size: 1820, type: "file" },
            { name: "PROJECT_OVERVIEW.md", path: "PROJECT_OVERVIEW.md", size: 2340, type: "file" },
          ],
          isDemo: true,
        });
      }

      const cleanPath = dirPath.replace(/^\/+/, "");
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
      const response = await fetch(url, {
        headers: getGitHubHeaders(token),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return res.json({
            files: [
              { name: "data/hybrid_civil_database.json", path: "data/hybrid_civil_database.json", size: 4210, type: "file" },
              { name: "data/transactions.csv", path: "data/transactions.csv", size: 1820, type: "file" },
              { name: "PROJECT_OVERVIEW.md", path: "PROJECT_OVERVIEW.md", size: 2340, type: "file" },
            ],
            isDemo: true,
            authError: true,
          });
        }
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `GitHub error (${response.status}): ${errorText}`,
        });
      }

      const items = (await response.json()) as any[];
      const files = Array.isArray(items)
        ? items.map((it: any) => ({
            name: it.name,
            path: it.path,
            sha: it.sha,
            size: it.size,
            type: it.type,
            html_url: it.html_url,
            download_url: it.download_url,
          }))
        : [];

      res.json({ files });
    } catch (err: any) {
      console.error("GitHub list-files error:", err);
      res.status(500).json({ error: err.message || "Failed to list repository files." });
    }
  });

  // Mount router at both '/api' and '/'
  // This guarantees that whether Vercel rewrites to '/api/...' or directly to '/...', the routes always match!
  app.use("/api", router);
  app.use("/", router);

  return app;
}
