import { useEffect, useRef, useState } from 'react';
import { processImageUrl, getFallbackImage, getPhotoFallback } from '../../utils/imageUtils';
import './LazyImage.css';

/**
 * LazyImage component with Intersection Observer
 * Loads images only when they're about to enter the viewport
 * Includes loading placeholder and error handling
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  width = 900,
  quality = 88,
  category = 'news',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Crect fill="%23f0f0f0"/%3E%3C/svg%3E',
  errorFallback,
}) => {
  // Route through weserv.nl for WebP conversion + sharpening.
  // Keep the original src so we can fall back to it if the proxy is blocked.
  const processedSrc = processImageUrl(src, { width, quality, sharpen: true });
  const isProxied = processedSrc !== src;
  // errorFallback stays an explicit-override escape hatch; the category pool
  // is what actually varies the fallback instead of repeating one photo.
  const categoryFallback = errorFallback || getFallbackImage(category);
  const seededFallback = getPhotoFallback(category, alt);
  const [imageSrc, setImageSrc] = useState(() => (
    typeof IntersectionObserver === 'undefined' ? processedSrc : placeholder
  ));
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    let observer;
    let didCancel = false;

    if (imageRef.current && imageSrc === placeholder) {
      if (IntersectionObserver) {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              // When image is visible in the viewport
              if (
                !didCancel &&
                (entry.intersectionRatio > 0 || entry.isIntersecting)
              ) {
                setIsLoading(true);
                setImageSrc(processedSrc);
                observer.unobserve(imageRef.current);
              }
            });
          },
          {
            threshold: 0.01,
            rootMargin: '200px' // Start loading 200px before image is visible
          }
        );
        observer.observe(imageRef.current);
      }
    }
    
    return () => {
      didCancel = true;
      // on component unmount, disconnect observer
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    };
  }, [imageSrc, placeholder, processedSrc]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    // Step 1: proxy blocked? try the original unproxied URL
    if (isProxied && imageSrc === processedSrc) {
      setImageSrc(src);
      return;
    }
    // Step 2: original also failed → category-specific fallback
    if (imageSrc !== categoryFallback) {
      setHasError(true);
      setIsLoading(false);
      setImageSrc(categoryFallback);
      return;
    }
    // Step 3: category fallback failed too → seeded photo that varies per
    // article instead of repeating the same image site-wide
    if (imageSrc !== seededFallback) {
      setImageSrc(seededFallback);
    }
  };

  return (
    <div className={`lazy-image-container ${className}`}>
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        className={`lazy-image ${isLoading ? 'loading' : 'loaded'} ${hasError ? 'error' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy" // Native lazy loading as fallback
      />
      {isLoading && imageSrc !== placeholder && (
        <div className="lazy-image-spinner">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
