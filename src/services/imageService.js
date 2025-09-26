// Image Optimization Service for SLAM25 Application
// Handles lazy loading, WebP support, and CDN integration

class ImageService {
  constructor() {
    this.imageCache = new Map();
    this.intersectionObserver = null;
    this.cdnBaseUrl = import.meta.env.VITE_CDN_URL || '';
    this.webpSupported = this.checkWebPSupport();
    this.retinaSupported = window.devicePixelRatio > 1;
    
    this.initializeIntersectionObserver();
  }

  // Check WebP support
  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Initialize intersection observer for lazy loading
  initializeIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              this.loadImage(img);
              this.intersectionObserver.unobserve(img);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );
    }
  }

  // Generate optimized image URL
  generateOptimizedUrl(originalUrl, options = {}) {
    const {
      width = null,
      height = null,
      quality = 85,
      format = this.webpSupported ? 'webp' : 'jpeg',
      crop = null,
      blur = null
    } = options;

    // If CDN is configured, use it for optimization
    if (this.cdnBaseUrl && this.isExternalUrl(originalUrl)) {
      return this.generateCDNUrl(originalUrl, {
        width,
        height,
        quality,
        format,
        crop,
        blur
      });
    }

    // For local images, return original URL
    return originalUrl;
  }

  // Generate CDN URL with optimization parameters
  generateCDNUrl(originalUrl, options) {
    const params = new URLSearchParams();
    
    if (options.width) params.append('w', options.width);
    if (options.height) params.append('h', options.height);
    if (options.quality) params.append('q', options.quality);
    if (options.format) params.append('f', options.format);
    if (options.crop) params.append('c', options.crop);
    if (options.blur) params.append('b', options.blur);

    return `${this.cdnBaseUrl}/optimize?url=${encodeURIComponent(originalUrl)}&${params.toString()}`;
  }

  // Check if URL is external
  isExternalUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // Load image with optimization
  async loadImage(imgElement) {
    const originalSrc = imgElement.dataset.src || imgElement.src;
    if (!originalSrc) return;

    try {
      // Check cache first
      if (this.imageCache.has(originalSrc)) {
        imgElement.src = this.imageCache.get(originalSrc);
        imgElement.classList.remove('lazy');
        return;
      }

      // Generate optimized URL
      const optimizedUrl = this.generateOptimizedUrl(originalSrc, {
        width: imgElement.dataset.width,
        height: imgElement.dataset.height,
        quality: imgElement.dataset.quality || 85
      });

      // Load image
      await this.preloadImage(optimizedUrl);
      
      // Cache the result
      this.imageCache.set(originalSrc, optimizedUrl);
      
      // Update image element
      imgElement.src = optimizedUrl;
      imgElement.classList.remove('lazy');
      
      // Trigger load event
      imgElement.dispatchEvent(new Event('load'));
      
    } catch (error) {
      console.warn('Failed to load optimized image:', error);
      // Fallback to original URL
      imgElement.src = originalSrc;
      imgElement.classList.remove('lazy');
    }
  }

  // Preload image
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Setup lazy loading for image
  setupLazyLoading(imgElement) {
    if (!this.intersectionObserver) {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(imgElement);
      return;
    }

    // Store original src in data attribute
    if (imgElement.src && !imgElement.dataset.src) {
      imgElement.dataset.src = imgElement.src;
      imgElement.src = this.getPlaceholderUrl();
    }

    imgElement.classList.add('lazy');
    this.intersectionObserver.observe(imgElement);
  }

  // Get placeholder URL
  getPlaceholderUrl() {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E`;
  }

  // Generate responsive image sources
  generateResponsiveSources(originalUrl, breakpoints = []) {
    const sources = [];
    
    breakpoints.forEach(breakpoint => {
      const optimizedUrl = this.generateOptimizedUrl(originalUrl, {
        width: breakpoint.width,
        height: breakpoint.height,
        quality: breakpoint.quality || 85
      });
      
      sources.push({
        src: optimizedUrl,
        media: breakpoint.media || `(max-width: ${breakpoint.width}px)`,
        width: breakpoint.width,
        height: breakpoint.height
      });
    });

    return sources;
  }

  // Create responsive picture element
  createResponsivePicture(originalUrl, alt, breakpoints, className = '') {
    const picture = document.createElement('picture');
    picture.className = className;

    // Add source elements
    breakpoints.forEach(breakpoint => {
      const source = document.createElement('source');
      source.media = breakpoint.media || `(max-width: ${breakpoint.width}px)`;
      source.srcset = this.generateOptimizedUrl(originalUrl, {
        width: breakpoint.width,
        height: breakpoint.height,
        quality: breakpoint.quality || 85
      });
      picture.appendChild(source);
    });

    // Add fallback img element
    const img = document.createElement('img');
    img.src = originalUrl;
    img.alt = alt;
    img.className = 'lazy';
    img.dataset.src = originalUrl;
    picture.appendChild(img);

    return picture;
  }

  // Optimize image for upload
  async optimizeForUpload(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
      format = this.webpSupported ? 'webp' : 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Get image dimensions
  getImageDimensions(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Generate thumbnail
  generateThumbnail(originalUrl, width = 150, height = 150) {
    return this.generateOptimizedUrl(originalUrl, {
      width,
      height,
      quality: 75,
      crop: 'fill'
    });
  }

  // Clear image cache
  clearCache() {
    this.imageCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cachedImages: this.imageCache.size,
      webpSupported: this.webpSupported,
      retinaSupported: this.retinaSupported,
      cdnConfigured: !!this.cdnBaseUrl
    };
  }

  // Setup lazy loading for all images with data-src attribute
  setupLazyLoadingForAll() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => this.setupLazyLoading(img));
  }

  // Convert to WebP if supported
  convertToWebP(url) {
    if (!this.webpSupported) return url;
    return this.generateOptimizedUrl(url, { format: 'webp' });
  }

  // Generate retina image URL
  generateRetinaUrl(url, scale = 2) {
    if (!this.retinaSupported) return url;
    return this.generateOptimizedUrl(url, { 
      width: parseInt(url.match(/w=(\d+)/)?.[1] || 0) * scale,
      height: parseInt(url.match(/h=(\d+)/)?.[1] || 0) * scale
    });
  }
}

// Create singleton instance
const imageService = new ImageService();

export default imageService;
