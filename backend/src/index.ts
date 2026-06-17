import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sanitizeMiddleware from './middleware/sanitize';
import { config } from './config/env';
import { McpParameterValidationError } from './errors/McpParameterValidationError';
import { BitrefillApiError } from './errors/BitrefillApiError';
import apiRouter from './routes/api';
import { McpService } from './services/mcp.service';

const app = express();

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(sanitizeMiddleware);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 1 minute',
});
app.use(globalLimiter);

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many checkout requests from this IP, please try again after 1 minute',
});
app.use('/api/checkout', checkoutLimiter);

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof McpParameterValidationError) {
    console.error('[USC Backend] MCP parameter validation error:', err.message);
    return res.status(422).json({ error: err.message });
  }

  if (err instanceof BitrefillApiError) {
    console.error('[USC Backend] Bitrefill API error:', err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error('Unhandled Server Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

app.listen(config.port, () => {
  console.log(`[USC Backend] Running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(
    `[USC Backend] Bitrefill: live=${config.bitrefillApiKey !== 'mock'}, payment=${config.bitrefillPaymentMethod}, currency=${config.bitrefillBalanceCurrency}`,
  );
  if (config.bitrefillApiKey !== 'mock') {
    new McpService()
      .getAccountBalance()
      .then((b) => console.log(`[USC Backend] API balance: ${b.amount} ${b.currency}`))
      .catch((err: Error) => console.warn(`[USC Backend] Balance check failed: ${err.message}`));
  }
});
