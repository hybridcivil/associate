import express, { Express, Router } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

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
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Chat endpoint supporting multi-turn conversation and model selection
  router.post("/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-3.1-flash-lite", systemInstruction } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          error:
            "Gemini API key is not configured in environment variables. If you are on Vercel, please go to Project Settings > Environment Variables and set GEMINI_API_KEY.",
        });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const defaultSystemInstruction =
        systemInstruction ||
        "You are the expert Civil Engineering Consultant, Financial Estimator, and Project Coordinator for 'Hybrid Civil Associate Network'. " +
        "You assist civil engineers, contractors, and project associates with structural engineering concepts, BOQ/cost estimations, profit distribution rules (90% Company, 5% Direct Associate, 5% Pool), client proposals, and site supervision best practices. Provide professional, mathematically accurate, and practical advice.";

      let selectedModel = model;
      const validModels = [
        "gemini-3.1-pro-preview",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
      ];
      if (!validModels.includes(selectedModel)) {
        selectedModel = "gemini-3.1-flash-lite";
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: defaultSystemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "No response generated.";
      res.json({ reply: replyText, model: selectedModel });
    } catch (err: any) {
      console.error("Chat error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate chat response.",
      });
    }
  });

  // High-Quality Image Generation endpoint
  router.post("/generate-image", async (req, res) => {
    try {
      const { prompt, size = "1K", aspectRatio = "1:1" } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          error:
            "Gemini API key is not configured in environment variables. Please add GEMINI_API_KEY in your Vercel Project Settings.",
        });
      }

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "A prompt description is required." });
      }

      const validSizes = ["1K", "2K", "4K"];
      const chosenSize = validSizes.includes(size) ? size : "1K";

      const validAspectRatios = ["1:1", "16:9", "4:3", "3:4", "9:16"];
      const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenAspectRatio as any,
              imageSize: chosenSize as any,
            },
          },
        });
      } catch (primaryErr: any) {
        console.warn("Primary image model failed, trying fallback:", primaryErr.message);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenAspectRatio as any,
              imageSize: chosenSize as any,
            },
          },
        });
      }

      let imageUrl: string | null = null;
      let textNote: string | null = null;

      if (response && response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textNote = part.text;
          }
        }
      }

      if (!imageUrl) {
        return res.status(500).json({
          error: textNote || "No image data returned. Please adjust the prompt and try again.",
        });
      }

      res.json({
        imageUrl,
        prompt,
        size: chosenSize,
        aspectRatio: chosenAspectRatio,
      });
    } catch (err: any) {
      console.error("Image generation error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate image.",
      });
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
