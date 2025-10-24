# Cursor Rules - Simplified Architecture

## Overview

This directory contains **15 focused Cursor rules** that enforce the simplified architecture from the gradual simplification migration plan.

## Rule Structure

### Core Architecture Rules

1. **`simple-architecture.mdc`** - Core architecture principles and technology stack
2. **`state-management.mdc`** - Simplified state management with React Query + Context
3. **`database-patterns.mdc`** - Consolidated database schema with single junction table
4. **`real-time-simple.mdc`** - Simple polling for real-time updates (no WebSockets)

### Component & API Rules

5. **`admin-components.mdc`** - 3 consolidated admin components instead of 53
6. **`api-routes.mdc`** - 12 focused API routes with simple patterns
7. **`user-interaction.mdc`** - Read-only portal user interaction model

### Quality & Testing Rules

8. **`keep-it-simple.mdc`** - Anti-over-engineering principles
9. **`testing-simple.mdc`** - Simple testing patterns for simplified architecture
10. **`project-overview.mdc`** - Complete project overview and guidelines

### Development & Quality Rules

11. **`development-workflow.mdc`** - Development workflow patterns and conventions
12. **`code-quality.mdc`** - Code quality standards and best practices
13. **`performance-optimization.mdc`** - Performance optimization patterns
14. **`accessibility-standards.mdc`** - Accessibility standards and best practices
15. **`security-standards.mdc`** - Security standards and best practices

## Key Principles

### ✅ What We Use
- **React 19** - Modern UI framework
- **TanStack Query** - Server state management
- **React Context** - Local state (theme, auth, UI)
- **Express.js** - Simple web framework
- **PostgreSQL** - Database with raw SQL
- **Simple polling** - Real-time updates (30s intervals)
- **JWT + cookies** - Authentication

### ❌ What We DON'T Use
- **WebSockets** - Complex real-time infrastructure
- **Zustand/Redux** - Complex state management
- **Complex middleware** - Over-engineered request handling
- **Custom abstractions** - Over-engineered solutions
- **Complex ORM** - Over-engineered database layer

## Architecture Benefits

- **Simple** - Easy to understand and debug
- **Maintainable** - Easy to modify and extend
- **Performant** - Optimized for speed and efficiency
- **Scalable** - Simple architecture scales well
- **Developer friendly** - Easy to onboard new developers
- **Secure** - Security-first development patterns
- **Accessible** - WCAG 2.1 AA compliant
- **High Quality** - Consistent code standards

## Success Metrics

- **Code reduction** - ~35% reduction in codebase size
- **Dependencies** - Removed Socket.io, Zustand
- **Components** - 53 → 3 admin components
- **Database** - 4 → 1 junction table
- **State management** - Single source of truth
- **Maintainability** - Simple architecture, easy to understand
- **Performance** - Optimized for speed and efficiency
- **Security** - Protection against common vulnerabilities
- **Accessibility** - Inclusive design for all users

## Usage

These rules are automatically applied by Cursor to ensure the simplified architecture is maintained. They provide:

- **Guidance** - What patterns to use and avoid
- **Examples** - Code examples for correct patterns
- **Anti-patterns** - What not to do
- **Benefits** - Why the simplified approach is better
- **Standards** - Quality, security, and accessibility standards

## Rule Categories

### Architecture Rules (1-4)
Focus on core architecture principles, state management, database patterns, and real-time updates.

### Component Rules (5-7)
Cover admin components, API routes, and user interaction patterns.

### Quality Rules (8-10)
Emphasize simplicity, testing, and project overview.

### Development Rules (11-15)
Provide comprehensive development, quality, performance, accessibility, and security standards.

## Remember

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry

**Simple is better than complex.**
**Complex is better than complicated.**
**Readability counts.**
**Security is everyone's responsibility.**
**Accessibility is not optional.**