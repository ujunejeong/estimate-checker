
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

const SLACK_WEBHOOK = "https://hooks.slack.com/services/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";

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://estimate123.mycafe24.com/bbs/login.php?url=https%3A%2F%2Festimate123.mycafe24.com%2Fadm%2F');

  await page.type('input[name="mb_id"]', 'biddingok');
  await page.type('input[name="mb_password"]', 'sequencen!@');
  await Promise.all([
    page.click('input[type="submit"]'),
    page.waitForNavigation()
  ]);

  await page.goto('https://estimate123.mycafe24.com/adm/estimate_list.php');
  await page.waitForSelector('table');

  const rows = await page.$$eval('table tr', trs => trs.map(tr => tr.innerText.trim()));
  const latestEntry = rows[1] || '';

  const lastSeenFile = 'last.txt';
  let lastSeen = '';
  if (fs.existsSync(lastSeenFile)) {
    lastSeen = fs.readFileSync(lastSeenFile, 'utf-8').trim();
  }

  if (latestEntry && latestEntry !== lastSeen) {
    fs.writeFileSync(lastSeenFile, latestEntry);
    await axios.post(SLACK_WEBHOOK, {
      text: `📬 새 견적 접수됨:\n${latestEntry}`
    });
  }

  await browser.close();
})();
