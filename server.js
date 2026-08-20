const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة

// معلومات JSONbin الخاصة بك
const BIN_ID = '6a85d070da38895dfef7ad8e';
const MASTER_KEY = '$2a$10$LttjwJbTycA0ZlH0SCP0PehlbhEYgh3YYzHaerbuCLbi05dljoccy';

// متغيرات محلية في ذاكرة السيرفر لتخزين البيانات مؤقتاً وعدم إزعاج JSONbin
let localShopData = null;
let lastFetchTime = 0;
let isInitialized = false;

// دالة لجلب البيانات وإرسالها
app.get('/api/shop', async (req, res) => {
    const currentTime = Date.now();

    try {
        // إذا لم نقم بتحميل البيانات منذ تشغيل السيرفر أو مرّت 12 ساعة
        if (!isInitialized || (currentTime - lastFetchTime > CACHE_DURATION)) {
            console.log('Checking or fetching data from JSONbin...');

            // 1. جلب البيانات من JSONbin (هنا فقط يتم خصم طلب واحد من العداد)
            const binResponse = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': MASTER_KEY
                }
            });

            let record = binResponse.data.record;
            localShopData = record.shopData;
            lastFetchTime = record.lastFetchTime || 0;

            // 2. إذا مرّت 12 ساعة فعلياً عن آخر تحديث محفوظ في السحابة، نسحب من RapidAPI ونحدث السحابة
            if (!localShopData || Object.keys(localShopData).length === 0 || (currentTime - lastFetchTime > CACHE_DURATION)) {
                console.log('Fetching fresh data from RapidAPI...');
                
                const response = await axios.get('https://rocket-league10.p.rapidapi.com/shop', {
                    headers: {
                        'X-RapidAPI-Key': '43ec690dcbmsh855b9f2db21831cp12ccadjsn9c536080565c',
                        'X-RapidAPI-Host': 'rocket-league10.p.rapidapi.com'
                    }
                });

                localShopData = response.data;
                lastFetchTime = currentTime;

                // تحديث السحابة (خصم طلب آخر للكتابة)
                await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                    shopData: localShopData,
                    lastFetchTime: lastFetchTime
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': MASTER_KEY
                    }
                });
                console.log('JSONbin updated with new shop data.');
            } else {
                console.log('Data loaded from JSONbin (No RapidAPI call needed).');
            }

            isInitialized = true;
        } else {
            console.log('Serving from local RAM cache (Zero JSONbin requests used!).');
        }

        res.json(localShopData);

    } catch (error) {
        console.error('Error Details:', error.response ? error.response.data : error.message);
        // إذا حدث خطأ في الاتصال، نعرض البيانات المحلية الموجودة لدينا لكي لا يتوقف الموقع
        if (localShopData) {
            return res.json(localShopData);
        }
        res.status(500).json({ message: 'تعذر تحميل المتجر حالياً.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
