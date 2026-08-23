const express = require('express');
const path = require('path');
const fs = require('fs');
const seo = require('./seo');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, 'public');

// Compresses HTML/CSS/JS on the way out. Cheap, and the biggest single win
// available on a text-heavy page over a phone connection.
try {
  app.use(require('compression')());
} catch (e) {
  console.warn('[server] compression unavailable:', e.message);
}

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(seo.robotsTxt());
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(seo.sitemapXml());
});

// The index has to be built per request (see seo.js), so it is handled before
// express.static would serve the raw file. Hashed assets under /assets keep
// the long cache; index.html must not, or an edit in the CMS would take an
// hour to show up.
const INDEX = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
async function sendIndex(req, res) {
  res.type('html').set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.send(await seo.renderIndex(INDEX));
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);

app.use(express.static(PUBLIC, {
  setHeaders(res, filePath) {
    if (/[.-][A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpg|jpeg|svg|webp)$/.test(filePath)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// Single-page app: any other path is a client route, not a 404.
app.get('*', sendIndex);

app.listen(PORT, () => {
  console.log(`Site listening on port ${PORT}`);
});
