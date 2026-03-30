import { useEffect, useRef, useState } from 'react';
import { processImageUrl } from '../../utils/imageUtils';
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
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Crect fill="%23f0f0f0"/%3E%3C/svg%3E',
  errorFallback = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'
}) => {
  // Route through weserv.nl for WebP conversion + sharpening.
  // Keep the original src so we can fall back to it if the proxy is blocked.
  const processedSrc = processImageUrl(src, { width, quality, sharpen: true });
  const isProxied = processedSrc !== src;
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    let observer;
    let didCancel = false;

    if (imageRef && imageSrc === placeholder) {
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
                observer.unobserve(imageRef);
              }
            });
          },
          {
            threshold: 0.01,
            rootMargin: '200px' // Start loading 200px before image is visible
          }
        );
        observer.observe(imageRef);
      } else {
        // Fallback for browsers that don't support IntersectionObserver
        setImageSrc(processedSrc);
      }
    }
    
    return () => {
      didCancel = true;
      // on component unmount, disconnect observer
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    };
  }, [src, imageSrc, imageRef, placeholder]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    // Step 1: proxy blocked? try the original unproxied URL
    if (isProxied && imageSrc === processedSrc) {
      setImageSrc(src);
      return;
    }
    // Step 2: original also failed → generic fallback
    setHasError(true);
    setIsLoading(false);
    if (errorFallback && imageSrc !== errorFallback) {
      setImageSrc(errorFallback);
    }
  };

  return (
    <div className={`lazy-image-container ${className}`}>
      <img
        ref={setImageRef}
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
