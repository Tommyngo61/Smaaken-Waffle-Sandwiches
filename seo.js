// Server-rendered <head> for a client site.
//
// WHY THIS EXISTS: the site itself is a React app that fetches its content
// after the JavaScript runs. That is fine for a person with a browser and
// useless for everyone else. Before this, the HTML we served said
// `<title>Loading...</title>` and contained one word of text, so:
//
//   * Facebook, iMessage and WhatsApp previewed the salon as "Loading..."
//   * AI crawlers (GPTBot, ClaudeBot, PerplexityBot) mostly do not run
//     JavaScript, so the business was invisible to exactly the channel we
//     tell clients we are good at
//   * Google can render it, but slower and less reliably than plain HTML
//
// The fix is not full server-side rendering, which would mean rebuilding the
// app. Crawlers care about the head and structured data far more than body
// markup, so we fetch the same published content the browser fetches and
// write a real head into the HTML before sending it.
//
// EVERY FAILURE MODE FALLS BACK TO THE ORIGINAL FILE. A slow or broken CMS
// must never take a client's website down.

const CMS = process.env.CMS_BASE_URL || "https://tablecloth-1003541566219.us-west1.run.app";
const SITE_ID = process.env.SITE_ID || "";
const BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

// schema.org has specific types for these. A more specific type gives Google
// better rich-result eligibility than a generic LocalBusiness.
const SCHEMA_TYPE = { "service-menu": "NailSalon", "food-menu": "Restaurant", "retail-shop": "Store" };

const DAY = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// The two templates store hours differently and both have to work here:
//
//   service-menu : { day: "Monday", time: "10:00 AM - 7:00 PM" }
//   food-menu    : { day: "Monday", open: "08:00", close: "17:00", closed: false }
//
// Returns ["10:00","19:00"], or null for a closed or unparseable day - a day
// the business is shut must produce no entry at all, never a 00:00-00:00 one
// that tells Google they're open at midnight.
function parseHours(entry) {
  if (!entry) return null;
  if (typeof entry === "object" && (entry.open || entry.close || entry.closed !== undefined)) {
    if (entry.closed || !entry.open || !entry.close) return null;
    return [String(entry.open), String(entry.close)];
  }
  const text = typeof entry === "string" ? entry : entry.time;
  if (/closed/i.test(String(text || ""))) return null;
  const m = String(text || "").match(
    /(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?[\s\S]*?(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?/
  );
  if (!m) return null;
  const to24 = (h, min, ap) => {
    let hh = parseInt(h, 10) % 12;
    if (ap.toLowerCase() === "p") hh += 12;
    return String(hh).padStart(2, "0") + ":" + (min || "00");
  };
  return [to24(m[1], m[2], m[3]), to24(m[4], m[5], m[6])];
}

// service-menu calls them "services", food-menu calls them "menu". Same shape
// underneath: [{ name, note, items: [{ name, desc, price }] }].
function itemGroups(c) {
  return (Array.isArray(c.services) && c.services.length ? c.services : c.menu) || [];
}

// Human-readable hours for the crawler summary, whichever shape they arrived in.
function hoursText(h) {
  if (h && (h.open || h.close || h.closed !== undefined)) {
    return h.closed || !h.open ? "Closed" : `${h.open} - ${h.close}`;
  }
  return (h && h.time) || "";
}

function buildJsonLd(c) {
  const b = c.business || {};
  const type = SCHEMA_TYPE[c.template] || "LocalBusiness";

  const opening = (c.hours || []).map((h) => {
    const day = DAY[String(h.day || "").trim().toLowerCase()];
    const range = parseHours(h);
    if (!day || !range) return null;
    return { "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: range[0], closes: range[1] };
  }).filter(Boolean);

  const sameAs = Object.values(c.socials || {}).filter(
    (u) => typeof u === "string" && u.indexOf("http") === 0
  );

  // Address as a real PostalAddress, not one string: Google needs the parts
  // separated to match this against a map listing.
  let address = null;
  const parts = String(b.address || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const last = parts[parts.length - 1].split(/\s+/);
    address = {
      "@type": "PostalAddress",
      streetAddress: parts.slice(0, parts.length - 2).join(", "),
      addressLocality: parts[parts.length - 2],
      addressRegion: last[0] || "",
      postalCode: last[1] || "",
      addressCountry: "US",
    };
  } else if (b.address) {
    address = { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "US" };
  }

  const biz = { "@context": "https://schema.org", "@type": type };
  biz.name = b.name || (c.meta && c.meta.title) || "";
  const desc = (c.meta && c.meta.description) || b.tagline;
  if (desc) biz.description = desc;
  if (b.phone) biz.telephone = b.phone;
  if (address) biz.address = address;
  if (BASE_URL) biz.url = BASE_URL;
  if (opening.length) biz.openingHoursSpecification = opening;
  if (sameAs.length) biz.sameAs = sameAs;

  // What the business sells, as real structured data. This is what lets a
  // search engine or an assistant answer "how much is a gel manicure at EXP
  // Nails" or "what's on the menu at Smaaken".
  //
  // Only emit a price when it is a single definite number. "$20 and up" is a
  // starting point, not a price, and publishing it as one is how you end up
  // arguing with a customer at the counter.
  const priceOf = (raw) => {
    const money = String(raw == null ? "" : raw).trim();
    return /^\$?\d+(\.\d{2})?$/.test(money) ? money.replace(/[^0-9.]/g, "") : null;
  };
  const groups = itemGroups(c);

  if (type === "Restaurant") {
    // A restaurant gets a Menu, not an offer catalog - it's the type Google
    // actually renders menu rich results from.
    const sections = groups.map((g) => {
      const items = (g.items || []).filter((i) => i && i.name).map((i) => {
        const mi = { "@type": "MenuItem", name: i.name };
        if (i.desc) mi.description = i.desc;
        const p = priceOf(i.price);
        if (p) mi.offers = { "@type": "Offer", price: p, priceCurrency: "USD" };
        return mi;
      });
      if (!items.length) return null;
      return { "@type": "MenuSection", name: g.name || "Menu", hasMenuItem: items };
    }).filter(Boolean);
    if (sections.length) biz.hasMenu = { "@type": "Menu", hasMenuSection: sections };
  } else {
    const offers = [];
    for (const group of groups) {
      for (const item of group.items || []) {
        if (!item || !item.name) continue;
        const offer = { "@type": "Offer", itemOffered: { "@type": "Service", name: item.name } };
        if (item.desc) offer.itemOffered.description = item.desc;
        const p = priceOf(item.price);
        if (p) { offer.price = p; offer.priceCurrency = "USD"; }
        if (group.name) offer.category = group.name;
        offers.push(offer);
      }
    }
    if (offers.length) {
      biz.hasOfferCatalog = {
        "@type": "OfferCatalog", name: "Services", itemListElement: offers.slice(0, 100),
      };
    }
  }

  return biz;
}

function buildHead(c) {
  const b = c.business || {};
  const title = (c.meta && c.meta.title) || b.name || "";
  const desc = (c.meta && c.meta.description) || b.tagline || "";
  const gal = (c.gallery && c.gallery.items) || [];
  const feat = gal.find(function (g) { return g && g.featured; }) || gal[0];
  const img = (c.hero && c.hero.image) || (feat && feat.image) || "";
  const tags = [];

  if (title) tags.push(`<title>${esc(title)}</title>`);
  if (desc) tags.push(`<meta name="description" content="${esc(desc)}" />`);
  if (BASE_URL) tags.push(`<link rel="canonical" href="${esc(BASE_URL)}/" />`);

  // The hero photo is the page's largest element and therefore its LCP. It is
  // referenced from inside the JS bundle, so without this the browser cannot
  // even discover it until the bundle has downloaded, parsed and rendered.
  // Preloading from the server-rendered head starts that fetch immediately.
  const gitems = (c.gallery && c.gallery.items) || [];
  const featured = gitems.find(function (g) { return g && g.featured; }) || gitems[0];
  const heroImg = (c.hero && c.hero.image) || (featured && featured.image) || "";
  if (heroImg) {
    tags.push(`<link rel="preload" as="image" href="${esc(heroImg)}" fetchpriority="high" />`);
  }

  tags.push('<meta property="og:type" content="website" />');
  if (title) tags.push(`<meta property="og:title" content="${esc(title)}" />`);
  if (desc) tags.push(`<meta property="og:description" content="${esc(desc)}" />`);
  if (BASE_URL) tags.push(`<meta property="og:url" content="${esc(BASE_URL)}/" />`);
  if (b.name) tags.push(`<meta property="og:site_name" content="${esc(b.name)}" />`);
  if (img) tags.push(`<meta property="og:image" content="${esc(img)}" />`);
  tags.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`);
  if (title) tags.push(`<meta name="twitter:title" content="${esc(title)}" />`);
  if (desc) tags.push(`<meta name="twitter:description" content="${esc(desc)}" />`);
  if (img) tags.push(`<meta name="twitter:image" content="${esc(img)}" />`);

  tags.push(
    '<script type="application/ld+json">' +
      JSON.stringify(buildJsonLd(c)).replace(/</g, "\\u003c") +
      "</script>"
  );

  // Counting, not tracking. No cookies, no storage, no identifiers - just
  // "someone did this today on this site". That is what a renewal
  // conversation needs, and it keeps the site out of consent-banner
  // territory entirely.
  //
  // sendBeacon because a tap on a tel: link navigates away immediately and
  // would cancel a normal fetch; beacons are handed to the browser to deliver
  // after the page is gone. Wrapped so a failure here can never break a page.
  if (SITE_ID) {
    tags.push(
      "<script>(function(){try{" +
        "var S=" + JSON.stringify(SITE_ID) + ",U=" + JSON.stringify(CMS + "/api/public/track") + ";" +
        "function t(e){try{var b=JSON.stringify({siteId:S,event:e});" +
        "if(navigator.sendBeacon){navigator.sendBeacon(U,new Blob([b],{type:'application/json'}));}" +
        "else{fetch(U,{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true});}}catch(x){}}" +
        "window.tcTrack=t;" +
        "if(document.visibilityState!=='prerender'){t('view');}" +
        "document.addEventListener('click',function(ev){" +
        "var a=ev.target.closest&&ev.target.closest('a');if(!a||!a.href)return;" +
        "if(a.href.indexOf('tel:')===0)t('call_tap');" +
        "else if(/maps\\.google|google\\.[a-z.]+\\/maps|maps\\.apple/.test(a.href))t('directions_tap');" +
        "},true);" +
        "}catch(e){}})();</script>"
    );
  }

  // A real summary in the HTML for crawlers that never run the app. It goes
  // INSIDE #root, because React's createRoot().render() replaces that node's
  // children on mount - so a visitor never sees it, while a crawler that stops
  // at the raw HTML still gets the name, address, phone, hours and prices the
  // page actually shows. It doubles as the no-JavaScript fallback.
  //
  // Not cloaking: this is the same information the rendered page displays.
  const hours = c.hours || [];
  const groups = itemGroups(c);
  const summary = [
    b.name ? `<h1>${esc(b.name)}</h1>` : "",
    b.tagline || (c.hero && c.hero.sub) ? `<p>${esc(b.tagline || c.hero.sub)}</p>` : "",
    b.address ? `<p>${esc(b.address)}</p>` : "",
    b.phone ? `<p><a href="tel:${esc(b.phoneHref || b.phone)}">${esc(b.phone)}</a></p>` : "",
    hours.length
      ? "<ul>" + hours.map((h) => `<li>${esc(h.day)}: ${esc(hoursText(h))}</li>`).join("") + "</ul>"
      : "",
    groups.length
      ? groups.slice(0, 12).map((g) =>
          `<h2>${esc(g.name || "")}</h2><ul>` +
          (g.items || []).slice(0, 40).map((i) =>
            `<li>${esc(i.name)}${i.price ? " &mdash; " + esc(i.price) : ""}` +
            `${i.desc ? ": " + esc(i.desc) : ""}</li>`).join("") +
          "</ul>").join("")
      : "",
  ].filter(Boolean).join("");

  return { tags: tags.join("\n  "), summary };
}

/* ------------------------------- caching -------------------------------- */
// Content changes when the owner edits it, not per request. Cache briefly so
// a burst of traffic does not hammer the CMS, and keep serving the last good
// copy if the CMS goes down.
let cache = { at: 0, data: null };
const TTL_MS = 5 * 60 * 1000;

async function getContent() {
  if (!SITE_ID) return null;
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${CMS}/api/public/sites/${SITE_ID}/content`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("CMS " + res.status);
    cache = { at: Date.now(), data: await res.json() };
  } catch (err) {
    console.error("[seo] content fetch failed:", err.message);
    // Keep the stale copy rather than dropping back to a bare head.
    if (!cache.data) return null;
  }
  return cache.data;
}

/** Rewrites index.html with a real head. Returns the original on any problem. */
async function renderIndex(html) {
  try {
    const c = await getContent();
    if (!c) return html;
    const built = buildHead(c);
    return html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<\/head>/i, "  " + built.tags + "\n</head>")
      .replace(/<div id="root"><\/div>/i,
        '<div id="root">' + built.summary + "</div>");
  } catch (err) {
    console.error("[seo] render failed:", err.message);
    return html;
  }
}

function robotsTxt() {
  return ["User-agent: *", "Allow: /", "", BASE_URL ? `Sitemap: ${BASE_URL}/sitemap.xml` : ""]
    .filter(Boolean).join("\n") + "\n";
}

function sitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`;
}

module.exports = { renderIndex, robotsTxt, sitemapXml, buildJsonLd, parseHours };
