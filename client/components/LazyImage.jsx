import React, { useState, useRef, useEffect } from 'react';
import { ImageLoadTransition } from './Transitions.jsx';

export default function LazyImage({ 
  src, 
  alt, 
  className = "", 
  placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E",
  fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ef4444'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='12'%3EImage Error%3C/text%3E%3C/svg%3E"
}) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let observer;
    let didCancel = false;

    if (imageRef && imageSrc === placeholder) {
      if (typeof window !== 'undefined' && typeof window.IntersectionObserver !== 'undefined') {
        // Ensure we observe only Elements
        if (imageRef.nodeType === 1) {
          observer = new IntersectionObserver(
            entries => {
              entries.forEach(entry => {
                if (
                  !didCancel &&
                  (entry.intersectionRatio > 0 || entry.isIntersecting)
                ) {
                  setImageSrc(src);
                  try { observer.unobserve(imageRef); } catch {}
                }
              });
            },
            {
              threshold: 0.01,
              rootMargin: '75%',
            }
          );
          try { observer.observe(imageRef); } catch {}
        }
      } else {
        // Fallback for older browsers
        setImageSrc(src);
      }
    }
    return () => {
      didCancel = true;
      if (observer) {
        try { observer.unobserve(imageRef); } catch {}
        observer.disconnect?.();
      }
    };
  }, [src, imageSrc, imageRef, placeholder]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoaded(false);
    setHasError(true);
    setImageSrc(fallback);
  };

  return (
    <ImageLoadTransition isLoaded={isLoaded} className={className}>
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </ImageLoadTransition>
  );
}
