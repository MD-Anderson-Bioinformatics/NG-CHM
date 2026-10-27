# Linkout checker

Checks that the linkouts defined in
[`custom.js`](../../WebContent/javascript/custom/custom.js) still point at
working pages.

It runs `custom.js` against a mock `linkouts` API, calls every linkout
function with sample label values from [`samples.json`](samples.json), and
records every URL the linkouts would open. Plugin `site` and `logo` URLs, pane
plugin sources, and URLs that linkouts or search options `fetch` are checked
too. Because the real linkout functions run, the checked URLs are exactly what
users get.

Requires Node.js 18 or later. No `npm install` is needed unless you use `--render`.

## Usage

```sh
cd NGCHM/tools/linkout-checker

# List every URL that would be checked (no network access)
node check-linkouts.mjs --list

# Check every URL and write a Markdown report
node check-linkouts.mjs --report linkout-report.md

# Also load each page in headless Chromium to catch JavaScript-rendered
# "not found" pages (needs: npm install playwright && npx playwright install chromium)
node check-linkouts.mjs --render --report linkout-report.md

# Check a single plugin
node check-linkouts.mjs --only cbioportal --render
```

Run `node check-linkouts.mjs --help` to see all options. The exit status is 1
if any URL is BROKEN, so the checker can run in a scheduled CI job.

## Statuses

| Status | Meaning |
|---|---|
| BROKEN | The request failed (DNS, TLS, timeout), the server returned 4xx/5xx, or a logo isn't an image. |
| SUSPECT | The page loads but looks like an error or empty-results page. With `--render`, this also covers a rendered page that never mentions the sample value. |
| MOVED | The URL works but redirects to a different host or path. Update the URL in `custom.js`. |
| UNVERIFIED | The site blocks scripted requests (Cloudflare, HTTP 403/429). Check it by hand or with `--render`. |
| OK | The URL looks fine. |

Many modern sites (cBioPortal, DepMap, GDC, GTEx, CIViC, UniProt and others)
are single-page apps. They answer HTTP 200 for any path and show "not found"
only after their JavaScript runs. Without `--render`, a dead link on one of
these sites can still come back OK, so use `--render` for a real audit.

SUSPECT is a heuristic. Open those URLs and confirm by hand.

## Sample values

`samples.json` maps each label type (for example `bio.gene.hugo`) to known-good
values, plus map attributes such as `bio.species` and `cbioportal.study`. When
you add a linkout for a new type, add a sample value for it as well; the
checker lists linkouts that have no sample. If a linkout reports SUSPECT only
because a sample ID was withdrawn upstream, change the sample.
