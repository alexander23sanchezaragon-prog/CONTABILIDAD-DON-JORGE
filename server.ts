import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

console.log("Starting server process...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { data } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Eres un analista financiero experto para un negocio de distribución de pollo y lácteos llamado "Distribuidora QUE POLLO".
        A continuación se presentan los datos financieros actuales del negocio (Ventas, Compras y Movimientos de Caja).
        
        Por favor, proporciona un análisis detallado que incluya:
        1. Resumen de salud financiera.
        2. Identificación de tendencias (cuáles productos se venden más, margen aparente).
        3. Recomendaciones específicas para mejorar la rentabilidad o el flujo de caja.
        4. Alertas sobre riesgos (ej. pagos pendientes altos, gastos excesivos).

        Datos:
        ${JSON.stringify(data, null, 2)}

        Responde en formato Markdown, con un tono profesional pero directo. Usa tablas si es necesario para comparar.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: "Failed to generate analysis", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
