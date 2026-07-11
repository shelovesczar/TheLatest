import { CATEGORY_CONFIG } from './categoryConfig.js'
import { TOPIC_PAGE_CONFIG } from './navigationConfig.js'

export const INDEXABLE_STATIC_ROUTES = [
  '/',
  '/news',
  '/social',
  '/videos',
  '/opinions',
  '/podcasts',
  '/sports',
  '/about',
  '/advertise',
  '/editorial-standards',
  '/corrections',
  '/contact',
  '/privacy',
  '/terms',
  '/all-news',
  '/all-opinions',
  '/all-videos',
  '/all-podcasts'
]

export function getIndexableRoutes() {
  const categoryRoutes = Object.keys(CATEGORY_CONFIG).flatMap((category) => ([
    `/category/${category}`,
    `/category/${category}/all-news`,
    `/category/${category}/all-opinions`,
    `/category/${category}/all-videos`,
    `/category/${category}/all-podcasts`
  ]))

  const topicRoutes = Object.keys(TOPIC_PAGE_CONFIG).flatMap((slug) => ([
    `/topic/${slug}`,
    `/topic/${slug}/all-news`,
    `/topic/${slug}/all-opinions`,
    `/topic/${slug}/all-videos`,
    `/topic/${slug}/all-podcasts`
  ]))

  return [...new Set([...INDEXABLE_STATIC_ROUTES, ...categoryRoutes, ...topicRoutes])]
}