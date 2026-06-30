/**
 * generate-sitemap.js
 * Build-time script: fetches all products + categories from the backend API
 * and writes frontend/public/sitemap.xml.
 *
 * Usage: node scripts/generate-sitemap.js
 * Or via npm script in frontend/package.json: "sitemap": "node ../scripts/generate-sitemap.js"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://trendy.vercel.app';
const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const OUTPUT_PATH = path.resolve(__dirname, '../frontend/public/sitemap.xml');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse JSON from ' + url + ': ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlEntry({ loc, changefreq = 'weekly', priority = '0.6', lastmod }) {
  const lastmodTag = lastmod ? '\n    <lastmod>' + lastmod + '</lastmod>' : '';
  return '\n  <url>\n    <loc>' + escapeXml(loc) + '</loc>' + lastmodTag +
    '\n    <changefreq>' + changefreq + '</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
}

async function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const urls = [];

  urls.push(urlEntry({ loc: SITE_URL + '/', changefreq: 'daily', priority: '1.0', lastmod: today }));
  urls.push(urlEntry({ loc: SITE_URL + '/shop', changefreq: 'daily', priority: '0.9', lastmod: today }));

  try {
    const catRes = await fetchJSON(API_BASE + '/api/v1/products/categories');
    const categories = catRes.categories || catRes.data || [];
    for (const cat of categories) {
      const name = typeof cat === 'string' ? cat : cat.name;
      if (name) {
        urls.push(urlEntry({ loc: SITE_URL + '/shop?category=' + encodeURIComponent(name), changefreq: 'daily', priority: '0.8', lastmod: today }));
      }
    }
    console.log('OK Added ' + categories.length + ' category URLs');
  } catch (err) { console.warn('WARN Could not fetch categories: ' + err.message); }

  let page = 1, totalPages = 1, productCount = 0;
  try {
    do {
      const res = await fetchJSON(API_BASE + '/api/v1/products?limit=100&page=' + page + '&sort=newest');
      const products = res.products || res.data || [];
      totalPages = (res.pagination && res.pagination.totalPages) || res.totalPages || 1;
      for (const product of products) {
        if (!product.slug) continue;
        const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : today;
        urls.push(urlEntry({ loc: SITE_URL + '/product/slug/' + escapeXml(product.slug), changefreq: 'weekly', priority: '0.7', lastmod }));
        productCount++;
      }
      page++;
    } while (page <= totalPages);
    console.log('OK Added ' + productCount + ' product URLs');
  } catch (err) { console.warn('WARN Could not fetch products: ' + err.message); }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join('') + '\n</urlset>\n';
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log('Sitemap written to: ' + OUTPUT_PATH + ' (' + urls.length + ' URLs)');
}

generateSitemap().catch((err) => { console.error('Sitemap generation failed:', err.message); process.exit(1); });
