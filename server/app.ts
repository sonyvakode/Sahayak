import express from 'express';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './db/schema.ts';
import { apiRouter } from './routes/api.ts';

let initialized = false;

export function createApiApp(): express.Express {
  if (!initialized) {
    initializeDatabase();
    initialized = true;
  }

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get(['/api', '/api/health'], (_req, res) => {
    res.json({ status: 'ok', service: 'SahayakSHG API' });
  });

  // Mount REST API
  app.use('/api', apiRouter);

  return app;
}
