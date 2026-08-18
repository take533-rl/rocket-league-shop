const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// نظام التخزين المؤقت لحماية الكوتا اليومية
let cachedData = null;
let lastFetchTime = null;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة

app.get('/api/shop', async (req, res) => {
  const now = Date.now();

  if (cachedData && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json({ categories: cachedData });
  }

  try {
    const response = await axios.get('https://rocket-league10.p.rapidapi.com/shop', {
      headers: {
        'x-rapidapi-host': 'rocket-league10.p.rapidapi.com',
        'x-rapidapi-key': 'ضع_مفتاح_API_الجديد_هنا'
      },
      timeout: 10000
    });

    const data = response.data || {};
    const categorizedShop = {};

    Object.keys(data).forEach(sectionKey => {
      if (Array.isArray(data[sectionKey]) && data[sectionKey].length > 0) {
        const formattedTitle = sectionKey.replace(/_/g, ' ');

        categorizedShop[formattedTitle] = data[sectionKey].map(item => ({
          name: item.name || item.title || 'Unknown Item',
          category: item.type || item.category || 'Item',
          price: item.price || item.credits || 0,
          image: item.image || item.icon || ''
        }));
      }
    });

    cachedData = categorizedShop;
    lastFetchTime = now;

    res.json({ categories: categorizedShop });
  } catch (error) {
    console.error('API Error Details:', error.response?.data || error.message);
    
    if (cachedData) {
      return res.json({ categories: cachedData });
    }

    res.status(500).json({ error: 'تعذر جلب البيانات من API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});