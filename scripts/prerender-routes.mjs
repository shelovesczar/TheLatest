import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { getIndexableRoutes } from '../src/utils/siteRoutes.js'
import { buildRouteMetadata, buildStructuredData, SITE_NAME } from '../src/utils/seoMetadata.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const indexPath = path.join(distDir, 'index.html')
const siteUrl = String(process.env.VITE_SITE_URL || 'https://thelatest.news').replace(/\/$/, '')

function upsertMeta(document, selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'content') {
        element.setAttribute(key, value)
      }
    })
    document.head.appendChild(element)
  }

  if (attributes.content !== undefined) {
    element.setAttribute('content', attributes.content)
  }
}

function upsertLink(document, selector, rel, href) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function upsertStructuredData(document, id, payload) {
  let element = document.head.querySelector(`script[data-structured-data="${id}"]`)
  if (!element) {
    element = document.createElement('script')
    element.setAttribute('type', 'application/ld+json')
    element.setAttribute('data-structured-data', id)
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(payload)
}

function buildRouteHtml(template, route) {
  const dom = new JSDOM(template)
  const { document } = dom.window
  const location = { pathname: route, search: '', origin: siteUrl }
  const metadata = buildRouteMetadata(location, { baseUrl: siteUrl })
  const structuredData = buildStructuredData(location, metadata)

  document.title = metadata.title
  upsertMeta(document, 'meta[name="description"]', { name: 'description', content: metadata.description })
  upsertMeta(document, 'meta[name="robots"]', { name: 'robots', content: metadata.robots })
  upsertMeta(document, 'meta[property="og:title"]', { property: 'og:title', content: metadata.title })
  upsertMeta(document, 'meta[property="og:description"]', { property: 'og:description', content: metadata.description })
  upsertMeta(document, 'meta[property="og:type"]', { property: 'og:type', content: metadata.openGraphType || 'website' })
  upsertMeta(document, 'meta[property="og:url"]', { property: 'og:url', content: metadata.canonicalUrl })
  upsertMeta(document, 'meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
  upsertMeta(document, 'meta[property="og:image"]', { property: 'og:image', content: metadata.image })
  upsertMeta(document, 'meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
  upsertMeta(document, 'meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title })
  upsertMeta(document, 'meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description })
  upsertMeta(document, 'meta[name="twitter:image"]', { name: 'twitter:image', content: metadata.image })
  upsertLink(document, 'link[rel="canonical"]', 'canonical', metadata.canonicalUrl)
  upsertStructuredData(document, 'site-graph', structuredData)
  document.documentElement.setAttribute('data-prerendered-route', route)

  return dom.serialize()
}

function writeRouteFile(route, html) {
  if (route === '/') {
    fs.writeFileSync(indexPath, html, 'utf8')
    return
  }

  const outputDir = path.join(distDir, route.replace(/^\//, ''))
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8')
}

if (!fs.existsSync(indexPath)) {
  throw new Error(`Built index.html was not found at ${indexPath}`)
}

const template = fs.readFileSync(indexPath, 'utf8')
const routes = getIndexableRoutes()

routes.forEach((route) => {
  const html = buildRouteHtml(template, route)
  writeRouteFile(route, html)
})

console.log(`Prerendered ${routes.length} route shells.`)