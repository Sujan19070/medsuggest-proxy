const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // allow all origins
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => res.send('MedSuggest Proxy is running ✅'));

// Proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // set in Render dashboard
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
