# SLAM25 Members Area

A full-stack Poetry Slam application with React frontend and Express.js backend using PostgreSQL.

## 🚀 Features

- **Member Dashboard** - Competition rounds and participant management
- **Admin Panel** - Content management and user administration
- **Live Updates** - Polling-based data refresh for real-time experience
- **City Tips** - Location recommendations and interactive maps
- **News & Community** - News feed and community features
- **PWA Support** - Progressive Web App with offline capabilities

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + TailwindCSS + React Router v7
- **Backend**: Express.js + PostgreSQL
- **Real-time**: Polling-based updates for live data
- **PWA**: Progressive Web App with service workers

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── components/         # React components
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── server/                # Express.js backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   └── config/           # Configuration files
├── database/              # Database migrations
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
   JWT_SECRET=your_super_secure_jwt_secret_key  # REQUIRED - no fallback
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
- **Real-time**: Socket.io

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For issues and questions, please check the documentation or create an issue in the repository.
