import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  screenWidth: number;
}

export function useResponsive(): ResponsiveState {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => {
    // Initial state with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        prefersReducedMotion: false,
        screenWidth: 1024,
      };
    }

    const width = window.innerWidth;
    return {
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenWidth: width,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create media query lists
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const tabletQuery = window.matchMedia('(min-width: 769px) and (max-width: 1024px)');
    const desktopQuery = window.matchMedia('(min-width: 1025px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const updateState = () => {
      const width = window.innerWidth;
      setResponsiveState({
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024,
        isTouch: pointerQuery.matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        prefersReducedMotion: motionQuery.matches,
        screenWidth: width,
      });
    };

    // Add listeners to all media queries
    const queries = [mobileQuery, tabletQuery, desktopQuery, motionQuery, pointerQuery];
    queries.forEach(query => {
      query.addEventListener('change', updateState);
    });

    // Also listen to resize for screen width updates
    window.addEventListener('resize', updateState);

    // Cleanup function
    return () => {
      queries.forEach(query => {
        query.removeEventListener('change', updateState);
      });
      window.removeEventListener('resize', updateState);
    };
  }, []);

  return responsiveState;
}