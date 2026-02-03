# Project Structure

This document describes the organization of the SLAM25 Members Area project.

## Directory Structure

```
slam_members_area_with_admin/
├── client/                    # Frontend React application
│   ├── components/           # React components
│   │   ├── admin/           # Admin panel components
│   │   ├── forms/           # Reusable form components
│   │   └── shared/          # Shared/common components
│   ├── config/              # Client configuration files
│   ├── contexts/            # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API service layer
│   └── utils/               # Client-side utilities
│
├── server/                   # Backend Express application
│   ├── config/              # Server configuration
│   ├── constants/           # Server constants
│   ├── middleware/          # Express middleware
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   └── utils/               # Server-side utilities
│
├── shared/                   # Code shared between client and server
│   ├── constants/           # Shared constants
│   └── schemas/             # Validation schemas (Zod)
│
├── database/                 # Database related files
│   ├── migrations/          # SQL migration scripts
│   ├── schemas/             # Database schema files
│   └── setup/               # Database setup scripts
│
├── scripts/                  # Utility scripts
│   ├── deployment/          # Deployment scripts
│   └── *.js                 # Maintenance and utility scripts
│
├── docs/                     # Project documentation
│   ├── archive/             # Archived documentation
│   ├── *.md                 # Current documentation files
│   └── PROJECT_STRUCTURE.md # This file
│
├── public/                   # Static assets
│   ├── icons/               # Icon files
│   └── uploads/             # User uploaded files
│       ├── info-pages/      # Info page uploads
│       └── news/            # News image uploads
│
└── Root Files
    ├── index.html           # Application entry HTML
    ├── package.json         # NPM dependencies and scripts
    ├── vite.config.js       # Vite build configuration
    ├── tailwind.config.js   # Tailwind CSS configuration
    ├── postcss.config.js    # PostCSS configuration
    ├── nodemon.json         # Nodemon configuration
    ├── .env.*               # Environment configuration files
    ├── .gitignore           # Git ignore rules
    ├── README.md            # Main project README
    └── CHANGELOG.md         # Project changelog
```

## Key Directories Explained

### `/client`
Contains all frontend React code. Components are organized by type:
- **admin/** - Admin panel components for managing content
- **forms/** - Reusable form input components
- **shared/** - Shared components used across the application

### `/server`
Backend API server using Express.js. Routes handle HTTP requests and delegate to services for business logic.

### `/shared`
Code shared between client and server, including validation schemas and constants. This ensures consistency across the full stack.

### `/database`
- **migrations/** - SQL migration scripts for database schema changes
- **schemas/** - Full database schema definitions (dev/prod)
- **setup/** - Initial database setup scripts

### `/scripts`
Utility scripts for maintenance, data migration, and deployment tasks.

### `/docs`
Project documentation including:
- Technical documentation
- API documentation
- Deployment guides
- Archived historical documentation

### `/public`
Static assets served directly by the web server:
- Icons and images
- User-uploaded content (in uploads/)

## Configuration Files

### Environment Files
- `.env.development` - Development environment configuration
- `.env.production.template` - Template for production environment
- `.env.simple` - Simplified environment configuration
- `.env` - Local environment (gitignored)

### Build Configuration
- `package.json` - NPM dependencies and scripts
- `tailwind.config.js` - Tailwind CSS theming and configuration
- `postcss.config.js` - PostCSS plugins
- `nodemon.json` - Development server configuration

## Best Practices

1. **Component Organization**: Place components in the appropriate subdirectory based on their purpose
2. **Shared Code**: Use `/shared` for code needed by both client and server
3. **Documentation**: Keep documentation up-to-date in `/docs`
4. **Migrations**: All database changes should have a migration script in `/database/migrations`
5. **Scripts**: Utility scripts go in `/scripts`, deployment scripts in `/scripts/deployment`

## Maintenance

- Archived documentation should be moved to `/docs/archive`
- Temporary files should not be committed (check `.gitignore`)
- SQL files belong in `/database/migrations` or `/database/schemas`
- Deployment scripts belong in `/scripts/deployment`
