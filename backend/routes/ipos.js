const express = require('express');
const router = express.Router();

function formatDealSize(low, high) {
  const fmt = (v) => {
    if (!v) return null;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };
  if (low && high) return `${fmt(low)} - ${fmt(high)}`;
  if (high) return fmt(high);
  if (low) return fmt(low);
  return 'TBD';
}

module.exports = function (db) {

  // GET /api/ipos — list all IPOs with latest filing data
  router.get('/', (req, res) => {
    const { status, sector, limit = 50, offset = 0, sort = 'newest' } = req.query;

    let where = ['1=1'];
    let params = {};

    if (status) {
      where.push('c.status = @status');
      params.status = status;
    }
    if (sector) {
      where.push('c.sector = @sector');
      params.sector = sector;
    }

    const orderBy = sort === 'deal_size' ? 'f.deal_size_high DESC NULLS LAST' :
                    sort === 'oldest' ? 'c.created_at ASC' :
                    'c.updated_at DESC';

    const query = `
      SELECT c.*, 
        f.form_type as latest_form_type,
        f.filing_date as latest_filing_date,
        f.revenue_latest,
        f.revenue_growth,
        f.net_income,
        f.shares_offered,
        f.price_range_low,
        f.price_range_high,
        f.final_price,
        f.deal_size_low,
        f.deal_size_high,
        f.amendment_number,
        f.business_summary,
        (SELECT COUNT(*) FROM filings WHERE company_id = c.id) as filing_count,
        (SELECT COUNT(*) FROM filings WHERE company_id = c.id AND form_type LIKE '%/A') as amendment_count
      FROM companies c
      LEFT JOIN filings f ON f.id = (
        SELECT id FROM filings WHERE company_id = c.id ORDER BY filing_date DESC LIMIT 1
      )
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT @limit OFFSET @offset
    `;

    params.limit = Math.min(Number(limit), 100);
    params.offset = Number(offset);

    const ipos = db.prepare(query).all(params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM companies c WHERE ${where.join(' AND ')}`).get(
      Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'limit' && k !== 'offset'))
    ).count;

    // Add computed fields
    const enriched = ipos.map(ipo => ({
      ...ipo,
      deal_size_display: formatDealSize(ipo.deal_size_low, ipo.deal_size_high),
      price_range_display: ipo.price_range_low && ipo.price_range_high 
        ? `$${ipo.price_range_low} - $${ipo.price_range_high}` 
        : ipo.final_price ? `$${ipo.final_price}` : 'TBD',
      has_amendments: (ipo.amendment_count || 0) > 0,
    }));

    res.json({ data: enriched, total, limit: params.limit, offset: params.offset });
  });

  // GET /api/ipos/pipeline — pipeline view (grouped by status)
  router.get('/pipeline', (req, res) => {
    const statuses = ['filed', 'amended', 'roadshow', 'priced', 'listed', 'withdrawn'];
    const pipeline = {};

    for (const status of statuses) {
      const items = db.prepare(`
        SELECT c.id, c.company_name, c.ticker, c.sector, c.status, c.expected_listing_date,
          f.price_range_low, f.price_range_high, f.deal_size_high, f.filing_date as latest_filing_date,
          (SELECT COUNT(*) FROM filings WHERE company_id = c.id AND form_type LIKE '%/A') as amendment_count
        FROM companies c
        LEFT JOIN filings f ON f.id = (
          SELECT id FROM filings WHERE company_id = c.id ORDER BY filing_date DESC LIMIT 1
        )
        WHERE c.status = ?
        ORDER BY c.updated_at DESC
        LIMIT 20
      `).all(status);

      pipeline[status] = {
        count: db.prepare('SELECT COUNT(*) as count FROM companies WHERE status = ?').get(status).count,
        items: items.map(i => ({
          ...i,
          deal_size_display: formatDealSize(i.deal_size_low, i.deal_size_high),
          price_range_display: i.price_range_low && i.price_range_high
            ? `$${i.price_range_low} - $${i.price_range_high}` : 'TBD',
        })),
      };
    }

    res.json(pipeline);
  });

  // GET /api/ipos/stats — dashboard statistics
  router.get('/stats', (req, res) => {
    const stats = {
      total_tracked: db.prepare('SELECT COUNT(*) as count FROM companies').get().count,
      active_filings: db.prepare("SELECT COUNT(*) as count FROM companies WHERE status IN ('filed','amended','roadshow')").get().count,
      priced_this_month: db.prepare("SELECT COUNT(*) as count FROM companies WHERE status = 'priced' AND updated_at >= date('now', '-30 days')").get().count,
      listed_this_month: db.prepare("SELECT COUNT(*) as count FROM companies WHERE status = 'listed' AND updated_at >= date('now', '-30 days')").get().count,
      withdrawn: db.prepare("SELECT COUNT(*) as count FROM companies WHERE status = 'withdrawn'").get().count,
      total_filings: db.prepare('SELECT COUNT(*) as count FROM filings').get().count,
      amendments_this_week: db.prepare("SELECT COUNT(*) as count FROM filings WHERE form_type LIKE '%/A' AND filing_date >= date('now', '-7 days')").get().count,
      recent_alerts: db.prepare("SELECT COUNT(*) as count FROM alerts WHERE created_at >= datetime('now', '-24 hours')").get().count,
    };
    res.json(stats);
  });

  // GET /api/ipos/:id — full IPO detail with all filings, timeline, and insiders
  router.get('/:id', (req, res) => {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'IPO not found' });

    const filings = db.prepare(
      'SELECT * FROM filings WHERE company_id = ? ORDER BY filing_date DESC'
    ).all(company.id);

    const timeline = db.prepare(
      'SELECT * FROM timeline_events WHERE company_id = ? ORDER BY event_date DESC'
    ).all(company.id);

    const insiders = db.prepare(
      'SELECT * FROM insider_ownership WHERE company_id = ? ORDER BY percent_before_ipo DESC'
    ).all(company.id);

    const latestFiling = filings.length > 0 ? filings[0] : null;

    res.json({
      company: {
        ...company,
        deal_size_display: formatDealSize(
          latestFiling?.deal_size_low, latestFiling?.deal_size_high
        ),
        price_range_display: latestFiling?.price_range_low && latestFiling?.price_range_high
          ? `$${latestFiling.price_range_low} - $${latestFiling.price_range_high}`
          : latestFiling?.final_price ? `$${latestFiling.final_price}` : 'TBD',
      },
      filings,
      timeline,
      insiders,
      filing_count: filings.length,
      amendment_count: filings.filter(f => f.form_type.includes('/A')).length,
    });
  });

  // GET /api/ipos/:id/filings — all filings for a company
  router.get('/:id/filings', (req, res) => {
    const filings = db.prepare(
      'SELECT * FROM filings WHERE company_id = ? ORDER BY filing_date DESC'
    ).all(req.params.id);
    res.json({ data: filings });
  });

  // GET /api/ipos/:id/timeline — timeline events
  router.get('/:id/timeline', (req, res) => {
    const events = db.prepare(
      'SELECT * FROM timeline_events WHERE company_id = ? ORDER BY event_date DESC'
    ).all(req.params.id);
    res.json({ data: events });
  });

  return router;
};
