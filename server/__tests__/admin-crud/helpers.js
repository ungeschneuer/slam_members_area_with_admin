/**
 * Test Helper Functions and Data Factories
 * Provides consistent test data generation and utility functions
 */

import { getTestTimestamp, generateTestId } from './setup.js';

/**
 * Generate test participant data
 * @param {Object} override - Override default values
 * @returns {Object} Participant test data
 */
export const participantFactory = (override = {}) => ({
  name: `TEST Participant ${getTestTimestamp()}`,
  role: 'Slammer',
  region: 'Berlin',
  pronouns: 'they/them',
  instagram: '@testparticipant',
  ...override
});

/**
 * Generate test round data
 * @param {Object} override - Override default values
 * @returns {Object} Round test data
 */
export const roundFactory = (override = {}) => ({
  title: `TEST Round ${getTestTimestamp()}`,
  slug: `test-round-${getTestTimestamp()}`,
  date: '2025-12-31',
  startTime: '19:00',
  endTime: '22:00',
  location: 'Test Venue',
  address: 'Test Street 123',
  description: 'Test description',
  afterPlayReport: 'Test report',
  competitionType: 'Einzelwettbewerb',
  totalJuryMembers: 5,
  status: 'SCHEDULED',
  ...override
});

/**
 * Generate test news article data
 * @param {Object} override - Override default values
 * @returns {Object} News test data
 */
export const newsFactory = (override = {}) => ({
  title: `TEST News ${getTestTimestamp()}`,
  content: 'Test news content with detailed information about the event.',
  excerpt: 'Test excerpt',
  category: 'general',
  priority: 'NORMAL',
  featuredImageUrl: 'https://example.com/image.jpg',
  tags: ['test', 'news'],
  status: 'DRAFT',
  publishedAt: null,
  ...override
});

/**
 * Generate test timetable entry data
 * @param {Object} override - Override default values
 * @returns {Object} Timetable test data
 */
export const timetableFactory = (override = {}) => ({
  title: `TEST Timetable ${getTestTimestamp()}`,
  description: 'Test timetable description',
  detailedDescription: 'Detailed test description',
  location: 'Test Location',
  date: '2024-12-31',
  time: '19:00',
  type: 'general',
  status: 'confirmed',
  additionalLinks: [
    { name: 'Test Link', url: 'https://example.com' }
  ],
  ...override
});

/**
 * Generate test city tip data
 * @param {Object} override - Override default values
 * @returns {Object} City tip test data
 */
export const cityTipFactory = (override = {}) => ({
  name: `TEST City Tip ${getTestTimestamp()}`,
  category: 'restaurant',
  description: 'Test city tip description',
  address: 'Test Address 123, Berlin',
  latitude: 52.5200,
  longitude: 13.4050,
  price_range: '€€',
  opening_hours: {
    monday: '10:00-22:00',
    tuesday: '10:00-22:00'
  },
  contact_info: {
    phone: '+49 30 12345678',
    email: 'test@example.com'
  },
  website: 'https://example.com',
  images: ['https://example.com/image1.jpg'],
  slug: `test-city-tip-${getTestTimestamp()}`,
  tips: 'Test tips for visitors',
  is_featured: false,
  status: 'ACTIVE',
  ...override
});

/**
 * Generate test info page data
 * @param {Object} override - Override default values
 * @returns {Object} Info page test data
 */
export const infoPageFactory = (override = {}) => ({
  title: `TEST Info Page ${getTestTimestamp()}`,
  slug: `test-info-page-${getTestTimestamp()}`,
  content: 'Test info page content with detailed information.',
  excerpt: 'Test excerpt for info page',
  category: 'general',
  order: 0,
  status: 'DRAFT',
  featuredImageUrl: 'https://example.com/featured.jpg',
  metaDescription: 'Test meta description for SEO',
  tags: ['test', 'info'],
  isPublished: false,
  publishedAt: null,
  ...override
});

/**
 * Generate invalid data for testing validation
 * @param {string} type - Type of invalid data to generate
 * @returns {Object} Invalid test data
 */
export const invalidDataFactory = (type) => {
  const factories = {
    missingRequired: {
      // Missing name, role, region for participants
      participants: { pronouns: 'they/them' },
      // Missing title, content for news
      news: { category: 'general' },
      // Missing title, date, startTime, endTime for rounds
      rounds: { location: 'Test Venue' },
      // Missing title, description for timetable
      timetable: { location: 'Test Location' },
      // Missing name, category, description for city tips
      cityTips: { address: 'Test Address' },
      // Missing title, content for info pages
      infoPages: { category: 'general' }
    },
    invalidTypes: {
      participants: { name: 123, role: true, region: [] },
      news: { title: 123, content: true, priority: [] },
      rounds: { title: 123, date: true, startTime: 123, totalJuryMembers: 'five' },
      timetable: { title: 123, date: true, time: [] },
      cityTips: { name: 123, latitude: 'invalid', longitude: true },
      infoPages: { title: 123, content: true, order: 'invalid' }
    },
    emptyStrings: {
      participants: { name: '', role: '', region: '' },
      news: { title: '', content: '' },
      rounds: { title: '', location: '' },
      timetable: { title: '', description: '' },
      cityTips: { name: '', category: '', description: '' },
      infoPages: { title: '', content: '' }
    },
    sqlInjection: {
      participants: { name: "'; DROP TABLE participants; --", role: "'; DROP TABLE users; --" },
      news: { title: "'; DROP TABLE news; --", content: "'; DROP TABLE users; --" },
      rounds: { title: "'; DROP TABLE rounds; --", location: "'; DROP TABLE users; --" },
      timetable: { title: "'; DROP TABLE timetable_entries; --" },
      cityTips: { name: "'; DROP TABLE city_tips; --" },
      infoPages: { title: "'; DROP TABLE info_pages; --" }
    },
    xssAttempts: {
      news: { 
        title: '<script>alert("xss")</script>', 
        content: '<img src=x onerror=alert("xss")>' 
      },
      infoPages: { 
        title: '<script>alert("xss")</script>', 
        content: '<img src=x onerror=alert("xss")>' 
      }
    }
  };
  
  return factories[type] || {};
};

/**
 * Generate boundary test data
 * @param {string} type - Type of boundary test
 * @returns {Object} Boundary test data
 */
export const boundaryDataFactory = (type) => {
  const factories = {
    maxLength: {
      participants: { name: 'A'.repeat(300) }, // Exceeds VARCHAR(255)
      news: { title: 'A'.repeat(300) },
      rounds: { title: 'A'.repeat(300) },
      timetable: { title: 'A'.repeat(300) },
      cityTips: { name: 'A'.repeat(300) },
      infoPages: { title: 'A'.repeat(300) }
    },
    minLength: {
      participants: { name: 'A' },
      news: { title: 'A', content: 'A' },
      rounds: { title: 'A' },
      timetable: { title: 'A' },
      cityTips: { name: 'A' },
      infoPages: { title: 'A' }
    },
    invalidCoordinates: {
      cityTips: { latitude: 91, longitude: 181 } // Invalid ranges
    },
    invalidDates: {
      rounds: { 
        date: '2024-12-31',
        startTime: '22:00', 
        endTime: '19:00' // End before start
      }
    }
  };
  
  return factories[type] || {};
};

/**
 * Generate junction table test data
 * @param {number} roundId - Round ID
 * @param {number} participantId - Participant ID
 * @param {string} type - Type of junction (participants, crew, feature-artists)
 * @returns {Object} Junction test data
 */
export const junctionFactory = (roundId, participantId, type = 'participants') => {
  return {
    roundId,
    participantId,
    type
  };
};

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random test data
 * @param {string} entity - Entity type
 * @returns {Object} Random test data
 */
export const randomTestData = (entity) => {
  const random = Math.random().toString(36).substr(2, 9);
  const timestamp = getTestTimestamp();
  
  const factories = {
    participants: () => participantFactory({ name: `Random Participant ${random}` }),
    rounds: () => roundFactory({ title: `Random Round ${random}` }),
    news: () => newsFactory({ title: `Random News ${random}` }),
    timetable: () => timetableFactory({ title: `Random Timetable ${random}` }),
    cityTips: () => cityTipFactory({ name: `Random City Tip ${random}` }),
    infoPages: () => infoPageFactory({ title: `Random Info Page ${random}` })
  };
  
  return factories[entity] ? factories[entity]() : {};
};
