const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = process.env.SEC_USER_AGENT || 'Mirzayan LLC andre@mirzayanconsulting.com';
const HEADERS = { 'User-Agent': USER_AGENT, 'Accept': 'application/json' };
const DELAY_MS = 600; // SEC polite crawling - slightly longer for S-1 which are large

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search SEC EDGAR EFTS for S-1 and related IPO filings
 * Forms: S-1, S-1/A, F-1, F-1/A, 424B4
 */
async function scrapeIPOFilings(db) {
  console.log('[IPO-EDGAR] Starting S-1/IPO filing scrape...');
  
  const forms = ['S-1', 'S-1/A', 'F-1', 'F-1/A', '424B4'];
  let totalInserted = 0;

  for (const formType of forms) {
    try {
      const inserted = await scrapeFormType(db, formType);
      totalInserted += inserted;
      await sleep(1000); // pause between form types
    } catch (err) {
      console.error(`[IPO-EDGAR] Error scraping ${formType}:`, err.message);
    }
  }

  console.log(`[IPO-EDGAR] Scrape complete. Total new filings: ${totalInserted}`);
  return totalInserted;
}

async function scrapeFormType(db, formType) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back
  const startStr = start.toISOString().split('T')[0];
  const endStr = now.toISOString().split('T')[0];

  let hits = [];
  const PAGE_SIZE = 50;
  const MAX_PAGES = 5;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const url = `https://efts.sec.gov/LATEST/search-index?forms=${encodeURIComponent(formType)}&dateRange=custom&startdt=${startStr}&enddt=${endStr}&from=${from}&size=${PAGE_SIZE}`;
      
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const pageHits = (res.data.hits && res.data.hits.hits) || [];
      const total = (res.data.hits && res.data.hits.total && res.data.hits.total.value) || 0;
      hits = hits.concat(pageHits);
      
      console.log(`[IPO-EDGAR] ${formType} page ${page + 1}: ${pageHits.length} filings (${hits.length}/${total})`);
      if (hits.length >= total || pageHits.length < PAGE_SIZE) break;
      await sleep(400);
    }
  } catch (err) {
    console.error(`[IPO-EDGAR] Search failed for ${formType}:`, err.message);
    // Also try the full-text search API as fallback
    try {
      const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(formType)}%22&forms=${encodeURIComponent(formType)}&dateRange=custom&startdt=${startStr}&enddt=${endStr}&size=50`;
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      hits = (res.data.hits && res.data.hits.hits) || [];
      console.log(`[IPO-EDGAR] Fallback: got ${hits.length} ${formType} filings`);
    } catch (fallbackErr) {
      console.error(`[IPO-EDGAR] Fallback also failed:`, fallbackErr.message);
    }
  }

  if (hits.length === 0) return 0;

  const insertCompany = db.prepare(`
    INSERT INTO companies (cik, company_name, status)
    VALUES (@cik, @company_name, 'filed')
    ON CONFLICT(cik) DO UPDATE SET 
      company_name = COALESCE(@company_name, companies.company_name),
      updated_at = datetime('now')
  `);

  const getCompany = db.prepare('SELECT id FROM companies WHERE cik = ?');

  const insertFiling = db.prepare(`
    INSERT OR IGNORE INTO filings (
      company_id, accession_number, form_type, filing_date, filing_url,
      is_initial, amendment_number
    ) VALUES (
      @company_id, @accession_number, @form_type, @filing_date, @filing_url,
      @is_initial, @amendment_number
    )
  `);

  const insertTimeline = db.prepare(`
    INSERT OR IGNORE INTO timeline_events (company_id, event_type, event_date, description)
    VALUES (@company_id, @event_type, @event_date, @description)
  `);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (company_id, alert_type, title, message, severity)
    VALUES (@company_id, @alert_type, @title, @message, @severity)
  `);

  let inserted = 0;

  for (let i = 0; i < hits.length; i++) {
    const src = hits[i]._source || {};
    const adsh = src.adsh || '';
    const ciks = src.ciks || [];
    const names = src.display_names || [];
    const filingDate = src.file_date || '';
    const form = src.form_type || formType;

    // Extract company name and CIK
    let companyName = '';
    let cik = '';
    for (const n of names) {
      if (n.includes('(CIK')) {
        companyName = n.split('(CIK')[0].trim();
        break;
      }
    }
    if (!companyName && names.length > 0) {
      companyName = names[0].replace(/\(CIK.*\)/, '').trim();
    }
    cik = ciks.length > 0 ? String(ciks[0]).replace(/^0+/, '') : '';

    if (!cik || !companyName) continue;

    // Construct filing URL
    const adshClean = adsh.replace(/-/g, '');
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${adshClean}/`;

    try {
      // Upsert company
      insertCompany.run({ cik, company_name: companyName });
      const company = getCompany.get(cik);
      if (!company) continue;
      const companyId = company.id;

      // Determine if initial or amendment
      const isInitial = form === 'S-1' || form === 'F-1' ? 1 : 0;
      const amendmentNumber = form.includes('/A') ? countAmendments(db, companyId) + 1 : 0;

      // Insert filing
      const result = insertFiling.run({
        company_id: companyId,
        accession_number: adsh,
        form_type: form,
        filing_date: filingDate,
        filing_url: filingUrl,
        is_initial: isInitial,
        amendment_number: amendmentNumber,
      });

      if (result.changes > 0) {
        inserted++;

        // Add timeline event
        const eventType = isInitial ? 'initial_filing' : 
                          form === '424B4' ? 'pricing' : 'amendment';
        insertTimeline.run({
          company_id: companyId,
          event_type: eventType,
          event_date: filingDate,
          description: `${companyName} filed ${form} with SEC`,
        });

        // Generate alert
        const alertType = isInitial ? 'new_filing' : 
                          form === '424B4' ? 'pricing_update' : 'amendment';
        const severity = isInitial ? 'high' : form === '424B4' ? 'high' : 'medium';
        insertAlert.run({
          company_id: companyId,
          alert_type: alertType,
          title: `${companyName} — ${form} Filed`,
          message: isInitial 
            ? `🚀 NEW IPO: ${companyName} has filed an ${form} registration statement with the SEC.`
            : form === '424B4'
            ? `💰 IPO PRICED: ${companyName} has filed pricing details.`
            : `📝 AMENDMENT: ${companyName} filed ${form} amendment #${amendmentNumber}.`,
          severity,
        });

        // Update company status based on form type
        if (form === '424B4') {
          db.prepare('UPDATE companies SET status = ? WHERE id = ?').run('priced', companyId);
        } else if (form.includes('/A')) {
          db.prepare("UPDATE companies SET status = 'amended' WHERE id = ? AND status = 'filed'").run(companyId);
        }

        console.log(`[IPO-EDGAR] ${isInitial ? '🚀 NEW' : '📝'} ${companyName} — ${form} (${filingDate})`);
      }
    } catch (err) {
      console.log(`[IPO-EDGAR] Error processing ${companyName || 'unknown'}: ${err.message}`);
    }
  }

  return inserted;
}

function countAmendments(db, companyId) {
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM filings WHERE company_id = ? AND form_type LIKE '%/A'"
  ).get(companyId);
  return result ? result.count : 0;
}

/**
 * Parse S-1 document for financial data and offering details
 * This is called separately for deeper analysis
 */
async function parseS1Document(db, filingId) {
  const filing = db.prepare('SELECT * FROM filings WHERE id = ?').get(filingId);
  if (!filing || !filing.filing_url) return null;

  console.log(`[S1-PARSER] Parsing filing ${filingId}: ${filing.filing_url}`);

  try {
    await sleep(DELAY_MS);
    // Get the index page to find the actual S-1 document
    const idxRes = await axios.get(filing.filing_url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
    });

    // Find the main HTML document (usually the largest .htm file)
    const $ = cheerio.load(idxRes.data);
    let docUrl = null;
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.endsWith('.htm') || href.endsWith('.html')) && !href.includes('R')) {
        if (!docUrl) docUrl = href;
      }
    });

    if (!docUrl) {
      console.log('[S1-PARSER] No HTML document found in filing');
      return null;
    }

    // Make URL absolute
    if (!docUrl.startsWith('http')) {
      docUrl = new URL(docUrl, filing.filing_url).href;
    }

    await sleep(DELAY_MS);
    const docRes = await axios.get(docUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // S-1s can be huge
    });

    const doc$ = cheerio.load(docRes.data);
    const fullText = doc$.text().replace(/\s+/g, ' ').toLowerCase();

    // Extract financial metrics using pattern matching
    const financials = extractFinancials(fullText);
    const offeringDetails = extractOfferingDetails(fullText);
    const riskSummary = extractRiskFactors(doc$);
    const businessSummary = extractBusinessSummary(doc$);
    const useOfProceeds = extractUseOfProceeds(doc$);

    // Update filing with parsed data
    db.prepare(`
      UPDATE filings SET
        revenue_latest = @revenue_latest,
        revenue_prior = @revenue_prior,
        revenue_growth = @revenue_growth,
        net_income = @net_income,
        shares_offered = @shares_offered,
        price_range_low = @price_range_low,
        price_range_high = @price_range_high,
        deal_size_low = @deal_size_low,
        deal_size_high = @deal_size_high,
        risk_factors_summary = @risk_factors_summary,
        business_summary = @business_summary,
        use_of_proceeds = @use_of_proceeds
      WHERE id = @id
    `).run({
      id: filingId,
      revenue_latest: financials.revenueLatest,
      revenue_prior: financials.revenuePrior,
      revenue_growth: financials.revenueGrowth,
      net_income: financials.netIncome,
      shares_offered: offeringDetails.sharesOffered,
      price_range_low: offeringDetails.priceLow,
      price_range_high: offeringDetails.priceHigh,
      deal_size_low: offeringDetails.dealSizeLow,
      deal_size_high: offeringDetails.dealSizeHigh,
      risk_factors_summary: riskSummary,
      business_summary: businessSummary,
      use_of_proceeds: useOfProceeds,
    });

    console.log(`[S1-PARSER] Parsed: revenue=$${financials.revenueLatest || 'N/A'}, price range=$${offeringDetails.priceLow || '?'}-$${offeringDetails.priceHigh || '?'}`);
    return { financials, offeringDetails };
  } catch (err) {
    console.error(`[S1-PARSER] Error parsing filing ${filingId}:`, err.message);
    return null;
  }
}

function safeParseNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/[,$\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

function extractFinancials(text) {
  const result = {
    revenueLatest: null,
    revenuePrior: null,
    revenueGrowth: null,
    netIncome: null,
  };

  // Revenue patterns — ordered from most to least specific
  const revenuePatterns = [
    /total (?:net )?revenue[s]?\s*(?:was|were|of)?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b\b)/i,
    /total (?:net )?revenue[s]?\s*(?:was|were|of)?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|m\b)/i,
    /(?:net )?revenue[s]?\s*(?:was|were|of|totaled|totalling)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b\b)/i,
    /(?:net )?revenue[s]?\s*(?:was|were|of|totaled|totalling)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|m\b)/i,
    /revenue[s]?\s*(?:increased|decreased|grew)?\s*(?:to|from)?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|m\b)/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:in\s+)?(?:total\s+)?(?:net\s+)?revenue/i,
  ];

  for (const pattern of revenuePatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = safeParseNumber(match[1]);
      if (val !== null && val > 0) {
        const isBillion = /billion|b\b/i.test(match[0]);
        result.revenueLatest = val * (isBillion ? 1e9 : 1e6);
        break;
      }
    }
  }

  // Net income/loss — multiple fallback patterns
  const incomePatterns = [
    /net (?:income|loss)\s*(?:was|were|of|totaled)?\s*\$?\s*\(?([\d,]+(?:\.\d+)?)\)?\s*(?:billion|b\b)/i,
    /net (?:income|loss)\s*(?:was|were|of|totaled)?\s*\$?\s*\(?([\d,]+(?:\.\d+)?)\)?\s*(?:million|m\b)/i,
    /(?:net loss|loss from operations)\s*(?:was|of|totaled)?\s*\$?\s*\(?([\d,]+(?:\.\d+)?)\)?\s*(?:million|m\b)/i,
  ];
  for (const pattern of incomePatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = safeParseNumber(match[1]);
      if (val !== null) {
        const isBillion = /billion|b\b/i.test(match[0]);
        result.netIncome = val * (isBillion ? 1e9 : 1e6);
        // Check for loss indicators: parentheses or "loss" keyword
        if (/\(/.test(match[0]) || /net loss|loss from/i.test(match[0])) {
          result.netIncome = -Math.abs(result.netIncome);
        }
        break;
      }
    }
  }

  // Calculate growth if we have both
  if (result.revenueLatest && result.revenuePrior && result.revenuePrior > 0) {
    result.revenueGrowth = ((result.revenueLatest - result.revenuePrior) / result.revenuePrior * 100);
  }

  return result;
}

function extractOfferingDetails(text) {
  const result = {
    sharesOffered: null,
    priceLow: null,
    priceHigh: null,
    dealSizeLow: null,
    dealSizeHigh: null,
  };

  // Price range patterns — multiple fallbacks
  const pricePatterns = [
    /\$\s*([\d]+(?:\.\d{1,2})?)\s*(?:to|and)\s*\$\s*([\d]+(?:\.\d{1,2})?)\s*per\s*share/i,
    /price\s*(?:range|between)\s*(?:of\s*)?\$\s*([\d]+(?:\.\d{1,2})?)\s*(?:to|and|-)\s*\$\s*([\d]+(?:\.\d{1,2})?)/i,
    /between\s*\$\s*([\d]+(?:\.\d{1,2})?)\s*and\s*\$\s*([\d]+(?:\.\d{1,2})?)\s*per\s*share/i,
    /initial\s*public\s*offering\s*price\s*(?:of\s*)?\$\s*([\d]+(?:\.\d{1,2})?)\s*per\s*share/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      const low = safeParseNumber(match[1]);
      const high = match[2] ? safeParseNumber(match[2]) : low;
      // Validate: prices should be reasonable ($0.01 - $10,000)
      if (low !== null && low > 0 && low < 10000 && high !== null && high > 0 && high < 10000) {
        // Ensure low <= high
        result.priceLow = Math.min(low, high);
        result.priceHigh = Math.max(low, high);
        break;
      }
    }
  }

  // Shares offered patterns — multiple fallbacks
  const sharesPatterns = [
    /(?:offering|sell(?:ing)?)\s*([\d,]+)\s*shares\s*(?:of\s*(?:its\s*)?(?:common|class\s*a)\s*stock)/i,
    /([\d,]+)\s*shares\s*(?:of\s*(?:its\s*)?(?:common|class\s*a)\s*stock)\s*(?:are|is)\s*(?:being\s*)?offer/i,
    /(?:we\s*are\s*offering|this\s*offering\s*(?:of|consists))\s*([\d,]+)\s*shares/i,
    /([\d,]+)\s*shares\s*(?:of\s*(?:common|class\s*a)\s*stock)?/i,
  ];

  for (const pattern of sharesPatterns) {
    const match = text.match(pattern);
    if (match) {
      const shares = parseInt(match[1].replace(/,/g, ''), 10);
      // Validate: share count should be reasonable (at least 100, less than 10B)
      if (!isNaN(shares) && shares >= 100 && shares < 10000000000) {
        result.sharesOffered = shares;
        break;
      }
    }
  }

  // Calculate deal size with validation
  if (result.sharesOffered && result.priceLow && result.priceLow > 0) {
    result.dealSizeLow = result.sharesOffered * result.priceLow;
  }
  if (result.sharesOffered && result.priceHigh && result.priceHigh > 0) {
    result.dealSizeHigh = result.sharesOffered * result.priceHigh;
  }

  return result;
}

function extractSection(doc$, headingPatterns, minLength, maxLength) {
  let result = '';
  
  // Strategy 1: Look for heading elements (h1-h4, b, strong) then grab next sibling text
  const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'b', 'strong', 'p'];
  for (const selector of headingSelectors) {
    if (result) break;
    doc$(selector).each((i, el) => {
      if (result) return false;
      const headText = doc$(el).text().trim().toLowerCase();
      for (const pattern of headingPatterns) {
        if (pattern instanceof RegExp ? pattern.test(headText) : headText.startsWith(pattern)) {
          // Get text from parent or next siblings
          const parentText = doc$(el).parent().text().trim();
          if (parentText.length > minLength) {
            result = parentText.substring(0, maxLength).trim();
            return false;
          }
          // Try next element
          const nextText = doc$(el).next().text().trim();
          if (nextText.length > minLength) {
            result = nextText.substring(0, maxLength).trim();
            return false;
          }
        }
      }
    });
  }

  // Strategy 2: Fallback — scan all elements
  if (!result) {
    doc$('*').each((i, el) => {
      if (result) return false;
      const text = doc$(el).text().trim();
      const lower = text.toLowerCase();
      for (const pattern of headingPatterns) {
        if ((pattern instanceof RegExp ? pattern.test(lower) : lower.startsWith(pattern)) && text.length > minLength) {
          result = text.substring(0, maxLength).trim();
          return false;
        }
      }
    });
  }

  return result || null;
}

function extractRiskFactors(doc$) {
  return extractSection(doc$, [
    'risk factors',
    /^risks?\s+factors?/,
    'risks related to',
  ], 50, 800);
}

function extractBusinessSummary(doc$) {
  return extractSection(doc$, [
    'our business',
    'company overview',
    'overview',
    'business overview',
    /^about\s+(?:us|the\s+company)/,
    'prospectus summary',
  ], 100, 600);
}

function extractUseOfProceeds(doc$) {
  return extractSection(doc$, [
    'use of proceeds',
    /^uses?\s+of\s+proceeds/,
  ], 50, 500);
}

/**
 * Detect pricing changes between amendments
 */
function detectAmendmentChanges(db, companyId) {
  const filings = db.prepare(`
    SELECT * FROM filings WHERE company_id = ? ORDER BY filing_date ASC
  `).all(companyId);

  if (filings.length < 2) return null;

  const latest = filings[filings.length - 1];
  const previous = filings[filings.length - 2];

  const changes = [];

  // Price range changes
  if (latest.price_range_low && previous.price_range_low) {
    if (latest.price_range_low !== previous.price_range_low || latest.price_range_high !== previous.price_range_high) {
      const direction = latest.price_range_high > previous.price_range_high ? '📈 INCREASED' : '📉 DECREASED';
      changes.push(`${direction}: Price range changed from $${previous.price_range_low}-$${previous.price_range_high} to $${latest.price_range_low}-$${latest.price_range_high}`);
    }
  }

  // Shares offered changes
  if (latest.shares_offered && previous.shares_offered && latest.shares_offered !== previous.shares_offered) {
    const direction = latest.shares_offered > previous.shares_offered ? 'increased' : 'decreased';
    changes.push(`Shares offered ${direction} from ${previous.shares_offered.toLocaleString()} to ${latest.shares_offered.toLocaleString()}`);
  }

  // Deal size changes
  if (latest.deal_size_high && previous.deal_size_high && latest.deal_size_high !== previous.deal_size_high) {
    const pctChange = ((latest.deal_size_high - previous.deal_size_high) / previous.deal_size_high * 100).toFixed(1);
    changes.push(`Deal size changed by ${pctChange > 0 ? '+' : ''}${pctChange}%`);
  }

  if (changes.length > 0) {
    const summary = changes.join('; ');
    db.prepare('UPDATE filings SET change_summary = ? WHERE id = ?').run(summary, latest.id);

    // Create high-severity alert for pricing changes (parameterized)
    db.prepare(`
      INSERT INTO alerts (company_id, alert_type, title, message, severity)
      VALUES (@company_id, @alert_type, @title, @message, @severity)
    `).run({
      company_id: companyId,
      alert_type: 'deal_size_change',
      title: `Pricing Update: ${latest.form_type}`,
      message: summary,
      severity: 'high',
    });
  }

  return changes;
}

module.exports = { scrapeIPOFilings, parseS1Document, detectAmendmentChanges };
