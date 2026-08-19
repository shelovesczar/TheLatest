export const AD_SIZE_PRESETS = {
  standard: {
    desktop: { width: 970, height: 250 },
    tablet: { width: 728, height: 90 },
    mobile: { width: 320, height: 100 },
  },
  compact: {
    desktop: { width: 728, height: 90 },
    tablet: { width: 468, height: 60 },
    mobile: { width: 320, height: 50 },
  },
  sidebar: {
    desktop: { width: 300, height: 250 },
    tablet: { width: 300, height: 250 },
    mobile: { width: 320, height: 100 },
  },
};

export const AD_SLOT_PRESETS = {
  "top-stories-inline": {
    type: "standard",
    label: "Advertisement",
    sizes: {
      desktop: { width: 970, height: 250 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 100 },
    },
  },
  "home-feed-inline": {
    type: "standard",
    label: "Advertisement",
    sizes: {
      desktop: { width: 970, height: 90 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 50 },
    },
  },
  "section-break": {
    type: "standard",
    label: "Advertisement",
    sizes: {
      desktop: { width: 970, height: 90 },
      tablet: { width: 728, height: 90 },
      mobile: { width: 320, height: 50 },
    },
  },
  "sidebar-rail": {
    type: "sidebar",
    label: "Advertisement",
    sizes: {
      desktop: { width: 300, height: 600 },
      tablet: { width: 300, height: 250 },
      mobile: { width: 320, height: 100 },
    },
  },
  "article-sidebar": {
    type: "sidebar",
    label: "Advertisement",
    sizes: {
      desktop: { width: 300, height: 250 },
      tablet: { width: 300, height: 250 },
      mobile: { width: 320, height: 100 },
    },
  },
};
