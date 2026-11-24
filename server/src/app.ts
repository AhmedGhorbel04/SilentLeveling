import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Builds the Express app without starting it, so tests can import it directly.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet()); // security-related HTTP headers
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true })); // only our frontend
  app.use(express.json({ limit: '100kb' })); // parse JSON bodies, reject huge ones

  app.use('/api/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
