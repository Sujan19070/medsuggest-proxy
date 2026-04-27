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

// ── Gemini proxy... pore grock dilam ekhon(FREE alternative) ────────────────────────────
app.post('/api/gemini', async (req, res) => {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: { message: 'GROQ_API_KEY not set.' } });

    const { system, userMsg } = req.body;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',   // free & fast
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: { message: data.error.message } });

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
