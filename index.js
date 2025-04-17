require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const {
  LOGIN_URL,
  ESTIMATE_URL,
  ADMIN_ID,
  ADMIN_PW,
  SLACK_WEBHOOK,
} = process.env;

// 마지막 견적 시간 기록 파일
const lastFile = path.join(__dirname, 'last.txt');

app.get('/check', async (req, res) => {
  try {
    console.log('🔍 로그인 페이지 요청 중...');
    const loginPage = await axios.get(LOGIN_URL);
    const $ = cheerio.load(loginPage.data);
    const token = $('input[name="token"]').val() || ''; // CSRF 토큰이 있다면

    console.log('🧪 로그인 요청 시도 중...');
    const loginResponse = await axios.post(
      LOGIN_URL,
      new URLSearchParams({
        mb_id: ADMIN_ID,
        mb_password: ADMIN_PW,
        token,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: (status) => status < 400,
      }
    );

    const cookie = loginResponse.headers['set-cookie'];
    console.log('🍪 로그인 성공. 쿠키 획득');

    const estimatePage = await axios.get(ESTIMATE_URL, {
      headers: { Cookie: cookie.join(';') },
    });

    const $$ = cheerio.load(estimatePage.data);
    const latestText = $$('.td_datetime').first().text().trim();
    console.log('📅 가장 최근 견적 신청일:', latestText);

    let lastSeen = '';
    if (fs.existsSync(lastFile)) {
      lastSeen = fs.readFileSync(lastFile, 'utf-8').trim();
    }

    if (lastSeen !== latestText) {
      fs.writeFileSync(lastFile, latestText);
      await axios.post(SLACK_WEBHOOK, {
        text: `🚗 신규 견적이 등록되었습니다!\n신청일: ${latestText}`,
      });
      console.log('📢 Slack 전송 완료');
    } else {
      console.log('📭 신규 견적 없음');
    }

    res.send('✅ 완료');
  } catch (err) {
    console.error('❌ 에러:', err.message);
    res.status(500).send('에러 발생');
  }
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
