const express = require('express');
const axios = require('axios');
const app = express();

// تفعيل قراءة الملفات من مجلد public
app.use(express.static('public'));

// متغيرات لتخزين البيانات مؤقتاً في ذاكرة السيرفر
let cachedShopData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة

app.get('/api/shop', async (req, res) => {
    const currentTime = Date.now();

    // جلب بيانات جديدة إذا مر 12 ساعة أو إذا كانت الذاكرة فارغة
    if (!cachedShopData || (currentTime - lastFetchTime > CACHE_DURATION)) {
        try {
            console.log('Fetching new data from RapidAPI...');
            
            // تم تعديل المسار إلى /shop
            const response = await axios.get('https://rocket-league10.p.rapidapi.com/shop', {
                headers: {
                    'X-RapidAPI-Key': '43ec690dcbmsh855b9f2db21831cp12ccadjsn9c536080565c',
                    'X-RapidAPI-Host': 'rocket-league10.p.rapidapi.com'
                }
            });

            cachedShopData = response.data;
            lastFetchTime = currentTime;
        } catch (error) {
            console.error('API Error Details:', error.response ? error.response.data : error.message);
            
            if (cachedShopData) {
                return res.json(cachedShopData);
            }
            return res.status(500).json({ message: 'تعذر تحميل المتجر حالياً.' });
        }
    } else {
        console.log('Serving data from cache.');
    }

    res.json(cachedShopData);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
