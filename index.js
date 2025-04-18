const express = require('express');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const LOGIN_URL = process.env.LOGIN_URL;
const ESTIMATE_URL = process.env.ESTIMATE_URL;
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PW = process.env.ADMIN_PW;

async function loginAndFetchLatestText() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36');

    console.log('🔐 Navigating to login page...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

    await page.type('input[name="mb_id"]', ADMIN_ID);
    await page.type('input[name="mb_password"]', ADMIN_PW);
    await page.evaluate(() => {
      document.querySelector('form').submit();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Logged in, navigating to estimate page...');
    await page.goto(ESTIMATE_URL, { waitUntil: 'networkidle2' });

const result = await page.evaluate(() => {
  const row = document.querySelector('tbody tr:not(.sbn_img)');
  if (!row) return null;
  const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
  if (cells.length < 11) return null;  // latestText가 10번 인덱스이므로

  return {
    latestText: cells[10],
    model: cells[6],
    nickname: cells[7],
    region: cells[8],
    phone: cells[9]
  };
});

    await browser.close();
    return result;

  } catch (err) {
    if (browser) await browser.close();
    console.error('❌ Puppeteer Error:', err);
    return null;
  }
}

app.get('/check', async (req, res) => {
  const data = await loginAndFetchLatestText();
  if (data) {
    res.json(data);
  } else {
    res.status(500).send('Failed to fetch estimate');
  }
});

app.listen(port, () => {
  console.log(`✅ Puppeteer server running at port ${port}`);
});
