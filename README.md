# TheLatest - News Aggregator

**Stay informed with news from 170+ global sources in one place**

[![GitHub Stars](https://img.shields.io/github/stars/shelovesczar/TheLatest?style=social)](https://github.com/shelovesczar/TheLatest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)

> 🌍 A modern, free news aggregator built with React + Vite, featuring 170+ RSS feeds from international sources

## What Does This Website Do?

TheLatest is a modern news website that brings together news, opinions, videos, and podcasts from across the internet. Instead of visiting dozens of different news sites, you can see everything in one beautiful, easy-to-use interface.

Think of it like your personal newspaper that automatically updates itself every few minutes with the latest stories from CNN, BBC, ESPN, Variety, TechCrunch, and 100+ other sources.

## Main Features

### 📰 Real-Time News from 170+ Global Sources
- Breaking news from US, UK, Europe, Asia, Africa, Middle East
- Major networks: CNN, BBC, Al Jazeera, Reuters, Deutsche Welle, France24
- Updates every 5 minutes automatically
- No paywalls - all content is free

### 🌍 International Coverage
- **US**: New York Times, Washington Post, CNN, Fox News, NPR
- **UK**: BBC, The Guardian, Sky News
- **Europe**: Deutsche Welle, France24, Euronews
- **Asia**: Al Jazeera, Channel NewsAsia, Times of India
- **Australia**: ABC News Australia
- **Canada**: CBC News

### 🎯 Category Pages
Browse news by topic:
- **Sports** - NFL, NBA, soccer, Olympics, and more
- **Entertainment** - Movies, music, celebrities, awards shows
- **Business & Tech** - Startups, stocks, AI, cryptocurrency
- **Lifestyle** - Health, travel, food, fashion
- **Culture** - Arts, books, museums, society

### 🤖 AI News Summaries
- AI automatically reads and summarizes the day's top stories
- Get the gist of what's happening in 30 seconds
- Updates every hour

### 🔍 Search Everything
- Search across all news articles, videos, and podcasts
- Find stories about any person, event, or topic
- Results ranked by relevance

### 🎥 Videos & 🎙️ Podcasts
- Latest news videos from YouTube
- Trending podcast episodes
- All filtered by category

### 📱 Works on Any Device
- Looks great on phones, tablets, and computers
- Dark mode for night reading
- Fast loading times

---

## For Developers

### What's Under the Hood?

**Technology:**
- React (JavaScript framework for building the website)
- Vite (makes the site load super fast)
- RSS feeds (how we get news from 120+ sources for free)
- Netlify (where the website is hosted - it's free!)

**Key Features:**
- No database needed - everything loads directly from news sources
- Smart caching - news updates every 5 minutes
- Enhanced filtering - sports news shows only sports content, not politics
- Completely free to run - no API costs

---

## 🚀 How to Set This Up (For Developers)

### 1. Download the Code
```bash
git clone https://github.com/yourusername/TheLatest.git
cd TheLatest
```

### 2. Install Required Software
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev:netlify
```

Visit: **http://localhost:52678**

### 4. Deploy to the Internet (Optional)
```bash
netlify deploy --prod
```

That's it! Your news site is now live on the internet.

---

## 📖 How It Works

### RSS Feeds - The Secret Sauce
Instead of paying for expensive news APIs, TheLatest uses RSS feeds - a free technology that news sites provide to share their content. We've configured 120+ RSS feeds from sources like:
- CNN, BBC, New York Times (news)
- ESPN, Sports Illustrated (sports)
- TechCrunch, The Verge (tech)
- Variety, Hollywood Reporter (entertainment)

### The Flow:
1. User visits your site
2. Site requests latest articles from RSS feeds
3. Articles are cached for 5 minutes
4. Content is filtered by category and keywords
5. Beautiful page displays with all the news

### Smart Filtering:
When you're on the Sports page, the system:
- Fetches all sports RSS feeds
- Filters opinions/videos/podcasts using sports keywords (NFL, NBA, etc.)
- Requires multiple keyword matches to avoid showing political "team" talk
- Shows only genuinely sports-related content

---

## 🎯 Category Configuration

Each category has 70-90 carefully selected keywords to ensure relevant content:

**Sports:** NFL, NBA, MLB, hockey, soccer, Olympics, playoffs, championships
**Entertainment:** Oscars, Emmys, movies, music, celebrities, Hollywood
**Business & Tech:** Startups, AI, stocks, Apple, Google, cryptocurrency
**Lifestyle:** Health, travel, food, fitness, fashion
**Culture:** Arts, museums, literature, books, theatre

---

## 📱 Mobile-Friendly Design

Works perfectly on:
- iPhones and Android phones
- iPads and tablets  
- Desktop computers
- Works in both portrait and landscape mode
- Automatically adjusts text size for readability

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 (for building the user interface)
- React Router (for page navigation)
- Axios (for fetching news data)
- FontAwesome (for icons)

**Backend:**
- Netlify Functions (serverless - no server to maintain!)
- RSS Parser (reads news feeds)
- Node.js (JavaScript runtime)

**Deployment:**
- Netlify (free hosting)
- GitHub (code storage)
- Automatic deployments when you push code

---

## 📦 Project Structure

```
TheLatest/
├── src/
│   ├── pages/           # Different pages (HomePage, CategoryPage, etc.)
│   ├── components/      # Reusable pieces (Header, Footer, etc.)
│   │   ├── layout/      # Header and Footer
│   │   └── sections/    # News sections (TopStories, Videos, etc.)
│   ├── assets/          # Images and fonts
│   └── main.jsx         # App entry point
├── public/              # Static files (images, fonts)
├── package.json         # Dependencies list
└── netlify.toml         # Deployment configuration
```

---

## 🚧 Roadmap & Future Features

- [ ] Add Wikipedia to Advanced Search
- [ ] Improve story layout with ads space
- [ ] Larger text for story descriptions
- [ ] Optimize image sizes to prevent pixelation
- [ ] User accounts & saved articles
- [ ] Newsletter signup integration
- [ ] More news categories

---

## 📝 Common Commands

```bash
# Start development server
npm run dev:netlify

# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod

# Check for errors
npm run lint
```

---

## 🤝 Contributing

This is an open-source project! Feel free to:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Areas Where You Can Contribute:
- Add more RSS feeds from international sources
- Improve the UI/UX design
- Add new features (user accounts, bookmarks, etc.)
- Fix bugs and improve performance
- Translate the site to other languages
- Write tests

---

## 📄 License

This project is open source and available under the MIT License.

---

## 💬 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/shelovesczar/TheLatest/issues)
- **Discussions**: [Join the conversation](https://github.com/shelovesczar/TheLatest/discussions)
- **Organization**: Part of [Our National Conversations](https://github.com/ournationalconversations)

---

## 🎉 Credits & Acknowledgments

Built with ❤️ by Cesar Hernandez and contributors.

**Technology Stack:**
- React + Vite
- RSS Feed Aggregation
- Netlify Serverless Functions
- FontAwesome Icons

**News Sources:** CNN, BBC, Al Jazeera, ESPN, TechCrunch, Variety, and 165+ more trusted publications worldwide.

**Special Thanks:**
- All contributors and testers
- Open source community
- News organizations providing RSS feeds

---

## 🔗 Useful Links

- [Live Demo](#) _(Add your Netlify URL here)_
- [Documentation](./README.md)
- [Git Upload Guide](./GIT_UPLOAD_GUIDE.md)
- [Social Media Guide](./SOCIAL_MEDIA_GUIDE.md)

---

## 🛠️ Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🐳 Docker Commands Reference

```bash
# Build development image
docker-compose build dev

# Build production image
docker-compose build prod

# Stop running containers
docker-compose down

# View logs
docker-compose logs -f

# Remove all containers and images
docker-compose down --rmi all
```
