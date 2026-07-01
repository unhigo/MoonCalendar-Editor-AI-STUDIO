import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/find-moon-phase", async (req, res) => {
    const { phase, date } = req.body;
    const apiKey = process.env.API_NINJAS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API_NINJAS_API_KEY not configured' });
    }

    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/moonphase?date=${date}`, {
        headers: { 'X-Api-Key': apiKey }
      });
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch moon data' });
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
