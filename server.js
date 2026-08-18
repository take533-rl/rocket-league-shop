const express = require('express');
const axios = require('axios');
const app = express();

// متغيرات لتخزين البيانات مؤقتاً في ذاكرة السيرفر
let cachedShopData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة بالمللي ثانية

// مسار لجلب البيانات للموقع (يتوافق مع fetch('/api/shop') في index.html)
app.get('/api/shop', async (req, res) => {
    const currentTime = Date.now();

    // التحقق مما إذا مر 12 ساعة أم لا، أو إذا كانت البيانات غير موجودة أساساً
    if (!cachedShopData || (currentTime - lastFetchTime > CACHE_DURATION)) {
        try {
            console.log('Fetching new data from RapidAPI...');
            
            // استبدل الرابط أدناه برابط الـ API الصحيح من RapidAPI
            const response = await axios.get('https://rocket-league10.p.rapidapi.com/...', {
                headers: {
                    'X-RapidAPI-Key': 'ضع_مفتاحك_هنا',
                    'X-RapidAPI-Host': 'rocket-league10.p.rapidapi.com'
                }
            });

            // تحديث البيانات المخزنة ووقت الجلب
            cachedShopData = response.data;
            lastFetchTime = currentTime;
        } catch (error) {
            console.error('API Error Details:', error.response ? error.response.data : error.message);
            
            // إذا فشل الاتصال وكان لدينا بيانات قديمة مخزنة، نعرضها للمستخدم حتى لا يتعطل الموقع
            if (cachedShopData) {
                return res.json(cachedShopData);
            }
            
            return res.status(500).json({ message: 'تعذر تحميل المتجر حالياً.' });
        }
    } else {
        console.log('Serving data from cache (No API call made).');
    }

    // إرجاع البيانات المخزنة للزائر مباشرة بدون طلب جديد من RapidAPI
    res.json(cachedShopData);
});

// تشغيل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});