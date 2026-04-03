import { Router, Request, Response } from 'express';
import { SessionStorage } from '../storage';

const SUMMARIZER_URL = process.env.SUMMARIZER_URL || 'http://localhost:8000';

export function healthRouter(storage: SessionStorage): Router {
  const router = Router();

  router.get('/health', async (_req: Request, res: Response) => {
    let summarizerReachable = false;
    try {
      const r = await fetch(`${SUMMARIZER_URL}/health`);
      summarizerReachable = r.ok;
    } catch {
      summarizerReachable = false;
    }

    res.json({
      ok: true,
      sessions: storage.size(),
      ttl_seconds: parseInt(process.env.TTL_SECONDS || '3600', 10),
      summarizer: summarizerReachable ? 'reachable' : 'unreachable',
      summarizer_url: SUMMARIZER_URL,
    });
  });

  return router;
}
