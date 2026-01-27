# SLAM25 Documentation Index

Complete documentation for the SLAM25 Members Area application.

---

## 📚 Quick Start

- [Main README](../README.md) - Project overview, setup, and quick start
- [Security Documentation](../SECURITY.md) - Security features and best practices

---

## 🏗️ Architecture & Configuration

### Deployment & Hosting
- [Uberspace Configuration](../UBERSPACE_CONFIGURATION.md) - Uberspace-specific deployment setup

### Technical Details
- [Database Connection Pool](./DATABASE_CONNECTION_POOL.md) - Connection pool optimization and configuration
- [Axios Migration](./AXIOS_MIGRATION.md) - Migration from fetch to Axios with authentication

### Validation & Quality
- [API-Database Alignment Report](../API_DATABASE_ALIGNMENT_REPORT.md) - Comprehensive validation of schema-API alignment

---

## 🐛 Error Handling & Testing

### Error Handling
- [Error Handling Audit](./ERROR_HANDLING_AUDIT.md) - Complete audit of 200+ error handling instances
- [Testing Phase 1](./TESTING_PHASE1.md) - Initial testing checklist for error handling

### Key Features
- **Toast Notifications**: Application-wide error and success notifications
- **Comprehensive Logging**: Structured logging with Winston
- **Network Error Handling**: Offline-aware with German error messages
- **Transaction Safety**: Database transactions with retry logic

---

## 📊 Database & API

### Database Schema
- 16 tables with full referential integrity
- 34 constraints (Primary Keys, Foreign Keys, Unique)
- 82 performance indexes
- Full CRUD operations on all public tables

### API Routes
```
/api/auth          - Authentication & user management
/api/participants  - Participant CRUD operations
/api/rounds        - Competition rounds with assignments
/api/news          - News articles & breaking news
/api/city-tips     - City recommendations
/api/timetable     - Event scheduling
/api/info-pages    - Information pages
/api/links         - Quick links
/api/teams         - Team management
/api/settings      - Application settings
```

See [API-Database Alignment Report](../API_DATABASE_ALIGNMENT_REPORT.md) for complete details.

---

## 🎨 Frontend

### Tech Stack
- React 19 with hooks
- Vite for build tooling
- TailwindCSS for styling
- React Query for data fetching
- React Router v7 for routing

### Key Features
- Toast notification system (ToastContext)
- Responsive design with dark mode
- PWA support with offline capabilities
- Real-time updates via polling
- Interactive maps with Leaflet

### Error Handling
- Comprehensive error handling in all mutation hooks
- User-friendly German error messages
- Network-aware with offline detection
- Structured error logging

---

## 🔐 Security

### Authentication
- JWT-based authentication (stateless)
- Refresh token support
- Role-based access control
- Token revocation mechanism
- Password hashing with bcrypt

### API Security
- Input sanitization on all endpoints
- Parameterized SQL queries (no SQL injection)
- Rate limiting and DDoS protection
- Security headers (Helmet.js)
- CORS configuration

### Error Handling Security
- Sensitive data not exposed in errors
- Proper error categorization
- Failed operation logging
- Transaction rollback on errors

See [SECURITY.md](../SECURITY.md) for complete security documentation.

---

## 🧪 Testing

### Test Coverage
- Frontend: Component and integration tests
- Backend: API and database tests
- Error handling validation tests
- Database schema validation

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test

# Coverage reports
npm run test:coverage
```

---

## 🚀 Deployment

### Production Deployment
1. Environment configuration
2. Database migrations
3. Build frontend assets
4. Start production server

### Deployment Scripts
```bash
# Clean deployment (recommended)
npm run deploy:clean

# Incremental deployment
npm run deploy:incremental
```

See [UBERSPACE_CONFIGURATION.md](../UBERSPACE_CONFIGURATION.md) for detailed deployment instructions.

---

## 📈 Monitoring & Maintenance

### Health Checks
- Database connection monitoring
- Connection pool statistics
- API response time tracking
- Error rate monitoring

### Logging
- Structured logging with Winston
- Error categorization (serious vs benign)
- Performance metrics
- User action audit trail

### Database Maintenance
- Automated vacuum and analyze
- Expired session cleanup
- Breaking news expiration
- Backup utilities

---

## 🔧 Development

### Code Style
- ESLint configuration
- Prettier formatting
- Git hooks for pre-commit checks

### Best Practices
- Comprehensive error handling
- Transaction safety for data operations
- Input validation and sanitization
- Proper logging at all levels
- API-database schema alignment

---

## 📝 Recent Updates

### Latest Changes (January 2026)
- ✅ Comprehensive error handling improvements
- ✅ Toast notification system implementation
- ✅ API-Database alignment validation
- ✅ Transaction safety for critical operations
- ✅ Memory leak fixes in map components
- ✅ Structured file deletion error handling
- ✅ Network error handling with offline support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow code style guidelines
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

---

## 📞 Support

For issues and questions:
- Check this documentation index
- Review relevant documentation files
- Check the [Main README](../README.md)
- Create an issue in the repository

---

**Last Updated:** January 27, 2026
