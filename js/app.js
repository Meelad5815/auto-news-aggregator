/**
 * Main Application Logic
 * Handles UI interactions and news display
 */

class NewsApp {
    constructor() {
        this.fetcher = new NewsFetcher();
        this.seoOptimizer = new SEOOptimizer();
        this.currentCategory = 'all';
        this.currentPage = 1;
        this.articles = [];
        this.viewMode = 'grid';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadNews('all');
        this.updateLastUpdateTime();
        
        // Auto-refresh every 30 minutes
        setInterval(() => {
            this.refreshNews();
        }, 1800000);
    }

    setupEventListeners() {
        // Category navigation
        document.querySelectorAll('[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                this.loadNews(category);
                
                // Update active state
                document.querySelectorAll('[data-category]').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewMode = e.target.dataset.view;
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateViewMode();
            });
        });

        // Load more button
        document.getElementById('load-more-btn')?.addEventListener('click', () => {
            this.loadMoreArticles();
        });

        // Mobile menu toggle
        document.querySelector('.hamburger')?.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
    }

    async loadNews(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        
        const container = document.getElementById('news-container');
        container.innerHTML = '<div class="loading-container"><div class="loading-spinner">Loading latest news...</div></div>';
        
        try {
            this.articles = await this.fetcher.fetchCategory(category);
            
            if (this.articles.length === 0) {
                container.innerHTML = '<div class="no-news"><p>No news available at the moment. Please try again later.</p></div>';
                return;
            }
            
            this.displayArticles();
            this.seoOptimizer.addStructuredData(this.articles.slice(0, 10));
            this.seoOptimizer.addBreadcrumb(category);
            this.updateCategoryTitle(category);
            
        } catch (error) {
            console.error('Error loading news:', error);
            container.innerHTML = '<div class="error-message"><p>Failed to load news. Please try again later.</p></div>';
        }
    }

    displayArticles() {
        const container = document.getElementById('news-container');
        const paginatedArticles = this.fetcher.getPaginatedArticles(this.articles, this.currentPage);
        
        if (this.currentPage === 1) {
            container.innerHTML = '';
        }
        
        paginatedArticles.forEach(article => {
            const articleElement = this.createArticleCard(article);
            container.appendChild(articleElement);
        });
        
        // Update load more button
        const totalPages = this.fetcher.getTotalPages(this.articles);
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            if (this.currentPage >= totalPages) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'No More News';
            } else {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Load More News';
            }
        }
        
        // Lazy load images
        setTimeout(() => this.seoOptimizer.lazyLoadImages(), 100);
    }

    createArticleCard(article) {
        const card = document.createElement('article');
        card.className = 'news-card';
        card.setAttribute('itemscope', '');
        card.setAttribute('itemtype', 'https://schema.org/NewsArticle');
        
        card.innerHTML = `
            <div class="news-card-image">
                <img src="${this.escapeHtml(article.image)}" 
                     alt="${this.escapeHtml(article.title)}" 
                     loading="lazy"
                     itemprop="image">
            </div>
            <div class="news-card-content">
                <div class="news-card-meta">
                    <span class="category-badge">${this.escapeHtml(article.category)}</span>
                    <time datetime="${article.pubDate}" itemprop="datePublished">
                        ${this.formatDate(article.pubDate)}
                    </time>
                </div>
                <h3 class="news-card-title" itemprop="headline">
                    <a href="${this.escapeHtml(article.link)}" 
                       target="_blank" 
                       rel="noopener noreferrer nofollow"
                       itemprop="url">
                        ${this.escapeHtml(article.title)}
                    </a>
                </h3>
                <p class="news-card-description" itemprop="description">
                    ${this.escapeHtml(article.description)}
                </p>
                <div class="news-card-footer">
                    <a href="${this.escapeHtml(article.link)}" 
                       class="read-more" 
                       target="_blank" 
                       rel="noopener noreferrer nofollow">
                        Read More →
                    </a>
                    <span class="source-name" itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
                        <span itemprop="name">${this.escapeHtml(article.source)}</span>
                    </span>
                </div>
            </div>
        `;
        
        return card;
    }

    loadMoreArticles() {
        this.currentPage++;
        this.displayArticles();
        
        // Smooth scroll to new content
        setTimeout(() => {
            const cards = document.querySelectorAll('.news-card');
            const targetCard = cards[cards.length - this.fetcher.articlesPerPage];
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    updateViewMode() {
        const container = document.getElementById('news-container');
        if (this.viewMode === 'grid') {
            container.className = 'news-grid';
        } else {
            container.className = 'news-list';
        }
    }

    updateCategoryTitle(category) {
        const titleElement = document.getElementById('category-title');
        if (titleElement) {
            titleElement.textContent = category === 'all' ? 'All News' : 
                category.charAt(0).toUpperCase() + category.slice(1) + ' News';
        }
    }

    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    async refreshNews() {
        console.log('Auto-refreshing news...');
        this.fetcher.cache.clear();
        await this.loadNews(this.currentCategory);
        this.updateLastUpdateTime();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                return `${diffMinutes} minutes ago`;
            }
            return `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        }
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new NewsApp();
    });
} else {
    new NewsApp();
}