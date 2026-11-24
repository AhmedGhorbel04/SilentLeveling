import { Router } from 'express';
import { RANKS } from '../../game/index.js';

export const ranksRouter = Router();

// GET /api/ranks — the rank table and its requirements (public, used by the rank page)
ranksRouter.get('/', (_req, res) => {
  res.json({ ranks: RANKS });
});
