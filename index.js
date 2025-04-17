const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const LOGIN_URL = process.env.LOGIN_URL;
const ESTIMATE_URL = process.env.ESTIMATE_URL;
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PW = process.env.ADMIN_PW;

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

async function loginAndFetchLatestText() {
    try {
        await client.post(LOGIN_URL, new URLSearchParams({
            mb_id: ADMIN_ID,
            mb_password: ADMIN_PW
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const response = await client.get(ESTIMATE_URL);
        const $ = cheerio.load(response.data);
        const firstRow = $('tbody tr').first();
        const tds = firstRow.find('td');

        const result = {
            latestText: tds.eq(10).text().trim(),       // 신청일
            model: tds.eq(6).text().trim(),              // 차종
            nickname: tds.eq(7).text().trim(),           // 동호회닉네임
            region: tds.eq(8).text().trim(),             // 수리희망지역
            phone: tds.eq(9).text().trim()               // 연락처
        };

        return result;
    } catch (error) {
        console.error('❌ Error in loginAndFetchLatestText:', error.message);
        return null;
    }
}

app.get('/check', async (req, res) => {
    const data = await loginAndFetchLatestText();
    if (data) {
        res.json(data);
    } else {
        res.status(500).send('Failed to fetch latest text');
    }
});

app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
