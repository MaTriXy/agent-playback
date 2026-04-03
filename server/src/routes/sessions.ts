import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionStorage } from '../storage';
import { summarizeSession, summarizeStep, summarizeStepInContext } from '../summarizer';
import { Session } from '../types';

export function sessionsRouter(storage: SessionStorage): Router {
  const router = Router();

  router.post('/api/sessions', async (req: Request, res: Response) => {
    const body = req.body;
    if (!body || !Array.isArray(body.steps)) {
      return res.status(400).json({ error: 'Missing steps[]' });
    }

    const id = uuidv4();
    const createdAt = body.createdAt || new Date().toISOString();

    const session: Session = {
      id,
      title: body.title || 'Playback',
      createdAt,
      steps: body.steps,
      meta: body.meta || {},
    };

    if (req.query.summarize === '1') {
      try {
        session.meta.ai_summary = await summarizeSession(session);
      } catch (err) {
        session.meta.ai_summary_error = (err as Error).message || 'Summary failed';
      }
    }

    storage.set(id, session);
    res.json({ session_id: id, expires_in: parseInt(process.env.TTL_SECONDS || '3600', 10) });
  });

  router.get('/api/sessions/:id', (req: Request, res: Response) => {
    storage.prune();
    const session = storage.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(session);
  });

  router.post('/api/sessions/:id/summary', async (req: Request, res: Response) => {
    storage.prune();
    const session = storage.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const summary = await summarizeSession(session);
      session.meta = session.meta || {};
      session.meta.ai_summary = summary;
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Summary failed' });
    }
  });

  router.post('/api/sessions/:id/steps/:index/summary', async (req: Request, res: Response) => {
    storage.prune();
    const session = storage.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Not found' });
    }
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= session.steps.length) {
      return res.status(400).json({ error: 'Invalid step index' });
    }
    try {
      const summary = await summarizeStep(session.steps[index]);
      session.steps[index].ai_summary = summary;
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Summary failed' });
    }
  });

  router.post('/api/sessions/:id/steps/:index/context-summary', async (req: Request, res: Response) => {
    storage.prune();
    const session = storage.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Not found' });
    }
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= session.steps.length) {
      return res.status(400).json({ error: 'Invalid step index' });
    }
    try {
      const summary = await summarizeStepInContext(session, session.steps[index]);
      session.meta = session.meta || {};
      if (!session.meta.ai_summary) {
        session.meta.ai_summary = await summarizeSession(session);
      }
      session.steps[index].context_summary = summary;
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Summary failed' });
    }
  });

  return router;
}
