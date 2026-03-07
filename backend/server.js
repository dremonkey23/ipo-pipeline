const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { initDb } = require('./db/schema');
const { scrapeIPOFilings, parseS1Document } = require('./scrapers/edgar-ipo');

// ─── Config ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
const DB_DIR = process.env.RENDER ? '/data' : path.join(__dirname, 'data');
const DB_PATH = path.resolve(DB_DIR, process.env.DB_PATH || 'ipo-pipeline.db');

// ─── Initialize Database ────────────────────────────────────
const db = initDb(DB_PATH);
console.log(`📦 Database initialized at ${DB_PATH}`);

// ─── Express App ────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// HTTPS enforcement in production (Render handles TLS termination via X-Forwarded-Proto)
if (process.env.RENDER || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/ipos', require('./routes/ipos')(db));
app.use('/api/alerts', require('./routes/alerts')(db));
app.use('/api/watchlist', require('./routes/watchlist')(db));

// Legal pages
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
  const filingCount = db.prepare('SELECT COUNT(*) as count FROM filings').get().count;
  const alertCount = db.prepare('SELECT COUNT(*) as count FROM alerts').get().count;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: { companies: companyCount, filings: filingCount, alerts: alertCount, users: userCount },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Scheduled Jobs ─────────────────────────────────────────

// IPO filing scraper — every hour (S-1, S-1/A, F-1, F-1/A, 424B4)
cron.schedule(process.env.IPO_SCRAPE_INTERVAL || '0 * * * *', () => {
  console.log('[CRON] Running IPO filing scraper...');
  scrapeIPOFilings(db)
    .catch(err => console.error('[CRON] IPO scrape error:', err.message));
});

// Deep S-1 parsing — every 4 hours (parse unprocessed filings)
cron.schedule('30 */4 * * *', async () => {
  console.log('[CRON] Running deep S-1 parser...');
  try {
    const unparsed = db.prepare(`
      SELECT id FROM filings 
      WHERE revenue_latest IS NULL AND business_summary IS NULL
      AND form_type IN ('S-1', 'F-1', 'S-1/A', 'F-1/A')
      ORDER BY filing_date DESC
      LIMIT 10
    `).all();
    
    for (const filing of unparsed) {
      await parseS1Document(db, filing.id);
    }
    console.log(`[CRON] Parsed ${unparsed.length} filings`);
  } catch (err) {
    console.error('[CRON] S-1 parser error:', err.message);
  }
});

// Cleanup old alerts — daily at midnight
cron.schedule('0 0 * * *', () => {
  const days = 90;
  console.log(`[CRON] Cleaning up alerts older than ${days} days...`);
  try {
    const result = db.prepare(
      `DELETE FROM alerts WHERE created_at < datetime('now', '-${days} days') AND is_read = 1`
    ).run();
    console.log(`[CRON] Cleaned up ${result.changes} old alerts`);
  } catch (err) {
    console.error(`[CRON] Alert cleanup error:`, err.message);
  }
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 IPO Pipeline API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   IPOs: http://localhost:${PORT}/api/ipos`);
  console.log(`   Pipeline: http://localhost:${PORT}/api/ipos/pipeline`);
  console.log(`   Stats: http://localhost:${PORT}/api/ipos/stats`);
  console.log(`   Alerts: http://localhost:${PORT}/api/alerts`);
  console.log(`\n📡 Scheduled jobs:`);
  console.log(`   IPO filing scraper: every hour`);
  console.log(`   Deep S-1 parser: every 4 hours`);
  console.log(`   Alert cleanup: daily at midnight`);

  // Run scraper on startup
  console.log('\n🔄 Running initial IPO scrape...');
  scrapeIPOFilings(db)
    .then(() => console.log('✅ Initial IPO scrape complete'))
    .catch(err => console.error('❌ Initial IPO scrape failed:', err.message));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

module.exports = app;
