import axios from 'axios';
import { 
  fetchRSSNews as getRSSNews, 
  fetchRSSOpinions as getRSSOpinions, 
  fetchRSSVideos as getRSSVideos, 
  fetchRSSPodcasts as getRSSPodcasts 
} from './rssService';

// Check if running in development mode
const isDevelopment = import.meta.env.DEV;

// API Configuration
const NEWS_API_KEY = '0b0041996c424f25850a21dd1d75b810';
const GNEWS_API_KEY = '03280f741607ebb5d78f02ee71186de4';
const API_BASE_URL = '/.netlify/functions/fetchNews';

// Helper function to format time
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return 'Just now';
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Fallback news data with diverse topics including Jeff's requested keywords
const getFallbackNews = () => {
  return [
    {
      title: "Epstein Files: New Documents Released in High-Profile Investigation",
      source: "Associated Press",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop",
      time: "30 minutes ago",
      category: "News",
      description: "Federal court releases additional Epstein files containing previously sealed documents. Epstein investigation documents reveal new details in ongoing case.",
      content: "Breaking: Epstein files unsealed by federal court. New Epstein documents provide insight into the investigation. Legal experts analyze the latest Epstein file releases.",
      url: "#"
    },
    {
      title: "Oscars 2026: Academy Awards Nominations Announced",
      source: "Variety",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=500&fit=crop",
      time: "1 hour ago",
      category: "Entertainment",
      description: "The Academy of Motion Picture Arts and Sciences reveals Oscar nominations for 2026. Oscars ceremony promises historic night with diverse nominees.",
      content: "Oscars nominations announced for Academy Awards 2026. Oscar race heats up with surprising picks. The Oscars ceremony scheduled for next month.",
      url: "#"
    },
    {
      title: "Summer Movie Blockbusters: Studios Unveil 2026 Film Slate",
      source: "The Hollywood Reporter",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=500&fit=crop",
      time: "2 hours ago",
      category: "Entertainment",
      description: "Major film studios announce highly anticipated movie releases. Summer blockbuster movies promise spectacular cinema experiences.",
      content: "Hollywood unveils summer movie lineup. Major movies scheduled including sequels and original films. Cinema enthusiasts anticipate blockbuster movie season.",
      url: "#"
    },
    {
      title: "AI Breakthrough: Artificial Intelligence Achieves New Milestone",
      source: "MIT Technology Review",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop",
      time: "1 hour ago",
      category: "Technology",
      description: "Revolutionary AI system demonstrates human-level reasoning. Artificial intelligence advancement represents major technology breakthrough in machine learning.",
      content: "AI researchers unveil groundbreaking artificial intelligence model. New AI technology surpasses previous benchmarks. Artificial intelligence continues rapid evolution.",
      url: "#"
    },
    {
      title: "Soccer World Cup 2026: Teams Prepare for Historic Tournament",
      source: "ESPN",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=500&fit=crop",
      time: "2 hours ago",
      category: "Sports",
      description: "National soccer teams intensify training as the 2026 FIFA World Cup approaches. Soccer fans worldwide anticipate the biggest football event.",
      content: "Soccer teams from around the globe are ramping up preparations for the upcoming World Cup. The soccer tournament promises to be the most exciting yet.",
      url: "#"
    },
    {
      title: "Epstein Files Investigation: Legal Experts Weigh In on Latest Developments",
      source: "CNN",
      image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&h=500&fit=crop",
      time: "3 hours ago",
      category: "News",
      description: "Attorneys analyze newly released Epstein documents. The Epstein files case continues with additional evidence coming to light.",
      content: "Epstein investigation expands with new file releases. Legal analysts examine the Epstein documents for implications. Epstein files reveal connections.",
      url: "#"
    },
    {
      title: "AI in Healthcare: Artificial Intelligence Transforms Medical Diagnosis",
      source: "New England Journal of Medicine",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
      time: "3 hours ago",
      category: "Technology",
      description: "Medical AI systems achieve breakthrough in disease detection. Artificial intelligence technology revolutionizes healthcare diagnosis and treatment planning.",
      content: "Healthcare AI demonstrates unprecedented accuracy. Artificial intelligence medical applications expand rapidly. AI technology transforms patient care.",
      url: "#"
    },
    {
      title: "Oscars Predictions: Who Will Win at the Academy Awards?",
      source: "Hollywood Reporter",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop",
      time: "4 hours ago",
      category: "Entertainment",
      description: "Industry experts predict Oscar winners ahead of Academy Awards ceremony. The Oscars race remains competitive across all major categories.",
      content: "Oscar predictions divide critics. Academy Awards favorites emerge in best picture race. The Oscars ceremony anticipation builds in Hollywood.",
      url: "#"
    },
    {
      title: "Premier League Soccer: Manchester United Signs New Star Player",
      source: "Sky Sports",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=500&fit=crop",
      time: "4 hours ago",
      category: "Sports",
      description: "Manchester United completes record-breaking soccer transfer deal ahead of new season. The football club secures talent from European rivals.",
      content: "In a major soccer news development, Manchester United has signed a world-class football player in a historic transfer deal.",
      url: "#"
    },
    {
      title: "Epstein Documents: Congressional Hearing Examines Case Evidence",
      source: "NBC News",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop",
      time: "5 hours ago",
      category: "News",
      description: "Congress reviews Epstein files in oversight hearing. Lawmakers question officials about the Epstein investigation and document handling.",
      content: "Epstein files face congressional scrutiny. The Epstein case documents prompt questions about justice system oversight and accountability.",
      url: "#"
    },
    {
      title: "Academy Awards History: Memorable Oscars Moments Through the Years",
      source: "Entertainment Tonight",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=500&fit=crop",
      time: "5 hours ago",
      category: "Entertainment",
      description: "Looking back at iconic Oscar moments as the Oscars 2026 approaches. Academy Awards history showcases cinema's greatest achievements.",
      content: "The Oscars have delivered unforgettable moments. Academy Awards retrospective celebrates film excellence and memorable Oscar speeches.",
      url: "#"
    },
    {
      title: "Artificial Intelligence Ethics: Tech Leaders Call for AI Regulation",
      source: "The Verge",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop",
      time: "6 hours ago",
      category: "Technology",
      description: "Tech executives urge government AI oversight. Artificial intelligence development requires ethical frameworks and safety standards.",
      content: "AI industry leaders advocate for responsible artificial intelligence development. Technology companies propose AI safety guidelines and regulations.",
      url: "#"
    },
    {
      title: "Champions League Soccer: Epic Football Match Ends in Thriller",
      source: "UEFA Official",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=500&fit=crop",
      time: "6 hours ago",
      category: "Sports",
      description: "Champions League soccer delivers dramatic finish. Football fans witness incredible comeback in European soccer competition.",
      content: "Soccer history made in Champions League thriller. The football match featured stunning goals and exceptional athletic performance.",
      url: "#"
    },
    {
      title: "Epstein Files Timeline: Complete Overview of Investigation",
      source: "ProPublica",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop",
      time: "7 hours ago",
      category: "News",
      description: "Comprehensive timeline of Epstein investigation from start to present. The Epstein files case explained with key dates and developments.",
      content: "Epstein case chronology detailed. Investigation timeline tracks the Epstein files release and legal proceedings over time.",
      url: "#"
    },
    {
      title: "Oscar-Winning Directors: Academy Awards Recognize Filmmaking Excellence",
      source: "IndieWire",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop",
      time: "7 hours ago",
      category: "Entertainment",
      description: "Best Director category features acclaimed filmmakers. The Oscars 2026 celebrate visionary cinema and directorial achievement.",
      content: "Oscar nominees for Best Director announced. Academy Awards honor innovative filmmakers pushing boundaries of cinema and storytelling.",
      url: "#"
    },
    {
      title: "AI Revolution: How Artificial Intelligence Is Changing Every Industry",
      source: "Forbes",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop",
      time: "8 hours ago",
      category: "Technology",
      description: "Artificial intelligence transforms business operations worldwide. AI technology disrupts traditional industries and creates new opportunities.",
      content: "AI adoption accelerates across sectors. Companies integrate artificial intelligence to improve efficiency, innovation, and competitiveness.",
      url: "#"
    },
    {
      title: "World Cup Soccer Qualifiers: National Teams Battle for Tournament Spots",
      source: "FIFA Official",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=500&fit=crop",
      time: "8 hours ago",
      category: "Sports",
      description: "Soccer qualification matches determine World Cup participants. Football nations compete intensely for coveted tournament positions.",
      content: "Soccer teams fight for World Cup berths. Qualification round produces exciting football with high stakes and passionate performances.",
      url: "#"
    },
    {
      title: "Blockbuster Movies 2026: Most Anticipated Film Releases",
      source: "Rotten Tomatoes",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=500&fit=crop",
      time: "9 hours ago",
      category: "Entertainment",
      description: "Cinema fans await major movie premieres. Film industry prepares biggest releases with star-studded casts and acclaimed directors.",
      content: "Movies dominate conversation as studios release trailers. Blockbuster films promise action, drama, and entertainment for all audiences.",
      url: "#"
    },
    {
      title: "Tech Giants Unveil AI Breakthrough in Machine Learning",
      source: "TechCrunch",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop",
      time: "3 hours ago",
      category: "Technology",
      description: "Major technology companies announce revolutionary AI technology that could transform computing. Artificial intelligence reaches new milestone.",
      content: "Tech industry leaders reveal groundbreaking developments in AI and machine learning, promising to revolutionize technology applications.",
      url: "#"
    },
    {
      title: "Global Markets Show Mixed Performance Amid Economic Uncertainty",
      source: "Financial Times",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
      time: "4 hours ago",
      category: "Business",
      description: "Major stock indices across global markets displayed varied performance as investors assess recent economic indicators and policy developments.",
      content: "Financial markets experience volatility as economic uncertainty continues to impact investor sentiment and trading activity.",
      url: "#"
    },
    {
      title: "Climate Summit Concludes with New International Agreements",
      source: "BBC News",
      image: "https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=800&h=500&fit=crop",
      time: "5 hours ago",
      category: "Environment",
      description: "World leaders reached consensus on several key environmental initiatives during the latest international climate conference.",
      content: "International climate summit produces historic environmental agreements as nations commit to sustainable development goals.",
      url: "#"
    },
    {
      title: "NBA Basketball Playoffs: Championship Series Heats Up",
      source: "ESPN",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=500&fit=crop",
      time: "6 hours ago",
      category: "Sports",
      description: "Basketball teams compete in intense playoff matches. NBA championship race intensifies with spectacular performances.",
      content: "Professional basketball reaches fever pitch as teams battle for NBA championship glory in exciting playoff series.",
      url: "#"
    },
    {
      title: "Hollywood Announces Major Film Productions for 2026",
      source: "Variety",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop",
      time: "8 hours ago",
      category: "Entertainment",
      description: "Studios reveal plans for upcoming movies and entertainment projects featuring acclaimed directors and talented ensemble casts.",
      content: "Entertainment industry unveils exciting new film and television productions scheduled for release in the coming year.",
      url: "#"
    },
    {
      title: "Electric Vehicles: Tesla Unveils Revolutionary New Model",
      source: "Reuters",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=500&fit=crop",
      time: "10 hours ago",
      category: "Technology",
      description: "Tesla announces groundbreaking electric vehicle with extended range and advanced technology features for sustainable transportation.",
      content: "Automotive technology advances with new electric vehicle release featuring cutting-edge battery technology and autonomous capabilities.",
      url: "#"
    },
    {
      title: "Champions League Soccer: Barcelona Advances to Finals",
      source: "UEFA",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=500&fit=crop",
      time: "12 hours ago",
      category: "Sports",
      description: "Barcelona soccer team secures spot in Champions League final with stunning football performance. European soccer reaches climax.",
      content: "In dramatic soccer action, Barcelona defeats rival in Champions League semifinal, advancing to the prestigious football championship.",
      url: "#"
    },
    {
      title: "Space Exploration: NASA Announces Mars Mission Update",
      source: "NASA",
      image: "https://images.unsplash.com/photo-1516849677043-ef67c9557e16?w=800&h=500&fit=crop",
      time: "14 hours ago",
      category: "Science",
      description: "Space agency provides updates on Mars exploration mission with groundbreaking scientific discoveries from the red planet.",
      content: "Scientific breakthrough in space exploration as NASA reveals new findings from ongoing Mars research and planetary studies.",
      url: "#"
    }
  ];
};

// Fallback opinions data with diverse topics including Jeff's keywords
const getFallbackOpinions = () => {
  return [
    {
      title: "The Epstein Files: What the Documents Reveal About Justice System",
      author: "Jennifer Morrison",
      source: "The Atlantic",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop",
      date: "1 day ago",
      category: "Opinion",
      description: "The Epstein files release raises questions about accountability. Analysis of the Epstein documents and their implications for legal reform.",
      content: "Epstein investigation files demonstrate systemic issues. The Epstein case documents shed light on failures in oversight and justice.",
      url: "#"
    },
    {
      title: "AI Ethics: The Responsibility That Comes With Artificial Intelligence",
      author: "Dr. Sarah Chen",
      source: "Wired",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
      date: "1 day ago",
      category: "Technology",
      description: "As AI technology advances, we must address artificial intelligence ethics. The AI revolution requires thoughtful regulation and oversight.",
      content: "Artificial intelligence development demands ethical frameworks. AI systems must be designed with human values and safety in mind.",
      url: "#"
    },
    {
      title: "Oscars Diversity: Has the Academy Awards Made Real Progress?",
      author: "Marcus Thompson",
      source: "Vanity Fair",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop",
      date: "1 day ago",
      category: "Entertainment",
      description: "The Oscars nominations reflect changing Hollywood. Academy Awards diversity initiatives show progress but work remains. Oscar inclusion matters.",
      content: "Oscars 2026 nominations demonstrate Academy's commitment to representation. The Academy Awards continue evolving to reflect cinema's diversity.",
      url: "#"
    },
    {
      title: "The Renaissance of Independent Cinema: Why Movies Matter More Than Ever",
      author: "Elena Rodriguez",
      source: "IndieWire",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
      date: "1 day ago",
      category: "Entertainment",
      description: "Independent movies are experiencing a creative resurgence. Film festivals showcase innovative cinema that challenges mainstream movie conventions.",
      content: "Cinema's artistic evolution thrives in independent films. Movies from emerging filmmakers offer fresh perspectives and storytelling innovation.",
      url: "#"
    },
    {
      title: "Why Soccer Remains the World's Most Popular Sport",
      author: "Marcus Johnson",
      source: "Sports Illustrated",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop",
      date: "2 days ago",
      category: "Sports",
      description: "Soccer's global appeal stems from its simplicity and universal accessibility. Football culture transcends borders and brings communities together.",
      content: "The beautiful game of soccer continues to captivate billions worldwide. Football's unique combination of skill, strategy, and passion.",
      url: "#"
    },
    {
      title: "Artificial Intelligence in Education: AI's Promise and Pitfalls",
      author: "Dr. Emily Rodriguez",
      source: "Education Week",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop",
      date: "2 days ago",
      category: "Technology",
      description: "AI tools transform classroom learning. Artificial intelligence in education offers personalization but raises important questions about equity.",
      content: "Educational AI applications expand rapidly. Artificial intelligence technology must be implemented thoughtfully in schools.",
      url: "#"
    },
    {
      title: "The Epstein Files: Media's Role in Covering Sensitive Investigations",
      author: "David Park",
      source: "Columbia Journalism Review",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop",
      date: "2 days ago",
      category: "Opinion",
      description: "Reporting on the Epstein documents requires balancing public interest with sensitivity. The Epstein files coverage tests journalistic standards.",
      content: "Epstein investigation reporting demands careful ethical consideration. Media coverage of Epstein files must serve justice.",
      url: "#"
    },
    {
      title: "Soccer Tactics Evolution: How Modern Football Has Changed",
      author: "Alex Martinez",
      source: "The Athletic",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Sports",
      description: "Modern soccer strategies have revolutionized football. Tactical innovation in the beautiful game continues to evolve.",
      content: "Soccer coaches worldwide are adopting new football tactics that emphasize possession and high pressing systems.",
      url: "#"
    },
    {
      title: "AI Technology: Balancing Innovation with Ethics",
      author: "Dr. Michael Chen",
      source: "MIT Technology Review",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
      date: "2 days ago",
      category: "Technology",
      description: "Artificial intelligence advancement requires careful consideration of ethical implications and societal impact.",
      content: "Technology leaders must balance AI innovation with responsible development practices and ethical guidelines.",
      url: "#"
    },
    {
      title: "Oscars and Streaming: How the Academy Awards Adapt to Changing Cinema",
      author: "Lisa Chen",
      source: "The New Yorker",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop",
      date: "2 days ago",
      category: "Entertainment",
      description: "The Oscars face challenges from streaming platforms. Academy Awards must evolve as the movie industry transforms.",
      content: "Oscar eligibility rules adapt to streaming era. The Academy Awards balance tradition with modern cinema distribution methods.",
      url: "#"
    },
    {
      title: "Epstein Case Accountability: Justice System Reform Needed",
      author: "Amanda Roberts",
      source: "Washington Post",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Opinion",
      description: "The Epstein files demonstrate need for systemic change. Epstein investigation failures must lead to justice system improvements.",
      content: "Epstein documents expose accountability gaps. The Epstein case should catalyze meaningful legal and institutional reforms.",
      url: "#"
    },
    {
      title: "Why International Soccer Captivates Global Audiences",
      author: "Roberto Silva",
      source: "ESPN Opinion",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Sports",
      description: "Soccer transcends cultural boundaries. Football's universal appeal creates shared experiences across continents and communities.",
      content: "The soccer phenomenon unites diverse populations. Football culture demonstrates sport's power to bring humanity together.",
      url: "#"
    },
    {
      title: "Artificial Intelligence and Employment: Navigating the AI Job Market",
      author: "Karen Williams",
      source: "Harvard Business Review",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Technology",
      description: "AI technology reshapes workforce dynamics. Artificial intelligence creates new opportunities while disrupting traditional employment.",
      content: "Workers must adapt to AI-driven economy. Artificial intelligence integration requires workforce training and education initiatives.",
      url: "#"
    },
    {
      title: "Cinema's Future: Why Movies Will Always Matter",
      author: "James Patterson",
      source: "Film Comment",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Entertainment",
      description: "Despite streaming dominance, theatrical movies endure. Cinema offers irreplaceable communal experiences and artistic vision.",
      content: "Movie theaters remain vital to film culture. The cinema experience cannot be fully replicated at home.",
      url: "#"
    },
    {
      title: "Climate Action Cannot Wait for Perfect Solutions",
      author: "Dr. Emily Rodriguez",
      source: "Scientific American",
      image: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Environment",
      description: "The pursuit of ideal environmental policies should not prevent us from implementing effective measures today.",
      content: "Climate change demands immediate action. Environmental sustainability requires pragmatic approaches to reduce emissions.",
      url: "#"
    },
    {
      title: "Basketball vs Soccer: Comparing Global Sports Phenomena",
      author: "James Williams",
      source: "ESPN Analysis",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop",
      date: "3 days ago",
      category: "Sports",
      description: "While basketball thrives in America, soccer dominates globally. Football's international reach surpasses all sports.",
      content: "Soccer and basketball represent different sporting cultures. Football's worldwide appeal versus basketball's regional strength.",
      url: "#"
    },
    {
      title: "Healthcare Accessibility Remains a Critical Challenge",
      author: "Dr. Maria Garcia",
      source: "Medical Times",
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
      date: "4 days ago",
      category: "Health",
      description: "Despite medical advances, ensuring equitable access to quality care continues to challenge healthcare systems.",
      content: "Healthcare reform must address systemic inequalities and ensure medical services reach underserved communities.",
      url: "#"
    },
    {
      title: "Entertainment Streaming: The Future of Media Consumption",
      author: "David Park",
      source: "Hollywood Reporter",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop",
      date: "4 days ago",
      category: "Entertainment",
      description: "Streaming services have fundamentally transformed how audiences consume movies, shows, and entertainment content.",
      content: "Entertainment industry adapts to digital distribution. Technology reshapes media consumption habits and production.",
      url: "#"
    },
    {
      title: "Electric Vehicles and the Future of Transportation",
      author: "Lisa Anderson",
      source: "Green Tech Today",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&h=300&fit=crop",
      date: "5 days ago",
      category: "Technology",
      description: "Electric vehicle technology represents a crucial step toward sustainable transportation and environmental conservation.",
      content: "Automotive industry transformation through electric vehicles. Technology drives sustainable transportation solutions.",
      url: "#"
    },
    {
      title: "Women's Soccer Growth: Breaking Barriers in Football",
      author: "Jennifer Lee",
      source: "Women's Sports Foundation",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=300&fit=crop",
      date: "5 days ago",
      category: "Sports",
      description: "Women's soccer continues explosive growth worldwide. Female football players achieve unprecedented recognition and success.",
      content: "Soccer equality advances as women's football gains viewership, investment, and respect in the global sports arena.",
      url: "#"
    }
  ];
};

// Fallback videos data with diverse topics including Jeff's keywords
const getFallbackVideos = () => {
  return [
    {
      title: "Epstein Files: Legal Experts Analyze Newly Released Documents",
      source: "CBS News",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      date: "1 hour ago",
      category: "News",
      description: "Breaking analysis of the Epstein documents. Legal scholars discuss implications of the Epstein files investigation.",
      content: "Epstein investigation files examined by legal experts. The Epstein case documents reveal new details about the proceedings.",
      url: "#"
    },
    {
      title: "AI Revolution: How Artificial Intelligence is Changing Everything",
      source: "CNBC Tech",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      date: "2 hours ago",
      category: "Technology",
      description: "Comprehensive look at AI technology transformation. Artificial intelligence applications across industries. AI future explained.",
      content: "AI experts discuss artificial intelligence breakthroughs. New AI systems demonstrate unprecedented capabilities in various fields.",
      url: "#"
    },
    {
      title: "Oscars 2026: Red Carpet Preview and Predictions",
      source: "E! News",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=250&fit=crop",
      date: "2 hours ago",
      category: "Entertainment",
      description: "Live coverage of the Oscars red carpet arrivals. Academy Awards fashion, predictions, and celebrity interviews. Oscar excitement builds.",
      content: "Oscars ceremony approaches with star-studded red carpet. The Academy Awards showcase Hollywood's biggest night.",
      url: "#"
    },
    {
      title: "New Movie Trailers: Most Anticipated Films of 2026",
      source: "Rotten Tomatoes",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop",
      date: "2 hours ago",
      category: "Entertainment",
      description: "Watch exclusive movie trailers for upcoming cinema releases. Film previews showcase action movies, dramas, and comedies hitting theaters soon.",
      content: "Movie trailers reveal 2026's most exciting films. Cinema fans get first look at blockbuster movies and indie film releases.",
      url: "#"
    },
    {
      title: "Soccer Highlights: Top 10 Goals of the Week",
      source: "ESPN FC",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop",
      date: "3 hours ago",
      category: "Sports",
      description: "Watch the most spectacular soccer goals from football leagues around the world. Amazing strikes and incredible saves.",
      content: "Soccer fans enjoy compilation of stunning football goals from Premier League, La Liga, and Champions League matches.",
      url: "#"
    },
    {
      title: "Artificial Intelligence Explained: AI for Beginners",
      source: "TED-Ed",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      date: "4 hours ago",
      category: "Technology",
      description: "Understanding AI basics. Artificial intelligence fundamentals explained simply. How AI technology works and its applications.",
      content: "Educational video breaks down artificial intelligence concepts. AI technology demystified for general audiences.",
      url: "#"
    },
    {
      title: "Epstein Files Investigation: Timeline of Events",
      source: "BBC News",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=250&fit=crop",
      date: "5 hours ago",
      category: "News",
      description: "Comprehensive timeline of the Epstein case. The Epstein files investigation explained from beginning to recent developments.",
      content: "Epstein investigation timeline detailed. The Epstein documents case history and current status examined.",
      url: "#"
    },
    {
      title: "World Cup 2026 Preview: Teams to Watch",
      source: "FOX Soccer",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=250&fit=crop",
      date: "6 hours ago",
      category: "Sports",
      description: "Expert analysis of soccer teams competing for football's biggest prize. World Cup favorites and dark horses examined.",
      content: "Soccer analysts preview upcoming World Cup tournament. Football experts discuss championship contenders and predictions.",
      url: "#"
    },
    {
      title: "Academy Awards History: Greatest Oscars Moments",
      source: "Turner Classic Movies",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=250&fit=crop",
      date: "8 hours ago",
      category: "Entertainment",
      description: "Relive the most memorable Oscar moments. Academy Awards history showcased. The Oscars' most iconic speeches and wins.",
      content: "Oscars retrospective highlights Academy Awards legacy. Classic Oscar moments from cinema's biggest night.",
      url: "#"
    },
    {
      title: "Soccer Training: Professional Techniques Revealed",
      source: "Nike Football",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=250&fit=crop",
      date: "8 hours ago",
      category: "Sports",
      description: "Professional soccer players demonstrate advanced football training methods. Learn soccer skills from the pros.",
      content: "Soccer coaching video showcases professional football training techniques used by elite players worldwide.",
      url: "#"
    },
    {
      title: "Epstein Files: Investigative Journalism Deep Dive",
      source: "60 Minutes",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      date: "9 hours ago",
      category: "News",
      description: "In-depth investigation into Epstein documents. Journalists examine the Epstein files and their broader implications.",
      content: "Epstein case examined through investigative reporting. The Epstein files story told with comprehensive research and interviews.",
      url: "#"
    },
    {
      title: "AI in Creative Industries: Artificial Intelligence and Art",
      source: "Vox",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      date: "9 hours ago",
      category: "Technology",
      description: "Exploring AI-generated art and music. Artificial intelligence transforms creative processes and artistic expression.",
      content: "AI technology enables new forms of creativity. Artificial intelligence tools empower artists and challenge traditional methods.",
      url: "#"
    },
    {
      title: "Oscar-Nominated Films: Behind the Scenes Documentaries",
      source: "HBO Max",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop",
      date: "9 hours ago",
      category: "Entertainment",
      description: "Exclusive behind-the-scenes look at Oscars contenders. Academy Awards nominated films reveal production secrets and creative processes.",
      content: "Oscar nominees share filmmaking journeys. The Academy Awards recognize these exceptional movies and their creators.",
      url: "#"
    },
    {
      title: "Champions League Soccer: Best Moments Compilation",
      source: "UEFA TV",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=250&fit=crop",
      date: "9 hours ago",
      category: "Sports",
      description: "Relive greatest Champions League soccer moments. Football's premier tournament delivers unforgettable action and drama.",
      content: "Soccer excellence showcased in Champions League highlights. European football competition produces spectacular moments.",
      url: "#"
    },
    {
      title: "Movie Directors Masterclass: Filmmaking Techniques",
      source: "MasterClass",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=250&fit=crop",
      date: "10 hours ago",
      category: "Entertainment",
      description: "Award-winning directors teach cinema craft. Movie-making secrets from Hollywood's best filmmakers and storytellers.",
      content: "Cinema masters share filmmaking wisdom. Movies directed by these visionaries demonstrate artistic excellence.",
      url: "#"
    },
    {
      title: "Climate Documentary: Urgent Call for Environmental Action",
      source: "National Geographic",
      image: "https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=400&h=250&fit=crop",
      date: "10 hours ago",
      category: "Environment",
      description: "Documentary explores urgent environmental challenges and potential solutions for climate change.",
      content: "Environmental documentary highlights climate crisis impact and showcases innovative sustainability initiatives.",
      url: "#"
    },
    {
      title: "NBA Playoffs: Game 7 Extended Highlights",
      source: "NBA TV",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=250&fit=crop",
      date: "12 hours ago",
      category: "Sports",
      description: "Basketball championship series reaches dramatic conclusion. Watch extended highlights from thrilling Game 7.",
      content: "Professional basketball playoff action features spectacular plays and dramatic moments in championship series.",
      url: "#"
    },
    {
      title: "Space Exploration: Mars Rover Latest Discoveries",
      source: "NASA TV",
      image: "https://images.unsplash.com/photo-1516849677043-ef67c9557e16?w=400&h=250&fit=crop",
      date: "14 hours ago",
      category: "Science",
      description: "NASA reveals groundbreaking findings from Mars exploration mission. Scientific discoveries from the red planet.",
      content: "Space agency presents latest Mars rover discoveries and scientific data from ongoing planetary exploration.",
      url: "#"
    },
    {
      title: "Champions League Soccer: Match Analysis and Highlights",
      source: "UEFA TV",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "Sports",
      description: "European soccer championship action with expert football analysis. Champions League highlights and tactical breakdown.",
      content: "Soccer experts analyze Champions League matches. Football tactics and player performances examined in detail.",
      url: "#"
    },
    {
      title: "Hollywood Movie Trailers: Biggest Releases of 2026",
      source: "Entertainment Tonight",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "Entertainment",
      description: "Preview upcoming blockbuster films with exclusive trailers and behind-the-scenes footage from major studios.",
      content: "Entertainment industry showcases anticipated movies featuring acclaimed directors and talented ensemble casts.",
      url: "#"
    },
   {
      title: "Investigation: Supply Chain Disruptions Continue",
      source: "MSNBC",
      image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=250&fit=crop",
      date: "6 hours ago",
      description: "An in-depth look at ongoing challenges affecting global trade and distribution networks.",
      url: "#"
    },
    {
      title: "Town Hall: Community Leaders Discuss Local Issues",
      source: "PBS",
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=250&fit=crop",
      date: "8 hours ago",
      description: "Representatives and residents engage in dialogue about priorities and solutions for their area.",
      url: "#"
    },
    {
      title: "Documentary: Climate Change Impact on Coastal Regions",
      source: "National Geographic",
      image: "https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=400&h=250&fit=crop",
      date: "10 hours ago",
      description: "Comprehensive examination of environmental changes affecting shoreline communities worldwide.",
      url: "#"
    },
    {
      title: "Panel Discussion: Technology's Role in Education Reform",
      source: "C-SPAN",
      image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=250&fit=crop",
      date: "12 hours ago",
      description: "Education experts debate the integration of digital tools in modern learning environments.",
      url: "#"
    },
    {
      title: "Interview: Healthcare Innovation and Patient Care",
      source: "CBS News",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=250&fit=crop",
      date: "14 hours ago",
      description: "Medical professionals discuss advances in treatment methods and care delivery systems.",
      url: "#"
    },
    {
      title: "Coverage: International Summit on Trade Relations",
      source: "BBC World",
      image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop",
      date: "16 hours ago",
      description: "World leaders convene to address economic cooperation and international commerce challenges.",
      url: "#"
    },
    {
      title: "Feature: Artists Transforming Public Spaces",
      source: "Arts Network",
      image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=250&fit=crop",
      date: "18 hours ago",
      description: "Creative projects bring new life to urban areas through innovative installations and performances.",
      url: "#"
    },
    {
      title: "Analysis: Cybersecurity in the Modern Era",
      source: "Tech Channel",
      image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400&h=250&fit=crop",
      date: "20 hours ago",
      description: "Security experts examine emerging threats and protective measures for digital infrastructure.",
      url: "#"
    }
  ];
};

// Fallback podcasts/trending content including Jeff's keywords
const getFallbackTrendingContent = () => {
  return [
    {
      title: "Epstein Files Investigation Podcast",
      source: "ProPublica",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "News",
      description: "Reporters discuss Epstein documents and case details",
      content: "Epstein files podcast examining new evidence",
      url: "#"
    },
    {
      title: "AI Technology Deep Dive Podcast",
      source: "Lex Fridman Podcast",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "Technology",
      description: "AI experts discuss technology breakthroughs and ethics",
      content: "Artificial intelligence podcast covering AI development",
      url: "#"
    },
    {
      title: "Oscar Worthy Academy Awards Insider",
      source: "Hollywood Reporter",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "Entertainment",
      description: "Inside look at Oscars race and predictions",
      content: "Academy Awards analysis and Oscar predictions",
      url: "#"
    },
    {
      title: "The Film Review Podcast: New Movies Discussion",
      source: "Kermode and Mayo",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop",
      date: "1 day ago",
      category: "Entertainment",
      description: "Film critics review latest cinema releases and discuss movie trends in entertainment",
      content: "Movie reviews and cinema discussion podcast covering new films",
      url: "#"
    },
    {
      title: "Soccer Legends Podcast",
      source: "ESPN FC Podcast",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=250&fit=crop",
      date: "2 days ago",
      category: "Sports",
      description: "Football icon discusses soccer career and World Cup",
      content: "Soccer legend shares football insights",
      url: "#"
    },
    {
      title: "AI Revolution in Business",
      source: "McKinsey Podcast",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop",
      date: "2 days ago",
      category: "Technology",
      description: "Business leaders discuss AI transformation",
      content: "Artificial intelligence impact on industries",
      url: "#"
    },
    {
      title: "Epstein Files Legal Analysis",
      source: "Lawfare Podcast",
      image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&h=250&fit=crop",
      date: "2 days ago",
      category: "News",
      description: "Legal experts analyze Epstein documents",
      content: "Epstein case files legal perspective",
      url: "#"
    },
    {
      title: "World Cup Soccer Stories",
      source: "FIFA Podcast",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop",
      date: "3 days ago",
      category: "Sports",
      description: "Soccer players share World Cup football experiences",
      content: "Football tournament memories and soccer insights",
      url: "#"
    },
    {
      title: "Greatest Oscar Wins in History",
      source: "IndieWire Podcast",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=250&fit=crop",
      date: "3 days ago",
      category: "Entertainment",
      description: "Film critics revisit iconic Oscars moments",
      content: "Academy Awards legacy and classic Oscar wins",
      url: "#"
    },
    {
      title: "Business of Soccer Explained",
      source: "Financial Times Podcast",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=250&fit=crop",
      date: "4 days ago",
      category: "Sports",
      description: "Soccer industry experts discuss football economics",
      content: "Football business and soccer club finances",
      url: "#"
    },
    {
      title: "Artificial Intelligence and Society Podcast",
      source: "MIT Technology Review",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      date: "4 days ago",
      category: "Technology",
      description: "Researchers explore AI impact on society and culture",
      content: "Artificial intelligence societal effects discussed",
      url: "#"
    },
    {
      title: "Cinema History: Evolution of Movies",
      source: "The Film School Podcast",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop",
      date: "4 days ago",
      category: "Entertainment",
      description: "Film historians trace cinema development and movie evolution",
      content: "Movies transform from silent films to modern blockbusters",
      url: "#"
    },
    {
      title: "Epstein Investigation Reporting Ethics",
      source: "Columbia Journalism Review Podcast",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      date: "5 days ago",
      category: "News",
      description: "Journalists discuss ethical considerations in Epstein files coverage",
      content: "Epstein case reporting standards and media responsibility",
      url: "#"
    },
    {
      title: "Soccer Tactics and Strategy Deep Dive",
      source: "The Athletic Football Podcast",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop",
      date: "5 days ago",
      category: "Sports",
      description: "Coaches analyze soccer formations and football tactical evolution",
      content: "Soccer strategy breakdown and football coaching insights",
      url: "#"
    },
    {
      title: "Academy Awards Campaign Strategies",
      source: "Variety Awards Circuit Podcast",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=250&fit=crop",
      date: "5 days ago",
      category: "Entertainment",
      description: "Oscar campaign experts reveal how films compete for Academy Awards",
      content: "Oscars race strategies and awards season campaigning",
      url: "#"
    },
    {
      title: "Future of Artificial Intelligence",
      source: "Sam Harris Making Sense Podcast",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop",
      date: "6 days ago",
      category: "Technology",
      description: "AI researchers predict artificial intelligence future developments",
      content: "AI technology trajectory and long-term implications",
      url: "#"
    },
    {
      title: "Health and Wellness Podcast",
      source: "Health Podcast Network",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=250&fit=crop",
      date: "6 days ago",
      category: "Health",
      description: "Nutrition experts discuss healthy eating",
      content: "Evidence-based wellness recommendations",
      url: "#"
    }
  ];
};

// Fetch top news stories
export const fetchTopNews = async (category = null) => {
  try {
    // Try RSS first (no API limits, unlimited requests)
    console.log('Fetching news from RSS feeds...');
    const rssNews = await getRSSNews(category);
    
    if (rssNews && rssNews.length > 0) {
      console.log(`Successfully fetched ${rssNews.length} articles from RSS feeds`);
      return rssNews;
    }
    
    console.log('RSS returned no articles, falling back to hardcoded content');
    return getFallbackNews();
  } catch (error) {
    console.error('Error fetching news (RSS failed):', error.message);
    return getFallbackNews();
  }
};

// Fetch news by category
export const fetchNewsByCategory = async (category) => {
  try {
    // Use RSS aggregator with category filtering
    console.log(`Fetching ${category} news from RSS feeds...`);
    const rssNews = await getRSSNews(category);
    
    if (rssNews && rssNews.length > 0) {
      console.log(`Successfully fetched ${rssNews.length} ${category} articles from RSS`);
      return rssNews;
    }
    
    console.log(`RSS returned no ${category} articles, using fallback content`);
    return getFallbackNews();
  } catch (error) {
    console.error(`Error fetching ${category} news:`, error);
    return getFallbackNews();
  }
};

// Fetch opinions/editorials
export const fetchOpinions = async () => {
  try {
    // Use RSS aggregator for opinions
    console.log('Fetching opinions from RSS feeds...');
    const rssOpinions = await getRSSOpinions();
    
    if (rssOpinions && rssOpinions.length > 0) {
      console.log(`Successfully fetched ${rssOpinions.length} opinion pieces from RSS`);
      return rssOpinions;
    }
    
    console.log('RSS returned no opinions, using fallback content');
    return getFallbackOpinions();
  } catch (error) {
    console.error('Error fetching opinions:', error);
    return getFallbackOpinions();
  }
};

// Fetch video content
export const fetchVideos = async () => {
  try {
    // Use RSS aggregator for videos
    console.log('Fetching videos from RSS feeds...');
    const rssVideos = await getRSSVideos();
    
    if (rssVideos && rssVideos.length > 0) {
      console.log(`Successfully fetched ${rssVideos.length} videos from RSS`);
      return rssVideos;
    }
    
    console.log('RSS returned no videos, using fallback content');
    return getFallbackVideos();
  } catch (error) {
    console.error('Error fetching videos:', error);
    return getFallbackVideos();
  }
};

// Fetch trending informative content (podcasts/interviews)
export const fetchTrendingContent = async () => {
  try {
    // Use RSS aggregator for podcasts
    console.log('Fetching podcasts from RSS feeds...');
    const rssPodcasts = await getRSSPodcasts();
    
    if (rssPodcasts && rssPodcasts.length > 0) {
      console.log(`Successfully fetched ${rssPodcasts.length} podcasts from RSS`);
      return rssPodcasts;
    }
    
    console.log('RSS returned no podcasts, using fallback content');
    return getFallbackTrendingContent();
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return getFallbackTrendingContent();
  }
};

// Export alias for compatibility with existing code
export const fetchRSSNews = fetchTopNews;
