/**
 * Image optimization utilities for Supabase Storage
 * Reduces bandwidth by serving appropriately sized images
 */

export type ImageSize = 'thumb' | 'small' | 'medium' | 'large' | 'original';

export const IMAGE_SIZES = {
    thumb: { width: 50, height: 50, quality: 70 },      // Tiny icons in lists
    small: { width: 100, height: 100, quality: 75 },    // Grid thumbnails
    medium: { width: 300, height: 300, quality: 80 },   // Product cards
    large: { width: 800, height: 800, quality: 85 },    // Detail view
    original: null                                       // Full size (no optimization)
};

/**
 * Get optimized image URL with size and quality parameters
 * Works with Supabase Storage URLs
 * 
 * @param url - Original image URL
 * @param size - Desired image size preset
 * @param customQuality - Optional custom quality (overrides preset)
 * @returns Optimized image URL or placeholder
 * 
 * @example
 * // Thumbnail in list
 * <img src={getOptimizedImageUrl(product.image, 'small')} />
 * 
 * // Full size in detail view
 * <img src={getOptimizedImageUrl(product.image, 'large')} />
 */
export function getOptimizedImageUrl(
    url: string | null | undefined,
    size: ImageSize = 'medium',
    customQuality?: number
): string {
    // Return placeholder if no URL
    if (!url || url.trim() === '') {
        return '/placeholder-product.png';
    }

    // If original size requested, return as-is
    if (size === 'original') {
        return url;
    }

    // Get size configuration
    const sizeConfig = IMAGE_SIZES[size];
    if (!sizeConfig) {
        return url;
    }

    // Only optimize Supabase Storage URLs
    if (url.includes('supabase.co/storage') || url.includes('/storage/v1/object/public/')) {
        const { width, height, quality } = sizeConfig;
        const finalQuality = customQuality || quality;

        // Build optimization parameters
        const params = new URLSearchParams({
            width: width.toString(),
            height: height.toString(),
            quality: finalQuality.toString(),
            resize: 'contain' // Maintain aspect ratio
        });

        // Check if URL already has query params
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}${params.toString()}`;
    }

    // External URLs - return as-is
    return url;
}

/**
 * Get responsive image srcset for different screen sizes
 * 
 * @param url - Original image URL
 * @returns srcset string for responsive images
 * 
 * @example
 * <img 
 *   src={getOptimizedImageUrl(url, 'medium')}
 *   srcSet={getResponsiveImageSrcSet(url)}
 * />
 */
export function getResponsiveImageSrcSet(url: string | null | undefined): string {
    if (!url) return '';

    return [
        `${getOptimizedImageUrl(url, 'small')} 100w`,
        `${getOptimizedImageUrl(url, 'medium')} 300w`,
        `${getOptimizedImageUrl(url, 'large')} 800w`
    ].join(', ');
}

/**
 * Preload critical images for better UX
 * 
 * @param urls - Array of image URLs to preload
 * @param size - Size preset to preload
 */
export function preloadImages(urls: string[], size: ImageSize = 'medium'): void {
    urls.forEach(url => {
        if (url) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = getOptimizedImageUrl(url, size);
            document.head.appendChild(link);
        }
    });
}
