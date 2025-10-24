/**
 * Form to API Mapping Utilities
 * 
 * Maps camelCase form data to snake_case API format
 * Following the hybrid convention: React forms use camelCase, API uses snake_case
 */

import { formatDateForInput } from './dateUtils.js';

/**
 * Maps timetable form data to API format
 * @param {Object} formData - Form data with camelCase fields
 * @returns {Object} API data with snake_case fields
 */
export const mapTimetableFormToAPI = (formData) => {
  return {
    ...formData,
    // Map camelCase to snake_case
    end_time: formData.endTime,
    detailed_description: formData.detailedDescription,
    internal_link: formData.internalLink,
    additional_links: formData.additionalLinks,
    
    // Remove camelCase fields to avoid confusion
    endTime: undefined,
    detailedDescription: undefined,
    internalLink: undefined,
    additionalLinks: undefined
  };
};

/**
 * Maps round form data to API format
 * @param {Object} formData - Form data with camelCase fields
 * @returns {Object} API data with snake_case fields
 */
export const mapRoundFormToAPI = (formData) => {
  return {
    ...formData,
    // Map camelCase to snake_case
    start_time: formData.startTime,
    end_time: formData.endTime,
    competition_type: formData.competitionType,
    total_jury_members: formData.totalJuryMembers,
    after_play_report: formData.afterPlayReport,
    photos_cloud_url: formData.photosCloudUrl,
    
    // Remove camelCase fields to avoid confusion
    startTime: undefined,
    endTime: undefined,
    competitionType: undefined,
    totalJuryMembers: undefined,
    afterPlayReport: undefined,
    photosCloudUrl: undefined
  };
};

/**
 * Maps news form data to API format
 * @param {Object} formData - Form data with camelCase fields
 * @returns {Object} API data with snake_case fields
 */
export const mapNewsFormToAPI = (formData) => {
  return {
    ...formData,
    // Map camelCase to snake_case
    featured_image_url: formData.featuredImageUrl,
    published_at: formData.date || formData.publishedAt, // Map date field to published_at
    is_breaking_news: formData.isBreakingNews,
    breaking_news_until: formData.breakingNewsUntil,
    meta_description: formData.metaDescription,
    
    // Remove camelCase fields to avoid confusion
    featuredImageUrl: undefined,
    publishedAt: undefined,
    date: undefined, // Remove date field after mapping
    isBreakingNews: undefined,
    breakingNewsUntil: undefined,
    metaDescription: undefined
  };
};

/**
 * Maps info page form data to API format
 * @param {Object} formData - Form data with camelCase fields
 * @returns {Object} API data with snake_case fields
 */
export const mapInfoPageFormToAPI = (formData) => {
  return {
    ...formData,
    // Map camelCase to snake_case
    featured_image_url: formData.featuredImageUrl,
    meta_description: formData.metaDescription,
    is_published: formData.isPublished,
    published_at: formData.publishedAt,
    created_at: formData.createdAt,
    updated_at: formData.updatedAt,
    
    // Remove camelCase fields to avoid confusion
    featuredImageUrl: undefined,
    metaDescription: undefined,
    isPublished: undefined,
    publishedAt: undefined,
    createdAt: undefined,
    updatedAt: undefined
  };
};

/**
 * Maps participant form data to API format
 * @param {Object} formData - Form data with camelCase fields
 * @returns {Object} API data with snake_case fields
 */
export const mapParticipantFormToAPI = (formData) => {
  return {
    ...formData,
    // Map camelCase to snake_case (if any exist)
    // Currently participants don't have camelCase fields, but keeping for consistency
    ...formData
  };
};

/**
 * Maps API data back to form format for news
 * @param {Object} apiData - API data with snake_case fields
 * @returns {Object} Form data with camelCase fields
 */
export const mapNewsAPIToForm = (apiData) => {
  return {
    ...apiData,
    // Map snake_case to camelCase
    featuredImageUrl: apiData.featured_image_url,
    date: apiData.published_at ? formatDateForInput(apiData.published_at) : '',
    isBreakingNews: apiData.is_breaking_news,
    breakingNewsUntil: apiData.breaking_news_until,
    metaDescription: apiData.meta_description,
    
    // Remove snake_case fields to avoid confusion
    featured_image_url: undefined,
    published_at: undefined,
    is_breaking_news: undefined,
    breaking_news_until: undefined,
    meta_description: undefined
  };
};

/**
 * Generic mapper for any form data
 * @param {Object} formData - Form data with camelCase fields
 * @param {Array} fieldMappings - Array of {camelCase, snake_case} mappings
 * @returns {Object} API data with snake_case fields
 */
export const mapGenericFormToAPI = (formData, fieldMappings) => {
  const apiData = { ...formData };
  
  fieldMappings.forEach(({ camelCase, snake_case }) => {
    if (formData[camelCase] !== undefined) {
      apiData[snake_case] = formData[camelCase];
      delete apiData[camelCase];
    }
  });
  
  return apiData;
};
