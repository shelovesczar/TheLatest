import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIndexableRoutes } from '../src/utils/siteRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')

const siteUrl = String(process.env.VITE_SITE_URL || 'https://thelatest.news').replace(/\/$/, '')
const today = new Date().toISOString().slice(0, 10)

const routes = getIndexableRoutes()

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrlEntry(route) {
  const normalizedRoute = route === '/' ? '' : route
  const priority = route === '/' ? '1.0' : route.includes('/topic/') || route.includes('/category/') ? '0.8' : '0.7'
  const changefreq = route === '/' ? 'hourly' : route.includes('/all-') ? 'hourly' : 'daily'

  return [
    '  <url>',
    `    <loc>${xmlEscape(`${siteUrl}${normalizedRoute}`)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n')
}

const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(buildUrlEntry),
  '</urlset>',
  ''
].join('\n')

const robotsTxt = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /dashboard',
  'Disallow: /saved',
  'Disallow: /following',
  'Disallow: /search',
  'Disallow: /article',
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  ''
].join('\n')

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8')
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8')

console.log(`Generated sitemap.xml and robots.txt for ${routes.length} routes.`)