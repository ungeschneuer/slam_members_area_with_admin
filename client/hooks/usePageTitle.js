import { useEffect } from 'react';

/**
 * Hook to update the document title
 * @param {string} title - The page title (without "| SLAM25" suffix)
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | SLAM25` : 'SLAM25 Mitgliederbereich';
    return () => { document.title = previousTitle; };
  }, [title]);
}
