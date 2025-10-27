--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Homebrew)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values, created_at)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, created_at)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, created_at)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: cleanup_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_audit_logs(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_tokens() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM token_revocations WHERE revoked_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_metrics() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: fix_common_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fix_common_permissions() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Fix audit_log permissions specifically
    BEGIN
        GRANT ALL PRIVILEGES ON audit_log TO slam_user;
        GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO slam_user;
        result := result || 'audit_log permissions fixed; ';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || 'audit_log permissions error: ' || SQLERRM || '; ';
    END;
    
    -- Fix sequence permissions
    BEGIN
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO slam_user;
        result := result || 'sequence permissions fixed; ';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || 'sequence permissions error: ' || SQLERRM || '; ';
    END;
    
    -- Fix function permissions
    BEGIN
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO slam_user;
        result := result || 'function permissions fixed; ';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || 'function permissions error: ' || SQLERRM || '; ';
    END;
    
    RETURN result;
END;
$$;


--
-- Name: increment_group_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_group_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;


--
-- Name: increment_round_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_round_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;


--
-- Name: log_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values, created_at)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, created_at)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, created_at)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: log_system_event(character varying, character varying, integer, jsonb, jsonb, integer, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_system_event(p_action character varying, p_table_name character varying, p_record_id integer DEFAULT NULL::integer, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_user_id integer DEFAULT NULL::integer, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO audit_log (
        action, table_name, record_id, old_values, new_values,
        user_id, ip_address, user_agent, created_at
    ) VALUES (
        p_action, p_table_name, p_record_id, p_old_values, p_new_values,
        p_user_id, p_ip_address, p_user_agent, CURRENT_TIMESTAMP
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


--
-- Name: update_info_pages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_info_pages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_links_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_links_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_teams_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_teams_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_last_login(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_last_login(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP 
    WHERE id = user_id;
END;
$$;


--
-- Name: verify_user_email(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_user_email(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE users 
    SET email_verified = true 
    WHERE id = user_id;
END;
$$;


--
-- Name: verify_user_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_user_permissions() RETURNS TABLE(permission_type text, object_name text, has_permission boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check table permissions
    RETURN QUERY
    SELECT 
        'TABLE'::TEXT,
        t.table_name::TEXT,
        has_table_privilege('slam_user', t.table_name, 'SELECT') AND
        has_table_privilege('slam_user', t.table_name, 'INSERT') AND
        has_table_privilege('slam_user', t.table_name, 'UPDATE') AND
        has_table_privilege('slam_user', t.table_name, 'DELETE')
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE';
    
    -- Check sequence permissions
    RETURN QUERY
    SELECT 
        'SEQUENCE'::TEXT,
        s.sequence_name::TEXT,
        has_sequence_privilege('slam_user', s.sequence_name, 'USAGE')
    FROM information_schema.sequences s
    WHERE s.sequence_schema = 'public';
    
    -- Check function permissions
    RETURN QUERY
    SELECT 
        'FUNCTION'::TEXT,
        r.routine_name::TEXT,
        has_function_privilege('slam_user', r.routine_name, 'EXECUTE')
    FROM information_schema.routines r
    WHERE r.routine_schema = 'public' AND r.routine_type = 'FUNCTION';
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    action character varying(20) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer NOT NULL,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: city_tips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.city_tips_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: city_tips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.city_tips (
    id integer DEFAULT nextval('public.city_tips_id_seq'::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    price_range character varying(50),
    opening_hours text,
    website character varying(255),
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slug character varying(255) NOT NULL,
    tips text,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    CONSTRAINT city_tips_slug_format CHECK (((slug)::text ~ '^[a-z0-9-]+$'::text)),
    CONSTRAINT city_tips_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'DRAFT'::character varying, 'ARCHIVED'::character varying])::text[])))
);


--
-- Name: TABLE city_tips; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.city_tips IS 'City tips table - is_featured column removed on 2025-01-23';


--
-- Name: countdown_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countdown_config (
    id integer NOT NULL,
    title character varying(255) DEFAULT 'Countdown zum SLAM25'::character varying NOT NULL,
    subtitle character varying(500) DEFAULT '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)'::character varying NOT NULL,
    target_date timestamp with time zone DEFAULT '2025-10-28 11:00:00+01'::timestamp with time zone NOT NULL,
    button_text character varying(100) DEFAULT 'Zum Zeitplan'::character varying NOT NULL,
    button_emoji character varying(10) DEFAULT '📅'::character varying NOT NULL,
    button_link character varying(500) DEFAULT '/timetable'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE countdown_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.countdown_config IS 'Stores customizable countdown settings for the landing page';


--
-- Name: COLUMN countdown_config.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.title IS 'Main countdown title displayed to users';


--
-- Name: COLUMN countdown_config.subtitle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.subtitle IS 'Subtitle with date and time information';


--
-- Name: COLUMN countdown_config.target_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.target_date IS 'Target date and time for the countdown (with timezone)';


--
-- Name: COLUMN countdown_config.button_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.button_text IS 'Text displayed on the countdown button';


--
-- Name: COLUMN countdown_config.button_emoji; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.button_emoji IS 'Emoji displayed on the countdown button';


--
-- Name: COLUMN countdown_config.button_link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.button_link IS 'Link destination for the countdown button';


--
-- Name: COLUMN countdown_config.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.countdown_config.is_active IS 'Whether this countdown configuration is currently active';


--
-- Name: countdown_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.countdown_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: countdown_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countdown_config_id_seq OWNED BY public.countdown_config.id;


--
-- Name: info_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.info_pages (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    excerpt text,
    category character varying(100) DEFAULT 'general'::character varying,
    display_order integer DEFAULT 0,
    status character varying(50) DEFAULT 'DRAFT'::character varying,
    file_url text,
    tags text[] DEFAULT '{}'::text[],
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pdf_url text,
    file_type character varying(10),
    file_description text,
    additional_links jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT info_pages_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['image'::character varying, 'pdf'::character varying])::text[])))
);


--
-- Name: COLUMN info_pages.file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.info_pages.file_url IS 'Universal file URL - can be image or PDF';


--
-- Name: COLUMN info_pages.pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.info_pages.pdf_url IS 'URL path to uploaded PDF file for this info page';


--
-- Name: COLUMN info_pages.file_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.info_pages.file_type IS 'Type of file: image or pdf';


--
-- Name: COLUMN info_pages.file_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.info_pages.file_description IS 'Custom description text for the uploaded file';


--
-- Name: COLUMN info_pages.additional_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.info_pages.additional_links IS 'Array of additional links with title and URL';


--
-- Name: info_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.info_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: info_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.info_pages_id_seq OWNED BY public.info_pages.id;


--
-- Name: links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.links (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    url text NOT NULL,
    icon character varying(10) DEFAULT '🔗'::character varying,
    category character varying(100) DEFAULT 'Sonstiges'::character varying,
    is_external boolean DEFAULT true,
    color character varying(20) DEFAULT 'blue'::character varying,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.links IS 'External and internal links';


--
-- Name: COLUMN links.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.title IS 'Display title of the link';


--
-- Name: COLUMN links.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.description IS 'Optional description of the link';


--
-- Name: COLUMN links.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.url IS 'URL or route path for the link';


--
-- Name: COLUMN links.icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.icon IS 'Emoji icon for the link';


--
-- Name: COLUMN links.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.category IS 'Category for grouping links';


--
-- Name: COLUMN links.is_external; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.is_external IS 'Whether the link opens in a new tab';


--
-- Name: COLUMN links.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.color IS 'Color theme for the link display';


--
-- Name: COLUMN links.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.sort_order IS 'Order for displaying links';


--
-- Name: COLUMN links.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.links.is_active IS 'Whether the link is currently active';


--
-- Name: links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.links_id_seq OWNED BY public.links.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    excerpt text,
    category character varying(100),
    priority character varying(50) DEFAULT 'NORMAL'::character varying,
    tags text[] DEFAULT '{}'::text[],
    status character varying(50) DEFAULT 'DRAFT'::character varying,
    featured_image_url text,
    published_at timestamp without time zone,
    is_breaking_news boolean DEFAULT false,
    breaking_news_until timestamp without time zone,
    slug character varying(255) NOT NULL,
    CONSTRAINT chk_news_priority CHECK (((priority)::text = ANY ((ARRAY['NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[])))
);


--
-- Name: COLUMN news.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.news.priority IS 'Priority level: NORMAL, HIGH, URGENT. Defaults to NORMAL.';


--
-- Name: news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.news_id_seq OWNED BY public.news.id;


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(100) NOT NULL,
    region character varying(100),
    pronouns character varying(50),
    instagram character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slug character varying(255) NOT NULL,
    CONSTRAINT participants_role_check CHECK (((role)::text = ANY ((ARRAY['Wettbewerb-Teilnehmer*in'::character varying, 'Supporter*in'::character varying, 'SLAM25-Team'::character varying, 'SLAM-MC'::character varying, 'Moderator*in'::character varying, 'Techniker*in'::character varying, 'Fotograf*in'::character varying, 'Videograf*in'::character varying, 'Organisator*in'::character varying])::text[])))
);


--
-- Name: COLUMN participants.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.participants.role IS 'Role of the participant: Teilnehmer*in, Supporter*in, Crew, SLAM-MC, Moderator, Technik';


--
-- Name: participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;


--
-- Name: round_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.round_assignments (
    id integer NOT NULL,
    round_id integer NOT NULL,
    participant_id integer,
    roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    team_id integer,
    CONSTRAINT check_participant_or_team CHECK ((((participant_id IS NOT NULL) AND (team_id IS NULL)) OR ((participant_id IS NULL) AND (team_id IS NOT NULL)))),
    CONSTRAINT round_assignments_participant_or_team CHECK ((((participant_id IS NOT NULL) AND (team_id IS NULL)) OR ((participant_id IS NULL) AND (team_id IS NOT NULL))))
);


--
-- Name: round_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.round_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: round_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.round_assignments_id_seq OWNED BY public.round_assignments.id;


--
-- Name: rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rounds (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    location character varying(255) NOT NULL,
    address text,
    description text,
    after_play_report text,
    competition_type character varying(100) DEFAULT 'Einzelwettbewerb'::character varying,
    total_jury_members integer DEFAULT 5,
    status character varying(50) DEFAULT 'SCHEDULED'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slug character varying(255) NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    version integer DEFAULT 1,
    groups jsonb DEFAULT '[]'::jsonb,
    photos_cloud_url text,
    CONSTRAINT rounds_time_check CHECK ((end_time > start_time))
);


--
-- Name: rounds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rounds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rounds_id_seq OWNED BY public.rounds.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms integer DEFAULT 0
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS 'Tracks which database migrations have been applied';


--
-- Name: COLUMN schema_migrations.migration_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.migration_name IS 'Name of the migration file (e.g., 20250126143052_add_user_preferences.sql)';


--
-- Name: COLUMN schema_migrations.applied_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.applied_at IS 'When the migration was applied';


--
-- Name: COLUMN schema_migrations.execution_time_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.execution_time_ms IS 'How long the migration took to execute in milliseconds';


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: schnellzugriff_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schnellzugriff_links (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    url character varying(500) NOT NULL,
    icon character varying(10) DEFAULT '🔗'::character varying,
    color character varying(20) DEFAULT 'blue'::character varying,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_external boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schnellzugriff_links_color_check CHECK (((color)::text = ANY ((ARRAY['blue'::character varying, 'purple'::character varying, 'green'::character varying, 'red'::character varying, 'yellow'::character varying, 'indigo'::character varying, 'pink'::character varying, 'orange'::character varying, 'teal'::character varying, 'cyan'::character varying])::text[]))),
    CONSTRAINT schnellzugriff_links_title_length CHECK ((char_length((title)::text) >= 1)),
    CONSTRAINT schnellzugriff_links_url_length CHECK ((char_length((url)::text) >= 1))
);


--
-- Name: TABLE schnellzugriff_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schnellzugriff_links IS 'Quick access links for the Schnellzugriff area, separate from regular links';


--
-- Name: COLUMN schnellzugriff_links.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.title IS 'Display title for the link';


--
-- Name: COLUMN schnellzugriff_links.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.description IS 'Optional description text';


--
-- Name: COLUMN schnellzugriff_links.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.url IS 'The actual URL to link to';


--
-- Name: COLUMN schnellzugriff_links.icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.icon IS 'Emoji icon to display';


--
-- Name: COLUMN schnellzugriff_links.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.color IS 'Color theme for the link card';


--
-- Name: COLUMN schnellzugriff_links.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.sort_order IS 'Order in which links should be displayed';


--
-- Name: COLUMN schnellzugriff_links.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.is_active IS 'Whether the link is currently active/visible';


--
-- Name: COLUMN schnellzugriff_links.is_external; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schnellzugriff_links.is_external IS 'Whether the link opens in a new tab';


--
-- Name: schnellzugriff_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schnellzugriff_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schnellzugriff_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schnellzugriff_links_id_seq OWNED BY public.schnellzugriff_links.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    team_id integer NOT NULL,
    participant_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    role character varying(100) DEFAULT 'Team'::character varying NOT NULL,
    instagram character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: timetable_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_entries (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    detailed_description text,
    location character varying(255),
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    type character varying(100) DEFAULT 'general'::character varying,
    status character varying(50) DEFAULT 'confirmed'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_time time without time zone,
    round_id integer,
    slug character varying(255) NOT NULL,
    additional_links jsonb DEFAULT '[]'::jsonb,
    address text,
    sort_order integer DEFAULT 0
);


--
-- Name: COLUMN timetable_entries.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timetable_entries.type IS 'Event type: team-round, individual-round, workshop, fun, aftershow, or general (legacy)';


--
-- Name: COLUMN timetable_entries.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timetable_entries.address IS 'Optional address field for timetable events';


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_entries_id_seq OWNED BY public.timetable_entries.id;


--
-- Name: timetable_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_participants (
    id integer NOT NULL,
    timetable_entry_id integer NOT NULL,
    participant_id integer NOT NULL,
    role character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE timetable_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timetable_participants IS 'Junction table linking timetable entries to participants, replacing participants JSONB array';


--
-- Name: COLUMN timetable_participants.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timetable_participants.role IS 'Role of the participant in the timetable entry';


--
-- Name: timetable_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_participants_id_seq OWNED BY public.timetable_participants.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    last_login timestamp without time zone,
    email_verified boolean DEFAULT false
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: countdown_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countdown_config ALTER COLUMN id SET DEFAULT nextval('public.countdown_config_id_seq'::regclass);


--
-- Name: info_pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.info_pages ALTER COLUMN id SET DEFAULT nextval('public.info_pages_id_seq'::regclass);


--
-- Name: links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links ALTER COLUMN id SET DEFAULT nextval('public.links_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: news id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news ALTER COLUMN id SET DEFAULT nextval('public.news_id_seq'::regclass);


--
-- Name: participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);


--
-- Name: round_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_assignments ALTER COLUMN id SET DEFAULT nextval('public.round_assignments_id_seq'::regclass);


--
-- Name: rounds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds ALTER COLUMN id SET DEFAULT nextval('public.rounds_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: schnellzugriff_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schnellzugriff_links ALTER COLUMN id SET DEFAULT nextval('public.schnellzugriff_links_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: timetable_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries ALTER COLUMN id SET DEFAULT nextval('public.timetable_entries_id_seq'::regclass);


--
-- Name: timetable_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_participants ALTER COLUMN id SET DEFAULT nextval('public.timetable_participants_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: city_tips city_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.city_tips
    ADD CONSTRAINT city_locations_pkey PRIMARY KEY (id);


--
-- Name: countdown_config countdown_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countdown_config
    ADD CONSTRAINT countdown_config_pkey PRIMARY KEY (id);


--
-- Name: info_pages info_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.info_pages
    ADD CONSTRAINT info_pages_pkey PRIMARY KEY (id);


--
-- Name: info_pages info_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.info_pages
    ADD CONSTRAINT info_pages_slug_key UNIQUE (slug);


--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: news news_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_slug_unique UNIQUE (slug);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: participants participants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_slug_unique UNIQUE (slug);


--
-- Name: round_assignments round_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_assignments
    ADD CONSTRAINT round_assignments_pkey PRIMARY KEY (id);


--
-- Name: rounds rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: schnellzugriff_links schnellzugriff_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schnellzugriff_links
    ADD CONSTRAINT schnellzugriff_links_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_participant_id_key UNIQUE (team_id, participant_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_slug_key UNIQUE (slug);


--
-- Name: timetable_entries timetable_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_pkey PRIMARY KEY (id);


--
-- Name: timetable_entries timetable_entries_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_slug_unique UNIQUE (slug);


--
-- Name: timetable_participants timetable_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_participants
    ADD CONSTRAINT timetable_participants_pkey PRIMARY KEY (id);


--
-- Name: timetable_participants timetable_participants_timetable_entry_id_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_participants
    ADD CONSTRAINT timetable_participants_timetable_entry_id_participant_id_key UNIQUE (timetable_entry_id, participant_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_city_tips_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_city_tips_category ON public.city_tips USING btree (category);


--
-- Name: idx_city_tips_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_city_tips_name ON public.city_tips USING btree (name);


--
-- Name: idx_city_tips_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_city_tips_slug ON public.city_tips USING btree (slug);


--
-- Name: idx_city_tips_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_city_tips_status ON public.city_tips USING btree (status);


--
-- Name: idx_countdown_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countdown_config_active ON public.countdown_config USING btree (is_active);


--
-- Name: idx_countdown_config_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countdown_config_updated ON public.countdown_config USING btree (updated_at);


--
-- Name: idx_info_pages_additional_links; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_additional_links ON public.info_pages USING gin (additional_links);


--
-- Name: idx_info_pages_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_category ON public.info_pages USING btree (category);


--
-- Name: idx_info_pages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_created_at ON public.info_pages USING btree (created_at);


--
-- Name: idx_info_pages_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_display_order ON public.info_pages USING btree (display_order);


--
-- Name: idx_info_pages_pdf_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_pdf_url ON public.info_pages USING btree (pdf_url) WHERE (pdf_url IS NOT NULL);


--
-- Name: idx_info_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_slug ON public.info_pages USING btree (slug);


--
-- Name: idx_info_pages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_pages_status ON public.info_pages USING btree (status);


--
-- Name: idx_links_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_active ON public.links USING btree (is_active);


--
-- Name: idx_links_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_category ON public.links USING btree (category);


--
-- Name: idx_links_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_created_at ON public.links USING btree (created_at);


--
-- Name: idx_links_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_is_active ON public.links USING btree (is_active);


--
-- Name: idx_links_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_sort ON public.links USING btree (sort_order);


--
-- Name: idx_links_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_sort_order ON public.links USING btree (sort_order);


--
-- Name: idx_news_breaking_news; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_breaking_news ON public.news USING btree (is_breaking_news, breaking_news_until) WHERE (is_breaking_news = true);


--
-- Name: idx_news_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_category ON public.news USING btree (category);


--
-- Name: idx_news_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_priority ON public.news USING btree (priority);


--
-- Name: idx_news_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_published_at ON public.news USING btree (published_at);


--
-- Name: idx_news_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_slug ON public.news USING btree (slug);


--
-- Name: idx_news_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_status ON public.news USING btree (status);


--
-- Name: idx_news_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_title ON public.news USING btree (title);


--
-- Name: idx_participants_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_created_at ON public.participants USING btree (created_at);


--
-- Name: idx_participants_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_name ON public.participants USING btree (name);


--
-- Name: idx_participants_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_region ON public.participants USING btree (region);


--
-- Name: idx_participants_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_role ON public.participants USING btree (role);


--
-- Name: idx_participants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_slug ON public.participants USING btree (slug);


--
-- Name: idx_round_assignments_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_assignments_participant ON public.round_assignments USING btree (participant_id);


--
-- Name: idx_round_assignments_participant_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_round_assignments_participant_unique ON public.round_assignments USING btree (round_id, participant_id) WHERE (participant_id IS NOT NULL);


--
-- Name: idx_round_assignments_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_assignments_roles ON public.round_assignments USING gin (roles);


--
-- Name: idx_round_assignments_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_assignments_round ON public.round_assignments USING btree (round_id);


--
-- Name: idx_round_assignments_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_assignments_team ON public.round_assignments USING btree (team_id);


--
-- Name: idx_round_assignments_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_assignments_team_id ON public.round_assignments USING btree (team_id);


--
-- Name: idx_round_assignments_team_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_round_assignments_team_unique ON public.round_assignments USING btree (round_id, team_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_rounds_competition_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_competition_type ON public.rounds USING btree (competition_type);


--
-- Name: idx_rounds_groups; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_groups ON public.rounds USING gin (groups);


--
-- Name: idx_rounds_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_location ON public.rounds USING btree (location);


--
-- Name: idx_rounds_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rounds_slug ON public.rounds USING btree (slug);


--
-- Name: idx_rounds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_status ON public.rounds USING btree (status);


--
-- Name: idx_rounds_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_title ON public.rounds USING btree (title);


--
-- Name: idx_rounds_total_jury_members; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rounds_total_jury_members ON public.rounds USING btree (total_jury_members);


--
-- Name: idx_schema_migrations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schema_migrations_name ON public.schema_migrations USING btree (migration_name);


--
-- Name: idx_schnellzugriff_links_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schnellzugriff_links_active ON public.schnellzugriff_links USING btree (is_active);


--
-- Name: idx_schnellzugriff_links_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schnellzugriff_links_created_at ON public.schnellzugriff_links USING btree (created_at);


--
-- Name: idx_schnellzugriff_links_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schnellzugriff_links_sort_order ON public.schnellzugriff_links USING btree (sort_order);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_team_members_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_participant ON public.team_members USING btree (participant_id);


--
-- Name: idx_team_members_participant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_participant_id ON public.team_members USING btree (participant_id);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_teams_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_created_at ON public.teams USING btree (created_at);


--
-- Name: idx_teams_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_name ON public.teams USING btree (name);


--
-- Name: idx_teams_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_slug ON public.teams USING btree (slug);


--
-- Name: idx_timetable_additional_links; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_additional_links ON public.timetable_entries USING gin (additional_links);


--
-- Name: idx_timetable_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_date ON public.timetable_entries USING btree (date);


--
-- Name: idx_timetable_entries_round_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_entries_round_id ON public.timetable_entries USING btree (round_id);


--
-- Name: idx_timetable_participants_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_participants_entry_id ON public.timetable_participants USING btree (timetable_entry_id);


--
-- Name: idx_timetable_participants_participant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_participants_participant_id ON public.timetable_participants USING btree (participant_id);


--
-- Name: idx_timetable_participants_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_participants_role ON public.timetable_participants USING btree (role);


--
-- Name: idx_timetable_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_slug ON public.timetable_entries USING btree (slug);


--
-- Name: idx_timetable_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_sort_order ON public.timetable_entries USING btree (sort_order);


--
-- Name: idx_timetable_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_status ON public.timetable_entries USING btree (status);


--
-- Name: idx_timetable_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_title ON public.timetable_entries USING btree (title);


--
-- Name: idx_timetable_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_type ON public.timetable_entries USING btree (type);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: info_pages audit_info_pages_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_info_pages_changes AFTER INSERT OR DELETE OR UPDATE ON public.info_pages FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: links audit_links_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_links_changes AFTER INSERT OR DELETE OR UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: news audit_news_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_news_changes AFTER INSERT OR DELETE OR UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: participants audit_participants_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_participants_changes AFTER INSERT OR DELETE OR UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: rounds audit_rounds_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_rounds_changes AFTER INSERT OR DELETE OR UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: schnellzugriff_links audit_schnellzugriff_links_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_schnellzugriff_links_changes AFTER INSERT OR DELETE OR UPDATE ON public.schnellzugriff_links FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: team_members audit_team_members_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_team_members_changes AFTER INSERT OR DELETE OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: teams audit_teams_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_teams_changes AFTER INSERT OR DELETE OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: timetable_entries audit_timetable_entries_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_timetable_entries_changes AFTER INSERT OR DELETE OR UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: users audit_users_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_users_changes AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_changes();


--
-- Name: participants participants_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participants_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: rounds rounds_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER rounds_version_trigger BEFORE UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.increment_round_version();


--
-- Name: teams teams_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teams_updated_at_trigger BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_teams_updated_at();


--
-- Name: city_tips update_city_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_city_locations_updated_at BEFORE UPDATE ON public.city_tips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: info_pages update_info_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_info_pages_updated_at BEFORE UPDATE ON public.info_pages FOR EACH ROW EXECUTE FUNCTION public.update_info_pages_updated_at();


--
-- Name: links update_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.update_links_updated_at();


--
-- Name: news update_news_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: participants update_participants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rounds update_rounds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timetable_entries update_timetable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users users_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: round_assignments round_assignments_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_assignments
    ADD CONSTRAINT round_assignments_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: round_assignments round_assignments_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_assignments
    ADD CONSTRAINT round_assignments_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: round_assignments round_assignments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_assignments
    ADD CONSTRAINT round_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: timetable_entries timetable_entries_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: timetable_participants timetable_participants_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_participants
    ADD CONSTRAINT timetable_participants_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: timetable_participants timetable_participants_timetable_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_participants
    ADD CONSTRAINT timetable_participants_timetable_entry_id_fkey FOREIGN KEY (timetable_entry_id) REFERENCES public.timetable_entries(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

