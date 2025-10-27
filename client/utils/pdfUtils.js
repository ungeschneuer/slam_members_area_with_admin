/**
 * Utility functions for PDF handling
 */

/**
 * Determines if a URL points to a PDF file
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL points to a PDF
 */
export function isPDFUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.toLowerCase().includes('.pdf');
}

/**
 * Gets the primary PDF URL from an info page object
 * Prioritizes pdf_url over featured_image_url
 * @param {Object} page - The page object
 * @returns {string|null} - The PDF URL or null
 */
export function getPDFUrl(page) {
  if (!page) return null;
  
  // Prioritize dedicated pdf_url field
  if (page.pdf_url) return page.pdf_url;
  
  // Fallback to featured_image_url if it's a PDF
  if (page.featured_image_url && isPDFUrl(page.featured_image_url)) {
    return page.featured_image_url;
  }
  
  return null;
}

/**
 * Determines if a page has any PDF content
 * @param {Object} page - The page object
 * @returns {boolean} - True if the page has PDF content
 */
export function hasPDF(page) {
  return getPDFUrl(page) !== null;
}

/**
 * Gets the display title for a PDF
 * @param {Object} page - The page object
 * @returns {string} - The display title
 */
export function getPDFTitle(page) {
  if (!page) return "PDF-Dokument";
  return page.title ? `${page.title} - PDF` : "PDF-Dokument";
}
