import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';
import dotenv from 'dotenv';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

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
        const latestText = $('tbody tr').first().find('td').eq(10).text().trim();
        return latestText;
    } catch (error) {
        console.error('❌ Error in loginAndFetchLatestText:', error);
        return null;
    }
}

app.get('/check', async (req, res) => {
    const latestText = await loginAndFetchLatestText();
    if (latestText) {
        res.json({ latestText });
    } else {
        res.status(500).send('Failed to fetch latest text');
    }
});

app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
