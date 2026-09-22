import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient(): GoogleGenAI | null {
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Chat endpoint supporting multi-turn conversation and model selection
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-3.1-flash-lite", systemInstruction } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured. Please ensure GEMINI_API_KEY is available in your environment.",
        });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // Convert messages to GenAI contents format
      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      // Default role instructions for Hybrid Civil assistant
      const defaultSystemInstruction =
        systemInstruction ||
        "You are the expert Civil Engineering Consultant, Financial Estimator, and Project Coordinator for 'Hybrid Civil Associate Network'. " +
        "You assist civil engineers, contractors, and project associates with structural engineering concepts, BOQ/cost estimations, profit distribution rules (90% Company, 5% Direct Associate, 5% Pool), client proposals, and site supervision best practices. Provide professional, mathematically accurate, and practical advice.";

      // Select valid model alias or provided model
      let selectedModel = model;
      const validModels = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
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
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size = "1K", aspectRatio = "1:1" } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured. Please ensure GEMINI_API_KEY is available in your environment.",
        });
      }

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "A prompt description is required." });
      }

      // Standardize size to 1K, 2K, 4K
      const validSizes = ["1K", "2K", "4K"];
      const chosenSize = validSizes.includes(size) ? size : "1K";

      // Supported aspect ratios
      const validAspectRatios = ["1:1", "16:9", "4:3", "3:4", "9:16"];
      const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      // Attempt primary model: gemini-3-pro-image-preview
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
        console.warn("Primary image model (gemini-3-pro-image-preview) failed, trying gemini-3.1-flash-image:", primaryErr.message);
        // Fallback to gemini-3.1-flash-image
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
          error: textNote || "No image data was returned by the model. Please adjust the prompt and try again.",
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

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hybrid Civil Network server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
