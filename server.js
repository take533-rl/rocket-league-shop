const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 ساعة

// معلومات JSONbin الخاصة بك
const BIN_ID = '6a85d070da38895dfef7ad8e';
const MASTER_KEY = '$2a$10$LttjwJbTycA0ZlH0SCP0PehlbhEYgh3YYzHaerbuCLbi05dljoccy';

app.get('/api/shop', async (req, res) => {
    const currentTime = Date.now();

    try {
        // 1. جلب البيانات والوقت من سحابة JSONbin
        const binResponse = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': MASTER_KEY
            }
        });

        let record = binResponse.data.record;
        let cachedShopData = record.shopData;
        let lastFetchTime = record.lastFetchTime;

        // 2. التحقق مما إذا مر 12 ساعة أو أن البيانات فارغة
        if (!cachedShopData || Object.keys(cachedShopData).length === 0 || (currentTime - lastFetchTime > CACHE_DURATION)) {
            console.log('Fetching new data from RapidAPI...');
            
            const response = await axios.get('https://rocket-league10.p.rapidapi.com/shop', {
                headers: {
                    'X-RapidAPI-Key': '43ec690dcbmsh855b9f2db21831cp12ccadjsn9c536080565c',
                    'X-RapidAPI-Host': 'rocket-league10.p.rapidapi.com'
                }
            });

            cachedShopData = response.data;
            lastFetchTime = currentTime;

            // 3. تحديث البيانات الجديدة في سحابة JSONbin
            await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                shopData: cachedShopData,
                lastFetchTime: lastFetchTime
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': MASTER_KEY
                }
            });

            console.log('Data updated successfully in JSONbin.');
        } else {
            console.log('Serving data from JSONbin cache (No API call needed).');
        }

        res.json(cachedShopData);

    } catch (error) {
        console.error('Error Details:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'تعذر تحميل المتجر حالياً.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
