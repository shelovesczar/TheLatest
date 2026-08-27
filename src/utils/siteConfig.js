import { SITE_URL } from "./seoMetadata.js";

const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, "");

export const SUPPORT_EMAIL = `support@${siteHost}`;
export const EDITORIAL_EMAIL = `editorial@${siteHost}`;
export const CORRECTIONS_EMAIL = `corrections@${siteHost}`;
export const PRIVACY_EMAIL = `privacy@${siteHost}`;
export const LEGAL_EMAIL = `legal@${siteHost}`;
export const DMCA_EMAIL = `dmca@${siteHost}`;
export const ADVERTISING_EMAIL = SUPPORT_EMAIL;
