# SLAM25 Members Area

A full-stack Poetry Slam application with React frontend and Express.js backend using PostgreSQL.

## 🚀 Features

- **Member Dashboard** - Competition rounds and participant management
- **Admin Panel** - Content management and user administration
- **Live Updates** - Polling-based data refresh for real-time experience
- **City Tips** - Location recommendations and interactive maps
- **News & Community** - News feed and community features
- **PWA Support** - Progressive Web App with offline capabilities
- **Error Handling** - Comprehensive error handling with toast notifications
- **API Validation** - Fully validated API-database schema alignment

## 🌐 Uberspace Deployment

This application is specifically configured for Uberspace hosting with all common issues resolved:

- **bcrypt → bcryptjs**: No native compilation issues
- **Port Binding**: Server binds to `0.0.0.0` for Uberspace compatibility  
- **CSP Fixed**: Content Security Policy configured for production
- **Source Maps**: Disabled in production for security
- **Database Pooling**: Optimized connection pools for Uberspace limits
- **Logger Configuration**: Simple console logging to avoid file descriptor issues

### Quick Deployment
```bash
# Clean deployment (recommended for production)
npm run deploy:clean

# Incremental deployment (faster updates)
npm run deploy:incremental
```

See [UBERSPACE_CONFIGURATION.md](./docs/UBERSPACE_CONFIGURATION.md) for the complete deployment guide.

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + TailwindCSS + React Router v7
- **Backend**: Express.js + PostgreSQL
- **Real-time**: Polling-based updates for live data
- **PWA**: Progressive Web App with service workers

## 📁 Project Structure

For a detailed explanation of the project structure, see [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md).

```
├── client/                 # React frontend
│   ├── components/         # React components (admin, forms, shared)
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── server/                # Express.js backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   └── config/           # Configuration files
├── database/              # Database schemas and migrations
│   ├── migrations/        # SQL migration scripts
│   └── schemas/          # Database schema files
├── scripts/               # Utility and deployment scripts
├── docs/                  # Project documentation
└── public/               # Static assets
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd slam_members_area_with_admin
   npm install
   cd server && npm install
   ```

2. **Environment setup:**
   ```bash
   # Copy environment template for your environment
   cp .env.development.template .env.development  # For development
   cp .env.production.template .env.production    # For production
   
   # Edit .env.development with your configuration
   # Required environment variables:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=slam25_db
   DB_USER=slam_user
   DB_PASSWORD=your_secure_password  # REQUIRED - no fallback
   JWT_SECRET=your_super_secure_jwt_secret_key_minimum_64_characters_required  # REQUIRED - no fallback
   NODE_ENV=development
   PORT=3000
   ```

3. **Database setup:**
   ```bash
   # Run database migrations
   cd server
   npm run migrate
   ```

4. **Start development servers:**
   ```bash
   # Backend (Terminal 1)
   cd server
   npm run dev
   
   # Frontend (Terminal 2)
   npm run dev
   ```

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd server
npm test

# Run all tests with coverage
npm run test:coverage
```

## 🚀 Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   cd server
   npm start
   ```

3. **Environment variables for production:**
   - Set `NODE_ENV=production`
   - Configure secure database credentials
   - Set up SSL certificates

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- ~~`POST /api/auth/refresh` - Refresh token~~ (Removed - using simple JWT)
- `POST /api/auth/logout` - User logout

### Participants
- `GET /api/participants` - Get all participants
- `GET /api/participants/:id` - Get specific participant
- `POST /api/participants` - Create participant (admin/organizer)
- `PUT /api/participants/:id` - Update participant (admin/organizer)
- `DELETE /api/participants/:id` - Delete participant (admin only)

### Other Endpoints
- `GET /api/health` - Health check
- `GET /api/news` - News feed
- `GET /api/rounds` - Competition rounds
- `GET /api/city-tips` - City recommendations

## 🔒 Security Features

- JWT-based authentication (stateless, no refresh tokens needed)
- Role-based access control (admin, organizer, member)
- XSS protection and input sanitization
- Rate limiting and DDoS protection
- Security headers with Helmet.js
- Password hashing with bcrypt
- **Token revocation mechanism** for immediate logout
- **Database validation** for admin routes to prevent deleted user access
- **No hardcoded secrets** - application fails fast if misconfigured

## 🛡️ Error Handling & Reliability

- **Toast Notification System** - User-friendly error and success messages
- **Comprehensive Logging** - Structured logging with Winston
- **Transaction Safety** - Database operations with rollback on errors
- **Network Error Handling** - Offline-aware with German error messages
- **Validation** - All API endpoints validated against database schema
- **Memory Leak Prevention** - Proper cleanup in all components
- **Error Categorization** - Distinguishes serious vs benign errors

See [Error Handling Documentation](./docs/ERROR_HANDLING_AUDIT.md) for details.

## 📱 PWA Features

- Service worker for offline functionality
- App manifest for installation
- Push notifications support
- Responsive design for mobile devices

## 🛠️ Development Tools

- **Frontend**: Vite, React 19, TailwindCSS
- **Backend**: Express.js, PostgreSQL, Winston logging
- **Testing**: Vitest, Jest, React Testing Library
- **Database**: PostgreSQL with migrations
- **Real-time**: Simple polling (30s intervals)

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

- [Documentation Index](./docs/README.md) - Complete documentation guide
- [Project Structure](./docs/PROJECT_STRUCTURE.md) - Detailed project organization
- [API-Database Alignment Report](./docs/API_DATABASE_ALIGNMENT_REPORT.md) - Schema validation
- [Error Handling Audit](./docs/ERROR_HANDLING_AUDIT.md) - Error handling improvements
- [Database Connection Pool](./docs/DATABASE_CONNECTION_POOL.md) - Pool optimization
- [Uberspace Configuration](./docs/UBERSPACE_CONFIGURATION.md) - Deployment guide
- [Security Documentation](./docs/SECURITY.md) - Security features

## 📞 Support

For issues and questions:
1. Check the [documentation index](./docs/README.md)
2. Review relevant documentation files
3. Create an issue in the repository

## ✨ Recent Updates (January 2026)

- ✅ Comprehensive error handling system with toast notifications
- ✅ API-Database schema validation (16 tables, 82 indexes verified)
- ✅ Transaction safety for all critical operations
- ✅ Memory leak fixes in map components
- ✅ Structured error logging and categorization
- ✅ Network error handling with offline support
- ✅ File operation error handling improvements
