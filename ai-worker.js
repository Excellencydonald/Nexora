/**
 * NEXORA AI Proxy – Cloudflare Worker
 * ------------------------------------
 * Free tier friendly. Proxies requests to Groq (free) so the API key
 * never appears in the frontend.
 *
 * SETUP STEPS (≈ 5-10 minutes):
 *
 * 1. Create a free account at https://console.groq.com
 *    → Create an API key
 *
 * 2. Create a free account at https://dash.cloudflare.com
 *    → Workers & Pages → Create Worker
 *
 * 3. Paste this entire file into the Worker editor
 *
 * 4. Go to Settings → Variables → Add secret:
 *      Name:  GROQ_API_KEY
 *      Value: (your Groq key)
 *
 * 5. (Optional) Add another secret:
 *      Name:  NEXORA_SECRET
 *      Value: any random string you choose
 *
 * 6. Deploy the Worker and copy the URL
 *    (looks like https://nexora-ai.yourname.workers.dev)
 *
 * 7. Open js/ai.js in the NEXORA project and set:
 *      const REAL_AI_ENDPOINT = 'https://your-worker-url.workers.dev';
 *      const AI_SECRET = 'the-same-secret-you-set'; // or leave empty
 *
 * 8. Reload the app. NEXORA AI will now use a real model.
 */

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Optional simple secret check
    if (env.NEXORA_SECRET) {
      const incoming = request.headers.get('X-Nexora-Secret');
      if (incoming !== env.NEXORA_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY not configured on the Worker' }, 500);
    }

    try {
      const body = await request.json();
      const userMessage = body.message || '';
      const history = Array.isArray(body.history) ? body.history : [];

      if (!userMessage.trim()) {
        return json({ error: 'Empty message' }, 400);
      }

      // Build messages for the model
      const messages = [
        {
          role: 'system',
          content: `You are NEXORA AI, a helpful, friendly and concise assistant inside the NEXORA messaging app.
You help users with writing messages, captions, emails, studying, brainstorming ideas, summaries, light translation and productivity tasks.
Keep answers clear and useful. Use markdown sparingly (bold, lists). Be warm but professional.`
        },
        ...history.slice(-10),
        { role: 'user', content: userMessage }
      ];

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',   // fast & free-tier friendly
          messages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('Groq error:', errText);
        return json({ error: 'Upstream AI error', detail: errText }, 502);
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';

      return json({ reply });
    } catch (err) {
      console.error(err);
      return json({ error: 'Server error', detail: err.message }, 500);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Nexora-Secret',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}
