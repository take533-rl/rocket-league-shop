const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة

// معلومات JSONbin الخاصة بك
const BIN_ID = '6a85d070da38895dfef7ad8e';
const MASTER_KEY = '$2a$10$LttjwJbTycA0ZlH0SCP0PehlbhEYgh3YYzHaerbuCLbi05dljoccy';

// متغيرات محلية في ذاكرة السيرفر
let localShopData = null;
let lastFetchTime = 0;

app.get('/api/shop', async (req, res) => {
    const currentTime = Date.now();

    try {
        // إذا لم تكن البيانات مخزنة في RAM السيرفر أصلاً، أو مرّت 12 ساعة كاملة
        if (!localShopData || (currentTime - lastFetchTime >= CACHE_DURATION)) {
            console.log('Checking JSONbin for latest data...');

            // 1. جلب البيانات من JSONbin لنرى متى كان آخر تحديث
            const binResponse = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': MASTER_KEY
                }
            });

            let record = binResponse.data.record;
            let cloudShopData = record.shopData;
            let cloudLastFetch = record.lastFetchTime || 0;

            // 2. التحقق من السحابة: هل مرّت 12 ساعة فعلياً عما هو مخزن في السحابة؟
            if (!cloudShopData || Object.keys(cloudShopData).length === 0 || (currentTime - cloudLastFetch >= CACHE_DURATION)) {
                console.log('12 hours passed (or first time). Fetching fresh data from RapidAPI...');
                
                // جلب بيانات جديدة من RapidAPI
                const response = await axios.get('https://rocket-league10.p.rapidapi.com/shop', {
                    headers: {
                        'X-RapidAPI-Key': '43ec690dcbmsh855b9f2db21831cp12ccadjsn9c536080565c',
                        'X-RapidAPI-Host': 'rocket-league10.p.rapidapi.com'
                    }
                });

                localShopData = response.data;
                lastFetchTime = currentTime;

                // تحديث السحابة بالبيانات الجديدة ووقت الجلب الجديد
                await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                    shopData: localShopData,
                    lastFetchTime: lastFetchTime
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': MASTER_KEY
                    }
                });
                console.log('JSONbin and RapidAPI updated successfully.');

            } else {
                // لم تمر 12 ساعة في السحابة حتى لو نام السيرفر وصحا! نأخذ البيانات الموجودة في السحابة بدون طلبات إضافية
                console.log('Server woke up, but 12 hours have NOT passed yet. Using cloud data with ZERO new requests!');
                localShopData = cloudShopData;
                lastFetchTime = cloudLastFetch;
            }

        } else {
            console.log('Serving from local RAM cache (Zero requests used!).');
        }

        res.json(localShopData);

    } catch (error) {
        console.error('Error Details:', error.response ? error.response.data : error.message);
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
