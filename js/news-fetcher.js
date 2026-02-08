/**
 * Advanced News Fetcher with Multiple RSS Sources
 * Fetches, caches, and manages news from various sources
 */

class NewsFetcher {
    constructor() {
        // Using multiple RSS to JSON APIs for redundancy
        this.corsProxies = [
            'https://api.rss2json.com/v1/api.json?rss_url=',
            'https://api.allorigins.win/raw?url='
        ];
        
        this.currentProxyIndex = 0;
        
        // Multiple news sources RSS feeds
        this.newsFeeds = {
            technology: [
                'https://techcrunch.com/feed/',
                'https://www.theverge.com/rss/index.xml',
                'https://www.wired.com/feed/rss'
            ],
            business: [
                'https://feeds.bloomberg.com/markets/news.rss',
                'https://www.cnbc.com/id/100003114/device/rss/rss.html'
            ],
            entertainment: [
                'https://variety.com/feed/',
                'https://www.hollywoodreporter.com/feed/'
            ],
            sports: [
                'https://www.espn.com/espn/rss/news',
                'http://rss.cnn.com/rss/edition_sport.rss'
            ],
            health: [
                'https://www.medicalnewstoday.com/rss',
                'https://rss.sciencedaily.com/health.xml'
            ],
            science: [
                'https://www.sciencedaily.com/rss/all.xml',
                'https://www.scientificamerican.com/feed/'
            ],
            world: [
                'http://feeds.bbci.co.uk/news/world/rss.xml',
                'http://rss.cnn.com/rss/edition_world.rss'
            ],
            all: [
                'http://rss.cnn.com/rss/edition.rss',
                'http://feeds.bbci.co.uk/news/rss.xml',
                'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'
            ]
        };
        
        this.cache = new Map();
        this.cacheTimeout = 1800000; // 30 minutes
        this.articles = [];
        this.currentPage = 1;
        this.articlesPerPage = 12;
    }

    // Get CORS proxy
    getCorsProxy() {
        return this.corsProxies[this.currentProxyIndex];
    }

    // Switch to next proxy if current fails
    switchProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    }

    // Fetch RSS feed
    async fetchFeed(feedUrl, retries = 2) {
        try {
            const proxy = this.getCorsProxy();
            const response = await fetch(proxy + encodeURIComponent(feedUrl), {
                timeout: 10000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching ${feedUrl}:`, error);
            
            if (retries > 0) {
                this.switchProxy();
                return await this.fetchFeed(feedUrl, retries - 1);
            }
            
            return null;
        }
    }

    // Fetch multiple feeds for a category
    async fetchCategory(category = 'all') {
        const cacheKey = `category_${category}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`Using cached data for ${category}`);
                return cached.data;
            }
        }
        
        const feeds = this.newsFeeds[category] || this.newsFeeds.all;
        const promises = feeds.map(feed => this.fetchFeed(feed));
        const results = await Promise.all(promises);
        
        const validResults = results.filter(r => r !== null);
        
        let allArticles = [];
        validResults.forEach(result => {
            if (result.items) {
                const articles = this.parseArticles(result.items, category, result.feed);
                allArticles = allArticles.concat(articles);
            }
        });
        
        // Sort by date
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        // Cache the results
        this.cache.set(cacheKey, {
            data: allArticles,
            timestamp: Date.now()
        });
        
        return allArticles;
    }

    // Parse articles with SEO optimization
    parseArticles(items, category, feedInfo) {
        return items.map(item => {
            const title = this.sanitizeText(item.title || '');
            const description = this.sanitizeText(item.description || item.content || '');
            
            return {
                id: this.generateId(item.link),
                title: title,
                description: description.substring(0, 200),
                fullDescription: description,
                link: item.link,
                pubDate: item.pubDate || new Date().toISOString(),
                category: category,
                image: this.extractImage(item),
                author: item.author || feedInfo?.title || 'Unknown',
                source: feedInfo?.title || this.extractDomain(item.link),
                keywords: this.extractKeywords(title + ' ' + description)
            };
        });
    }

    // Generate unique ID
    generateId(url) {
        return btoa(url).substring(0, 16);
    }

    // Extract image from article
    extractImage(item) {
        // Try multiple sources
        if (item.thumbnail) return item.thumbnail;
        if (item.enclosure && item.enclosure.link) return item.enclosure.link;
        if (item['media:thumbnail']) return item['media:thumbnail'].url;
        
        // Try to find image in content
        if (item.content || item.description) {
            const content = item.content || item.description;
            const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
            if (imgMatch) return imgMatch[1];
        }
        
        // Default placeholder
        return 'https://via.placeholder.com/400x300/2563eb/ffffff?text=News';
    }

    // Extract domain from URL
    extractDomain(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch {
            return 'News Source';
        }
    }

    // Sanitize text
    sanitizeText(text) {
        const temp = document.createElement('div');
        temp.innerHTML = text;
        return (temp.textContent || temp.innerText || '').trim();
    }

    // Extract keywords for SEO
    extractKeywords(text) {
        const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to'];
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word));
        
        // Get unique words
        return [...new Set(words)].slice(0, 10);
    }

    // Get paginated articles
    getPaginatedArticles(articles, page) {
        const start = (page - 1) * this.articlesPerPage;
        const end = start + this.articlesPerPage;
        return articles.slice(start, end);
    }

    // Calculate total pages
    getTotalPages(articles) {
        return Math.ceil(articles.length / this.articlesPerPage);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.NewsFetcher = NewsFetcher;
}