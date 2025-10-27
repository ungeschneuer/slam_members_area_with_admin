import React from 'react';
import { useLocation } from 'react-router-dom';

// Main page transition wrapper - React 19 compatible
export default function PageTransition({ children, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div 
      className={`page-transition-wrapper ${className} ${isVisible ? 'page-transition-enter-active' : 'page-transition-enter'}`}
      style={{
        transition: 'opacity 500ms ease-in-out, transform 500ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
      }}
    >
      {children}
    </div>
  );
}

// Fade In Animation Component - React 19 compatible
export function FadeIn({ children, delay = 0, duration = 300, className = '' }) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`fade-in-wrapper ${className}`}
      style={{
        transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(10px)'
      }}
    >
      {children}
    </div>
  );
}

// Staggered Container for multiple children - React 19 compatible
export function StaggeredContainer({ children, staggerDelay = 100, className = '' }) {
  const [visibleItems, setVisibleItems] = React.useState([]);

  React.useEffect(() => {
    const childrenArray = React.Children.toArray(children);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < childrenArray.length) {
        setVisibleItems(prev => [...prev, currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, staggerDelay);

    return () => clearInterval(interval);
  }, [children, staggerDelay]);

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!visibleItems.includes(index)) return null;
        
        return (
          <div 
            key={index}
            className="stagger-item-wrapper"
            style={{
              transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
              opacity: 1,
              transform: 'translateY(0)'
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

// Animate on Scroll Component - React 19 compatible
export function AnimateOnScroll({ children, threshold = 0.1, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const node = elementRef.current;
    if (!node || node.nodeType !== 1) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (node) observer.unobserve(node);
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      try {
        if (node) observer.unobserve(node);
      } catch {}
      observer.disconnect?.();
    };
  }, [threshold]);

  return (
    <div
      ref={elementRef}
      className={`animate-on-scroll-wrapper ${className}`}
      style={{
        transition: 'opacity 700ms ease-in-out, transform 700ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
      }}
    >
      {children}
    </div>
  );
}

// Route Transition Component for React Router - React 19 compatible
export function RouteTransition({ children }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsVisible(true);
    // Scroll to top when route changes
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname, location.search, location.hash]);

  return (
    <div 
      className="route-transition-wrapper"
      style={{
        transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)'
      }}
    >
      {children}
    </div>
  );
}

// Slide Transition Component - React 19 compatible
export function SlideTransition({ children, direction = 'up', className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  const getTransform = () => {
    switch (direction) {
      case 'up': return isVisible ? 'translateY(0)' : 'translateY(20px)';
      case 'down': return isVisible ? 'translateY(0)' : 'translateY(-20px)';
      case 'left': return isVisible ? 'translateX(0)' : 'translateX(20px)';
      case 'right': return isVisible ? 'translateX(0)' : 'translateX(-20px)';
      default: return isVisible ? 'translateY(0)' : 'translateY(20px)';
    }
  };

  return (
    <div 
      className={`slide-transition-wrapper slide-${direction}-wrapper ${className}`}
      style={{
        transition: 'opacity 400ms ease-in-out, transform 400ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: getTransform()
      }}
    >
      {children}
    </div>
  );
}

// Scale Transition Component - React 19 compatible
export function ScaleTransition({ children, className = '' }) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div 
      className={`scale-transition-wrapper ${className}`}
      style={{
        transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.9)'
      }}
    >
      {children}
    </div>
  );
}

// Hover Transition Component for interactive elements - React 19 compatible
export function HoverTransition({ children, className = '', hoverClass = 'hover-scale' }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className={`hover-transition-wrapper ${className} ${hoverClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transition: 'transform 200ms ease-in-out',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {children}
    </div>
  );
}

// Image Load Transition Component - React 19 compatible
export function ImageLoadTransition({ children, className = '', isLoaded = false }) {
  return (
    <div 
      className={`image-load-transition-wrapper ${className}`}
      style={{
        transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'scale(1)' : 'scale(0.95)'
      }}
    >
      {children}
    </div>
  );
}

// Opacity Transition Component for overlays - React 19 compatible
export function OpacityTransition({ children, className = '', isVisible = false, timeout = 300 }) {
  return (
    <div 
      className={`opacity-transition-wrapper ${className}`}
      style={{
        transition: `opacity ${timeout}ms ease-in-out`,
        opacity: isVisible ? 1 : 0
      }}
    >
      {children}
    </div>
  );
}
