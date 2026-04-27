const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => res.send('MedSuggest Proxy is running ✅'));

// ── Anthropic Claude proxy ──────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── Gemini proxy (FREE alternative) ────────────────────────────
app.post('/api/gemini', async (req, res) => {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;

    // Debug: log first 8 chars of key so you can verify in Render logs
    console.log('Gemini key loaded:', geminiKey ? geminiKey.slice(0,8)+'...' : 'NOT FOUND ❌');

    if (!geminiKey) {
      return res.status(500).json({ error: { message: 'GEMINI_API_KEY environment variable is not set on Render.' } });
    }

    const { system, userMsg } = req.body;
    const prompt = `${system}\n\n${userMsg}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
      })
    });

    const data = await response.json();
    console.log('Gemini response status:', response.status);

    // If Gemini returned an error, forward it clearly
    if (data.error) {
      console.log('Gemini error:', JSON.stringify(data.error));
      return res.status(400).json({ error: { message: `Gemini API error: ${data.error.message}` } });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Gemini returned empty response');

    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.log('Proxy catch error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
