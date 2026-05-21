/**
 * RSS Feed Prioritization & Rotation Guide
 * 
 * OVERVIEW:
 * The social-feed-config.cjs now supports prioritized feed fetching with rotation cycles.
 * The RSS.app Social Media Bundle (LVYomWWGnBBWz7m9) is set as HIGH priority and
 * always fetches 60 items, while other feeds rotate in specified groups.
 * 
 * CONFIGURATION STRUCTURE:
 * ========================
 * 
 * 1. fetchConfig:
 *    - priorityWeight: 3 (multiplier for high-priority feeds)
 *    - standardWeight: 1 (multiplier for standard feeds)
 *    - rotationCycleLength: 7 (number of rotation positions)
 *    - defaultItemsPerFeed: 20 (base items per feed)
 * 
 * 2. Feed Properties:
 *    - priority: 'high' | 'standard'
 *    - weight: Multiplier for item count (3 = 3x more items)
 *    - maxItems: Override for max items to fetch (if not set, uses weight calculation)
 *    - rotationIndex: null (always active) | 0-6 (rotation position)
 * 
 * PRIORITY FEED (Always Active):
 * ==============================
 * RSS.app Social Media Bundle: priority='high', weight=3, maxItems=60
 * - Fetches up to 60 items every cycle
 * - Never rotated out
 * - Always included in results
 * 
 * ROTATIONAL FEEDS (Cycles):
 * ==========================
 * Secondary feeds are grouped into rotation positions (0-6).
 * Each cycle, only feeds matching the active rotation index are fetched.
 * 
 * Rotation Groups:
 * - Group 0: Homepage Aggregator, Hollywood Reporter, The Guardian Culture
 * - Group 1: KTLA, Rolling Stone, NPR Books
 * - Group 2: ESPN, Billboard, TED Radio Hour
 * - Group 3: ESPN NFL, Health.com
 * - Group 4: ESPN NBA, Travel + Leisure
 * - Group 5: ESPN Soccer, Food Network
 * - Group 6: Variety, National Geographic Travel
 * 
 * USAGE EXAMPLE:
 * ==============
 * 
 * In your fetchSocialFeeds or similar function:
 * 
 * ```javascript
 * const config = require('./social-feed-config.cjs');
 * 
 * // Get current cycle index (e.g., from database/state)
 * const cycleIndex = getCurrentFetchCycle();
 *
 * // Get feeds for this cycle
 * const activeFeeds = config.getFeedsForCycle(cycleIndex);
 * 
 * // Fetch from each feed
 * for (const feed of activeFeeds) {
 *   const maxItems = config.getMaxItemsForFeed(feed);
 *   // Fetch up to maxItems from this feed
 *   const items = await fetchFromFeed(feed, maxItems);
 *   // Process items...
 * }
 * 
 * // Increment cycle for next fetch
 * setCurrentFetchCycle(cycleIndex + 1);
 * ```
 * 
 * CUSTOMIZATION:
 * ==============
 * 
 * To change priority feed:
 * 1. Change priority: 'high' to desired feed
 * 2. Set weight and maxItems accordingly
 * 3. Set other high-priority feeds to priority: 'standard'
 * 
 * To change rotation cycle:
 * 1. Adjust rotationCycleLength in fetchConfig
 * 2. Update rotationIndex values (0 to cycleLength-1)
 * 3. Redistribute feeds across groups
 * 
 * FETCH BEHAVIOR:
 * ===============
 * 
 * Cycle 0: Fetch from Social Media Bundle (60) + Group 0 feeds (20 each)
 * Cycle 1: Fetch from Social Media Bundle (60) + Group 1 feeds (20 each)
 * Cycle 2: Fetch from Social Media Bundle (60) + Group 2 feeds (20 each)
 * ... (cycles 3-6)
 * Cycle 7: Back to Cycle 0 pattern (rotation repeats)
 * 
 * This ensures:
 * - RSS.app bundle always gets 60 items per fetch
 * - All other feeds are represented without overloading any single fetch
 * - Feed diversity across different cycles
 */

// Example fetch cycle management in Netlify function or Express middleware:

// Store cycle index in environment or database
let currentCycleIndex = 0;

async function fetchSocialFeeds() {
  const config = require('./social-feed-config.cjs');
  
  // Get active feeds for this cycle
  const activeFeeds = config.getFeedsForCycle(currentCycleIndex);
  
  console.log(`Fetching cycle #${currentCycleIndex}`);
  console.log(`Active feeds: ${activeFeeds.map(f => f.source).join(', ')}`);
  
  const allPosts = [];
  
  for (const feed of activeFeeds) {
    try {
      const maxItems = config.getMaxItemsForFeed(feed);
      console.log(`Fetching ${maxItems} items from ${feed.source}`);
      
      // Fetch from feed URL or route
      const feedUrl = feed.url || buildFeedUrl(feed.route);
      const posts = await fetchFromRSS(feedUrl, maxItems);
      
      allPosts.push(...posts);
    } catch (error) {
      console.error(`Error fetching from ${feed.source}:`, error);
    }
  }
  
  // Increment cycle for next fetch
  currentCycleIndex = (currentCycleIndex + 1) % config.fetchConfig.rotationCycleLength;
  
  return allPosts;
}

module.exports = { fetchSocialFeeds };
