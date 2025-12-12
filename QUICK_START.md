# Quick Start - Cloudron MCP Testing

## TL;DR (3 Steps)

### Step 1: Get API Token
1. Go to your Cloudron Admin Panel
2. Click **Admin → API Tokens**
3. Click **Create API Token**
4. Name it `MCP Testing`, enable read/write, click Create
5. Copy the token

### Step 2: Set Environment
```bash
export CLOUDRON_BASE_URL="https://your-cloudron-instance.com"
export CLOUDRON_API_TOKEN="your-api-token-here"
```

### Step 3: Run Tests
```bash
cd /home/blackthorne/Work/cloudron
npm run dev src/test-integration.ts
```

## What to Expect

If everything works:
- ✅ Connection Validation passes (proves your token works)
- ✅ Get System Status shows version and uptime
- ✅ List Applications shows your installed apps
- ✅ Restart Application test runs safely

## If Something Goes Wrong

1. **Token invalid** → Generate new token, try again
2. **URL incorrect** → Verify URL matches your instance
3. **Network error** → Check internet connection, firewall
4. **Timeout** → Your instance is slow, increase timeout and retry

## For Detailed Help

See: `TESTING.md` - Full guide with troubleshooting

## For Complete Info

See: `PHASE_2_3_SUMMARY.md` - Technical report

---

**Time to first test**: 5 minutes
