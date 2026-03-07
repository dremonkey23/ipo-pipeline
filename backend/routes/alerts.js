const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

module.exports = function (db) {

  // GET /api/alerts — recent alerts (public, paginated)
  router.get('/', (req, res) => {
    const { limit = 30, offset = 0, type, severity, unread_only } = req.query;

    let where = ['1=1'];
    let params = {};

    if (type) {
      where.push('a.alert_type = @type');
      params.type = type;
    }
    if (severity) {
      where.push('a.severity = @severity');
      params.severity = severity;
    }
    if (unread_only === 'true') {
      where.push('a.is_read = 0');
    }

    params.limit = Math.min(Number(limit), 100);
    params.offset = Number(offset);

    const alerts = db.prepare(`
      SELECT a.*, c.company_name, c.ticker, c.status as company_status
      FROM alerts a
      LEFT JOIN companies c ON c.id = a.company_id
      WHERE ${where.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT @limit OFFSET @offset
    `).all(params);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM alerts a WHERE ${where.join(' AND ')}
    `).get(Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'limit' && k !== 'offset'))).count;

    res.json({ data: alerts, total, limit: params.limit, offset: params.offset });
  });

  // PUT /api/alerts/:id/read — mark alert as read
  router.put('/:id/read', (req, res) => {
    const result = db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true });
  });

  // PUT /api/alerts/read-all — mark all alerts as read
  router.put('/read-all', (req, res) => {
    const result = db.prepare('UPDATE alerts SET is_read = 1 WHERE is_read = 0').run();
    res.json({ success: true, marked: result.changes });
  });

  return router;
};
