/**
 * Shared utilities for handling external links
 * Follows the project's simplicity principles by providing a single source of truth
 */

/**
 * Validates that a link object has the required properties
 * @param {object} link - The link object to validate
 * @returns {boolean} - Whether the link object is valid
 */
export const isValidLink = (link) => {
  return link && 
         typeof link === 'object' && 
         typeof link.url === 'string' && 
         link.url.length > 0 &&
         typeof link.title === 'string' &&
         link.title.length > 0;
};

/**
 * Determines if a link should open in a new tab
 * @param {string} url - The link URL
 * @param {boolean} isExternal - The external flag from database
 * @returns {boolean} - Whether the link should open in a new tab
 */
export const shouldOpenInNewTab = (url, isExternal) => {
  if (!url) return false;
  
  // Use the is_external flag from database OR check if it's an absolute URL
  return isExternal || url.startsWith('http://') || url.startsWith('https://');
};

/**
 * Gets the appropriate target and rel attributes for a link
 * @param {string} url - The link URL
 * @param {boolean} isExternal - The external flag from database
 * @returns {object} - Object with target and rel properties
 */
export const getLinkProps = (url, isExternal) => {
  const isNewTab = shouldOpenInNewTab(url, isExternal);
  
  return {
    target: isNewTab ? '_blank' : '_self',
    rel: isNewTab ? 'noopener noreferrer' : undefined
  };
};

/**
 * Handles link click with proper external link behavior
 * @param {object} link - The link object with url, title, and is_external properties
 * @param {Event} event - The click event
 * @param {function} onInvalidLink - Optional callback for invalid links
 */
export const handleLinkClick = (link, event, onInvalidLink) => {
  // Validate link object
  if (!isValidLink(link)) {
    event.preventDefault();
    if (onInvalidLink) {
      onInvalidLink(link);
    } else {
      console.warn('Invalid link object:', link);
    }
    return;
  }

  // Check if link is empty or invalid
  if (!link.url || link.url === '#' || link.url === '' || link.url === 'javascript:void(0)') {
    event.preventDefault();
    
    if (onInvalidLink) {
      onInvalidLink(link);
    } else {
      // Default behavior - show alert
      alert(`Der Link "${link.title}" ist noch nicht verfügbar. Bitte versuche es später erneut.`);
    }
    return;
  }
  
  // Force external links to open in new tab
  if (shouldOpenInNewTab(link.url, link.is_external)) {
    event.preventDefault();
    window.open(link.url, '_blank', 'noopener,noreferrer');
    
    // Track external link clicks (dev only)
    if (import.meta.env.DEV) {
      console.log(`External link clicked: ${link.title} -> ${link.url}`);
    }
  }
};
