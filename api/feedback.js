export default async function handler(req, res) {
  // CORS headers so the HTML app can call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, attempt, context } = req.body;

  if (!target || !attempt) {
    return res.status(400).json({ error: 'Missing target or attempt' });
  }

  const apiKey = process.env['french-app'];
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = `You are a concise French language coach helping an American retiree (Jack, 68) who is learning conversational French to live in Menton, France. 

Your job: compare what he TRIED to say vs what he SHOULD have said, and give short, practical feedback.

Rules:
- Keep responses under 60 words total
- Lead with what was RIGHT if anything was correct
- Correct errors directly — no lengthy explanations
- Focus on what matters for real conversation
- Use this format:
  ✓ [what was right, if anything]
  → Correct: [the right phrase]
  💡 [one practical tip if needed]

If the attempt is perfect, just say: "Perfect! 🎉"`;

  const userMessage = `Target phrase: "${target}"
User's attempt: "${attempt}"${context ? `\nContext: ${context}` : ''}

Give feedback on pronunciation accuracy and correctness.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const feedback = data.content?.[0]?.text || 'No feedback returned.';

    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
