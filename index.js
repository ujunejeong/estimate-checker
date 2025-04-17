const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;

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

// 견적 크롤링 체크
app.get("/check", async (req, res) => {
  try {
    console.log("🚀 /check 엔드포인트 호출됨");

    const browser = await puppeteer.launch({ headless: true });
    console.log("🧭 브라우저 실행됨");

    const page = await browser.newPage();
    console.log("📄 새 페이지 열림");

    await page.goto("https://estimate123.mycafe24.com/adm/bbs/login.php?url=https%3A%2F%2Festimate123.mycafe24.com%2Fadm%2F");
    console.log("🔑 로그인 페이지 접속");

    await page.type("input[name='mb_id']", "biddingok");
    await page.type("input[name='mb_password']", "sequence1");
    await page.click("input[type='submit']");
    console.log("🔐 로그인 정보 입력 후 제출");

    await page.waitForNavigation();
    console.log("✅ 로그인 성공 후 이동");

    await page.goto("https://estimate123.mycafe24.com/adm/estimate_list.php");
    console.log("📋 견적 목록 페이지 접속");

    await page.waitForSelector("table");
    console.log("📊 테이블 요소 확인됨");

    const rows = await page.$$eval("table tr", trs => trs.map(tr => tr.innerText.trim()));
    console.log("📥 테이블 rows 추출 완료", rows.slice(0, 5));

    const lastEntry = rows[1] || "";
    const lastSeenFile = "last.txt";

    let lastSeen = "";
    if (fs.existsSync(lastSeenFile)) {
      lastSeen = fs.readFileSync(lastSeenFile, "utf-8").trim();
    }

    console.log("📂 이전 기록:", lastSeen);
    console.log("🆕 새 견적:", lastEntry);

    if (lastEntry && lastEntry !== lastSeen) {
      fs.writeFileSync(lastSeenFile, lastEntry);
      console.log("💾 새로운 견적 저장됨");

      await axios.post(SLACK_WEBHOOK, {
        text: `🚨 새 견적 발견!\n${lastEntry}`
      });
      console.log("📣 Slack 알림 전송됨");
    } else {
      console.log("🔁 새로운 견적 없음");
    }

    await browser.close();
    res.send("✅ 견적 확인 완료");
  } catch (e) {
    console.error("❌ 크롤링 오류 발생:", e);
    res.status(500).send("에러 발생");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT} 포트에서 실행 중!`);
});
