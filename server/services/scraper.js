const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const { randomDelay, sleep } = require("../utils/sleep");

puppeteerExtra.use(StealthPlugin());

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX =
  /(?:\+91[\s\-]?)?[6-9]\d{9}|\b[6-9]\d{2}[\s\-]?\d{3}[\s\-]?\d{4}\b/g;

const PAGE_TIMEOUT = 30000;

class ScraperError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ScraperError";
    this.code = code;
  }
}

const unique = (arr) => [...new Set(arr.filter(Boolean))];

// ─── Puppeteer helpers ────────────────────────────────────────────────────────

const setupPage = async (browser) => {
  const page = await browser.newPage();
  // The stealth plugin rewrites the UA (strips "HeadlessChrome"); a manually
  // spoofed UA would contradict the real browser fingerprint and flag us.
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

// ─── Web search via Puppeteer (multiple engines with fallback) ────────────────

const BLOCKED_DOMAINS = [
  "duckduckgo.com",
  "bing.com",
  "brave.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "wikipedia.org",
  "linkedin.com",
  "microsoft.com",
];

const SEARCH_ENGINES = [
  {
    name: "duckduckgo",
    buildUrl: (query, pageNum) =>
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageNum * 30}`,
    resultSelector: "a.result__a",
    blockedMarkers: ["bots use duckduckgo", "complete the following challenge"],
  },
  {
    name: "bing",
    buildUrl: (query, pageNum) =>
      `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${pageNum * 10 + 1}&mkt=en-IN&setlang=en`,
    resultSelector: "li.b_algo h2 a",
    blockedMarkers: ["verify you are human", "unusual traffic"],
  },
  {
    name: "brave",
    buildUrl: (query, pageNum) =>
      `https://search.brave.com/search?q=${encodeURIComponent(query)}&offset=${pageNum}`,
    resultSelector: ".snippet a[href^='http'], a.heading-serpresult",
    blockedMarkers: ["verify you are human", "unusual traffic"],
  },
];

// Search engines wrap result URLs in redirects — unwrap to the real site.
const decodeResultHref = (href) => {
  try {
    const url = new URL(href);
    if (url.hostname.endsWith("duckduckgo.com")) {
      const uddg = url.searchParams.get("uddg");
      if (uddg) return decodeURIComponent(uddg);
    }
    if (url.hostname.endsWith("bing.com") && url.pathname.startsWith("/ck/")) {
      const u = url.searchParams.get("u");
      if (u && u.startsWith("a1")) {
        return Buffer.from(
          u.slice(2).replace(/-/g, "+").replace(/_/g, "/"),
          "base64",
        ).toString("utf8");
      }
    }
  } catch {
    // fall through to raw href
  }
  return href;
};

const searchWithEngine = async (page, engine, query, pageNum) => {
  await page.goto(engine.buildUrl(query, pageNum), {
    waitUntil: "domcontentloaded",
    timeout: PAGE_TIMEOUT,
  });

  const bodyText = (
    await page.evaluate(() => document.body.innerText)
  ).toLowerCase();
  if (engine.blockedMarkers.some((m) => bodyText.includes(m))) {
    throw new ScraperError(`${engine.name} blocked the search`, "CAPTCHA");
  }

  const rawHrefs = await page.$$eval(engine.resultSelector, (anchors) =>
    anchors.map((a) => a.href),
  );

  const links = rawHrefs
    .map(decodeResultHref)
    .filter(
      (href) =>
        href.startsWith("http") &&
        !BLOCKED_DOMAINS.some((b) => href.includes(b)),
    );

  return [...new Set(links)];
};

/**
 * Try each search engine in turn (starting from the last one that worked)
 * until one returns results. Returns the links and the index of the engine
 * that produced them so subsequent pages stick with it.
 */
const searchWithPuppeteer = async (page, query, pageNum = 0, startIdx = 0) => {
  let lastError;

  for (let i = 0; i < SEARCH_ENGINES.length; i++) {
    const engineIdx = (startIdx + i) % SEARCH_ENGINES.length;
    const engine = SEARCH_ENGINES[engineIdx];

    try {
      const links = await searchWithEngine(page, engine, query, pageNum);
      if (links.length) return { links, engineIdx };
      lastError = new ScraperError(
        `${engine.name} returned no results`,
        "EMPTY_RESULTS",
      );
    } catch (err) {
      console.warn(`Search via ${engine.name} failed:`, err.message);
      lastError = err;
    }

    await randomDelay(1000, 2000);
  }

  throw (
    lastError || new ScraperError("All search engines failed", "EMPTY_RESULTS")
  );
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
 * Searches the web for the given query (or one built from targetAudience +
 * location), then visits each result site to extract contact details.
 * @param {{ location?: string, targetAudience?: string, requiredLeads: number, searchQuery?: string }} params
 */
const scrapeLeads = async ({
  location,
  targetAudience,
  requiredLeads,
  searchQuery,
}) => {
  if (!requiredLeads || (!searchQuery && (!location || !targetAudience))) {
    throw new ScraperError(
      "requiredLeads and either searchQuery or location + targetAudience are required",
      "INVALID_INPUT",
    );
  }

  const query =
    searchQuery?.trim() ||
    `${targetAudience} in ${location} contact email phone`;
  const leads = [];
  const seenEmails = new Set();
  const seenPhones = new Set();
  const seenLinks = new Set();

  let browser;

  try {
    browser = await puppeteerExtra.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: "new",
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

    // ── Step 1: Collect result links from web search via Puppeteer ──────────
    const allLinks = [];
    const maxPages = Math.min(5, Math.ceil((requiredLeads * 3) / 10));
    let engineIdx = 0;

    for (
      let pageNum = 0;
      pageNum < maxPages && allLinks.length < requiredLeads * 3;
      pageNum++
    ) {
      try {
        const { links, engineIdx: usedIdx } = await searchWithPuppeteer(
          searchPage,
          query,
          pageNum,
          engineIdx,
        );
        engineIdx = usedIdx;

        for (const l of links) {
          if (!seenLinks.has(l)) {
            seenLinks.add(l);
            allLinks.push(l);
          }
        }

        // Delay between search pages to avoid CAPTCHA
        if (pageNum < maxPages - 1) await randomDelay(3000, 6000);
      } catch (err) {
        // Abort only if the very first page yields nothing; otherwise keep
        // whatever links we already collected.
        if (pageNum === 0) throw err;
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
