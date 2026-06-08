const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const { randomDelay, sleep } = require("../utils/sleep");

puppeteerExtra.use(StealthPlugin());

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX =
  /(?:\+91[\s\-]?)?[6-9]\d{9}|\b[6-9]\d{2}[\s\-]?\d{3}[\s\-]?\d{4}\b/g;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

const PAGE_TIMEOUT = 30000;

class ScraperError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ScraperError";
    this.code = code;
  }
}

const getRandomUserAgent = () =>
  USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const unique = (arr) => [...new Set(arr.filter(Boolean))];

// ─── Puppeteer helpers ────────────────────────────────────────────────────────

const setupPage = async (browser) => {
  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1366, height: 768 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    window.chrome = { runtime: {} };
  });
  return page;
};

// ─── Google Search via Puppeteer ──────────────────────────────────────────────

const searchWithPuppeteer = async (page, query, pageNum = 0) => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageNum * 30}`;

  await page.setUserAgent(getRandomUserAgent());
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: PAGE_TIMEOUT,
  });

  const content = await page.content();

  if (content.includes("blocked") || content.includes("captcha")) {
    throw new ScraperError("Search blocked. Try again later.", "CAPTCHA");
  }

  const links = await page.evaluate(() => {
    const BLOCKED = [
      "duckduckgo.com",
      "youtube.com",
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "wikipedia.org",
      "linkedin.com",
      "google.com",
    ];

    // DDG html page uses <a class="result__a"> for organic results
    const resultAnchors = Array.from(document.querySelectorAll("a.result__a"));

    // fallback: grab all external hrefs
    const fallback = Array.from(document.querySelectorAll('a[href^="http"]'));

    const anchors = resultAnchors.length ? resultAnchors : fallback;

    return anchors
      .map((a) => {
        // DDG wraps real URLs in redirect links — decode them
        try {
          const url = new URL(a.href);
          const uddg = url.searchParams.get("uddg");
          return uddg ? decodeURIComponent(uddg) : a.href;
        } catch {
          return a.href;
        }
      })
      .filter(
        (href) =>
          href.startsWith("http") && !BLOCKED.some((b) => href.includes(b)),
      );
  });

  return [...new Set(links)];
};

// ─── Per-site extraction ──────────────────────────────────────────────────────

const extractBusinessName = ($) => {
  const candidates = [
    $("h1").first().text(),
    $("h2").first().text(),
    $("title").text(),
    $("strong").first().text(),
  ];
  return candidates.map((t) => t.trim()).find((t) => t.length > 2) || "";
};

const extractAddress = ($) => {
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const paragraph = $("p").first().text().trim();
  return [metaDesc, ogDesc, paragraph].find((t) => t.length > 10) || "";
};

const extractFromHtml = (html, pageUrl = "") => {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();

  const emails = unique(bodyText.match(EMAIL_REGEX) || []);
  const phones = unique(
    (bodyText.match(PHONE_REGEX) || []).map((p) => p.replace(/\s|-/g, "")),
  );
  const businessName = extractBusinessName($);
  const address = extractAddress($);

  let website = "";
  if (pageUrl && !pageUrl.includes("google.")) {
    website = pageUrl;
  } else {
    const canonical = $('link[rel="canonical"]').attr("href");
    website = canonical || $('a[href^="http"]').first().attr("href") || "";
  }

  if (!emails.length && !phones.length && !businessName) return [];

  if (emails.length) {
    return emails.map((email) => ({
      businessName,
      email,
      phone: phones[0] || "",
      website,
      address,
    }));
  }

  return [
    { businessName, email: "", phone: phones[0] || "", website, address },
  ];
};

const fetchBusinessPage = async (page, url) => {
  await page.setUserAgent(getRandomUserAgent());
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: PAGE_TIMEOUT,
  });
  if (!response) throw new Error("No response");
  await sleep(300 + Math.random() * 500);
  return page.content();
};

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Scrape business leads using Puppeteer directly (no API key needed).
 * @param {{ location: string, targetAudience: string, requiredLeads: number }} params
 */
const scrapeLeads = async ({ location, targetAudience, requiredLeads }) => {
  if (!location || !targetAudience || !requiredLeads) {
    throw new ScraperError(
      "location, targetAudience, and requiredLeads are required",
      "INVALID_INPUT",
    );
  }

  const query = `${targetAudience} in ${location} contact email phone`;
  const leads = [];
  const seenEmails = new Set();
  const seenPhones = new Set();
  const seenLinks = new Set();

  let browser;

  try {
    browser = await puppeteerExtra.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/brave",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--lang=en-US,en",
        "--window-size=1366,768",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    const searchPage = await setupPage(browser);
    const businessPage = await setupPage(browser);

    // ── Step 1: Collect result links from Google via Puppeteer ──────────────
    const allLinks = [];
    const maxPages = Math.min(5, Math.ceil((requiredLeads * 3) / 10));

    for (
      let pageNum = 0;
      pageNum < maxPages && allLinks.length < requiredLeads * 3;
      pageNum++
    ) {
      try {
        const links = await searchWithPuppeteer(searchPage, query, pageNum);

        if (!links.length && pageNum === 0) {
          throw new ScraperError(
            "No search results found for this query",
            "EMPTY_RESULTS",
          );
        }

        for (const l of links) {
          if (!seenLinks.has(l)) {
            seenLinks.add(l);
            allLinks.push(l);
          }
        }

        // Delay between search pages to avoid CAPTCHA
        if (pageNum < maxPages - 1) await randomDelay(3000, 6000);
      } catch (err) {
        if (err.code === "CAPTCHA" || err.code === "EMPTY_RESULTS") throw err;
        console.warn(`Search page ${pageNum + 1} failed:`, err.message);
        break;
      }
    }

    if (!allLinks.length) {
      throw new ScraperError(
        "No search results found for this query",
        "EMPTY_RESULTS",
      );
    }

    // ── Step 2: Visit each business site ────────────────────────────────────
    for (const link of allLinks) {
      if (leads.length >= requiredLeads) break;

      try {
        const pageHtml = await fetchBusinessPage(businessPage, link);
        const extracted = extractFromHtml(pageHtml, link);

        for (const lead of extracted) {
          const emailKey = lead.email?.toLowerCase();
          const phoneKey = lead.phone?.replace(/\D/g, "");

          if (emailKey && seenEmails.has(emailKey)) continue;
          if (!emailKey && phoneKey && seenPhones.has(phoneKey)) continue;
          if (!emailKey && !phoneKey) continue;

          if (emailKey) seenEmails.add(emailKey);
          if (phoneKey) seenPhones.add(phoneKey);

          leads.push(lead);
          if (leads.length >= requiredLeads) break;
        }
      } catch (err) {
        console.warn(`Failed to scrape ${link}:`, err.message);
      }

      await randomDelay(1000, 2500);
    }

    if (!leads.length) {
      throw new ScraperError(
        "Scraping completed but no leads were extracted",
        "EMPTY_RESULTS",
      );
    }

    return leads.slice(0, requiredLeads);
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { scrapeLeads, ScraperError, extractFromHtml };
