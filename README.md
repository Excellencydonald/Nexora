# NEXORA AI – Real Model Setup (Free)

This folder contains everything you need to connect a **real** AI model to NEXORA while staying on the free tier.

## Recommended free stack
- **Groq** → free API key, very fast models
- **Cloudflare Workers** → free tier (100k requests/day)

## Quick Start (≈ 10 minutes)

### 1. Get a free Groq key
1. Go to https://console.groq.com and create an account
2. Create an API key and copy it

### 2. Create the Worker
1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
2. Name it something like `nexora-ai`
3. Paste the contents of `ai-worker.js` into the editor
4. Click **Save and Deploy**

### 3. Add the secret
1. In the Worker → Settings → Variables
2. Add an encrypted secret:
   - Name: `GROQ_API_KEY`
   - Value: your Groq API key
3. (Optional but recommended) Add another secret:
   - Name: `NEXORA_SECRET`
   - Value: any random string (example: `nexora_super_secret_7f3a`)

### 4. Connect the app
1. Open `js/ai.js`
2. Find these two lines near the top:

```js
const REAL_AI_ENDPOINT = '';
const AI_SECRET = '';
```

3. Change them to:

```js
const REAL_AI_ENDPOINT = 'https://nexora-ai.your-subdomain.workers.dev';
const AI_SECRET = 'nexora_super_secret_7f3a';  // same value you set in the Worker
```

4. Save and reload the app.

The status under NEXORA AI should change to **Online • Real AI**.

## Notes
- The free Groq tier is generous for personal / demo use.
- Never put the Groq key in the frontend.
- The Worker keeps the key safe on the server side.
- If the Worker is down or the key is missing, the app automatically falls back to the local demo mode.

## Alternative: Cloudflare Workers AI
You can also use Cloudflare’s own Workers AI (10,000 Neurons/day free).  
The same Worker structure works — just change the upstream fetch URL and model name.
