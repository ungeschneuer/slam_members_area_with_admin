import { executeQuery } from '../config/database.js';
import { calculateRoundsStatus } from '../utils/roundStatusUtils.js';
import logger from '../config/logger.js';

/**
 * Optimized Query Service with JOINs for better performance
 * This service provides optimized database queries using JOINs to reduce
 * the number of database round trips and improve performance.
 */
class OptimizedQueryService {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all participants with their related data in a single query
   * Instead of multiple queries, this uses JOINs to get all related information
   */
  async getParticipantByIdWithStats(id) {
    const cacheKey = `participant_${id}_with_stats`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific participant by ID with round count using junction table
      const participantQuery = `
        SELECT 
          p.*,
          COUNT(rp.round_id) as round_count
        FROM participants p
        LEFT JOIN round_participants rp ON p.id = rp.participant_id
        WHERE p.id = $1
        GROUP BY p.id, p.name, p.role, p.region, p.pronouns, p.instagram, p.created_at, p.updated_at
      `;

      const participantResult = await executeQuery(participantQuery, [id]);
      
      if (participantResult.rows.length === 0) {
        return null;
      }

      const participant = participantResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: participant,
        timestamp: Date.now()
      });

      return participant;
    } catch (error) {
      logger.error('Error in getParticipantByIdWithStats:', error);
      throw error;
    }
  }

  async getParticipantsWithStats() {
    const cacheKey = 'participants_with_stats';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          p.*,
          COUNT(rp.round_id) as round_count
        FROM participants p
        LEFT JOIN round_participants rp ON p.id = rp.participant_id
        GROUP BY p.id, p.name, p.role, p.region, p.pronouns, p.instagram, p.created_at, p.updated_at
        ORDER BY p.name ASC
      `;

      const result = await executeQuery(query);
      
      const data = result.rows.map(row => ({
        ...row,
        role: row.role, // Use the correct role column
        round_count: parseInt(row.round_count) || 0
      }));

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching participants with stats:', error);
      throw error;
    }
  }

  /**
   * Get rounds with participant information and statistics
   * Uses JOINs to get all related data in a single query
   */
  async getRoundById(id) {
    const cacheKey = `round_${id}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get round with all junction table data in one optimized query
      const roundQuery = `
        SELECT 
          r.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rp.participant_id,
                'name', p.name,
                'role', rp.role
              )
            ) FILTER (WHERE rp.participant_id IS NOT NULL),
            '[]'::json
          ) as tournament_participants,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'participantId', crew_data.participant_id,
                  'name', crew_data.name,
                  'roles', crew_data.roles
                )
              )
              FROM (
                SELECT 
                  rc.participant_id,
                  pc.name,
                  json_agg(rc.role ORDER BY rc.role) as roles
                FROM round_crew rc
                LEFT JOIN participants pc ON rc.participant_id = pc.id
                WHERE rc.round_id = r.id
                GROUP BY rc.participant_id, pc.name
              ) crew_data
            ),
            '[]'::json
          ) as crew,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rfa.participant_id,
                'name', rfa.name,
                'displayOrder', rfa.display_order,
                'description', rfa.description
              )
            ) FILTER (WHERE rfa.participant_id IS NOT NULL),
            '[]'::json
          ) as feature_artists,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rm.participant_id,
                'name', rm.name,
                'displayOrder', rm.display_order,
                'description', rm.description
              )
            ) FILTER (WHERE rm.participant_id IS NOT NULL),
            '[]'::json
          ) as moderation
        FROM rounds r
        LEFT JOIN round_participants rp ON r.id = rp.round_id
        LEFT JOIN participants p ON rp.participant_id = p.id
        LEFT JOIN round_feature_artists rfa ON r.id = rfa.round_id
        LEFT JOIN round_moderation rm ON r.id = rm.round_id
        WHERE r.id = $1
        GROUP BY r.id
      `;

      const roundResult = await executeQuery(roundQuery, [id]);
      
      if (roundResult.rows.length === 0) {
        return null;
      }

      const round = roundResult.rows[0];
      
      // Transform the junction table data
      round.tournamentParticipants = round.tournament_participants || [];
      round.crew = round.crew || [];
      round.featureArtists = round.feature_artists || [];
      round.moderation = round.moderation || [];
      
      // Remove the raw junction table fields
      delete round.tournament_participants;
      delete round.feature_artists;
      delete round.moderation;

      // Calculate status automatically
      const roundsWithCalculatedStatus = calculateRoundsStatus([round]);
      const roundWithStatus = roundsWithCalculatedStatus[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: roundWithStatus,
        timestamp: Date.now()
      });

      return roundWithStatus;
    } catch (error) {
      logger.error('Error in getRoundById:', error);
      throw error;
    }
  }

  async getRoundBySlug(slug) {
    const cacheKey = `round_slug_${slug}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // First, get the round by slug to get the ID
      const roundQuery = `
        SELECT id FROM rounds WHERE slug = $1
      `;
      const roundResult = await executeQuery(roundQuery, [slug]);
      
      if (roundResult.rows.length === 0) {
        return null;
      }

      const roundId = roundResult.rows[0].id;
      
      // Now get the full round data with junction tables using the existing getRoundById function
      const round = await this.getRoundById(roundId);

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: round,
        timestamp: Date.now()
      });

      return round;
    } catch (error) {
      logger.error('Error in getRoundBySlug:', error);
      throw error;
    }
  }

  async getRoundsWithDetails() {
    const cacheKey = 'rounds_with_details';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get all rounds with junction table data in one optimized query
      const roundsQuery = `
        SELECT 
          r.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rp.participant_id,
                'name', p.name,
                'role', rp.role
              )
            ) FILTER (WHERE rp.participant_id IS NOT NULL),
            '[]'::json
          ) as tournament_participants,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'participantId', crew_data.participant_id,
                  'name', crew_data.name,
                  'roles', crew_data.roles
                )
              )
              FROM (
                SELECT 
                  rc.participant_id,
                  pc.name,
                  json_agg(rc.role ORDER BY rc.role) as roles
                FROM round_crew rc
                LEFT JOIN participants pc ON rc.participant_id = pc.id
                WHERE rc.round_id = r.id
                GROUP BY rc.participant_id, pc.name
              ) crew_data
            ),
            '[]'::json
          ) as crew,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rfa.participant_id,
                'name', rfa.name,
                'displayOrder', rfa.display_order,
                'description', rfa.description
              )
            ) FILTER (WHERE rfa.participant_id IS NOT NULL),
            '[]'::json
          ) as feature_artists,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'participantId', rm.participant_id,
                'name', rm.name,
                'displayOrder', rm.display_order,
                'description', rm.description
              )
            ) FILTER (WHERE rm.participant_id IS NOT NULL),
            '[]'::json
          ) as moderation
        FROM rounds r
        LEFT JOIN round_participants rp ON r.id = rp.round_id
        LEFT JOIN participants p ON rp.participant_id = p.id
        LEFT JOIN round_feature_artists rfa ON r.id = rfa.round_id
        LEFT JOIN round_moderation rm ON r.id = rm.round_id
        GROUP BY r.id
        ORDER BY r.date ASC, r."startTime" ASC
      `;

      logger.info('Executing optimized rounds query with junction tables');
      const roundsResult = await executeQuery(roundsQuery);
      logger.info('Rounds query result:', { rowCount: roundsResult.rows.length });
      
      // Transform the junction table data for each round
      const roundsWithJunctionData = roundsResult.rows.map(round => {
        return {
          ...round,
          tournamentParticipants: round.tournament_participants || [],
          crew: round.crew || [],
          featureArtists: round.feature_artists || [],
          moderation: round.moderation || [],
          // Remove the raw junction table fields
          tournament_participants: undefined,
          feature_artists: undefined,
          moderation: undefined
        };
      });

      // Calculate status automatically for all rounds
      const roundsWithCalculatedStatus = calculateRoundsStatus(roundsWithJunctionData);

      this.queryCache.set(cacheKey, {
        data: roundsWithCalculatedStatus,
        timestamp: Date.now()
      });

      return roundsWithCalculatedStatus;
    } catch (error) {
      logger.error('Error fetching rounds with details:', error);
      throw error;
    }
  }

  /**
   * Get news with basic information
   * Simplified without analytics/engagement tracking
   */
  async getNewsWithDetails() {
    const cacheKey = 'news_with_details';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          n.*
        FROM news n
        ORDER BY n."publishedAt" DESC
      `;

      const result = await executeQuery(query);
      
      const data = result.rows;

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching news with details:', error);
      throw error;
    }
  }

  /**
   * Get simplified dashboard data with basic statistics
   * Removed analytics tracking for read-only portal
   */
  async getDashboardData() {
    const cacheKey = 'dashboard_data';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM participants) as total_participants,
          (SELECT COUNT(*) FROM rounds) as total_rounds,
          (SELECT COUNT(*) FROM news WHERE status = 'PUBLISHED') as published_news,
          (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users
      `;

      const result = await executeQuery(query);
      
      const data = {
        statistics: {
          total_participants: parseInt(result.rows[0]?.total_participants) || 0,
          total_rounds: parseInt(result.rows[0]?.total_rounds) || 0,
          published_news: parseInt(result.rows[0]?.published_news) || 0,
          active_users: parseInt(result.rows[0]?.active_users) || 0
        }
      };

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  }


  /**
   * Get timetable entries with participant information
   * Uses JOINs to get participant details for timetable entries
   */
  async getTimetableByIdWithParticipants(id) {
    const cacheKey = `timetable_${id}_with_participants`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific timetable entry by ID with participants using junction table
      const timetableQuery = `
        SELECT 
          te.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'region', p.region,
                'pronouns', p.pronouns,
                'instagram', p.instagram,
                'role', tp.role,
                'created_at', p.created_at,
                'updated_at', p.updated_at
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) as participants_details
        FROM timetable_entries te
        LEFT JOIN timetable_participants tp ON te.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        WHERE te.id = $1
        GROUP BY te.id, te.title, te.date, te.time, te.location, 
                 te.description, te."detailedDescription", te.type, te.status, 
                 te.end_time, te.internal_link, te.round_id, te.slug, te.created_at, te.updated_at
      `;

      const timetableResult = await executeQuery(timetableQuery, [id]);
      
      if (timetableResult.rows.length === 0) {
        return null;
      }

      const row = timetableResult.rows[0];
      const result = {
        ...row,
        participants_details: row.participants_details || []
      };

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      logger.error('Error in getTimetableByIdWithParticipants:', error);
      throw error;
    }
  }

  async getTimetableWithParticipants() {
    const cacheKey = 'timetable_with_participants';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get all timetable entries with participants using junction table
      const timetableQuery = `
        SELECT 
          te.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'region', p.region,
                'pronouns', p.pronouns,
                'instagram', p.instagram,
                'role', tp.role,
                'created_at', p.created_at,
                'updated_at', p.updated_at
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) as participants_details
        FROM timetable_entries te
        LEFT JOIN timetable_participants tp ON te.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        GROUP BY te.id, te.title, te.date, te.time, te.location, 
                 te.description, te."detailedDescription", te.type, te.status, 
                 te.end_time, te.internal_link, te.round_id, te.slug, te.created_at, te.updated_at
        ORDER BY te.date ASC, te.time ASC
      `;

      const timetableResult = await executeQuery(timetableQuery);
      
      const data = timetableResult.rows.map(row => ({
        ...row,
        participants_details: row.participants_details || []
      }));

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching timetable with participants:', error);
      throw error;
    }
  }

  /**
   * Get city tips without analytics/tracking data
   */
  async getCityTipById(id) {
    const cacheKey = `city_tip_${id}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific city tip by ID
      const cityTipQuery = `
        SELECT 
          ct.*
        FROM city_tips ct
        WHERE ct.id = $1
      `;

      const cityTipResult = await executeQuery(cityTipQuery, [id]);
      
      if (cityTipResult.rows.length === 0) {
        return null;
      }

      const cityTip = cityTipResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: cityTip,
        timestamp: Date.now()
      });

      return cityTip;
    } catch (error) {
      logger.error('Error in getCityTipById:', error);
      throw error;
    }
  }

  async getCityTips(options = {}) {
    const { 
      limit = 50, 
      offset = 0, 
      category = null, 
      featured = null, 
      sortBy = 'name',
      searchTerm = null 
    } = options;
    
    const cacheKey = `city_tips_${JSON.stringify(options)}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      let whereClause = "WHERE ct.status = 'ACTIVE'";
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        whereClause += ` AND ct.category = $${paramCount}`;
        params.push(category);
      }

      if (featured !== null) {
        paramCount++;
        whereClause += ` AND ct.is_featured = $${paramCount}`;
        params.push(featured);
      }

      if (searchTerm) {
        paramCount++;
        whereClause += ` AND (ct.name ILIKE $${paramCount} OR ct.description ILIKE $${paramCount} OR ct.address ILIKE $${paramCount})`;
        params.push(`%${searchTerm}%`);
      }

      let orderClause = "ORDER BY ct.name ASC";
      switch (sortBy) {
        case 'featured':
          orderClause = "ORDER BY ct.is_featured DESC, ct.name ASC";
          break;
        case 'recent':
          orderClause = "ORDER BY ct.created_at DESC, ct.name ASC";
          break;
      }

      const query = `
        SELECT 
          ct.*
        FROM city_tips ct
        ${whereClause}
        ${orderClause}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);
      const result = await executeQuery(query, params);
      
      const data = result.rows;

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching city tips:', error);
      throw error;
    }
  }

  /**
   * Get city tip by slug (no analytics)
   */
  async getCityTipBySlug(slug) {
    const cacheKey = `city_tip_slug_${slug}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          ct.*
        FROM city_tips ct
        WHERE ct.slug = $1 AND ct.status = 'ACTIVE'
      `;

      const result = await executeQuery(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const data = result.rows[0];

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching city tip by slug:', error);
      throw error;
    }
  }


  /**
   * Clear city tip related cache entries
   */
  clearCityTipCache(cityTipId = null) {
    const keysToDelete = [];
    
    for (const [key, value] of this.queryCache.entries()) {
      if (key.includes('city_tips') || (cityTipId && key.includes(cityTipId))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  /**
   * Get news article by ID with basic information
   * Simplified without analytics/engagement tracking
   */
  async getNewsByIdWithDetails(newsId) {
    try {
      const query = `
        SELECT 
          n.*
        FROM news n
        WHERE n.id = $1
      `;

      const result = await executeQuery(query, [newsId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching news by ID with details:', error);
      throw error;
    }
  }

  /**
   * Get breaking news with basic information
   * Simplified without analytics/engagement tracking
   */
  async getBreakingNewsWithDetails() {
    const cacheKey = 'breaking_news_with_details';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          n.*
        FROM news n
        WHERE n.status = 'PUBLISHED' 
        AND n."isBreakingNews" = true
        ORDER BY n.created_at DESC 
        LIMIT 1
      `;

      const result = await executeQuery(query);
      
      let data = null;
      if (result.rows.length > 0) {
        data = result.rows[0];
      }

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching breaking news with details:', error);
      throw error;
    }
  }

  /**
   * Get info pages with engagement statistics
   * Uses JOINs to get view counts and engagement data
   */
  async getInfoPageById(id) {
    const cacheKey = `info_page_${id}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific info page by ID
      const infoPageQuery = `
        SELECT 
          ip.*
        FROM info_pages ip
        WHERE ip.id = $1
      `;

      const infoPageResult = await executeQuery(infoPageQuery, [id]);
      
      if (infoPageResult.rows.length === 0) {
        return null;
      }

      const infoPage = infoPageResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: infoPage,
        timestamp: Date.now()
      });

      return infoPage;
    } catch (error) {
      logger.error('Error in getInfoPageById:', error);
      throw error;
    }
  }

  async getInfoPagesWithDetails() {
    const cacheKey = 'info_pages_with_details';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          ip.*
        FROM info_pages ip
        ORDER BY ip."order" ASC, ip.title ASC
      `;

      const result = await executeQuery(query);
      
      const data = result.rows;

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching info pages with details:', error);
      throw error;
    }
  }

  /**
   * Get info page by slug with basic information
   * Simplified without analytics/engagement tracking
   */
  async getInfoPageBySlugWithDetails(slug) {
    try {
      const query = `
        SELECT 
          ip.*
        FROM info_pages ip
        WHERE ip.slug = $1 AND ip."isPublished" = true
      `;

      const result = await executeQuery(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching info page by slug with details:', error);
      throw error;
    }
  }

  /**
   * Get links with engagement statistics
   * Uses JOINs to get click counts and engagement data
   */
  async getLinkById(id) {
    const cacheKey = `link_${id}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific link by ID
      const linkQuery = `
        SELECT 
          l.*
        FROM links l
        WHERE l.id = $1
      `;

      const linkResult = await executeQuery(linkQuery, [id]);
      
      if (linkResult.rows.length === 0) {
        return null;
      }

      const link = linkResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: link,
        timestamp: Date.now()
      });

      return link;
    } catch (error) {
      logger.error('Error in getLinkById:', error);
      throw error;
    }
  }

  async getLinksWithDetails() {
    const cacheKey = 'links_with_details';
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          l.*
        FROM links l
        WHERE l.is_active = true
        ORDER BY l.category, l.sort_order, l.title
      `;

      const result = await executeQuery(query);
      
      const data = result.rows;

      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error('Error fetching links with details:', error);
      throw error;
    }
  }

  /**
   * Get news article by slug with details
   */
  async getNewsBySlugWithDetails(slug) {
    const cacheKey = `news_slug_${slug}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT 
          n.*
        FROM news n
        WHERE n.slug = $1
      `;

      const result = await executeQuery(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const newsArticle = result.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: newsArticle,
        timestamp: Date.now()
      });

      return newsArticle;
    } catch (error) {
      logger.error('Error in getNewsBySlugWithDetails:', error);
      throw error;
    }
  }

  /**
   * Get participant by slug with statistics
   */
  async getParticipantBySlugWithStats(slug) {
    const cacheKey = `participant_slug_${slug}_with_stats`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific participant by slug with round count using junction table
      const participantQuery = `
        SELECT 
          p.*,
          COUNT(rp.round_id) as round_count
        FROM participants p
        LEFT JOIN round_participants rp ON p.id = rp.participant_id
        WHERE p.slug = $1
        GROUP BY p.id, p.name, p.role, p.region, p.pronouns, p.instagram, p.slug, p.created_at, p.updated_at
      `;

      const participantResult = await executeQuery(participantQuery, [slug]);
      
      if (participantResult.rows.length === 0) {
        return null;
      }

      const participant = participantResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: participant,
        timestamp: Date.now()
      });

      return participant;
    } catch (error) {
      logger.error('Error in getParticipantBySlugWithStats:', error);
      throw error;
    }
  }

  /**
   * Get timetable event by slug with participants
   */
  async getTimetableBySlugWithParticipants(slug) {
    const cacheKey = `timetable_slug_${slug}_with_participants`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific timetable event by slug with participants
      const timetableQuery = `
        SELECT 
          te.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', p.id,
                'name', p.name,
                'role', p.role,
                'region', p.region,
                'pronouns', p.pronouns,
                'instagram', p.instagram,
                'participantRole', tp.role
              ) ORDER BY p.name
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) as participants
        FROM timetable_entries te
        LEFT JOIN timetable_participants tp ON te.id = tp.timetable_entry_id
        LEFT JOIN participants p ON tp.participant_id = p.id
        WHERE te.slug = $1
        GROUP BY te.id, te.title, te.description, te."detailedDescription", 
                 te.location, te.date, te.time, te.type, te.status, 
                 te.slug, te.created_at, te.updated_at, te.end_time, te.internal_link, te.round_id
      `;

      const timetableResult = await executeQuery(timetableQuery, [slug]);
      
      if (timetableResult.rows.length === 0) {
        return null;
      }

      const timetableEvent = timetableResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: timetableEvent,
        timestamp: Date.now()
      });

      return timetableEvent;
    } catch (error) {
      logger.error('Error in getTimetableBySlugWithParticipants:', error);
      throw error;
    }
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.queryCache.size,
      cacheTimeout: this.cacheTimeout,
      entries: Array.from(this.queryCache.keys())
    };
  }

  /**
   * Get individual schnellzugriff link by ID
   */
  async getSchnellzugriffById(id) {
    const cacheKey = `schnellzugriff_${id}`;
    
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get specific schnellzugriff link by ID
      const schnellzugriffQuery = `
        SELECT 
          sq.*
        FROM schnellzugriff_links sq
        WHERE sq.id = $1
      `;

      const schnellzugriffResult = await executeQuery(schnellzugriffQuery, [id]);
      
      if (schnellzugriffResult.rows.length === 0) {
        return null;
      }

      const schnellzugriff = schnellzugriffResult.rows[0];

      // Cache the result
      this.queryCache.set(cacheKey, {
        data: schnellzugriff,
        timestamp: Date.now()
      });

      return schnellzugriff;
    } catch (error) {
      logger.error('Error in getSchnellzugriffById:', error);
      throw error;
    }
  }
}

// Create singleton instance
const optimizedQueryService = new OptimizedQueryService();

export default optimizedQueryService;
