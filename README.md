# Reddit Watchful Eye

A fully functional Reddit monitoring application that tracks keywords across Reddit posts and comments, alerting you when your keywords are mentioned.

## Features

- 🔍 **Keyword Monitoring**: Track exact phrases or regex patterns across Reddit
- 📊 **Dashboard**: View match statistics, trends, and top subreddits
- 🎯 **Sources Management**: Monitor specific subreddits or all of Reddit
- 🔔 **Alerts**: Email notifications for keyword matches (coming soon: Slack, webhooks)
- 💳 **Subscription Tiers**: Free, Basic, and Pro plans with different limits
- 📈 **Match History**: View and manage all your keyword matches
- ⚡ **Real-time Scanning**: Manual and scheduled scans

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Database + Edge Functions)
- **Authentication**: Supabase Auth
- **Reddit API**: Public Reddit JSON API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd reddit-watchful-eye
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run all migrations in `supabase/migrations/`
   - Get your project URL and API keys from Settings > API

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```

5. **Deploy Supabase Edge Functions**
   ```bash
   # Install Supabase CLI if you haven't
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Deploy functions
   supabase functions deploy scan-reddit
   supabase functions deploy scheduled-scan
   ```

6. **Set environment variables for Edge Functions**
   - Go to Supabase Dashboard > Edge Functions > scan-reddit > Settings
   - Add environment variables:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)
     - `CRON_SECRET`: A random string for securing scheduled scans

7. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

## Setting Up Scheduled Scans

To enable automatic scanning, you have several options:

### Option 1: External Cron Service (Easiest)

1. Sign up for a free cron service like [cron-job.org](https://cron-job.org)
2. Create a new cron job that calls:
   ```
   POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scan
   Headers:
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
   Body:
     { "cron_secret": "YOUR_CRON_SECRET" }
   ```
3. Set it to run hourly or as desired

### Option 2: GitHub Actions (Free)

Create `.github/workflows/scheduled-scan.yml`:
```yaml
name: Scheduled Reddit Scan
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scan
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"cron_secret": "${{ secrets.CRON_SECRET }}"}' \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scan
```

### Option 3: Supabase pg_cron (Requires Enterprise)

If you have pg_cron enabled, you can use the SQL in `supabase/migrations/20250104000001_scheduled_scans.sql`

## Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions
│   └── integrations/     # Supabase client setup
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── scan-reddit/      # Manual scan endpoint
│   │   └── scheduled-scan/   # Scheduled scan endpoint
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## Features by Plan

### Free Tier
- 1 keyword
- 2 manual scans per day
- Email alerts
- All of Reddit or specific subreddits

### Basic Tier ($9.99/mo)
- 5 keywords
- Unlimited scans
- Email alerts
- All of Reddit or specific subreddits

### Pro Tier ($19.99/mo) - Coming Soon
- 15 keywords
- Unlimited scans
- Email alerts
- Slack integration
- Webhook integration
- Reddit + X (Twitter) monitoring

## Development

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Testing Edge Functions Locally

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve scan-reddit
```

## API Endpoints

### `POST /functions/v1/scan-reddit`
Manually trigger a scan for the authenticated user.

**Headers:**
- `Authorization: Bearer <user_token>`

**Body:**
```json
{
  "sourceId": "optional-source-id"
}
```

**Response:**
```json
{
  "message": "Scan completed successfully",
  "matches": 5,
  "newMatches": 3
}
```

### `POST /functions/v1/scheduled-scan`
Scheduled scan endpoint (requires cron secret).

**Headers:**
- `Authorization: Bearer <service_role_key>`

**Body:**
```json
{
  "cron_secret": "your_cron_secret"
}
```

## Troubleshooting

### Edge Functions not working
- Ensure you've deployed the functions: `supabase functions deploy scan-reddit`
- Check that environment variables are set in Supabase Dashboard
- Verify your service role key is correct

### No matches found
- Check that you have keywords and sources configured
- Verify keywords are spelled correctly
- Try a common keyword to test (e.g., "hello")
- Check Reddit API rate limits (60 requests/minute)

### Authentication issues
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set correctly
- Clear browser cache and localStorage
- Check Supabase project is active

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
