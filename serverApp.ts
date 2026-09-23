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
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
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

  // ==========================================
  // AUTHORITATIVE DATABASE API (GITHUB / DISK)
  // ==========================================

  // GET /database - Load authoritative database directly from GitHub or server repository
  router.get("/database", async (req, res) => {
    try {
      const owner = (req.query.owner as string) || process.env.GITHUB_OWNER;
      const repo = (req.query.repo as string) || process.env.GITHUB_REPO;
      const branch = (req.query.branch as string) || "main";
      const token = (req.query.token as string) || process.env.GITHUB_TOKEN;

      // 1. If GitHub repository credentials are provided, attempt to fetch fresh from GitHub
      if (owner && repo && token) {
        try {
          const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/hybrid_civil_database.json?ref=${branch}`;
          const ghRes = await fetch(ghUrl, { headers: getGitHubHeaders(token) });
          if (ghRes.ok) {
            const ghData = (await ghRes.json()) as any;
            if (ghData.content && ghData.encoding === "base64") {
              const decoded = Buffer.from(ghData.content, "base64").toString("utf-8");
              const parsed = JSON.parse(decoded);
              // Cache to local disk as well
              const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
              await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
              await fs.promises.writeFile(dbFilePath, decoded, "utf-8");

              return res.json({
                success: true,
                source: "github",
                sha: ghData.sha,
                data: parsed,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } catch (ghErr) {
          console.warn("Could not fetch database directly from GitHub API, falling back to local file:", ghErr);
        }
      }

      // 2. Read from local repository file: data/hybrid_civil_database.json
      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      if (fs.existsSync(dbFilePath)) {
        const fileContent = await fs.promises.readFile(dbFilePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        return res.json({
          success: true,
          source: "local_repository",
          data: parsed,
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
      const { data, message, owner = "engrkalilinux", repo = "hybrid-civil-associate-network", branch = "main", token } = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Database data payload is required." });
      }

      const jsonString = JSON.stringify(data, null, 2);
      const dbFilePath = path.join(process.cwd(), "data", "hybrid_civil_database.json");
      await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
      await fs.promises.writeFile(dbFilePath, jsonString, "utf-8");

      // Also update PROJECT_OVERVIEW.md
      const overviewMd = generateOverviewMarkdown(data);
      const overviewPath = path.join(process.cwd(), "PROJECT_OVERVIEW.md");
      await fs.promises.writeFile(overviewPath, overviewMd, "utf-8");

      const commitMsg = message || `Update database state [${new Date().toISOString()}]`;

      let githubResult: any = { success: true, simulated: true };

      // Push to GitHub if token provided
      if (token && token.trim() && owner && repo) {
        try {
          const cleanPath = "data/hybrid_civil_database.json";
          const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;
          const checkRes = await fetch(checkUrl, { headers: getGitHubHeaders(token) });
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
              ...getGitHubHeaders(token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(putPayload),
          });

          if (putRes.ok) {
            const putData = (await putRes.json()) as any;
            githubResult = {
              success: true,
              pushedToGitHub: true,
              commitSha: putData.commit?.sha?.substring(0, 7) || "latest",
              commitUrl: putData.commit?.html_url || `https://github.com/${owner}/${repo}`,
            };

            // Also push updated PROJECT_OVERVIEW.md to GitHub
            try {
              const ovCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/PROJECT_OVERVIEW.md?ref=${branch}`, {
                headers: getGitHubHeaders(token),
              });
              let ovSha: string | undefined;
              if (ovCheck.ok) {
                const ovData = (await ovCheck.json()) as any;
                ovSha = ovData.sha;
              }
              await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/PROJECT_OVERVIEW.md`, {
                method: "PUT",
                headers: {
                  ...getGitHubHeaders(token),
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: `Update PROJECT_OVERVIEW.md for ${commitMsg}`,
                  content: Buffer.from(overviewMd).toString("base64"),
                  branch,
                  ...(ovSha ? { sha: ovSha } : {}),
                }),
              });
            } catch (ovErr) {
              console.warn("Could not push PROJECT_OVERVIEW.md to GitHub:", ovErr);
            }
          } else {
            const errBody = await putRes.text();
            console.warn("GitHub PUT returned error:", putRes.status, errBody);
            githubResult = {
              success: true,
              pushedToGitHub: false,
              warning: `Saved to repository files, but GitHub remote returned ${putRes.status}: ${errBody}`,
            };
          }
        } catch (remoteErr: any) {
          console.error("GitHub remote push error:", remoteErr);
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
          message: `Saved to repository file data/hybrid_civil_database.json (set GitHub token in GitHub Host tab to push to remote git)`,
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
      });

      if (response.status === 404) {
        return res.json({ exists: false });
      }

      if (!response.ok) {
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
        });
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
      });

      const resData = (await putRes.json()) as any;

      if (!putRes.ok) {
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
              author: owner || "engrkalilinux",
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
      });

      if (!response.ok) {
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
