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
