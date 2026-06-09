import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Gemini Smart Assistant Proxy Endpoints
app.post("/api/gemini/assistant", async (req, res) => {
  try {
    const { messages, userMessage, inventorySummary, lang } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is not defined on the server." 
      });
    }

    // Lazy initialize Gemini client as required
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Define function schema/declarations on server side to ensure stability
    const addProductToInventoryTool: FunctionDeclaration = {
      name: 'add_product_to_inventory',
      description: 'Use this tool when the shop owner/staff explicitly wants to add new inventory stock or update an existing products stock level in the inventory. (e.g., "দোকানে ৫০ পিস লাক্স সাবান আনলাম")',
      parameters: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING, description: 'The exact or clean name of the product in Bengali or English.' },
          quantity: { type: Type.NUMBER, description: 'The total stock quantity being added.' }
        },
        required: ['productName', 'quantity']
      }
    };

    const addProductToCartTool: FunctionDeclaration = {
      name: 'add_product_to_cart',
      description: 'Use this tool when a customer wants to buy items, or when selling products via POS. This adds items to the current sales cart. (e.g., "২ কেজি মিনিকেট চাল আর ১টি তেল বিক্রি করো")',
      parameters: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING, description: 'The name of the product being sold.' },
          quantity: { type: Type.NUMBER, description: 'The quantity being purchased.' }
        },
        required: ['productName', 'quantity']
      }
    };

    const systemPrompt = `
      You are an advanced retail POS voice/text smart assistant of "A.R. Enterprise" styled for Bangladesh retail.
      You have direct dashboard and cart updating utilities via function calling.
      
      Current Inventory: [${inventorySummary || "Empty"}]
      
      CRITICAL RULES:
      1. Correctly categorize user intents. If they are onboarding stock (adding inventory), use add_product_to_inventory. If they are making a sale, use add_product_to_cart.
      2. If matching a tool, trigger it immediately.
      3. Respond politely in ${lang === 'bn' ? 'Bengali' : 'English'}.
    `;

    // Format the history appropriately for Gemini 2.x/3.x SDK
    const contentsPayload = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ].map(m => ({
      role: m.role as 'user' | 'model',
      parts: m.parts
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // production-grade fast and robust model
      contents: contentsPayload,
      config: {
        tools: [{ functionDeclarations: [addProductToInventoryTool, addProductToCartTool] }]
      }
    });

    res.json({
      text: response.text,
      functionCalls: response.functionCalls || null
    });

  } catch (error: any) {
    console.error("Gemini server error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the Gemini API." });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "A.R. Enterprise POS Server" });
});

// Vite Middleware integration for SPA dev / prod pipelines
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

initializeServer();
