# 🚀 IPO Pipeline

**Professional IPO tracking app** — Early S-1 filing detection, amendment tracking, and investor-grade insights before companies go public.

## Architecture

```
ipo-pipeline/
├── backend/                  # Node.js + SQLite API
│   ├── server.js             # Express server with cron jobs
│   ├── db/
│   │   ├── schema.js         # Database schema (companies, filings, alerts, etc.)
│   │   └── seed.js           # Sample data seeder
│   ├── routes/
│   │   ├── auth.js           # Registration, login, JWT auth
│   │   ├── ipos.js           # IPO list, detail, pipeline, stats
│   │   ├── alerts.js         # Alert feed and management
│   │   └── watchlist.js      # User watchlist (auth required)
│   ├── scrapers/
│   │   └── edgar-ipo.js      # SEC EDGAR S-1/F-1/424B4 scraper + S-1 parser
│   └── middleware/
│       └── auth.js           # JWT middleware
├── app/                      # React Native (Expo) mobile app
│   ├── (tabs)/
│   │   ├── index.js          # Pipeline view — IPO list with filters
│   │   ├── alerts.js         # Alert feed with severity indicators
│   │   ├── watchlist.js      # Personal watchlist
│   │   ├── ipo-detail.js     # Full IPO detail (filings, timeline, insiders)
│   │   ├── settings.js       # Account, notifications, about
│   │   └── login.js          # Auth screen
│   └── _layout.js            # Root layout
├── constants/theme.js        # Dark blue/purple theme
├── services/
│   ├── api.js                # API client
│   └── auth.js               # Auth service (AsyncStorage)
└── render.yaml               # Render deployment config
```

## Data Flow

```
SEC EDGAR → Scraper (hourly) → SQLite DB → REST API → Mobile App
                                   ↓
                            Alert Generation
                                   ↓
                          Push Notifications
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server health + DB counts |
| `/api/ipos` | GET | List IPOs (filter by status, sector) |
| `/api/ipos/pipeline` | GET | Pipeline view (grouped by status) |
| `/api/ipos/stats` | GET | Dashboard statistics |
| `/api/ipos/:id` | GET | Full IPO detail |
| `/api/ipos/:id/filings` | GET | All filings for company |
| `/api/ipos/:id/timeline` | GET | Timeline events |
| `/api/alerts` | GET | Alert feed |
| `/api/alerts/:id/read` | PUT | Mark alert read |
| `/api/alerts/read-all` | PUT | Mark all read |
| `/api/watchlist` | GET | User watchlist (auth) |
| `/api/watchlist` | POST | Add to watchlist (auth) |
| `/api/watchlist/:id` | DELETE | Remove from watchlist (auth) |
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Current user |

## SEC Filing Types Tracked

| Form | Description |
|---|---|
| **S-1** | Initial registration statement (domestic) |
| **S-1/A** | Amendment to S-1 (pricing/terms changes) |
| **F-1** | Initial registration (foreign private issuer) |
| **F-1/A** | Amendment to F-1 |
| **424B4** | Final prospectus (IPO priced) |

## Database Schema

- **companies** — 279 tracked (and growing)
- **filings** — S-1, amendments, 424B4 with parsed financials
- **insider_ownership** — Pre/post-IPO ownership percentages
- **timeline_events** — Filing → roadshow → pricing → listing
- **alerts** — New filing, amendment, pricing, deal size changes
- **users** — Auth with JWT, free/premium plans
- **watchlist** — Per-user IPO tracking

## Quick Start

```bash
# Backend
cd backend
npm install
node db/seed.js      # Optional: seed sample data
node server.js       # Starts on port 3002

# Mobile app
npm install
npx expo start
```

## Deployment (Render)

1. Push to GitHub
2. Connect repo in Render
3. Use `render.yaml` for automatic setup
4. Add persistent disk for SQLite

## Pricing

- **Free**: Browse IPO pipeline, view filings, basic alerts
- **Premium ($14.99/mo)**: Deep S-1 analysis, unlimited alerts, watchlist, advanced filtering, 7-day trial

## Built by Mirzayan LLC

Reuses proven architecture from The Inside Track. Same infrastructure, new high-value market.
