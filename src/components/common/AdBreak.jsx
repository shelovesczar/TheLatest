import { useMemo } from 'react';
import './AdBreak.css';

const AD_SIZE_PRESETS = {
  standard: {
    desktop: { width: 970, height: 250 },
    tablet: { width: 728, height: 90 },
    mobile: { width: 320, height: 100 }
  },
  compact: {
    desktop: { width: 728, height: 90 },
    tablet: { width: 468, height: 60 },
    mobile: { width: 320, height: 50 }
  },
  sidebar: {
    desktop: { width: 300, height: 250 },
    tablet: { width: 300, height: 250 },
    mobile: { width: 320, height: 100 }
  }
};

const AD_SLOT_PRESETS = {
  'top-stories-inline': {
    type: 'standard',
    label: 'Advertisement',
    sizes: {
      desktop: { width: 970, height: 250 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 100 }
    }
  },
  'home-feed-inline': {
    type: 'standard',
    label: 'Advertisement',
    sizes: {
      desktop: { width: 970, height: 90 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 50 }
    }
  },
  'section-break': {
    type: 'standard',
    label: 'Advertisement',
    sizes: {
      desktop: { width: 970, height: 90 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 50 }
    }
  },
  'sidebar-rail': {
    type: 'sidebar',
    label: 'Advertisement',
    sizes: {
      desktop: { width: 300, height: 600 },
      tablet: { width: 300, height: 250 },
      mobile: { width: 320, height: 100 }
    }
  },
  'article-sidebar': {
    type: 'sidebar',
    label: 'Advertisement',
    sizes: {
      desktop: { width: 300, height: 250 },
      tablet: { width: 300, height: 250 },
      mobile: { width: 320, height: 100 }
    }
  }
};

const AD_CAMPAIGNS = [
  {
    brand: 'Northline',
    kicker: 'Business Banking',
    headline: 'Scale faster with an operating account built for modern teams.',
    support: 'Treasury yield, card controls, and clean finance workflows in one place.',
    badge: 'For fast-moving operators',
    cta: 'Learn More',
    points: ['Automated cash sweep', 'Same-day settlement', 'Granular spend controls'],
    theme: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
      accent: '#93c5fd',
      accentSoft: 'rgba(147, 197, 253, 0.18)',
      text: '#f8fbff'
    }
  },
  {
    brand: 'Aster Travel',
    kicker: 'Premium Escapes',
    headline: 'Plan the trip that feels impossible to forget.',
    support: 'Private itineraries, editorial guides, and member-only hotel perks across every major city.',
    badge: 'Summer booking window open',
    cta: 'See Destinations',
    points: ['Concierge booking', 'Editorial city guides', 'Flexible change policy'],
    theme: {
      background: 'linear-gradient(135deg, #1f2937 0%, #0f766e 100%)',
      accent: '#99f6e4',
      accentSoft: 'rgba(153, 246, 228, 0.18)',
      text: '#f1fffc'
    }
  },
  {
    brand: 'Helio EV',
    kicker: 'Electric Performance',
    headline: 'A quieter drive with range built for the whole week.',
    support: 'Charge faster, route smarter, and keep every cabin detail exactly where you want it.',
    badge: 'Reserve the 2026 model',
    cta: 'Build Yours',
    points: ['420-mile range', '15-min fast charge', 'Adaptive interior modes'],
    theme: {
      background: 'linear-gradient(135deg, #111827 0%, #7c3aed 100%)',
      accent: '#ddd6fe',
      accentSoft: 'rgba(221, 214, 254, 0.18)',
      text: '#fcfaff'
    }
  },
  {
    brand: 'Morrow Health',
    kicker: 'Personal Wellness',
    headline: 'Make your daily health data useful, not overwhelming.',
    support: 'Sleep, recovery, training, and nutrition recommendations that stay readable and actionable.',
    badge: 'Trusted by high-performers',
    cta: 'Start Tracking',
    points: ['Recovery scoring', 'Coach-style insights', 'Private health vault'],
    theme: {
      background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)',
      accent: '#a7f3d0',
      accentSoft: 'rgba(167, 243, 208, 0.18)',
      text: '#f5fffb'
    }
  }
];

const mergeResponsiveSizes = (type, sizes = {}) => {
  const fallback = AD_SIZE_PRESETS[type] || AD_SIZE_PRESETS.standard;

  return {
    desktop: { ...fallback.desktop, ...(sizes.desktop || {}) },
    tablet: { ...fallback.tablet, ...(sizes.tablet || {}) },
    mobile: { ...fallback.mobile, ...(sizes.mobile || {}) }
  };
};

const formatSize = ({ width, height }) => `${width} × ${height}`;

const hashValue = (value = '') => Array.from(String(value || '')).reduce(
  (total, char) => ((total * 31) + char.charCodeAt(0)) % 2147483647,
  7
);

const resolveAdConfig = ({ type = 'standard', slot, sizes, label }) => {
  const slotPreset = slot ? AD_SLOT_PRESETS[slot] : null;
  const resolvedType = slotPreset?.type || type;
  const slotSizes = slotPreset?.sizes || {};

  return {
    type: resolvedType,
    label: label || slotPreset?.label || 'Advertisement',
    sizes: mergeResponsiveSizes(resolvedType, {
      desktop: { ...(slotSizes.desktop || {}), ...(sizes?.desktop || {}) },
      tablet: { ...(slotSizes.tablet || {}), ...(sizes?.tablet || {}) },
      mobile: { ...(slotSizes.mobile || {}), ...(sizes?.mobile || {}) }
    })
  };
};

const getCreativeVariant = ({ slot, type, sponsor, variationKey, sizeLabel, campaignIndex }) => {
  if (Number.isInteger(campaignIndex)) {
    return AD_CAMPAIGNS[((campaignIndex % AD_CAMPAIGNS.length) + AD_CAMPAIGNS.length) % AD_CAMPAIGNS.length];
  }

  if (sponsor) {
    return {
      ...AD_CAMPAIGNS[0],
      brand: sponsor,
      kicker: 'Sponsored',
      headline: `See how ${sponsor} can show up in this premium format.`,
      support: 'This branded placeholder keeps the new ad treatment while reserving space for live creative.',
      badge: sizeLabel,
      cta: 'Visit Sponsor'
    };
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const seed = `${slot || type}-${variationKey || ''}-${dayKey}`;
  return AD_CAMPAIGNS[hashValue(seed) % AD_CAMPAIGNS.length];
};

const AdCreative = ({ creative, type, sizeLabel }) => (
  <div className={`ad-creative ${type === 'sidebar' ? 'sidebar' : 'leaderboard'}`}>
    <div className="ad-creative-copy">
      <div className="ad-creative-kicker">{creative.kicker}</div>
      <div className="ad-creative-brand">{creative.brand}</div>
      <div className="ad-creative-headline">{creative.headline}</div>
      <div className="ad-creative-support">{creative.support}</div>
      {type === 'sidebar' && (
        <div className="ad-creative-points">
          {creative.points.map((point) => (
            <span key={point} className="ad-creative-point">{point}</span>
          ))}
        </div>
      )}
    </div>

    <div className="ad-creative-side">
      <div className="ad-creative-badge">{creative.badge}</div>
      <div className="ad-creative-size">{sizeLabel}</div>
      <div className="ad-creative-cta">{creative.cta}</div>
    </div>
  </div>
);

const AdBreak = ({ type = 'standard', slot, sponsor, sizes, children, label = 'Advertisement', variationKey = '', campaignIndex }) => {
  const adConfig = resolveAdConfig({ type, slot, sizes, label });
  const responsiveSizes = adConfig.sizes;
  const desktopSizeLabel = formatSize(responsiveSizes.desktop);
  const creative = useMemo(
    () => getCreativeVariant({ slot, type: adConfig.type, sponsor, variationKey, sizeLabel: desktopSizeLabel, campaignIndex }),
    [adConfig.type, campaignIndex, desktopSizeLabel, slot, sponsor, variationKey]
  );

  const style = {
    '--ad-width-desktop': `${responsiveSizes.desktop.width}px`,
    '--ad-height-desktop': `${responsiveSizes.desktop.height}px`,
    '--ad-ratio-desktop': `${responsiveSizes.desktop.width} / ${responsiveSizes.desktop.height}`,
    '--ad-width-tablet': `${responsiveSizes.tablet.width}px`,
    '--ad-height-tablet': `${responsiveSizes.tablet.height}px`,
    '--ad-ratio-tablet': `${responsiveSizes.tablet.width} / ${responsiveSizes.tablet.height}`,
    '--ad-width-mobile': `${responsiveSizes.mobile.width}px`,
    '--ad-height-mobile': `${responsiveSizes.mobile.height}px`,
    '--ad-ratio-mobile': `${responsiveSizes.mobile.width} / ${responsiveSizes.mobile.height}`,
    '--ad-creative-bg': creative.theme.background,
    '--ad-creative-accent': creative.theme.accent,
    '--ad-creative-accent-soft': creative.theme.accentSoft,
    '--ad-creative-text': creative.theme.text
  };

  const content = children ? (
    <div className="ad-live-slot">
      {children}
    </div>
  ) : (
    <AdCreative creative={creative} type={adConfig.type} sizeLabel={desktopSizeLabel} />
  );

  if (adConfig.type === 'sidebar') {
    return (
      <div className="ad-break sidebar" style={style} data-slot={slot || adConfig.type}>
        <div className="ad-label">{adConfig.label}</div>
        <div className="ad-container ad-container-sidebar">
          <div className="ad-sidebar-inner">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-break ${adConfig.type}`} style={style} data-slot={slot || adConfig.type}>
      <div className="ad-label">{adConfig.label}</div>
      <div className="ad-container">
        {content}
      </div>
    </div>
  );
};

export default AdBreak;
