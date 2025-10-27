# Development Guide - SLAM25

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.simple .env

# Update .env with your database credentials
# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## New Architecture Patterns

### Centralized Error Handling

The project now uses a centralized error handling system with the following components:

#### ErrorService (`client/services/errorService.js`)
```javascript
import { ErrorService } from './errorService.js';

// Handle errors with context
const error = ErrorService.handleError(err, { context: 'form_submission' });

// Classify error types
const errorType = ErrorService.classifyError(error);

// Get user-friendly messages
const message = ErrorService.getErrorMessage(error, errorType);
```

#### useError Hook (`client/hooks/useError.js`)
```javascript
import { useError } from '../../hooks/useError.js';

function MyComponent() {
  const { error, handleError, clearError } = useError();
  
  const handleSubmit = async (data) => {
    try {
      await submitData(data);
    } catch (err) {
      handleError(err, { context: 'form_submission' });
    }
  };
  
  return (
    <div>
      {error && <ErrorMessage error={error} onDismiss={clearError} />}
    </div>
  );
}
```

#### ErrorMessage Component (`client/components/shared/ErrorMessage.jsx`)
```javascript
import { ErrorMessage, SuccessMessage } from '../shared/ErrorMessage.jsx';

// Display errors
<ErrorMessage 
  error={error} 
  onDismiss={clearError}
  showDetails={process.env.NODE_ENV === 'development'}
/>

// Display success messages
<SuccessMessage 
  message="Operation successful!" 
  onDismiss={() => setSuccessMessage(null)}
  duration={3000}
/>
```

### Unified Validation System

#### Validation Schema Factory (`shared/schemas/validationFactory.js`)
```javascript
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';

// Create schema for any entity type
const schema = createValidationSchema('cityTip');
const defaultValues = getDefaultValues('cityTip');

// Available entity types:
// - cityTip
// - participant  
// - news
// - timetable
// - infoPage
// - round
```

#### Common Validation Patterns
```javascript
import { commonValidations } from '../../../shared/schemas/validationFactory.js';

// Text validation
const name = commonValidations.requiredString('Name').max(255, 'Name ist zu lang');

// Email validation
const email = commonValidations.email();

// URL validation
const website = commonValidations.url();

// Enum validation
const status = commonValidations.enum(['ACTIVE', 'INACTIVE'], 'Status');
```

### Form State Management

#### useFormManager Hook (`client/hooks/useFormManager.js`)
```javascript
import { useFormManager } from '../../hooks/useFormManager.js';

function MyForm() {
  const { 
    form, 
    error, 
    isSubmitting, 
    submitForm, 
    resetForm, 
    setFormValues,
    clearError 
  } = useFormManager(schema, { defaultValues });
  
  const handleSubmit = async (data) => {
    await submitForm(async (formData) => {
      // Your submission logic
      await api.createItem(formData);
    });
  };
  
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

#### Form Persistence (`client/hooks/useFormManager.js`)
```javascript
import { useFormManagerWithPersistence } from '../../hooks/useFormManager.js';

function MyForm() {
  const formManager = useFormManagerWithPersistence(schema, 'my-form-key');
  
  // Form data is automatically saved to localStorage
  // and restored on component mount
}
```

### Migration Guide

#### Replacing alert() calls
```javascript
// OLD: Using alert()
if (!data.name) {
  alert('Name ist erforderlich');
  return;
}

// NEW: Using ErrorService
const { handleError } = useError();
if (!data.name) {
  handleError(new Error('Name ist erforderlich'), { context: 'validation' });
  return;
}
```

#### Replacing dual form instances
```javascript
// OLD: Separate add and edit forms
const addForm = useForm({ resolver: zodResolver(schema) });
const editForm = useForm({ resolver: zodResolver(schema) });

// NEW: Single form manager
const { form, setFormValues, resetForm } = useFormManager(schema);

// Switch between add/edit modes
useEffect(() => {
  if (editingItem) {
    setFormValues(editingItem);
  } else {
    resetForm();
  }
}, [editingItem]);
```

#### Replacing manual validation
```javascript
// OLD: Manual validation
if (!data.name || !data.email) {
  alert('Bitte füllen Sie alle Pflichtfelder aus');
  return;
}

// NEW: Schema-based validation
const schema = createValidationSchema('participant');
const { form } = useFormManager(schema);
// Validation is handled automatically by Zod
```

## Development Workflow

### 1. Database Setup
```bash
# Create database
createdb slam25_db

# Run migrations
npm run migrate

# Seed with test data (optional)
npm run seed
```

### 2. Development Server
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:client  # Frontend on :5173
npm run dev:server  # Backend on :3005
```

### 3. Building for Production
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Code Organization

### Frontend Structure
```
client/
  components/          # Reusable UI components
    admin/            # Admin-specific components
  contexts/           # React contexts (theme, auth, UI)
  hooks/              # Custom hooks
  services/           # API services
  utils/              # Utility functions
```

### Backend Structure
```
server/
  routes/             # API route handlers
  services/           # Business logic services
  middleware/         # Express middleware
  utils/              # Utility functions
  config/             # Configuration files
```

## Key Patterns

### 1. Data Fetching
```javascript
// Use TanStack Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['participants'],
  queryFn: fetchParticipants,
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### 2. Form Handling
```javascript
// Use React Hook Form
const { control, handleSubmit } = useForm({
  defaultValues: { name: '', email: '' }
});
```

### 3. Authentication
```javascript
// Use auth context
const { isAdmin, login, logout } = useAuth();
```

### 4. API Routes
```javascript
// Simple Express routes
router.get('/participants', async (req, res) => {
  const participants = await getParticipants();
  sendSuccessResponse(res, participants, 'GET_PARTICIPANTS');
});
```

## Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Structure
```
client/
  __tests__/          # Component tests
server/
  __tests__/          # API tests
```

## Database Management

### Migrations
```bash
# Create new migration
touch database/migrations/YYYY-MM-DD_description.sql

# Run migrations
npm run migrate
```

### Snake_case Migration Notes

- Standard: All database columns use snake_case.
- Client/server/validation schemas also use snake_case fields.
- If client submits camelCase keys, the server normalizes them to snake_case and logs a warning.

#### Timetable Table Name

- Use table `timetables` (not `timetable_entries`).
- Service/route queries updated accordingly.

#### Rollback Procedure

1. Backup database before migrations.
2. If a migration fails, restore backup, revert code changes via git.
3. Re-run migrations on a test DB; fix issues; redeploy.

### Schema Changes
1. Create migration file
2. Update schema.sql
3. Test migration
4. Deploy to production

## Deployment

### Environment Variables
```bash
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slam25_db
DB_USER=slam_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_minimum_64_characters_required_for_security

# Optional
PORT=3005
NODE_ENV=production
```

### Production Build
```bash
# Build application
npm run build

# Start production server
npm start
```

## Common Tasks

### Adding New Features
1. Create database migration if needed
2. Add API routes in `server/routes/`
3. Create React components in `client/components/`
4. Add tests for new functionality
5. Update documentation

### Debugging
- Check browser console for frontend errors
- Check server logs for backend errors
- Use React Query DevTools for data fetching
- Use PostgreSQL logs for database issues

## Remember: Keep it simple, test thoroughly, and focus on the core requirements.
