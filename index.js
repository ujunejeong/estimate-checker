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
const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  maxRedirects: 5
}));

async function loginAndFetchLatestText() {
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await client.post(LOGIN_URL, new URLSearchParams({
      mb_id: ADMIN_ID,
      mb_password: ADMIN_PW,
      url: 'https://estimate123.mycafe24.com/adm/'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('📍 Login redirect to:', loginResponse.request.res.responseUrl);
    console.log('🍪 [Login] 쿠키 목록:', await jar.getCookies(LOGIN_URL));

    // ✅ 로그인 직후 약간 대기
    await new Promise(resolve => setTimeout(resolve, 500));

    // ✅ 세션 활성화 위해 index 페이지 접근
    const adminPage = await client.get('https://estimate123.mycafe24.com/adm/index.php');
    console.log('✅ Admin index page accessed');
    console.log('🍪 [Index] 쿠키 목록:', await jar.getCookies('https://estimate123.mycafe24.com/adm/'));

    console.log('📄 Fetching estimate list...');
    const response = await client.get(ESTIMATE_URL, {
      headers: {
        Referer: 'https://estimate123.mycafe24.com/bbs/login.php?url=https%3A%2F%2Festimate123.mycafe24.com%2Fadm%2F',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
      },
      validateStatus: null
    });

    const html = response.data;
    console.log('📥 ESTIMATE HTML (preview):', html.slice(0, 1000));

    if (html.includes('mb_password')) {
      console.error('🚫 로그인 실패로 추정됩니다. 로그인 입력 폼이 그대로 있습니다.');
      return null;
    }

    const $ = cheerio.load(html);
    const firstRow = $('tbody tr').not('.sbn_img').first();
    const tds = firstRow.find('td');

    if (tds.length === 0) {
      console.log('📦 전체 HTML 미리보기 (10000자):', html.slice(0, 10000));
    }

    console.log('🧪 tbody:', $('tbody').length);
    console.log('🧪 firstRow HTML:', firstRow.html());
    console.log('🧪 tds count:', tds.length);
    console.log('🧪 tds values:', tds.map((i, el) => $(el).text().trim()).get());

    if (tds.length < 10) {
      console.warn('⚠️ 예상보다 td 개수가 부족합니다.');
      return null;
    }

    const result = {
      latestText: tds.eq(9).text().trim(),
      model: tds.eq(5).text().trim(),
      nickname: tds.eq(6).text().trim(),
      region: tds.eq(7).text().trim(),
      phone: tds.eq(8).text().trim()
    };

    return result;

  } catch (error) {
    console.error('❌ Error:', error.message);
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
