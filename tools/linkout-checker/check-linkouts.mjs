#!/usr/bin/env node
//==============================================//
// NG-CHM linkout checker                       //
//==============================================//
//
// Executes custom.js against a mock `linkouts` API, calls every linkout
// function with sample label values (see samples.json), collects every URL
// the linkouts would open (plus plugin site/logo URLs, pane plugin sources,
// and URLs fetched by linkouts/search options), then checks each URL.
//
// Because the real linkout functions are executed, the URLs checked are
// exactly the URLs users get, including any string building the functions do.
//
// Usage: node check-linkouts.mjs [options]   (see --help)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const HELP = `
Usage: node check-linkouts.mjs [options]

Options:
  --custom <file>     custom.js to check (default: ../../WebContent/javascript/custom/custom.js)
  --samples <file>    sample values per label type (default: ./samples.json)
  --list              only list the URLs that would be checked; no network access
  --render            also load each linkout page in headless Chromium (Playwright)
                      to detect "soft 404s" in JavaScript-rendered sites
  --only <text>       only check plugins whose name contains <text> (case-insensitive)
  --no-assets         skip plugin site and logo URLs
  --timeout <ms>      per-request timeout (default: 20000)
  --concurrency <n>   parallel requests (default: 6)
  --report <file>     write a Markdown report to <file>
  --json <file>       write full results as JSON to <file>
  --help              show this message

Exit status is 1 if any URL is BROKEN, 0 otherwise.
`;

//----------------------------------------------//
// Command line                                 //
//----------------------------------------------//
function parseArgs(argv) {
  const opts = {
    custom: path.resolve(here, "../../WebContent/javascript/custom/custom.js"),
    samples: path.resolve(here, "samples.json"),
    list: false,
    render: false,
    only: null,
    assets: true,
    timeout: 20000,
    concurrency: 6,
    report: null,
    json: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${a}`);
      return argv[++i];
    };
    switch (a) {
      case "--custom": opts.custom = path.resolve(next()); break;
      case "--samples": opts.samples = path.resolve(next()); break;
      case "--list": opts.list = true; break;
      case "--render": opts.render = true; break;
      case "--only": opts.only = next().toLowerCase(); break;
      case "--no-assets": opts.assets = false; break;
      case "--timeout": opts.timeout = +next(); break;
      case "--concurrency": opts.concurrency = Math.max(1, +next()); break;
      case "--report": opts.report = path.resolve(next()); break;
      case "--json": opts.json = path.resolve(next()); break;
      case "--help": case "-h": console.log(HELP); process.exit(0);
      default: throw new Error(`Unknown option ${a}\n${HELP}`);
    }
  }
  return opts;
}

//----------------------------------------------//
// Collect URLs by executing custom.js          //
//----------------------------------------------//

// Returns { targets, problems } where each target is
//   { plugin, kind, label, url, value }
// kind is one of: linkout, matrix, site, logo, pane, icon, api
async function collectTargets(opts, samples) {
  const plugins = [];
  const panePlugins = [];
  const hamburger = [];
  const searchOptions = [];
  const subtypes = {}; // subtype -> [supertypes]
  let captured = null; // { opened: [], fetched: [] } while a linkout runs

  const realFetch = globalThis.fetch;
  const sandboxFetch = (url, init) => {
    if (captured) captured.fetched.push(String(url));
    if (opts.list) return Promise.reject(new Error("network disabled (--list)"));
    return realFetch(url, init);
  };

  const linkouts = {
    VISIBLE_LABELS: "visibleLabels",
    HIDDEN_LABELS: "hiddenLabels",
    FULL_LABELS: "fullLabels",
    POSITION: "position",
    SINGLE_SELECT: "singleSelection",
    MULTI_SELECT: "multiSelection",
    setVersion: (v) => { linkouts._version = "" + v; },
    getVersion: () => linkouts._version,
    getAttribute: (name) => samples.attributes?.[name],
    getMapName: () => "linkout-checker",
    getMapFileName: () => "linkout-checker",
    getSourceObjectType: () => "chm",
    execCommand: (args) => {
      // Pretend the map has bio.gene.hugo labels on both axes and no covariates.
      if (args[0] === "heatmap" && args[1] === "get-label-types") return ["bio.gene.hugo"];
      return [];
    },
    addPlugin: (p) => plugins.push(p),
    addPanePlugin: (p) => panePlugins.push(p),
    addHamburgerLinkout: (p) => hamburger.push(p),
    addSubtype: (sub, sup) => (subtypes[sub] = subtypes[sub] || []).push(sup),
    describeTypes: () => {},
    addSearchOption: (o) => searchOptions.push(o),
    openUrl: (url, name, options) => {
      if (captured) captured.opened.push({ url: String(url), name, options: options || {} });
    },
    simplifyLabels: (labels) => {
      if (!Array.isArray(labels)) labels = labels.Row.concat(labels.Column);
      return labels.sort().filter((el, i, a) => i === a.indexOf(el));
    },
    getTypeValues: () => [],
    setSelectionVec: () => {},
    showLinkoutOutput: () => {},
  };

  const context = vm.createContext({
    linkouts,
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    fetch: sandboxFetch,
    alert: (msg) => { if (captured) captured.alerts.push(String(msg)); },
    jStat: { max: (v) => Math.max(...v) },
    encodeURIComponent, decodeURIComponent, URL, URLSearchParams, Promise, setTimeout,
  });
  vm.runInContext(fs.readFileSync(opts.custom, "utf8"), context, { filename: opts.custom });

  const targets = [];
  const problems = [];
  const wanted = (name) => !opts.only || name.toLowerCase().includes(opts.only);

  // Run fn while capturing openUrl/fetch calls.
  async function capture(fn) {
    captured = { opened: [], fetched: [], alerts: [] };
    let error = null;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    const result = { ...captured, error };
    captured = null;
    return result;
  }

  // Sample values for a type, falling back to its supertypes.
  function sampleFor(type, multi) {
    const seen = new Set();
    const queue = [type];
    while (queue.length) {
      const t = queue.shift();
      if (seen.has(t)) continue;
      seen.add(t);
      const v = (multi && samples.multiSelect?.[t]) || samples.types?.[t];
      if (v) return v.slice();
      for (const [sub, sups] of Object.entries(subtypes)) {
        if (sups.includes(t)) queue.push(sub);
      }
    }
    return null;
  }

  function record(plugin, kind, label, cap, value) {
    for (const o of cap.opened) {
      targets.push({ plugin, kind, label, url: o.url, value, noframe: !!o.options.noframe });
    }
    for (const f of cap.fetched) {
      targets.push({ plugin, kind: "api", label: `${label} (fetch)`, url: f, value });
    }
    if (cap.error) problems.push({ plugin, label, message: `threw: ${cap.error.message}` });
    for (const a of cap.alerts) problems.push({ plugin, label, message: `alert: ${a}` });
    if (!cap.error && cap.opened.length === 0 && cap.alerts.length === 0) {
      problems.push({ plugin, label, message: "did not open any URL" });
    }
  }

  for (const p of panePlugins) {
    if (wanted(p.name)) targets.push({ plugin: p.name, kind: "pane", label: "pane plugin", url: p.src });
  }
  for (const h of hamburger) {
    if (h.icon && /^https?:/.test(h.icon) && wanted(h.name)) {
      targets.push({ plugin: h.name, kind: "icon", label: "hamburger icon", url: h.icon });
    }
  }

  for (const p of plugins) {
    if (!wanted(p.name)) continue;
    if (opts.assets) {
      if (p.site) targets.push({ plugin: p.name, kind: "site", label: "site", url: p.site });
      if (p.logo) targets.push({ plugin: p.name, kind: "logo", label: "logo", url: p.logo });
    }
    for (const l of p.linkouts || []) {
      const multi = l.selectMode === linkouts.MULTI_SELECT;
      const label = `${l.menuEntry} [${l.typeName}${multi ? ", multi" : ""}]`;
      const values = sampleFor(l.typeName, multi);
      if (!values) {
        problems.push({ plugin: p.name, label, message: `no sample value for type ${l.typeName} in samples.json` });
        continue;
      }
      const cap = await capture(() => l.linkoutFn(values.slice()));
      record(p.name, "linkout", label, cap, values.join(","));
    }
    for (const l of p.matrixLinkouts || []) {
      const label = `${l.menuEntry} [${l.typeName1} x ${l.typeName2}, matrix]`;
      const rows = sampleFor(l.typeName1[0], true);
      const cols = sampleFor(l.typeName2[0], true);
      if (!rows || !cols) {
        problems.push({ plugin: p.name, label, message: "no sample values for matrix types" });
        continue;
      }
      const cap = await capture(() => l.linkoutFn({ Row: rows.slice(), Column: cols.slice() }));
      record(p.name, "matrix", label, cap, rows.concat(cols).join(","));
    }
  }

  for (const o of searchOptions) {
    const name = `Search option: ${o.key}`;
    if (!wanted(name) && !wanted(o.key)) continue;
    const query = samples.pathwaysSearch || "apoptosis";
    const cap = await capture(async () => {
      const searchFor = { axis: "" };
      o.onSelect({}, searchFor);
      if (typeof searchFor.doSearch !== "function") return;
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, opts.timeout);
        searchFor.doSearch({ getSearchString: () => query }, searchFor, () => {
          clearTimeout(timer);
          resolve();
        });
      });
    });
    for (const f of cap.fetched) {
      targets.push({ plugin: name, kind: "api", label: "search API", url: f, value: query });
    }
    if (cap.error) problems.push({ plugin: name, label: "search", message: `threw: ${cap.error.message}` });
  }

  return { targets, problems, version: linkouts._version };
}

//----------------------------------------------//
// URL checks                                   //
//----------------------------------------------//
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Phrases that suggest a 200 page is really an error/empty-result page.
const SOFT_404 = [
  /page not found/i, /404 not found/i, /\b404\b.*\berror\b/i, /no results found/i,
  /no matches found/i, /could not be found/i, /does not exist/i, /\b0 results\b/i,
  /no records found/i, /nothing found/i, /not a valid/i, /invalid (gene|id|identifier|query)/i,
  /your search .* did not match/i, /no items found/i, /no data found/i,
];
// Markers of bot protection rather than a dead link.
const BOT_WALL = [/cloudflare/i, /just a moment/i, /captcha/i, /access denied/i, /are you a robot/i, /cf-chl/i];

function normalizeForCompare(u) {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return u;
  }
}

async function fetchWithRedirects(url, timeout) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop < 10; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    let res;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "text/html,application/json,image/*,*/*;q=0.8" },
      });
    } finally {
      clearTimeout(timer);
    }
    chain.push({ url: current, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    let body = "";
    const type = res.headers.get("content-type") || "";
    if (/text|json|xml|javascript/.test(type)) {
      body = (await res.text()).slice(0, 500000);
    } else {
      await res.arrayBuffer().catch(() => {});
    }
    return { chain, finalUrl: current, status: res.status, contentType: type, body };
  }
  throw new Error("too many redirects");
}

function pageTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

async function checkHttp(t, opts) {
  const notes = [];
  if (t.url.startsWith("http://")) notes.push("uses http:// (consider https://)");
  let r;
  try {
    r = await fetchWithRedirects(t.url, opts.timeout);
  } catch (e) {
    const cause = e.cause?.code || e.cause?.message || e.name;
    return { status: "BROKEN", detail: `request failed: ${e.message}${cause ? ` (${cause})` : ""}`, notes };
  }
  const result = { httpStatus: r.status, finalUrl: r.finalUrl, chain: r.chain, title: pageTitle(r.body), notes };
  const text = r.body ? visibleText(r.body) : "";

  if (r.status >= 400) {
    if ([401, 403, 429, 503].includes(r.status) && BOT_WALL.some((re) => re.test(r.body))) {
      return { ...result, status: "UNVERIFIED", detail: `HTTP ${r.status} from bot protection; check by hand or with --render` };
    }
    if ([403, 429].includes(r.status)) {
      return { ...result, status: "UNVERIFIED", detail: `HTTP ${r.status}; site may block scripted requests` };
    }
    return { ...result, status: "BROKEN", detail: `HTTP ${r.status}` };
  }

  if (r.chain.length > 1 && normalizeForCompare(t.url) !== normalizeForCompare(r.finalUrl)) {
    notes.push(`redirects to ${r.finalUrl}`);
  }
  if (t.kind === "logo" || t.kind === "icon") {
    if (!/^image\//.test(r.contentType)) {
      return { ...result, status: "BROKEN", detail: `not an image (content-type: ${r.contentType || "none"})` };
    }
    return { ...result, status: notes.some((n) => n.startsWith("redirects")) ? "MOVED" : "OK", detail: "" };
  }
  if (t.kind === "api") {
    if (!/json/.test(r.contentType)) {
      return { ...result, status: "SUSPECT", detail: `expected JSON, got ${r.contentType || "no content-type"}` };
    }
  }
  const soft = SOFT_404.find((re) => re.test(result.title) || re.test(text.slice(0, 20000)));
  if (soft) {
    return { ...result, status: "SUSPECT", detail: `page text matches ${soft} (possible soft 404)` };
  }
  if (notes.some((n) => n.startsWith("redirects"))) {
    return { ...result, status: "MOVED", detail: "works, but the URL is redirected; consider updating it" };
  }
  return { ...result, status: "OK", detail: "" };
}

// Load linkout pages in a real browser so JavaScript-rendered "not found"
// pages (cBioPortal, DepMap, GDC, ...) can be detected.
async function renderCheck(results, opts) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    try {
      // Fall back to require(), which also finds a globally installed Playwright.
      ({ chromium } = createRequire(import.meta.url)("playwright"));
    } catch {
      console.error("--render needs Playwright: npm install playwright && npx playwright install chromium");
      process.exit(2);
    }
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ userAgent: UA });
  const pages = results.filter((r) => ["linkout", "matrix", "pane"].includes(r.kind) && r.status !== "BROKEN");
  await runPool(pages, Math.min(opts.concurrency, 3), async (r) => {
    const page = await context.newPage();
    try {
      const resp = await page.goto(r.url, { timeout: opts.timeout * 2, waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: opts.timeout }).catch(() => {});
      await page.waitForTimeout(1500);
      const title = await page.title();
      const text = (await page.evaluate(() => document.body?.innerText || "")).replace(/\s+/g, " ");
      r.render = { status: resp?.status(), finalUrl: page.url(), title };
      const soft = SOFT_404.find((re) => re.test(title) || re.test(text.slice(0, 20000)));
      const firstValue = (r.value || "").split(",")[0];
      const probe = firstValue.replace(/\.MIMAT\d+$/, "").replace(/^.*\.(MIMAT\d+)$/, "$1");
      if (BOT_WALL.some((re) => re.test(title) || re.test(text.slice(0, 2000)))) {
        r.render.verdict = "bot protection page; check by hand";
      } else if (soft) {
        r.status = "SUSPECT";
        r.detail = `rendered page matches ${soft} (possible soft 404)`;
      } else if (probe && r.kind !== "pane" && !text.toLowerCase().includes(probe.toLowerCase())) {
        if (r.status === "OK") r.status = "SUSPECT";
        r.detail = [r.detail, `rendered page does not mention sample value "${probe}"`].filter(Boolean).join("; ");
      } else if (r.status === "UNVERIFIED") {
        r.status = "OK";
        r.detail = "verified by rendering";
      }
      if (normalizeForCompare(page.url()) !== normalizeForCompare(r.url) && !r.notes.some((n) => n.startsWith("redirects"))) {
        r.notes.push(`browser ended up at ${page.url()}`);
      }
    } catch (e) {
      r.render = { error: e.message.split("\n")[0] };
    } finally {
      await page.close();
    }
  });
  await browser.close();
}

async function runPool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

//----------------------------------------------//
// Reporting                                    //
//----------------------------------------------//
const ORDER = ["BROKEN", "SUSPECT", "MOVED", "UNVERIFIED", "OK"];

function markdownReport(results, problems, meta) {
  const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");
  const lines = [];
  lines.push(`# NG-CHM linkout check`, "");
  lines.push(`- custom.js: \`${meta.custom}\` (version ${meta.version ?? "unknown"})`);
  lines.push(`- run: ${new Date().toISOString()}${meta.render ? " (with --render)" : ""}`, "");
  const counts = ORDER.map((s) => `${s}: ${results.filter((r) => r.status === s).length}`);
  lines.push(`**Summary:** ${counts.join(" · ")}`, "");
  lines.push(
    "Statuses: **BROKEN** request failed or HTTP 4xx/5xx · **SUSPECT** loads but looks like an error/empty page ·",
    "**MOVED** works via a redirect, update the URL · **UNVERIFIED** site blocks scripted access, check by hand · **OK**",
    "",
  );
  lines.push("| Status | Plugin | Linkout | URL | Details |", "|---|---|---|---|---|");
  const sorted = [...results].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.plugin.localeCompare(b.plugin),
  );
  for (const r of sorted) {
    const details = [r.detail, ...(r.notes || [])].filter(Boolean).join("; ");
    lines.push(`| ${r.status} | ${esc(r.plugin)} | ${esc(r.label)} | ${esc(r.url)} | ${esc(details)} |`);
  }
  if (problems.length) {
    lines.push("", "## Linkouts that could not be exercised", "");
    for (const p of problems) lines.push(`- **${p.plugin}** – ${p.label}: ${p.message}`);
  }
  return lines.join("\n") + "\n";
}

//----------------------------------------------//
// Main                                         //
//----------------------------------------------//
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const samples = JSON.parse(fs.readFileSync(opts.samples, "utf8"));
  const { targets, problems, version } = await collectTargets(opts, samples);

  // Check each distinct URL once.
  const unique = [];
  const seen = new Set();
  for (const t of targets) {
    if (seen.has(t.url)) continue;
    seen.add(t.url);
    unique.push(t);
  }

  if (opts.list) {
    for (const t of unique) console.log(`${t.kind.padEnd(7)} ${t.plugin} :: ${t.label}\n        ${t.url}`);
    if (problems.length) {
      console.log("\nCould not exercise:");
      for (const p of problems) console.log(`  ${p.plugin} :: ${p.label}: ${p.message}`);
    }
    console.log(`\n${unique.length} distinct URLs from ${targets.length} targets.`);
    return;
  }

  console.error(`Checking ${unique.length} URLs...`);
  const results = unique.map((t) => ({ ...t }));
  await runPool(results, opts.concurrency, async (r) => {
    Object.assign(r, await checkHttp(r, opts));
    console.error(`  ${r.status.padEnd(10)} ${r.url}`);
  });
  if (opts.render) {
    console.error("Rendering linkout pages in Chromium...");
    await renderCheck(results, opts);
  }

  const report = markdownReport(results, problems, { custom: opts.custom, version, render: opts.render });
  if (opts.report) fs.writeFileSync(opts.report, report);
  if (opts.json) fs.writeFileSync(opts.json, JSON.stringify({ version, results, problems }, null, 2));
  console.log(report);
  process.exitCode = results.some((r) => r.status === "BROKEN") ? 1 : 0;
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(2);
});
