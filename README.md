# Civic Pulse

A platform that helps Korean local election candidates track district issues and produce campaign content. It crawls real regional news, uses AI to surface what matters, and turns those issues into speeches, social posts, pledges, and strategies.

**Live:** https://civic-pulse-smoky.vercel.app

## The Problem

Running for local office in South Korea (전국동시지방선거) is expensive. Candidates need to know what their district cares about, then turn that knowledge into professional speeches, social media presence, policy platforms, and campaign strategy. Most small-scale candidates don't have the staff or budget to do this well.

## How It Works

```
Regional News  →  AI Analysis  →  Issue Dashboard  →  Content Generation  →  Workspace
(Google News)     (Gemini)         (per district)      (speech/SNS/pledge)    (edit/export)
```

1. **News crawling** fetches real articles for each candidate's region using multiple civic-specific search queries (정책, 교통, 교육, 개발, etc.)
2. **Gemini 2.5 Flash** reads the articles and extracts the top issues — categorized by urgency, trend, and topic
3. **Dashboard** displays these issues with filtering, search, and pagination. Each candidate only sees their district.
4. **Content generators** let candidates create campaign materials directly from any issue — or from scratch
5. **Workspace** stores everything with structured editing, PDF/DOCX export, and a teleprompter mode for speeches

## Features

### Issue Tracking
- Real-time news crawling via Google News RSS (6 parallel queries per region)
- AI-powered analysis: urgency, trend, sentiment, category classification across 10 domains
- Auto-crawl on first visit for new regions; daily cron job refreshes all active regions
- Throttled to prevent unnecessary API spend (6-hour cooldown, 5 districts/cron run)

### Content Generation
- **Speech Writer** — configurable occasion, tone, length, data density
- **SNS Generator** — platform-aware posts (Instagram, Facebook, X, KakaoStory, Naver Blog) with hashtags and image suggestions
- **Pledge Generator** — structured policy pledges with timeline, budget, outcomes; pulls legislative context from CLIK (의회회의록) API
- **Campaign Strategy** — voter group analysis, messaging angles, action plans, social media strategy, risk assessment

### Workspace (보관함)
- All generated content in one place, grouped by date
- Structured editing per content type (form fields, not raw text)
- PDF and DOCX export
- Teleprompter mode for speech delivery
- Grid/list views, filtering, search

### Admin Panel
- Tabbed layout: dashboard stats + user management
- Usage monitoring: generations by type, weekly trends, top active users, recent activity
- User detail with profile editing and full activity history

### Other
- Fully bilingual (Korean / English) with URL-based locale routing
- Candidate profiles with onboarding wizard, region/party/tone preferences, policy positions
- Supabase Auth with demo accounts for testing
- Vercel CI/CD with separate production and preview environments

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Database** | Supabase (PostgreSQL + Auth) |
| **AI** | Google Gemini 2.5 Flash |
| **Styling** | Tailwind CSS v4 |
| **i18n** | next-intl |
| **Export** | jspdf, docx |
| **Deployment** | Vercel |

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- A Google AI API key (Gemini)

### Setup

```bash
git clone https://github.com/syang0624/civic-pulse.git
cd civic-pulse
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_AI_API_KEY=your_gemini_key
ADMIN_EMAILS=admin@civicpulse.kr
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Open http://localhost:3000. Use the demo accounts on the login page to explore, or create a new account.

### Deployment

The project deploys to Vercel with automatic builds on push:
- `main` branch deploys to production
- `dev` branch deploys to preview

Environment variables are configured per environment in the Vercel dashboard.

## Project Structure

```
src/
  app/
    [locale]/          # Pages (dashboard, generate/*, workspace, admin, profile)
    api/               # 20 API routes (issues, generate, admin, auth, cron, export)
  backend/
    lib/               # Supabase clients, AI client, auth, news fetcher
    services/          # Issue crawler, council minutes integration
    validators/        # Zod schemas
  frontend/
    components/        # React components by domain
    lib/               # Utilities
  shared/
    constants/         # Election districts, category mappings
    types/             # TypeScript types
  i18n/                # Routing, navigation
messages/
  ko.json              # Korean translations
  en.json              # English translations
```

## License

ISC
