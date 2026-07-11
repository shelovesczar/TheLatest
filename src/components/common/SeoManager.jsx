import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_NAME, buildRouteMetadata, buildStructuredData } from '../../utils/seoMetadata'

function upsertMeta(selector, attributes) {
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

function upsertLink(selector, rel, href) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function upsertStructuredData(id, payload) {
  let element = document.head.querySelector(`script[data-structured-data="${id}"]`)
  if (!element) {
    element = document.createElement('script')
    element.setAttribute('type', 'application/ld+json')
    element.setAttribute('data-structured-data', id)
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(payload)
}

function SeoManager() {
  const location = useLocation()

  useEffect(() => {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : undefined
    const routeLocation = {
      pathname: location.pathname,
      search: location.search,
      origin
    }

    const metadata = buildRouteMetadata(routeLocation, { baseUrl: origin })
    const structuredData = buildStructuredData(routeLocation, metadata)

    document.title = metadata.title
    upsertMeta('meta[name="description"]', { name: 'description', content: metadata.description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: metadata.robots })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: metadata.description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: metadata.openGraphType || 'website' })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.canonicalUrl })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: metadata.image })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: metadata.image })
    upsertLink('link[rel="canonical"]', 'canonical', metadata.canonicalUrl)
    upsertStructuredData('site-graph', structuredData)
  }, [location])

  return null
}

export default SeoManager