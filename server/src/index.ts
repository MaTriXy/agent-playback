import express from 'express';
import path from 'path';
import { SessionStorage } from './storage';
import { sessionsRouter } from './routes/sessions';
import { healthRouter } from './routes/health';

const app = express();
const storage = new SessionStorage();

const JSON_LIMIT = process.env.JSON_LIMIT || '25mb';
app.use(express.json({ limit: JSON_LIMIT }));

app.use(sessionsRouter(storage));
app.use(healthRouter(storage));

// Prune expired sessions every 30s
setInterval(() => storage.prune(), 30 * 1000).unref();

// Serve React frontend
const staticDir = process.env.STATIC_DIR || path.join(__dirname, '../../client/dist');
app.use(express.static(staticDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, () => {
  console.log(`Playback server running on http://localhost:${port}`);
});
