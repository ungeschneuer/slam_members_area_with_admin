# Production Admin User Deployment Guide

## Quick Deployment (Automated)

### Option 1: Use the deployment script
```bash
# The script is already configured with your Uberspace credentials
./scripts/deploy-admin-user.sh
```

The script will:
1. Upload the interactive admin creation script to your Uberspace server
2. Run the script on the server
3. Prompt you for admin user details (username, email, password, etc.)
4. Create or update the admin user in your production database

## Manual Deployment

### Step 1: Upload the script to Uberspace
```bash
scp scripts/create-production-admin.js slam25@slam25.uber.space:/home/slam25/slam25/scripts/
```

### Step 2: SSH to your Uberspace server
```bash
ssh slam25@slam25.uber.space
```

### Step 3: Navigate to your project and run the script
```bash
cd /home/slam25/slam25
node scripts/create-production-admin.js
```

## Interactive Script Features

The script will ask you for:
- **Username**: Admin username (e.g., `slamok`)
- **Email**: Admin email address
- **First Name**: Admin's first name
- **Last Name**: Admin's last name
- **Password**: Admin password (hidden input with confirmation)

### Password Security
- Password input is hidden (shows asterisks)
- Password confirmation required
- Passwords are securely hashed with bcrypt

## What the script does

1. **Interactive prompts**: Asks for all user details
2. **Checks if user exists**: Looks for existing user by username/email
3. **Creates or updates**: Creates new user or updates existing user
4. **Sets admin permissions**: Ensures user has admin role
5. **Verifies setup**: Confirms user is active and email verified
6. **Reports success**: Shows final user configuration

## Example Usage

When you run the script, you'll see:
```
==========================================
Production Admin User Creation
==========================================
Enter admin username: slamok
Enter admin email: slamok@szene.slam25.de
Enter first name: Slam
Enter last name: Admin
Enter admin password: ********
Confirm password: ********

Creating admin user...
✅ Production admin user created successfully

==========================================
Production Admin User Ready
==========================================
Username: slamok
Email: slamok@szene.slam25.de
Role: admin
Active: true
Email Verified: true

You can now login to the production admin panel.
==========================================
```

## Troubleshooting

### If you get database connection errors:
1. Check your production database configuration
2. Ensure the database service is running
3. Verify connection credentials in your production environment

### If you get permission errors:
1. Make sure the script has execute permissions
2. Check that your Uberspace user has database access
3. Verify the project path is correct

### If the user already exists:
The script will automatically update the password and ensure admin permissions.

## Security Notes

- Passwords are never displayed in plain text
- All passwords are securely hashed with bcrypt
- The script validates input and confirms passwords
- User details are logged for audit purposes
