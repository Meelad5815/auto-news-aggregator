/**
 * SEO Optimizer for Better Google Rankings
 * Handles meta tags, structured data, and SEO best practices
 */

class SEOOptimizer {
    constructor() {
        this.siteName = 'Auto News Aggregator';
        this.siteUrl = 'https://meelad5815.github.io/auto-news-aggregator/';
        this.defaultImage = this.siteUrl + 'images/og-image.jpg';
    }

    // Update page meta tags dynamically
    updateMetaTags(article) {
        // Update title
        document.title = `${article.title} | ${this.siteName}`;
        
        // Update meta description
        this.updateMeta('description', article.description);
        this.updateMeta('keywords', article.keywords.join(', '));
        
        // Open Graph tags
        this.updateMeta('og:title', article.title, 'property');
        this.updateMeta('og:description', article.description, 'property');
        this.updateMeta('og:image', article.image, 'property');
        this.updateMeta('og:url', article.link, 'property');
        this.updateMeta('og:type', 'article', 'property');
        
        // Twitter Card
        this.updateMeta('twitter:title', article.title);
        this.updateMeta('twitter:description', article.description);
        this.updateMeta('twitter:image', article.image);
        this.updateMeta('twitter:card', 'summary_large_image');
        
        // Article specific
        this.updateMeta('article:published_time', article.pubDate, 'property');
        this.updateMeta('article:author', article.author, 'property');
        this.updateMeta('article:section', article.category, 'property');
    }

    // Helper to update meta tags
    updateMeta(name, content, attr = 'name') {
        if (!content) return;
        
        let element = document.querySelector(`meta[${attr}="${name}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attr, name);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    }

    // Add JSON-LD structured data
    addStructuredData(articles) {
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            'itemListElement': articles.map((article, index) => ({
                '@type': 'ListItem',
                'position': index + 1,
                'item': {
                    '@type': 'NewsArticle',
                    'headline': article.title,
                    'description': article.description,
                    'image': article.image,
                    'datePublished': article.pubDate,
                    'author': {
                        '@type': 'Person',
                        'name': article.author
                    },
                    'publisher': {
                        '@type': 'Organization',
                        'name': this.siteName,
                        'url': this.siteUrl
                    },
                    'mainEntityOfPage': {
                        '@type': 'WebPage',
                        '@id': article.link
                    },
                    'keywords': article.keywords.join(', ')
                }
            }))
        };

        let script = document.getElementById('structured-data');
        if (!script) {
            script = document.createElement('script');
            script.id = 'structured-data';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(structuredData);
    }

    // Generate sitemap data
    generateSitemapData(articles) {
        return articles.map(article => ({
            loc: article.link,
            lastmod: new Date(article.pubDate).toISOString().split('T')[0],
            changefreq: 'daily',
            priority: '0.8'
        }));
    }

    // Update canonical URL
    updateCanonical(url) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', url || this.siteUrl);
    }

    // Add breadcrumb structured data
    addBreadcrumb(category) {
        const breadcrumb = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': [
                {
                    '@type': 'ListItem',
                    'position': 1,
                    'name': 'Home',
                    'item': this.siteUrl
                },
                {
                    '@type': 'ListItem',
                    'position': 2,
                    'name': category.charAt(0).toUpperCase() + category.slice(1),
                    'item': this.siteUrl + '#' + category
                }
            ]
        };

        let script = document.getElementById('breadcrumb-data');
        if (!script) {
            script = document.createElement('script');
            script.id = 'breadcrumb-data';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(breadcrumb);
    }

    // Performance optimization
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SEOOptimizer = SEOOptimizer;
}