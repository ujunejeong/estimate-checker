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
        console.log('🔐 Logging in...');
        await client.post(LOGIN_URL, new URLSearchParams({
    mb_id: ADMIN_ID,
    mb_password: ADMIN_PW,
    url: 'https://estimate123.mycafe24.com/adm/' // ← 이걸 POST 파라미터로 넣는 것이 핵심!
}), {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});

        console.log('📄 Fetching estimate list...');
        const response = await client.get(ESTIMATE_URL);
        const html = response.data;

        // 로그인 실패 여부 간단 체크
        if (html.includes('로그인') || html.includes('비밀번호') || html.includes('mb_password')) {
            console.error('🚫 로그인 실패로 추정됩니다. HTML에 로그인 관련 텍스트가 포함되어 있습니다.');
            return null;
        }

        const $ = cheerio.load(html);
        const firstRow = $('tbody tr').not('.sbn_img').first(); // 숨겨진 이미지용 tr 필터
        const tds = firstRow.find('td');

        // 디버깅 로그
        console.log('🧪 tbody HTML 존재 여부:', $('tbody').length);
        console.log('🧪 firstRow HTML:', firstRow.html());
        console.log('🧪 tds count:', tds.length);
        console.log('🧪 tds values:', tds.map((i, el) => $(el).text().trim()).get());

        // 데이터 없는 경우 null 반환
        if (tds.length < 10) {
            console.warn('⚠️ 예상보다 td 개수가 부족합니다. 구조가 바뀌었거나 데이터가 없을 수 있습니다.');
            return null;
        }

        const result = {
            latestText: tds.eq(9).text().trim(),     // 신청일 (10번째)
            model: tds.eq(5).text().trim(),           // 차종 (6번째)
            nickname: tds.eq(6).text().trim(),        // 닉네임 (7번째)
            region: tds.eq(7).text().trim(),          // 지역 (8번째)
            phone: tds.eq(8).text().trim()            // 연락처 (9번째)
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
