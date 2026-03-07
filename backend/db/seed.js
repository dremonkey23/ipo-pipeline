/**
 * Seed the database with sample IPO data for development/testing
 */
const path = require('path');
const { initDb } = require('./schema');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipo-pipeline.db');
const db = initDb(DB_PATH);

console.log('🌱 Seeding IPO Pipeline database...');

// Sample IPO companies
const companies = [
  {
    cik: '0001234567',
    company_name: 'NovaTech AI Inc.',
    ticker: 'NVAI',
    industry: 'Artificial Intelligence',
    sector: 'Technology',
    description: 'Enterprise AI platform for automation and decision intelligence.',
    headquarters: 'San Francisco, CA',
    employees: 450,
    status: 'amended',
    exchange: 'NASDAQ',
    lead_underwriters: 'Goldman Sachs, Morgan Stanley',
  },
  {
    cik: '0001234568',
    company_name: 'GreenGrid Energy Corp.',
    ticker: 'GGEC',
    industry: 'Renewable Energy',
    sector: 'Energy',
    description: 'Next-generation grid-scale battery storage and renewable energy solutions.',
    headquarters: 'Austin, TX',
    employees: 280,
    status: 'filed',
    exchange: 'NYSE',
    lead_underwriters: 'J.P. Morgan, Barclays',
  },
  {
    cik: '0001234569',
    company_name: 'MedVault Health Technologies',
    ticker: 'MVHT',
    industry: 'Health Technology',
    sector: 'Healthcare',
    description: 'AI-powered clinical decision support and medical records platform.',
    headquarters: 'Boston, MA',
    employees: 620,
    status: 'roadshow',
    exchange: 'NASDAQ',
    lead_underwriters: 'Morgan Stanley, BofA Securities',
  },
  {
    cik: '0001234570',
    company_name: 'QuantumBridge Networks',
    ticker: 'QBNT',
    industry: 'Quantum Computing',
    sector: 'Technology',
    description: 'Quantum-safe cybersecurity and networking infrastructure.',
    headquarters: 'Boulder, CO',
    employees: 180,
    status: 'priced',
    exchange: 'NASDAQ',
    lead_underwriters: 'Goldman Sachs',
  },
  {
    cik: '0001234571',
    company_name: 'FreshDirect Foods Inc.',
    ticker: 'FDFI',
    industry: 'Food & Beverage',
    sector: 'Consumer',
    description: 'Farm-to-table food delivery platform with AI-optimized supply chain.',
    headquarters: 'Chicago, IL',
    employees: 1200,
    status: 'listed',
    exchange: 'NYSE',
    lead_underwriters: 'J.P. Morgan, Credit Suisse',
  },
];

const insertCompany = db.prepare(`
  INSERT OR IGNORE INTO companies (cik, company_name, ticker, industry, sector, description, headquarters, employees, status, exchange, lead_underwriters)
  VALUES (@cik, @company_name, @ticker, @industry, @sector, @description, @headquarters, @employees, @status, @exchange, @lead_underwriters)
`);

for (const c of companies) {
  insertCompany.run(c);
}
console.log(`  ✅ ${companies.length} companies inserted`);

// Get company IDs
const getCompanyId = db.prepare('SELECT id FROM companies WHERE cik = ?');

// Sample filings
const filings = [
  {
    cik: '0001234567', form_type: 'S-1', filing_date: '2026-02-01', is_initial: 1, amendment_number: 0,
    revenue_latest: 85000000, revenue_prior: 42000000, revenue_growth: 102.4, net_income: -12000000,
    shares_offered: 15000000, price_range_low: 18, price_range_high: 22,
    deal_size_low: 270000000, deal_size_high: 330000000,
    business_summary: 'NovaTech AI provides an enterprise AI platform that enables Fortune 500 companies to automate complex business processes and make data-driven decisions at scale.',
    risk_factors_summary: 'We have a history of net losses and may not achieve profitability. Our business depends on customer adoption of AI technologies which is still emerging.',
    use_of_proceeds: 'We intend to use approximately 40% for research and development, 30% for sales and marketing expansion, and 30% for general corporate purposes.',
  },
  {
    cik: '0001234567', form_type: 'S-1/A', filing_date: '2026-02-20', is_initial: 0, amendment_number: 1,
    revenue_latest: 85000000, revenue_growth: 102.4, net_income: -12000000,
    shares_offered: 15000000, price_range_low: 20, price_range_high: 24,
    deal_size_low: 300000000, deal_size_high: 360000000,
    change_summary: '📈 INCREASED: Price range changed from $18-$22 to $20-$24; Deal size changed by +9.1%',
  },
  {
    cik: '0001234568', form_type: 'S-1', filing_date: '2026-02-15', is_initial: 1, amendment_number: 0,
    revenue_latest: 120000000, revenue_prior: 78000000, revenue_growth: 53.8, net_income: -28000000,
    shares_offered: 20000000, price_range_low: 14, price_range_high: 17,
    deal_size_low: 280000000, deal_size_high: 340000000,
    business_summary: 'GreenGrid Energy develops and manufactures grid-scale battery storage systems using proprietary solid-state technology.',
  },
  {
    cik: '0001234569', form_type: 'S-1', filing_date: '2026-01-15', is_initial: 1, amendment_number: 0,
    revenue_latest: 210000000, revenue_prior: 145000000, revenue_growth: 44.8, net_income: 8000000,
    shares_offered: 12000000, price_range_low: 28, price_range_high: 32,
    deal_size_low: 336000000, deal_size_high: 384000000,
    business_summary: 'MedVault Health Technologies provides AI-powered clinical decision support tools used by over 2,000 hospitals.',
  },
  {
    cik: '0001234569', form_type: 'S-1/A', filing_date: '2026-02-10', is_initial: 0, amendment_number: 1,
    shares_offered: 12000000, price_range_low: 30, price_range_high: 34,
    deal_size_low: 360000000, deal_size_high: 408000000,
    change_summary: '📈 INCREASED: Price range changed from $28-$32 to $30-$34',
  },
  {
    cik: '0001234570', form_type: 'S-1', filing_date: '2026-01-05', is_initial: 1, amendment_number: 0,
    revenue_latest: 35000000, revenue_prior: 12000000, revenue_growth: 191.7, net_income: -45000000,
    shares_offered: 8000000, price_range_low: 22, price_range_high: 26,
    deal_size_low: 176000000, deal_size_high: 208000000,
    business_summary: 'QuantumBridge Networks develops quantum-safe cryptographic solutions for enterprise and government clients.',
  },
  {
    cik: '0001234570', form_type: '424B4', filing_date: '2026-02-28', is_initial: 0, amendment_number: 0,
    shares_offered: 8000000, final_price: 24,
    deal_size_high: 192000000,
  },
  {
    cik: '0001234571', form_type: 'S-1', filing_date: '2025-12-01', is_initial: 1, amendment_number: 0,
    revenue_latest: 520000000, revenue_prior: 380000000, revenue_growth: 36.8, net_income: -15000000,
    shares_offered: 25000000, price_range_low: 16, price_range_high: 19,
    deal_size_low: 400000000, deal_size_high: 475000000,
    business_summary: 'FreshDirect Foods operates a nationwide farm-to-table food delivery platform serving over 5 million customers.',
  },
];

const insertFiling = db.prepare(`
  INSERT OR IGNORE INTO filings (
    company_id, accession_number, form_type, filing_date, is_initial, amendment_number,
    revenue_latest, revenue_prior, revenue_growth, net_income,
    shares_offered, price_range_low, price_range_high, final_price,
    deal_size_low, deal_size_high, change_summary,
    business_summary, risk_factors_summary, use_of_proceeds
  ) VALUES (
    @company_id, @accession_number, @form_type, @filing_date, @is_initial, @amendment_number,
    @revenue_latest, @revenue_prior, @revenue_growth, @net_income,
    @shares_offered, @price_range_low, @price_range_high, @final_price,
    @deal_size_low, @deal_size_high, @change_summary,
    @business_summary, @risk_factors_summary, @use_of_proceeds
  )
`);

let filingCount = 0;
for (const f of filings) {
  const company = getCompanyId.get(f.cik);
  if (!company) continue;
  const accession = `${f.cik.replace(/^0+/, '')}-${f.filing_date.replace(/-/g, '')}-${f.form_type.replace(/\//g, '')}`;
  insertFiling.run({
    company_id: company.id,
    accession_number: accession,
    form_type: f.form_type,
    filing_date: f.filing_date,
    is_initial: f.is_initial || 0,
    amendment_number: f.amendment_number || 0,
    revenue_latest: f.revenue_latest || null,
    revenue_prior: f.revenue_prior || null,
    revenue_growth: f.revenue_growth || null,
    net_income: f.net_income || null,
    shares_offered: f.shares_offered || null,
    price_range_low: f.price_range_low || null,
    price_range_high: f.price_range_high || null,
    final_price: f.final_price || null,
    deal_size_low: f.deal_size_low || null,
    deal_size_high: f.deal_size_high || null,
    change_summary: f.change_summary || null,
    business_summary: f.business_summary || null,
    risk_factors_summary: f.risk_factors_summary || null,
    use_of_proceeds: f.use_of_proceeds || null,
  });
  filingCount++;
}
console.log(`  ✅ ${filingCount} filings inserted`);

// Sample timeline events
const timelineEvents = [
  { cik: '0001234567', event_type: 'initial_filing', event_date: '2026-02-01', description: 'NovaTech AI filed S-1 registration statement' },
  { cik: '0001234567', event_type: 'amendment', event_date: '2026-02-20', description: 'S-1/A amendment filed — price range increased to $20-$24' },
  { cik: '0001234568', event_type: 'initial_filing', event_date: '2026-02-15', description: 'GreenGrid Energy filed S-1 registration statement' },
  { cik: '0001234569', event_type: 'initial_filing', event_date: '2026-01-15', description: 'MedVault Health filed S-1 registration statement' },
  { cik: '0001234569', event_type: 'amendment', event_date: '2026-02-10', description: 'S-1/A amendment — price range increased' },
  { cik: '0001234569', event_type: 'roadshow_start', event_date: '2026-02-25', description: 'MedVault Health began investor roadshow' },
  { cik: '0001234570', event_type: 'initial_filing', event_date: '2026-01-05', description: 'QuantumBridge Networks filed S-1' },
  { cik: '0001234570', event_type: 'pricing', event_date: '2026-02-28', description: 'IPO priced at $24 per share' },
  { cik: '0001234571', event_type: 'initial_filing', event_date: '2025-12-01', description: 'FreshDirect Foods filed S-1' },
  { cik: '0001234571', event_type: 'pricing', event_date: '2026-01-10', description: 'IPO priced at $18 per share' },
  { cik: '0001234571', event_type: 'listing', event_date: '2026-01-12', description: 'FreshDirect Foods began trading on NYSE' },
];

const insertTimeline = db.prepare(`
  INSERT OR IGNORE INTO timeline_events (company_id, event_type, event_date, description)
  VALUES (@company_id, @event_type, @event_date, @description)
`);

let timelineCount = 0;
for (const te of timelineEvents) {
  const company = getCompanyId.get(te.cik);
  if (!company) continue;
  insertTimeline.run({ company_id: company.id, ...te });
  timelineCount++;
}
console.log(`  ✅ ${timelineCount} timeline events inserted`);

// Sample alerts
const alerts = [
  { cik: '0001234567', alert_type: 'new_filing', title: 'NovaTech AI — S-1 Filed', message: '🚀 NEW IPO: NovaTech AI has filed an S-1 registration statement.', severity: 'high' },
  { cik: '0001234567', alert_type: 'amendment', title: 'NovaTech AI — S-1/A Amendment', message: '📝 AMENDMENT: Price range increased from $18-$22 to $20-$24.', severity: 'medium' },
  { cik: '0001234567', alert_type: 'deal_size_change', title: 'NovaTech AI — Pricing Update', message: '📈 INCREASED: Price range changed; deal size up 9.1%.', severity: 'high' },
  { cik: '0001234568', alert_type: 'new_filing', title: 'GreenGrid Energy — S-1 Filed', message: '🚀 NEW IPO: GreenGrid Energy has filed an S-1 registration statement.', severity: 'high' },
  { cik: '0001234569', alert_type: 'new_filing', title: 'MedVault Health — S-1 Filed', message: '🚀 NEW IPO: MedVault Health Technologies has filed an S-1.', severity: 'high' },
  { cik: '0001234569', alert_type: 'roadshow', title: 'MedVault Health — Roadshow Started', message: '🎯 MedVault Health Technologies has begun its investor roadshow.', severity: 'medium' },
  { cik: '0001234570', alert_type: 'pricing_update', title: 'QuantumBridge — IPO Priced', message: '💰 IPO PRICED: QuantumBridge Networks priced at $24 per share.', severity: 'high' },
];

const insertAlert = db.prepare(`
  INSERT INTO alerts (company_id, alert_type, title, message, severity)
  VALUES (@company_id, @alert_type, @title, @message, @severity)
`);

let alertCount = 0;
for (const a of alerts) {
  const company = getCompanyId.get(a.cik);
  if (!company) continue;
  insertAlert.run({ company_id: company.id, alert_type: a.alert_type, title: a.title, message: a.message, severity: a.severity });
  alertCount++;
}
console.log(`  ✅ ${alertCount} alerts inserted`);

// Sample insider ownership
const insiders = [
  { cik: '0001234567', insider_name: 'James Chen', title: 'CEO & Co-Founder', shares_before_ipo: 12000000, percent_before_ipo: 28.5, shares_after_ipo: 12000000, percent_after_ipo: 22.1 },
  { cik: '0001234567', insider_name: 'Sarah Rodriguez', title: 'CTO & Co-Founder', shares_before_ipo: 8000000, percent_before_ipo: 19.0, shares_after_ipo: 8000000, percent_after_ipo: 14.7 },
  { cik: '0001234567', insider_name: 'Sequoia Capital', title: 'VC Investor', shares_before_ipo: 10000000, percent_before_ipo: 23.8, shares_after_ipo: 10000000, percent_after_ipo: 18.4 },
  { cik: '0001234569', insider_name: 'Dr. Michael Park', title: 'CEO', shares_before_ipo: 5000000, percent_before_ipo: 18.2, shares_after_ipo: 5000000, percent_after_ipo: 14.1 },
  { cik: '0001234569', insider_name: 'a16z Bio Fund', title: 'VC Investor', shares_before_ipo: 8000000, percent_before_ipo: 29.1, shares_after_ipo: 8000000, percent_after_ipo: 22.5 },
];

const insertInsider = db.prepare(`
  INSERT INTO insider_ownership (company_id, insider_name, title, shares_before_ipo, percent_before_ipo, shares_after_ipo, percent_after_ipo)
  VALUES (@company_id, @insider_name, @title, @shares_before_ipo, @percent_before_ipo, @shares_after_ipo, @percent_after_ipo)
`);

let insiderCount = 0;
for (const ins of insiders) {
  const company = getCompanyId.get(ins.cik);
  if (!company) continue;
  insertInsider.run({ company_id: company.id, ...ins });
  insiderCount++;
}
console.log(`  ✅ ${insiderCount} insider ownership records inserted`);

db.close();
console.log('\n🎉 Database seeded successfully!');
