const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Core IPO companies table
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cik TEXT UNIQUE,
      company_name TEXT NOT NULL,
      ticker TEXT,
      industry TEXT,
      sector TEXT,
      description TEXT,
      headquarters TEXT,
      founded_year INTEGER,
      employees INTEGER,
      website TEXT,
      status TEXT CHECK(status IN ('filed','amended','roadshow','priced','listed','withdrawn')) DEFAULT 'filed',
      expected_listing_date TEXT,
      exchange TEXT,
      lead_underwriters TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- S-1 filings and amendments
    CREATE TABLE IF NOT EXISTS filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      accession_number TEXT UNIQUE,
      form_type TEXT NOT NULL,  -- 'S-1', 'S-1/A', 'F-1', 'F-1/A', '424B4'
      filing_date TEXT NOT NULL,
      filing_url TEXT,
      amendment_number INTEGER DEFAULT 0,
      is_initial INTEGER DEFAULT 0,
      -- Parsed financial data
      revenue_latest REAL,
      revenue_prior REAL,
      revenue_growth REAL,
      net_income REAL,
      total_assets REAL,
      total_debt REAL,
      cash_on_hand REAL,
      -- Offering details
      shares_offered INTEGER,
      price_range_low REAL,
      price_range_high REAL,
      final_price REAL,
      deal_size_low REAL,
      deal_size_high REAL,
      overallotment_shares INTEGER,
      -- Key changes in amendments
      change_summary TEXT,
      -- Raw text excerpts
      risk_factors_summary TEXT,
      business_summary TEXT,
      use_of_proceeds TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- Insider ownership from S-1
    CREATE TABLE IF NOT EXISTS insider_ownership (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      filing_id INTEGER,
      insider_name TEXT NOT NULL,
      title TEXT,
      shares_before_ipo INTEGER,
      percent_before_ipo REAL,
      shares_after_ipo INTEGER,
      percent_after_ipo REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE SET NULL
    );

    -- IPO timeline events
    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN (
        'initial_filing','amendment','roadshow_start','roadshow_end',
        'pricing','listing','first_trade','lockup_expiry','withdrawn','confidential_filing'
      )),
      event_date TEXT NOT NULL,
      description TEXT,
      metadata TEXT,  -- JSON blob for extra data
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- User alerts/notifications
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      alert_type TEXT NOT NULL CHECK(alert_type IN (
        'new_filing','amendment','pricing_update','deal_size_change',
        'roadshow','listing','withdrawal','lockup_expiry'
      )),
      title TEXT NOT NULL,
      message TEXT,
      severity TEXT CHECK(severity IN ('high','medium','low')) DEFAULT 'medium',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      push_token TEXT,
      plan TEXT CHECK(plan IN ('free','premium')) DEFAULT 'free',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- User watchlist for IPOs
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(user_id, company_id)
    );

    -- User preferences
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      alert_new_filings INTEGER DEFAULT 1,
      alert_amendments INTEGER DEFAULT 1,
      alert_pricing INTEGER DEFAULT 1,
      alert_listings INTEGER DEFAULT 1,
      min_deal_size REAL DEFAULT 0,
      sectors TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_companies_cik ON companies(cik);
    CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
    CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_id);
    CREATE INDEX IF NOT EXISTS idx_filings_date ON filings(filing_date);
    CREATE INDEX IF NOT EXISTS idx_filings_type ON filings(form_type);
    CREATE INDEX IF NOT EXISTS idx_timeline_company ON timeline_events(company_id);
    CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_insider_company ON insider_ownership(company_id);
  `);

  return db;
}

module.exports = { initDb };
