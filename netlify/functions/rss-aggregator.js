import aggregator from "./rss-aggregator-impl.cjs";

export const handler = aggregator.handler;
export const RSS_FEEDS = aggregator.RSS_FEEDS;
export const buildManagedSourceId = aggregator.buildManagedSourceId;
export const buildManagedSourceKey = aggregator.buildManagedSourceKey;
export const getManagedSources = aggregator.getManagedSources;
export const getEffectiveFeedList = aggregator.getEffectiveFeedList;
