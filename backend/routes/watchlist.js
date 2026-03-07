const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

module.exports = function (db) {

  // GET /api/watchlist — user's watched IPOs
  router.get('/', authMiddleware, (req, res) => {
    const items = db.prepare(`
      SELECT w.id as watchlist_id, w.created_at as watched_since,
        c.*, 
        f.price_range_low, f.price_range_high, f.deal_size_high,
        f.filing_date as latest_filing_date, f.form_type as latest_form_type,
        (SELECT COUNT(*) FROM filings WHERE company_id = c.id) as filing_count
      FROM watchlist w
      JOIN companies c ON c.id = w.company_id
      LEFT JOIN filings f ON f.id = (
        SELECT id FROM filings WHERE company_id = c.id ORDER BY filing_date DESC LIMIT 1
      )
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(req.user.id);

    res.json({ data: items });
  });

  // POST /api/watchlist — add IPO to watchlist
  router.post('/', authMiddleware, (req, res) => {
    const { company_id } = req.body;
    if (!company_id) return res.status(400).json({ error: 'company_id required' });

    try {
      db.prepare('INSERT INTO watchlist (user_id, company_id) VALUES (?, ?)').run(req.user.id, company_id);
      res.status(201).json({ success: true });
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Already watching this IPO' });
      }
      res.status(500).json({ error: 'Failed to add to watchlist' });
    }
  });

  // DELETE /api/watchlist/:companyId — remove from watchlist
  router.delete('/:companyId', authMiddleware, (req, res) => {
    const result = db.prepare(
      'DELETE FROM watchlist WHERE user_id = ? AND company_id = ?'
    ).run(req.user.id, req.params.companyId);

    if (result.changes === 0) return res.status(404).json({ error: 'Not in watchlist' });
    res.json({ success: true });
  });

  return router;
};
