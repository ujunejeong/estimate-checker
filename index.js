const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const SLACK_WEBHOOK = "https://hooks.slack.com/services/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";

// 슬랙 테스트 전용
app.get("/", async (req, res) => {
  try {
    await axios.post(SLACK_WEBHOOK, {
      text: "✅ Render ping 테스트: 서버가 잘 작동 중입니다!"
    });
    res.send("슬랙 알림 테스트 완료!");
  } catch (error) {
    console.error("Slack 전송 실패:", error.message);
    res.status(500).send("슬랙 알림 실패");
  }
});

// 향후 실제 크롤링용 라우트 추가 가능
app.get("/check", async (req, res) => {
  try {
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
    res.send("견적 확인 및 슬랙 전송 완료");
  } catch (e) {
    console.error(e);
    res.status(500).send("에러 발생");
  }
});

app.listen(PORT, () => {
  console.log(`서버가 ${PORT} 포트에서 실행 중`);
});
