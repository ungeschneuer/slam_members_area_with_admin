# SLAM25 Architecture - Simplified

## Overview

This is a Poetry Slam members area built with React 19, Express.js, and PostgreSQL. It's designed to be simple, maintainable, and focused on the core requirements.

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router v7** - Routing
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling

### Backend
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Winston** - Logging

### Development
- **Vitest** - Testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Architecture Principles

### 1. Simplicity First
- Use established patterns
- Avoid over-engineering
- Focus on core requirements
- Keep code readable and maintainable

### 2. State Management
- **Server State**: TanStack Query for API data
- **Local State**: React Context for theme, auth, UI
- **Form State**: React Hook Form for forms

### 3. Database Design
- **Simple Schema**: Focused on core entities
- **JSONB**: Flexible data structures where needed
- **Raw SQL**: Direct queries for performance
- **Migrations**: Version-controlled schema changes

### 4. Authentication
- **JWT Tokens**: Secure authentication
- **HTTP-only Cookies**: XSS protection
- **Role-based Access**: Admin vs public access

### 5. Real-time Updates
- **Simple Polling**: 30-second intervals
- **React Query**: Automatic refetching
- **Simple Polling**: 30-second intervals for real-time updates

## Project Structure

```
client/
  components/          # React components
  contexts/           # React contexts
  hooks/              # Custom hooks
  services/           # API services
server/
  routes/             # API routes
  services/           # Business logic
  middleware/         # Express middleware
  utils/              # Utility functions
database/
  schema.sql          # Database schema
  migrations/         # Schema migrations
```

## Key Features

### Public Features
- View participants
- View competition rounds
- Read news and updates
- Access city tips and timetable
- Browse links and info pages

### Admin Features
- Manage participants
- Create and edit rounds
- Publish news articles
- Manage city tips
- Update timetable
- Manage links and info pages

## Development Guidelines

### Code Quality
- Write simple, readable code
- Use TypeScript for type safety
- Write tests for critical functions
- Follow established patterns

### Performance
- Optimize for actual usage
- Use appropriate caching
- Monitor query performance
- Keep bundle size reasonable

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Follow security best practices

## Remember: This is a focused application for a Poetry Slam event. Keep it simple, maintainable, and focused on the core requirements.
