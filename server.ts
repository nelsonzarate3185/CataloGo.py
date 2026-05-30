import express from "express";
import path from "path";

const app = express();
const PORT = 3000;

// API routes can go here if needed
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Bootstrap logic
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to prevent Vite from being required/loaded in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from 'dist' directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Server bootstrap failed:", err);
});
