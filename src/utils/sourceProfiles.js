import { deriveMediaOutlet } from "./sourceUtils.js";

export const SOURCE_REGISTRY = [
  {
    displayName: "Reuters",
    names: ["reuters", "reuters world", "reuters business"],
    slug: "reuters",
    homepage: "https://www.reuters.com/",
    country: "United Kingdom / Global",
    founded: "1851",
    ownershipName: "Thomson Reuters",
    ownershipType: "Public company",
    ownershipSummary:
      "Reuters operates within Thomson Reuters, a publicly traded information and media business.",
    fundingModel:
      "Wire service, enterprise data products, licensing, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Global wire service focused on fast, attribution-heavy reporting across markets, politics, business, and international affairs.",
    methodologyNote:
      "Frequently used as a baseline reporting source because of its sourcing discipline and broad international footprint.",
  },
  {
    displayName: "BBC News",
    names: ["bbc", "bbc news", "bbc world", "bbc global news podcast"],
    slug: "bbc-news",
    homepage: "https://www.bbc.com/news",
    country: "United Kingdom",
    founded: "1922",
    ownershipName: "British Broadcasting Corporation",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Publicly funded broadcaster operating under a royal charter with editorial obligations and public-service remit.",
    fundingModel:
      "Primarily UK licence-fee funding with some commercial subsidiaries.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Public-service broadcaster with strong breaking-news reach, international bureaus, and a broad general-news agenda.",
    methodologyNote:
      "Useful for broad international framing and public-interest coverage, especially on global and UK stories.",
  },
  {
    displayName: "Associated Press",
    names: ["associated press", "ap", "ap news"],
    slug: "associated-press",
    homepage: "https://apnews.com/",
    country: "United States / Global",
    founded: "1846",
    ownershipName: "Associated Press member organizations",
    ownershipType: "Cooperative",
    ownershipSummary:
      "News cooperative owned by member news organizations rather than a single corporate parent.",
    fundingModel:
      "Licensing, syndication, and service agreements with member outlets and customers.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Wire service with strong original reporting, particularly in breaking news, politics, disasters, and sports.",
    methodologyNote:
      "Often a useful benchmark because its coverage is widely syndicated and built for downstream editorial reuse.",
  },
  {
    displayName: "NPR",
    names: ["npr", "national public radio"],
    slug: "npr",
    homepage: "https://www.npr.org/",
    country: "United States",
    founded: "1970",
    ownershipName: "National Public Radio",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Nonprofit newsroom supported by member stations, underwriting, donations, grants, and some public funding.",
    fundingModel:
      "Member support, sponsorship, grants, and limited institutional funding.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Public radio newsroom known for explanatory coverage, audio storytelling, and issue-driven domestic reporting.",
    methodologyNote:
      "Often adds depth and explanatory framing rather than pure wire-style brevity.",
  },
  {
    displayName: "New York Times",
    names: [
      "new york times",
      "nyt",
      "the new york times",
      "new york times us",
      "new york times politics",
      "nyt business",
      "nyt arts",
      "nyt technology",
      "nyt well",
      "nyt books",
    ],
    slug: "new-york-times",
    homepage: "https://www.nytimes.com/",
    country: "United States",
    founded: "1851",
    ownershipName: "The New York Times Company",
    ownershipType: "Public company",
    ownershipSummary:
      "Publicly traded publisher focused on subscriptions and related media products.",
    fundingModel:
      "Digital and print subscriptions, advertising, licensing, and consumer bundles.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "National and international newsroom with strong original reporting, investigations, and a large subscriber base.",
    methodologyNote:
      "Useful for original reporting depth and agenda-setting coverage, especially on US politics and international affairs.",
  },
  {
    displayName: "Washington Post",
    names: [
      "washington post",
      "the washington post",
      "washington post politics",
      "post reports",
    ],
    slug: "washington-post",
    homepage: "https://www.washingtonpost.com/",
    country: "United States",
    founded: "1877",
    ownershipName: "Nash Holdings / Jeff Bezos",
    ownershipType: "Privately held",
    ownershipSummary:
      "Owned by Nash Holdings, the private investment vehicle of Jeff Bezos.",
    fundingModel:
      "Subscriptions, advertising, enterprise products, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "National newsroom with strong political, investigative, and policy coverage centered on Washington and federal institutions.",
    methodologyNote:
      "Particularly relevant on federal politics, policy, national security, and accountability reporting.",
  },
  {
    displayName: "CNN",
    names: ["cnn", "cnn politics"],
    slug: "cnn",
    homepage: "https://www.cnn.com/",
    country: "United States / Global",
    founded: "1980",
    ownershipName: "Warner Bros. Discovery",
    ownershipType: "Public company division",
    ownershipSummary:
      "Cable and digital news network operating within Warner Bros. Discovery.",
    fundingModel:
      "Advertising, carriage fees, streaming products, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "24-hour news network with fast updates, live coverage infrastructure, and a large digital front page.",
    methodologyNote:
      "Often useful for speed and live framing, but headline tone can differ from wire-style outlets.",
  },
  {
    displayName: "Fox News",
    names: ["fox news"],
    slug: "fox-news",
    homepage: "https://www.foxnews.com/",
    country: "United States",
    founded: "1996",
    ownershipName: "Fox Corporation",
    ownershipType: "Public company division",
    ownershipSummary:
      "Cable and digital news division within publicly traded Fox Corporation.",
    fundingModel:
      "Advertising, carriage fees, digital traffic, and video monetization.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "Mixed factuality",
    description:
      "Large conservative-leaning television and digital network with strong audience reach across US political and cultural news.",
    methodologyNote:
      "Important for understanding how a major right-leaning audience is seeing a story, especially in US politics.",
  },
  {
    displayName: "The Guardian",
    names: [
      "the guardian",
      "guardian",
      "the guardian us",
      "the guardian politics",
      "the guardian business",
      "the guardian tech",
      "the guardian culture",
      "the guardian books",
      "the guardian film",
      "the guardian tv",
      "the guardian music",
      "the guardian lifestyle",
    ],
    slug: "the-guardian",
    homepage: "https://www.theguardian.com/",
    country: "United Kingdom",
    founded: "1821",
    ownershipName: "Scott Trust Limited",
    ownershipType: "Trust-owned",
    ownershipSummary:
      "Owned by the Scott Trust, designed to preserve editorial independence rather than maximize shareholder returns.",
    fundingModel:
      "Reader contributions, memberships, advertising, and commercial partnerships.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Global news publisher with strong politics, climate, culture, and opinion coverage.",
    methodologyNote:
      "Useful for international framing, climate coverage, and a progressive editorial lens on public affairs.",
  },
  {
    displayName: "Wall Street Journal",
    names: [
      "wall street journal",
      "wsj",
      "the wall street journal",
      "wsj opinion",
      "the journal",
    ],
    slug: "wall-street-journal",
    homepage: "https://www.wsj.com/",
    country: "United States",
    founded: "1889",
    ownershipName: "News Corp",
    ownershipType: "Public company division",
    ownershipSummary:
      "Business and financial publisher operating within News Corp.",
    fundingModel:
      "Subscriptions, advertising, and enterprise business products.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "High factuality",
    description:
      "Business-focused newsroom with strong markets, policy, and corporate reporting.",
    methodologyNote:
      "Especially useful for business, finance, and policy stories where market framing matters.",
  },
  {
    displayName: "Politico",
    names: ["politico"],
    slug: "politico",
    homepage: "https://www.politico.com/",
    country: "United States / Europe",
    founded: "2007",
    ownershipName: "Axel Springer",
    ownershipType: "Privately held media group division",
    ownershipSummary: "Political and policy newsroom owned by Axel Springer.",
    fundingModel:
      "Advertising, subscriptions, and professional policy intelligence products.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Politics and policy newsroom focused on institutions, campaigns, legislative strategy, and insider reporting.",
    methodologyNote:
      "Useful for procedural detail, elite signaling, and institutional reporting rather than broad-population framing.",
  },
  {
    displayName: "Bloomberg",
    names: ["bloomberg", "bloomberg news"],
    slug: "bloomberg",
    homepage: "https://www.bloomberg.com/",
    country: "United States / Global",
    founded: "1990",
    ownershipName: "Bloomberg L.P.",
    ownershipType: "Privately held",
    ownershipSummary: "Privately held media and financial-data company.",
    fundingModel:
      "Terminal/data products, enterprise services, advertising, subscriptions, and syndication.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Business and markets newsroom with strong global financial, policy, and economic coverage.",
    methodologyNote:
      "Often strongest on market-moving detail, executive decisions, and data-backed economic reporting.",
  },
  {
    displayName: "CNBC",
    names: ["cnbc"],
    slug: "cnbc",
    homepage: "https://www.cnbc.com/",
    country: "United States / Global",
    founded: "1989",
    ownershipName: "NBCUniversal",
    ownershipType: "Public company division",
    ownershipSummary: "Business news network operating inside NBCUniversal.",
    fundingModel:
      "Advertising, carriage, digital traffic, and event sponsorship.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Markets-first business network with strong corporate, investor, and macroeconomic coverage.",
    methodologyNote:
      "Useful for live market reaction and business-news prioritization.",
  },
  {
    displayName: "LA Times",
    names: [
      "la times",
      "la times business",
      "la times entertainment",
      "la times sports",
    ],
    slug: "la-times",
    homepage: "https://www.latimes.com/",
    country: "United States",
    founded: "1881",
    ownershipName: "Nant Capital / Patrick Soon-Shiong",
    ownershipType: "Privately held",
    ownershipSummary:
      "Privately held metro newsroom controlled by Patrick Soon-Shiong through Nant Capital.",
    fundingModel: "Subscriptions, advertising, events, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Large West Coast metro newsroom with strong California, national, and cultural reporting.",
    methodologyNote:
      "Useful for major California stories and as a mainstream US reporting source with broad newsroom infrastructure.",
  },
  {
    displayName: "NBC News",
    names: ["nbc news"],
    slug: "nbc-news",
    homepage: "https://www.nbcnews.com/",
    country: "United States",
    founded: "1940",
    ownershipName: "NBCUniversal",
    ownershipType: "Public company division",
    ownershipSummary: "National news division operating within NBCUniversal.",
    fundingModel:
      "Advertising, distribution fees, licensing, and digital traffic.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "National broadcast and digital newsroom with strong breaking-news reach and broad US coverage.",
    methodologyNote:
      "Useful for mainstream US breaking news and network-scale live reporting.",
  },
  {
    displayName: "ABC News",
    names: ["abc news"],
    slug: "abc-news",
    homepage: "https://abcnews.go.com/",
    country: "United States",
    founded: "1945",
    ownershipName: "The Walt Disney Company",
    ownershipType: "Public company division",
    ownershipSummary: "US broadcast news division operating within Disney.",
    fundingModel:
      "Advertising, distribution, sponsorship, and digital traffic.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Broadcast and digital newsroom focused on breaking news, US politics, and general-interest coverage.",
    methodologyNote:
      "Useful for broad US audience framing and mainstream breaking-news coverage.",
  },
  {
    displayName: "CBS News",
    names: ["cbs news"],
    slug: "cbs-news",
    homepage: "https://www.cbsnews.com/",
    country: "United States",
    founded: "1927",
    ownershipName: "Paramount Global",
    ownershipType: "Public company division",
    ownershipSummary:
      "National broadcast and digital news division within Paramount Global.",
    fundingModel:
      "Advertising, distribution, sponsorship, and digital traffic.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Mainstream broadcast newsroom with broad US and international general-news coverage.",
    methodologyNote:
      "Useful for mainstream broadcast framing and broad consumer-facing news coverage.",
  },
  {
    displayName: "USA Today",
    names: ["usa today"],
    slug: "usa-today",
    homepage: "https://www.usatoday.com/",
    country: "United States",
    founded: "1982",
    ownershipName: "Gannett",
    ownershipType: "Public company",
    ownershipSummary: "National newspaper owned by publicly traded Gannett.",
    fundingModel: "Advertising, subscriptions, licensing, and syndication.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "National mass-market newsroom with broad general-interest news, sports, and consumer coverage.",
    methodologyNote:
      "Useful for mainstream national coverage and a wide-audience framing of US news.",
  },
  {
    displayName: "Al Jazeera",
    names: ["al jazeera"],
    slug: "al-jazeera",
    homepage: "https://www.aljazeera.com/",
    country: "Qatar / Global",
    founded: "1996",
    ownershipName: "Al Jazeera Media Network",
    ownershipType: "Public corporation",
    ownershipSummary:
      "State-funded international media network with a global English-language news operation.",
    fundingModel: "Public funding with some commercial activity.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "International broadcaster with strong global-south coverage, conflict reporting, and live-news capacity.",
    methodologyNote:
      "Useful for international framing and stories where Western outlets may not reflect the full global context.",
  },
  {
    displayName: "Deutsche Welle",
    names: ["deutsche welle"],
    slug: "deutsche-welle",
    homepage: "https://www.dw.com/",
    country: "Germany / Global",
    founded: "1953",
    ownershipName: "Deutsche Welle",
    ownershipType: "Public corporation",
    ownershipSummary:
      "German public international broadcaster funded by the federal government.",
    fundingModel: "Public funding.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "International public broadcaster with strong Europe, climate, and explanatory coverage.",
    methodologyNote:
      "Useful for European and international context beyond US-centric framing.",
  },
  {
    displayName: "France 24",
    names: ["france 24"],
    slug: "france-24",
    homepage: "https://www.france24.com/",
    country: "France / Global",
    founded: "2006",
    ownershipName: "France Medias Monde",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Publicly funded French international broadcaster operating within France Medias Monde.",
    fundingModel: "Public funding.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "International broadcaster focused on global affairs, diplomacy, and breaking world news.",
    methodologyNote:
      "Useful for international diplomatic context and broader world-news framing.",
  },
  {
    displayName: "CBC News",
    names: ["cbc news"],
    slug: "cbc-news",
    homepage: "https://www.cbc.ca/news",
    country: "Canada",
    founded: "1941",
    ownershipName: "Canadian Broadcasting Corporation",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Canadian public broadcaster with national TV, radio, and digital news operations.",
    fundingModel: "Public funding, commercial revenue, and partnerships.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Public-service newsroom with strong Canadian national and international coverage.",
    methodologyNote:
      "Useful for Canadian context and mainstream public-broadcaster framing.",
  },
  {
    displayName: "ABC News Australia",
    names: ["abc news australia"],
    slug: "abc-news-australia",
    homepage: "https://www.abc.net.au/news/",
    country: "Australia",
    founded: "1932",
    ownershipName: "Australian Broadcasting Corporation",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Australian public broadcaster with national television, radio, and digital news operations.",
    fundingModel: "Public funding.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Public-service broadcaster with strong Australian domestic and Asia-Pacific coverage.",
    methodologyNote:
      "Useful for Australian context and public-broadcaster framing on regional news.",
  },
  {
    displayName: "The Hill",
    names: ["the hill", "the hill opinion"],
    slug: "the-hill",
    homepage: "https://thehill.com/",
    country: "United States",
    founded: "1994",
    ownershipName: "Nexstar Media Group",
    ownershipType: "Public company division",
    ownershipSummary:
      "Washington-focused political outlet owned by Nexstar Media Group.",
    fundingModel: "Advertising, sponsorship, events, and digital traffic.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Politics and policy outlet centered on Congress, campaigns, and federal institutions.",
    methodologyNote:
      "Useful for day-to-day Washington process coverage and Hill-centric political reporting.",
  },
  {
    displayName: "New York Post",
    names: ["new york post"],
    slug: "new-york-post",
    homepage: "https://nypost.com/",
    country: "United States",
    founded: "1801",
    ownershipName: "News Corp",
    ownershipType: "Public company division",
    ownershipSummary:
      "Tabloid newspaper and digital outlet operating within News Corp.",
    fundingModel: "Advertising, subscriptions, licensing, and syndication.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "Mixed factuality",
    description:
      "High-velocity tabloid-style outlet with strong audience reach in politics, sports, and culture.",
    methodologyNote:
      "Useful for understanding a populist tabloid framing, but headline tone can outrun wire-style caution.",
  },
  {
    displayName: "Financial Times",
    names: ["financial times"],
    slug: "financial-times",
    homepage: "https://www.ft.com/",
    country: "United Kingdom / Global",
    founded: "1888",
    ownershipName: "Nikkei, Inc.",
    ownershipType: "Privately held media group division",
    ownershipSummary: "International financial newspaper owned by Nikkei.",
    fundingModel:
      "Subscriptions, enterprise products, advertising, and events.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Global financial newsroom known for markets, corporate, and policy reporting.",
    methodologyNote:
      "Useful for business, economics, and international policy stories where investor and institutional context matters.",
  },
  {
    displayName: "The Economist",
    names: ["the economist", "the intelligence economist"],
    slug: "the-economist",
    homepage: "https://www.economist.com/",
    country: "United Kingdom / Global",
    founded: "1843",
    ownershipName: "The Economist Group",
    ownershipType: "Privately held",
    ownershipSummary:
      "International news and analysis publisher operating through The Economist Group.",
    fundingModel: "Subscriptions, advertising, events, and research products.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Global analysis-driven outlet with strong economics, geopolitics, and institutional coverage.",
    methodologyNote:
      "Useful for synthesized international analysis and policy framing rather than minute-by-minute breaking updates.",
  },
  {
    displayName: "Forbes",
    names: ["forbes", "forbes business"],
    slug: "forbes",
    homepage: "https://www.forbes.com/",
    country: "United States / Global",
    founded: "1917",
    ownershipName: "Forbes Media",
    ownershipType: "Privately held",
    ownershipSummary: "Business publisher operating under Forbes Media.",
    fundingModel:
      "Advertising, licensing, brand extensions, events, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Business and entrepreneurship outlet with a mix of newsroom reporting and contributor-driven coverage.",
    methodologyNote:
      "Useful for business sentiment and entrepreneurship coverage, but contributor pieces should be separated from straight reporting where possible.",
  },
  {
    displayName: "MarketWatch",
    names: ["marketwatch"],
    slug: "marketwatch",
    homepage: "https://www.marketwatch.com/",
    country: "United States",
    founded: "1997",
    ownershipName: "Dow Jones / News Corp",
    ownershipType: "Public company division",
    ownershipSummary:
      "Markets and personal-finance outlet operating within Dow Jones and News Corp.",
    fundingModel: "Advertising, syndication, data products, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Markets-focused newsroom with strong coverage of equities, macroeconomics, and consumer finance.",
    methodologyNote:
      "Useful for investor-facing context and real-time market-driven business reporting.",
  },
  {
    displayName: "Vox",
    names: ["vox", "recode", "vox conversations"],
    slug: "vox",
    homepage: "https://www.vox.com/",
    country: "United States",
    founded: "2014",
    ownershipName: "Vox Media",
    ownershipType: "Privately held media group division",
    ownershipSummary: "Explanatory news outlet operating within Vox Media.",
    fundingModel:
      "Advertising, sponsorship, licensing, podcasts, and commerce.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Explanatory news outlet focused on policy, politics, and technology through an analysis-heavy lens.",
    methodologyNote:
      "Useful for explanatory framing and issue context rather than straight-wire brevity.",
  },
  {
    displayName: "Slate",
    names: ["slate", "slate political gabfest"],
    slug: "slate",
    homepage: "https://slate.com/",
    country: "United States",
    founded: "1996",
    ownershipName: "The Slate Group / Graham Holdings",
    ownershipType: "Public company division",
    ownershipSummary:
      "Digital magazine operating within Graham Holdings through The Slate Group.",
    fundingModel: "Advertising, subscriptions, podcasts, and sponsorship.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Digital magazine with strong opinion, culture, and political analysis output.",
    methodologyNote:
      "Useful for analysis and opinion framing, with more voice-driven presentation than straight-news wires.",
  },
  {
    displayName: "The Atlantic",
    names: [
      "the atlantic",
      "the atlantic tech",
      "the atlantic ideas",
      "the atlantic politics",
    ],
    slug: "the-atlantic",
    homepage: "https://www.theatlantic.com/",
    country: "United States",
    founded: "1857",
    ownershipName: "Emerson Collective",
    ownershipType: "Privately held",
    ownershipSummary:
      "Magazine and digital newsroom majority controlled by Emerson Collective.",
    fundingModel: "Subscriptions, advertising, events, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Magazine newsroom known for essays, long-form analysis, and reported features on politics and culture.",
    methodologyNote:
      "Useful for higher-level analysis and reported essays rather than rapid commodity news.",
  },
  {
    displayName: "TechCrunch",
    names: ["techcrunch"],
    slug: "techcrunch",
    homepage: "https://techcrunch.com/",
    country: "United States / Global",
    founded: "2005",
    ownershipName: "Yahoo",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Technology newsroom operating within Yahoo's media portfolio.",
    fundingModel: "Advertising, events, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Technology news outlet with strong startup, venture, and product coverage.",
    methodologyNote:
      "Useful for startup ecosystem reporting and fast-moving product or platform developments.",
  },
  {
    displayName: "The Verge",
    names: ["the verge", "the verge tech"],
    slug: "the-verge",
    homepage: "https://www.theverge.com/",
    country: "United States",
    founded: "2011",
    ownershipName: "Vox Media",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Technology and culture publication operating within Vox Media.",
    fundingModel: "Advertising, sponsorship, commerce, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Technology and culture outlet with strong device, platform, policy, and internet coverage.",
    methodologyNote:
      "Useful for platform policy, consumer technology, and culture-tech crossover stories.",
  },
  {
    displayName: "Wired",
    names: ["wired"],
    slug: "wired",
    homepage: "https://www.wired.com/",
    country: "United States / Global",
    founded: "1993",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Technology and science magazine operating within Condé Nast.",
    fundingModel: "Advertising, subscriptions, events, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Technology magazine with strong reporting on digital culture, cybersecurity, and science.",
    methodologyNote:
      "Useful for deeper reported technology features and investigative work around internet platforms and security.",
  },
  {
    displayName: "Ars Technica",
    names: ["ars technica"],
    slug: "ars-technica",
    homepage: "https://arstechnica.com/",
    country: "United States",
    founded: "1998",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary: "Technology publication operating within Condé Nast.",
    fundingModel: "Advertising, subscriptions, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Technology publication known for detailed reporting on computing, science, policy, and internet infrastructure.",
    methodologyNote:
      "Useful when technical depth matters more than broad consumer framing.",
  },
  {
    displayName: "CNET",
    names: ["cnet"],
    slug: "cnet",
    homepage: "https://www.cnet.com/",
    country: "United States",
    founded: "1994",
    ownershipName: "Ziff Davis",
    ownershipType: "Public company division",
    ownershipSummary:
      "Consumer technology publication operating within Ziff Davis.",
    fundingModel: "Advertising, commerce, affiliate revenue, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Consumer technology outlet focused on product news, reviews, and mainstream tech coverage.",
    methodologyNote:
      "Useful for consumer-device coverage and general tech news with a mainstream audience focus.",
  },
  {
    displayName: "ESPN",
    names: [
      "espn",
      "espn nfl",
      "espn nba",
      "espn mlb",
      "espn soccer",
      "espn nhl",
      "espn golf",
      "espn tennis",
    ],
    slug: "espn",
    homepage: "https://www.espn.com/",
    country: "United States / Global",
    founded: "1979",
    ownershipName: "ESPN / The Walt Disney Company",
    ownershipType: "Public company division",
    ownershipSummary:
      "Sports network and digital news operation controlled by Disney through ESPN.",
    fundingModel:
      "Advertising, carriage fees, subscriptions, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Sports network with broad live, beat, and league coverage across major US and global sports.",
    methodologyNote:
      "Useful as a primary sports-reporting source, especially for fast injury, transaction, and game-context updates.",
  },
  {
    displayName: "Entertainment Weekly",
    names: ["entertainment weekly"],
    slug: "entertainment-weekly",
    homepage: "https://ew.com/",
    country: "United States",
    founded: "1990",
    ownershipName: "Dotdash Meredith / IAC",
    ownershipType: "Public company division",
    ownershipSummary:
      "Entertainment publication operating within Dotdash Meredith and IAC.",
    fundingModel: "Advertising, commerce, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment publication focused on television, film, celebrity, and streaming coverage.",
    methodologyNote:
      "Useful for mainstream entertainment coverage and culture-industry news.",
  },
  {
    displayName: "Rolling Stone",
    names: ["rolling stone"],
    slug: "rolling-stone",
    homepage: "https://www.rollingstone.com/",
    country: "United States",
    founded: "1967",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Music and culture publication owned by Penske Media Corporation.",
    fundingModel: "Advertising, subscriptions, events, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "Industry reporting",
    description:
      "Culture and music publication with strong coverage of entertainment, celebrity, and politics-adjacent culture.",
    methodologyNote:
      "Useful for culture coverage and entertainment narratives, with more voice than straight general-news reporting.",
  },
  {
    displayName: "WebMD",
    names: ["webmd"],
    slug: "webmd",
    homepage: "https://www.webmd.com/",
    country: "United States",
    founded: "1996",
    ownershipName: "WebMD / Internet Brands",
    ownershipType: "Privately held",
    ownershipSummary:
      "Health-information publisher operating within Internet Brands.",
    fundingModel: "Advertising, sponsorship, partnerships, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Health-information publisher focused on consumer medical explainers and wellness coverage.",
    methodologyNote:
      "Useful for consumer health context, but treatment and diagnosis claims should still be checked against primary clinical sources.",
  },
  {
    displayName: "Channel NewsAsia",
    names: ["channel newsasia"],
    slug: "channel-newsasia",
    homepage: "https://www.channelnewsasia.com/",
    country: "Singapore / Asia-Pacific",
    founded: "1999",
    ownershipName: "Mediacorp",
    ownershipType: "Public corporation",
    ownershipSummary:
      "Singapore-based regional news outlet operating within Mediacorp.",
    fundingModel: "Public backing, advertising, sponsorship, and distribution.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Asia-Pacific news outlet with strong Southeast Asia, business, and regional affairs coverage.",
    methodologyNote:
      "Useful for regional context on Asia-Pacific stories that are often underweighted in US and UK coverage.",
  },
  {
    displayName: "Fast Company",
    names: ["fast company"],
    slug: "fast-company",
    homepage: "https://www.fastcompany.com/",
    country: "United States",
    founded: "1995",
    ownershipName: "Mansueto Ventures",
    ownershipType: "Privately held",
    ownershipSummary:
      "Business and innovation publication owned by Mansueto Ventures.",
    fundingModel:
      "Advertising, events, sponsorship, subscriptions, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Business and innovation outlet focused on leadership, work, technology, and company strategy.",
    methodologyNote:
      "Useful for business culture, workplace trends, and innovation coverage rather than pure market reporting.",
  },
  {
    displayName: "Fortune",
    names: ["fortune"],
    slug: "fortune",
    homepage: "https://fortune.com/",
    country: "United States / Global",
    founded: "1930",
    ownershipName: "Chatchaval Jiaravanon",
    ownershipType: "Privately held",
    ownershipSummary:
      "Business publication controlled by Thai investor Chatchaval Jiaravanon.",
    fundingModel:
      "Advertising, subscriptions, conferences, lists, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Business and corporate-news outlet known for executive reporting, rankings, and company coverage.",
    methodologyNote:
      "Useful for corporate and leadership reporting with a mainstream business-publication lens.",
  },
  {
    displayName: "Engadget",
    names: ["engadget"],
    slug: "engadget",
    homepage: "https://www.engadget.com/",
    country: "United States / Global",
    founded: "2004",
    ownershipName: "Yahoo",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Consumer technology publication operating within Yahoo's media portfolio.",
    fundingModel:
      "Advertising, sponsorship, affiliate commerce, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Consumer technology site covering gadgets, platforms, digital culture, and industry developments.",
    methodologyNote:
      "Useful for mainstream consumer-tech coverage and product-oriented tech news.",
  },
  {
    displayName: "Bleacher Report",
    names: ["bleacher report"],
    slug: "bleacher-report",
    homepage: "https://bleacherreport.com/",
    country: "United States",
    founded: "2005",
    ownershipName: "Warner Bros. Discovery",
    ownershipType: "Public company division",
    ownershipSummary:
      "Sports media property operating within Warner Bros. Discovery.",
    fundingModel:
      "Advertising, sponsorship, social distribution, and branded content.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Sports outlet focused on highlights, league coverage, and fan-facing sports news.",
    methodologyNote:
      "Useful for sports culture and league updates, though its tone is often more fan-oriented than beat-wire reporting.",
  },
  {
    displayName: "CBS Sports",
    names: ["cbs sports"],
    slug: "cbs-sports",
    homepage: "https://www.cbssports.com/",
    country: "United States",
    founded: "2001",
    ownershipName: "Paramount Global",
    ownershipType: "Public company division",
    ownershipSummary: "Sports media brand operating within Paramount Global.",
    fundingModel:
      "Advertising, sponsorship, licensing, and digital subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Broad sports outlet covering major leagues, events, and fantasy-relevant sports news.",
    methodologyNote:
      "Useful for general sports coverage with mainstream US league emphasis.",
  },
  {
    displayName: "Fox Sports",
    names: ["fox sports"],
    slug: "fox-sports",
    homepage: "https://www.foxsports.com/",
    country: "United States",
    founded: "1994",
    ownershipName: "Fox Corporation",
    ownershipType: "Public company division",
    ownershipSummary: "Sports media division operating within Fox Corporation.",
    fundingModel: "Advertising, carriage, sponsorship, and digital traffic.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Sports network and digital outlet covering major US sports and live-event storylines.",
    methodologyNote:
      "Useful for mainstream sports coverage and event-driven reporting across major leagues.",
  },
  {
    displayName: "Billboard",
    names: ["billboard"],
    slug: "billboard",
    homepage: "https://www.billboard.com/",
    country: "United States",
    founded: "1894",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Music industry publication owned by Penske Media Corporation.",
    fundingModel:
      "Advertising, events, charts licensing, sponsorship, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Music industry publication focused on charts, artists, labels, touring, and entertainment business news.",
    methodologyNote:
      "Useful for music-industry reporting and chart-driven entertainment context.",
  },
  {
    displayName: "Deadline",
    names: ["deadline"],
    slug: "deadline",
    homepage: "https://deadline.com/",
    country: "United States",
    founded: "2006",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Entertainment industry news outlet owned by Penske Media Corporation.",
    fundingModel: "Advertising, licensing, sponsorship, and event revenue.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment trade outlet focused on Hollywood dealmaking, casting, studios, and awards coverage.",
    methodologyNote:
      "Useful for industry-insider reporting and entertainment business developments.",
  },
  {
    displayName: "IndieWire",
    names: ["indiewire"],
    slug: "indiewire",
    homepage: "https://www.indiewire.com/",
    country: "United States",
    founded: "1996",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Film and television publication owned by Penske Media Corporation.",
    fundingModel: "Advertising, sponsorship, events, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment publication focused on film, television, festivals, criticism, and awards-season coverage.",
    methodologyNote:
      "Useful for more craft- and industry-oriented entertainment reporting than general celebrity coverage.",
  },
  {
    displayName: "Apartment Therapy",
    names: ["apartment therapy"],
    slug: "apartment-therapy",
    homepage: "https://www.apartmenttherapy.com/",
    country: "United States",
    founded: "2001",
    ownershipName: "Apartment Therapy Media",
    ownershipType: "Privately held",
    ownershipSummary:
      "Lifestyle and home publication operating as an independent digital media company.",
    fundingModel:
      "Advertising, commerce, affiliate partnerships, and sponsorship.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Home and lifestyle publication focused on interiors, organizing, and household trends.",
    methodologyNote:
      "Useful for lifestyle and home-design context rather than civic or political reporting.",
  },
  {
    displayName: "Architectural Digest",
    names: ["architectural digest"],
    slug: "architectural-digest",
    homepage: "https://www.architecturaldigest.com/",
    country: "United States / Global",
    founded: "1920",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Design and architecture publication operating within Condé Nast.",
    fundingModel: "Advertising, subscriptions, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Design publication covering architecture, interiors, style, and high-end lifestyle culture.",
    methodologyNote:
      "Useful for design and architecture coverage rather than general hard-news reporting.",
  },
  {
    displayName: "Condé Nast Traveler",
    names: ["conde nast traveler", "condé nast traveler"],
    slug: "conde-nast-traveler",
    homepage: "https://www.cntraveler.com/",
    country: "United States / Global",
    founded: "1987",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary: "Travel publication operating within Condé Nast.",
    fundingModel: "Advertising, sponsorship, commerce, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Travel publication focused on destinations, hospitality, and global travel culture.",
    methodologyNote:
      "Useful for travel and hospitality reporting rather than general public-affairs coverage.",
  },
  {
    displayName: "Eater",
    names: ["eater"],
    slug: "eater",
    homepage: "https://www.eater.com/",
    country: "United States",
    founded: "2005",
    ownershipName: "Vox Media",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Food and restaurant publication operating within Vox Media.",
    fundingModel: "Advertising, sponsorship, commerce, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Food publication focused on restaurants, hospitality, chefs, and dining culture.",
    methodologyNote:
      "Useful for food-industry and restaurant coverage rather than general hard-news reporting.",
  },
  {
    displayName: "Food Network",
    names: ["food network"],
    slug: "food-network",
    homepage: "https://www.foodnetwork.com/",
    country: "United States",
    founded: "1993",
    ownershipName: "Warner Bros. Discovery",
    ownershipType: "Public company division",
    ownershipSummary:
      "Food and cooking media brand operating within Warner Bros. Discovery.",
    fundingModel:
      "Advertising, carriage, sponsorship, commerce, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Food and cooking brand focused on recipes, personalities, and culinary media coverage.",
    methodologyNote:
      "Useful for food and recipe-driven coverage rather than public-affairs reporting.",
  },
  {
    displayName: "GQ",
    names: ["gq"],
    slug: "gq",
    homepage: "https://www.gq.com/",
    country: "United States / Global",
    founded: "1931",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Men's magazine and digital publication operating within Condé Nast.",
    fundingModel: "Advertising, subscriptions, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Men's lifestyle publication covering style, culture, entertainment, and profile features.",
    methodologyNote:
      "Useful for culture and lifestyle framing rather than straight hard-news reporting.",
  },
  {
    displayName: "HGTV",
    names: ["hgtv"],
    slug: "hgtv",
    homepage: "https://www.hgtv.com/",
    country: "United States",
    founded: "1994",
    ownershipName: "Warner Bros. Discovery",
    ownershipType: "Public company division",
    ownershipSummary:
      "Home and lifestyle media brand operating within Warner Bros. Discovery.",
    fundingModel: "Advertising, carriage, sponsorship, and commerce.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Home and renovation media brand focused on design, real estate lifestyle, and decorating content.",
    methodologyNote:
      "Useful for home and renovation culture coverage rather than hard-news reporting.",
  },
  {
    displayName: "Smithsonian Magazine",
    names: ["smithsonian magazine"],
    slug: "smithsonian-magazine",
    homepage: "https://www.smithsonianmag.com/",
    country: "United States",
    founded: "1970",
    ownershipName: "Smithsonian Institution",
    ownershipType: "Public corporation",
    ownershipSummary: "Magazine published by the Smithsonian Institution.",
    fundingModel:
      "Institutional support, subscriptions, advertising, and sponsorship.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Magazine covering history, science, culture, archaeology, and public knowledge topics.",
    methodologyNote:
      "Useful for cultural and historical reporting with a strong educational and institutional orientation.",
  },
  {
    displayName: "The New Yorker",
    names: ["the new yorker"],
    slug: "the-new-yorker",
    homepage: "https://www.newyorker.com/",
    country: "United States",
    founded: "1925",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Magazine and digital publication operating within Condé Nast.",
    fundingModel: "Subscriptions, advertising, sponsorship, and licensing.",
    perspectiveKey: "left",
    perspectiveLabel: "Left-Center",
    factualityLabel: "High factuality",
    description:
      "Magazine known for long-form reporting, criticism, essays, and cultural commentary.",
    methodologyNote:
      "Useful for deeper reported features and cultural analysis rather than rapid breaking-news updates.",
  },
  {
    displayName: "South China Morning Post",
    names: ["south china morning post", "scmp"],
    slug: "south-china-morning-post",
    homepage: "https://www.scmp.com/",
    country: "Hong Kong / Asia-Pacific",
    founded: "1903",
    ownershipName: "Alibaba Group",
    ownershipType: "Public company division",
    ownershipSummary:
      "English-language Hong Kong newspaper operating within Alibaba Group ownership.",
    fundingModel: "Subscriptions, advertising, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Regional news outlet focused on Hong Kong, China, business, and Asia-Pacific affairs.",
    methodologyNote:
      "Useful for Asia-Pacific and China coverage, with attention to ownership context on politically sensitive topics.",
  },
  {
    displayName: "National Review",
    names: ["national review"],
    slug: "national-review",
    homepage: "https://www.nationalreview.com/",
    country: "United States",
    founded: "1955",
    ownershipName: "National Review, Inc.",
    ownershipType: "Privately held",
    ownershipSummary:
      "Conservative magazine and opinion publisher operating independently.",
    fundingModel: "Subscriptions, advertising, donations, and sponsorship.",
    perspectiveKey: "right",
    perspectiveLabel: "Right",
    factualityLabel: "Mixed to high factuality",
    description:
      "Conservative opinion and commentary outlet focused on politics, policy, and culture.",
    methodologyNote:
      "Useful for mainstream conservative argumentation and editorial framing rather than neutral wire-style reporting.",
  },
  {
    displayName: "Reason",
    names: ["reason"],
    slug: "reason",
    homepage: "https://reason.com/",
    country: "United States",
    founded: "1968",
    ownershipName: "Reason Foundation",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Libertarian magazine and commentary outlet published by Reason Foundation.",
    fundingModel: "Donations, subscriptions, advertising, and sponsorship.",
    perspectiveKey: "right",
    perspectiveLabel: "Right-Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Libertarian outlet focused on policy, civil liberties, economics, and political commentary.",
    methodologyNote:
      "Useful for libertarian framing and policy argumentation rather than neutral straight-news presentation.",
  },
  {
    displayName: "Commentary",
    names: ["commentary"],
    slug: "commentary",
    homepage: "https://www.commentary.org/",
    country: "United States",
    founded: "1945",
    ownershipName: "Commentary, Inc.",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Opinion magazine and commentary publisher operating independently.",
    fundingModel: "Subscriptions, donations, sponsorship, and advertising.",
    perspectiveKey: "right",
    perspectiveLabel: "Right",
    factualityLabel: "Mixed factuality",
    description:
      "Opinion-focused magazine emphasizing conservative commentary on politics, foreign policy, and culture.",
    methodologyNote:
      "Useful as a viewpoint source for conservative commentary, not as a neutral primary reporting wire.",
  },
  {
    displayName: "The American Conservative",
    names: ["the american conservative"],
    slug: "the-american-conservative",
    homepage: "https://www.theamericanconservative.com/",
    country: "United States",
    founded: "2002",
    ownershipName: "The American Ideas Institute",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Conservative opinion magazine published by The American Ideas Institute.",
    fundingModel: "Donations, subscriptions, sponsorship, and advertising.",
    perspectiveKey: "right",
    perspectiveLabel: "Right",
    factualityLabel: "Mixed factuality",
    description:
      "Conservative commentary outlet focused on foreign policy, culture, and domestic politics.",
    methodologyNote:
      "Useful for a specific conservative editorial frame rather than neutral beat reporting.",
  },
  {
    displayName: "Marketplace",
    names: ["marketplace", "marketplace tech"],
    slug: "marketplace",
    homepage: "https://www.marketplace.org/",
    country: "United States",
    founded: "1989",
    ownershipName: "American Public Media Group",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "Public-radio business news program and digital outlet produced by American Public Media.",
    fundingModel:
      "Public-radio distribution, sponsorship, philanthropy, and donations.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Business and economics newsroom focused on markets, labor, technology, and consumer finance.",
    methodologyNote:
      "Useful for accessible business and economic reporting with strong public-media discipline.",
  },
  {
    displayName: "FiveThirtyEight Politics",
    names: ["fivethirtyeight politics"],
    slug: "fivethirtyeight-politics",
    homepage: "https://abcnews.go.com/538",
    country: "United States",
    founded: "2008",
    ownershipName: "ABC News / Disney",
    ownershipType: "Public company division",
    ownershipSummary:
      "Data journalism and analysis brand distributed through ABC News.",
    fundingModel: "Advertising, sponsorship, and parent-network support.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Data-driven politics and elections analysis brand known for polling and quantitative framing.",
    methodologyNote:
      "Useful for polling and analytical context rather than commodity beat reporting.",
  },
  {
    displayName: "Freakonomics Radio",
    names: ["freakonomics radio"],
    slug: "freakonomics-radio",
    homepage: "https://freakonomics.com/series/freakonomics-radio/",
    country: "United States",
    founded: "2010",
    ownershipName: "Stitcher / SiriusXM",
    ownershipType: "Public company division",
    ownershipSummary:
      "Economics and social-science podcast brand operating within SiriusXM podcast distribution.",
    fundingModel:
      "Sponsorship, advertising, licensing, and parent-network support.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Mixed to high factuality",
    description:
      "Interview and explainers podcast focused on economics, incentives, and social-science themes.",
    methodologyNote:
      "Useful for ideas and explanatory framing, while individual episodes may blend reporting with interpretive discussion.",
  },
  {
    displayName: "The World",
    names: ["the world"],
    slug: "the-world",
    homepage: "https://theworld.org/",
    country: "United States / Global",
    founded: "1996",
    ownershipName: "PRX and GBH",
    ownershipType: "Nonprofit media organization",
    ownershipSummary:
      "International public-radio news program produced by PRX and GBH.",
    fundingModel:
      "Public-media distribution, philanthropy, sponsorship, and donations.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "High factuality",
    description:
      "Public-media international affairs program focused on global news and cross-border reporting.",
    methodologyNote:
      "Useful for international context with public-media sourcing and explanatory framing.",
  },
  {
    displayName: "TechRadar",
    names: ["techradar"],
    slug: "techradar",
    homepage: "https://www.techradar.com/",
    country: "United Kingdom / Global",
    founded: "2008",
    ownershipName: "Future plc",
    ownershipType: "Public company division",
    ownershipSummary:
      "Consumer technology and buying-guides publication operating within Future plc.",
    fundingModel:
      "Advertising, affiliate commerce, sponsorship, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Consumer technology site focused on devices, buying guides, reviews, and product news.",
    methodologyNote:
      "Useful for gadget and product coverage, though commerce incentives should be considered on review-oriented content.",
  },
  {
    displayName: "Sports Illustrated",
    names: ["sports illustrated"],
    slug: "sports-illustrated",
    homepage: "https://www.si.com/",
    country: "United States",
    founded: "1954",
    ownershipName: "Minute Media",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Sports media brand operated by Minute Media under licensing arrangements.",
    fundingModel: "Advertising, sponsorship, subscriptions, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Sports outlet known for league coverage, features, and mainstream sports commentary.",
    methodologyNote:
      "Useful for major sports coverage and feature framing rather than wire-style transaction reporting alone.",
  },
  {
    displayName: "Sky Sports",
    names: ["sky sports"],
    slug: "sky-sports",
    homepage: "https://www.skysports.com/",
    country: "United Kingdom",
    founded: "1991",
    ownershipName: "Sky Group / Comcast",
    ownershipType: "Public company division",
    ownershipSummary:
      "Sports broadcasting and digital outlet operating within Sky and Comcast.",
    fundingModel: "Advertising, carriage, subscriptions, and sponsorship.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Sports broadcaster and digital outlet focused on live-event reporting and major league coverage.",
    methodologyNote:
      "Useful for UK and international sports coverage with broadcaster-style event emphasis.",
  },
  {
    displayName: "Pitchfork",
    names: ["pitchfork"],
    slug: "pitchfork",
    homepage: "https://pitchfork.com/",
    country: "United States",
    founded: "1995",
    ownershipName: "Condé Nast / Advance Publications",
    ownershipType: "Privately held media group division",
    ownershipSummary:
      "Music criticism and culture publication operating within Condé Nast.",
    fundingModel: "Advertising, sponsorship, events, and licensing.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Music publication focused on criticism, artist coverage, and music-culture reporting.",
    methodologyNote:
      "Useful for music criticism and culture context rather than hard-news beat reporting.",
  },
  {
    displayName: "NME",
    names: ["nme"],
    slug: "nme",
    homepage: "https://www.nme.com/",
    country: "United Kingdom",
    founded: "1952",
    ownershipName: "NME Networks / Caldecott Music Group",
    ownershipType: "Privately held",
    ownershipSummary:
      "Music and entertainment publication operating within NME Networks.",
    fundingModel: "Advertising, sponsorship, events, and brand partnerships.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Music and entertainment outlet covering artists, releases, reviews, and pop-culture news.",
    methodologyNote:
      "Useful for music and youth-culture coverage rather than general hard-news reporting.",
  },
  {
    displayName: "The A.V. Club",
    names: ["the a.v. club"],
    slug: "the-av-club",
    homepage: "https://www.avclub.com/",
    country: "United States",
    founded: "1993",
    ownershipName: "Paste Media",
    ownershipType: "Privately held",
    ownershipSummary:
      "Entertainment and pop-culture publication operating within Paste Media.",
    fundingModel: "Advertising, sponsorship, licensing, and commerce.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Pop-culture publication focused on television, film, music, and criticism.",
    methodologyNote:
      "Useful for criticism and entertainment context rather than beat-driven industry reporting.",
  },
  {
    displayName: "The Hollywood Reporter",
    names: ["hollywood reporter", "the hollywood reporter"],
    slug: "the-hollywood-reporter",
    homepage: "https://www.hollywoodreporter.com/",
    country: "United States",
    founded: "1930",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Entertainment trade publication owned by Penske Media Corporation.",
    fundingModel:
      "Advertising, events, sponsorship, licensing, and subscriptions.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment trade outlet focused on studios, talent, television, film, and awards coverage.",
    methodologyNote:
      "Useful for Hollywood industry reporting and trade context rather than general celebrity aggregation.",
  },
  {
    displayName: "Custom Video Feed",
    names: ["custom video feed"],
    slug: "custom-video-feed",
    homepage: "https://rss.app/",
    country: "Global",
    founded: "Unknown",
    ownershipName: "RSS.app",
    ownershipType: "Unclassified",
    ownershipSummary:
      "Platform-generated feed container rather than a single newsroom.",
    fundingModel: "Feed automation platform.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "Bundle feed that aggregates publisher video items rather than acting as the originating newsroom.",
    methodologyNote:
      "Treat as a container feed and rely on the underlying linked publisher for final trust context.",
  },
  {
    displayName: "Entertainment RSS Bundle",
    names: ["entertainment rss bundle"],
    slug: "entertainment-rss-bundle",
    homepage: "https://rss.app/",
    country: "Global",
    founded: "Unknown",
    ownershipName: "RSS.app",
    ownershipType: "Unclassified",
    ownershipSummary:
      "Platform-generated entertainment feed bundle rather than a single newsroom.",
    fundingModel: "Feed automation platform.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "Bundle feed that aggregates entertainment publishers and should not be treated as a primary newsroom.",
    methodologyNote:
      "Use the linked publisher when evaluating specific stories carried through this bundle.",
  },
  {
    displayName: "Lifestyle RSS Bundle",
    names: ["lifestyle rss bundle"],
    slug: "lifestyle-rss-bundle",
    homepage: "https://rss.app/",
    country: "Global",
    founded: "Unknown",
    ownershipName: "RSS.app",
    ownershipType: "Unclassified",
    ownershipSummary:
      "Platform-generated lifestyle feed bundle rather than a single newsroom.",
    fundingModel: "Feed automation platform.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "Bundle feed that aggregates lifestyle publishers and should not be treated as an originating outlet.",
    methodologyNote:
      "Use the linked publisher when evaluating specific stories carried through this bundle.",
  },
  {
    displayName: "Sports RSS Bundle",
    names: ["sports rss bundle"],
    slug: "sports-rss-bundle",
    homepage: "https://rss.app/",
    country: "Global",
    founded: "Unknown",
    ownershipName: "RSS.app",
    ownershipType: "Unclassified",
    ownershipSummary:
      "Platform-generated sports feed bundle rather than a single newsroom.",
    fundingModel: "Feed automation platform.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "Bundle feed that aggregates sports publishers and should not be treated as a primary newsroom.",
    methodologyNote:
      "Use the linked publisher when evaluating specific stories carried through this bundle.",
  },
  {
    displayName: "Variety",
    names: ["variety"],
    slug: "variety",
    homepage: "https://variety.com/",
    country: "United States",
    founded: "1905",
    ownershipName: "Penske Media Corporation",
    ownershipType: "Privately held",
    ownershipSummary:
      "Entertainment trade publication owned by Penske Media Corporation.",
    fundingModel:
      "Advertising, events, sponsorship, licensing, and subscriptions for trade audiences.",
    perspectiveKey: "center",
    perspectiveLabel: "Center",
    factualityLabel: "Industry reporting",
    description:
      "Entertainment trade outlet focused on film, television, streaming, talent, and awards coverage.",
    methodologyNote:
      "Best treated as an industry trade source rather than a general political news source.",
  },
  {
    displayName: "YouTube",
    names: ["youtube"],
    slug: "youtube",
    homepage: "https://www.youtube.com/",
    country: "United States / Global",
    founded: "2005",
    ownershipName: "Google / Alphabet",
    ownershipType: "Public company platform",
    ownershipSummary:
      "User-generated and publisher video platform owned by Alphabet through Google.",
    fundingModel:
      "Advertising, subscriptions, creator monetization, and commerce products.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Varies by channel",
    description:
      "Distribution platform rather than a single newsroom; reliability depends on the originating channel or publisher.",
    methodologyNote:
      "Treat platform-hosted video as a container. Verify the original publisher or channel behind the content.",
  },
  {
    displayName: "The Latest",
    names: ["the latest"],
    slug: "the-latest",
    homepage: "/",
    country: "United States",
    founded: "2026",
    ownershipName: "The Latest, Inc.",
    ownershipType: "Independent digital product",
    ownershipSummary:
      "Aggregation product that combines source routing, clustering, and clearly labeled generated fallback content.",
    fundingModel:
      "Advertising today; premium trust and research features are the intended long-term path.",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Aggregation layer",
    description:
      "The Latest is a routing and synthesis layer, not the originating publisher for most live stories on the platform.",
    methodologyNote:
      "When The Latest generates fallback summaries or briefings, they should remain visibly labeled and link back to source context whenever possible.",
  },
];

export const PERSPECTIVE_METHODOLOGY = [
  {
    key: "source-map",
    title: "Source map",
    body: "The label comes from a known outlet pattern in our source registry. It reflects a broad editorial tendency, not the definitive truth value of a single story.",
  },
  {
    key: "ai-headline",
    title: "AI estimate",
    body: "The label is inferred from headline and summary framing when a strong source-history mapping is unavailable. Treat it as directional rather than authoritative.",
  },
  {
    key: "unclassified",
    title: "Unclassified",
    body: "We did not have enough confidence to assign a perspective bucket. That is preferable to overclaiming certainty where the signal is weak.",
  },
];

const normalizeKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const SOURCE_LOOKUP = SOURCE_REGISTRY.reduce((accumulator, profile) => {
  profile.names.forEach((name) => {
    accumulator[normalizeKey(name)] = profile;
  });
  accumulator[normalizeKey(profile.displayName)] = profile;
  return accumulator;
}, {});

const SOURCE_BY_SLUG = SOURCE_REGISTRY.reduce((accumulator, profile) => {
  accumulator[profile.slug] = profile;
  return accumulator;
}, {});

const FACTUALITY_SCORE_MAP = {
  "High factuality": 88,
  "Mixed to high factuality": 74,
  "Mixed factuality": 58,
  "Industry reporting": 68,
  "Varies by channel": 50,
  "Aggregation layer": 52,
  "Needs review": 30,
};

const OWNERSHIP_CLARITY_BONUS_MAP = {
  Cooperative: 5,
  "Nonprofit media organization": 6,
  "Public corporation": 5,
  "Trust-owned": 6,
  "Public company": 4,
  "Public company division": 3,
  "Privately held": 3,
  "Privately held media group division": 3,
  "Public company platform": 1,
  "Independent digital product": 2,
  Unclassified: 0,
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getTrustBand(score) {
  if (score >= 85) return "high";
  if (score >= 70) return "solid";
  if (score >= 55) return "caution";
  return "low";
}

function getTrustBandLabel(score) {
  const band = getTrustBand(score);
  if (band === "high") return "High trust context";
  if (band === "solid") return "Solid trust context";
  if (band === "caution") return "Use extra context";
  return "Needs verification";
}

function humanizeSourceSlug(value = "") {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function slugifySourceName(value = "") {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "source"
  );
}

export function getSourceProfile(sourceOrItem = "") {
  const derivedName =
    typeof sourceOrItem === "object" && sourceOrItem !== null
      ? deriveMediaOutlet(sourceOrItem)
      : deriveMediaOutlet(sourceOrItem);

  const matched = SOURCE_LOOKUP[normalizeKey(derivedName)];
  if (matched) {
    return {
      ...matched,
      sourceName: matched.displayName,
      href: `/sources/${matched.slug}`,
    };
  }

  const fallbackName = derivedName || "Unknown Source";
  const fallbackSlug = slugifySourceName(fallbackName);
  return {
    displayName: fallbackName,
    names: [fallbackName],
    slug: fallbackSlug,
    sourceName: fallbackName,
    href: `/sources/${fallbackSlug}`,
    homepage: "",
    country: "Unknown",
    founded: "Unknown",
    ownershipName: "Ownership not yet mapped",
    ownershipType: "Unclassified",
    ownershipSummary:
      "This outlet is not yet in the source registry, so ownership and editorial posture need manual review.",
    fundingModel: "Unknown",
    perspectiveKey: "unknown",
    perspectiveLabel: "Unclassified",
    factualityLabel: "Needs review",
    description:
      "The Latest has not yet built a full source profile for this outlet.",
    methodologyNote:
      "When a source is unmapped, treat perspective and ownership fields as incomplete until they are reviewed.",
  };
}

export function getTrustDescriptor(sourceOrItem = "") {
  const profile = getSourceProfile(sourceOrItem);
  return getTrustDescriptorForProfile(profile);
}

export function getTrustDescriptorForProfile(profile = {}) {
  const rawTrustScore = profile?.trustScore;
  const explicitScore =
    rawTrustScore === null ||
    rawTrustScore === undefined ||
    (typeof rawTrustScore === "string" && rawTrustScore.trim() === "")
      ? null
      : Number(rawTrustScore);
  if (Number.isFinite(explicitScore)) {
    const score = clampScore(explicitScore);
    return {
      score,
      band: getTrustBand(score),
      label: getTrustBandLabel(score),
      shortLabel: `Truth score ${score}`,
      rationale:
        "Source-level score currently set in the managed source registry. It is outlet context, not proof that any single article is true.",
    };
  }

  const factualityBase = FACTUALITY_SCORE_MAP[profile.factualityLabel] ?? 35;
  const ownershipBonus =
    OWNERSHIP_CLARITY_BONUS_MAP[profile.ownershipType] ?? 0;
  const mappedPerspectiveBonus =
    profile.perspectiveKey && profile.perspectiveKey !== "unknown" ? 2 : 0;
  const methodologyBonus =
    profile.slug !== slugifySourceName(profile.displayName) ||
    SOURCE_BY_SLUG[profile.slug]
      ? 2
      : 0;
  const score = clampScore(
    factualityBase + ownershipBonus + mappedPerspectiveBonus + methodologyBonus,
  );

  return {
    score,
    band: getTrustBand(score),
    label: getTrustBandLabel(score),
    shortLabel: `Truth score ${score}`,
    rationale: `Source-level estimate based on factuality shorthand, ownership transparency, and how complete this source profile is. It is context for the outlet, not proof that any single article is true.`,
  };
}

export function getSourceProfileBySlug(sourceSlug = "") {
  const normalizedSlug = slugifySourceName(sourceSlug);
  const matched = SOURCE_BY_SLUG[normalizedSlug];
  if (matched) {
    return {
      ...matched,
      sourceName: matched.displayName,
      href: `/sources/${matched.slug}`,
    };
  }

  return getSourceProfile(humanizeSourceSlug(normalizedSlug));
}

export function getSourceProfileHref(sourceOrItem = "") {
  return getSourceProfile(sourceOrItem).href;
}
