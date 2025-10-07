# SLAM25 Configuration Guide

## Environment Variables

### APP_TIMEZONE

**Description**: Application timezone for round status calculations and time displays.

**Type**: String (IANA timezone identifier)

**Default**: `Europe/Berlin`

**Examples**:
- `Europe/Berlin` - Central European Time
- `America/New_York` - Eastern Time
- `Asia/Tokyo` - Japan Standard Time
- `UTC` - Coordinated Universal Time

**Usage**: This timezone is used for:
- Round status calculations (SCHEDULED, ACTIVE, COMPLETED)
- Time displays throughout the application
- Date/time formatting in the admin panel

**Configuration**: Set in your `.env` file:
```bash
APP_TIMEZONE=Europe/Berlin
```

**Important Notes**:
- Changing the timezone requires a server restart
- Use valid IANA timezone identifiers only
- The timezone affects all time-based operations in the application
- Round status calculations are based on this timezone

## Migration from Database Settings

The timezone configuration was previously stored in the database and managed through the admin interface. This has been migrated to environment variables for better deployment practices and 12-factor app compliance.

**Benefits of Environment Variable Configuration**:
- Simpler deployment and configuration management
- No database queries needed for timezone settings
- Follows 12-factor app principles
- Easier to manage in containerized environments
- No admin UI needed for infrastructure settings

## Valid Timezone Identifiers

The application accepts any valid IANA timezone identifier. Common examples:

**Europe**:
- `Europe/Berlin` - Central European Time
- `Europe/London` - Greenwich Mean Time
- `Europe/Paris` - Central European Time
- `Europe/Madrid` - Central European Time

**America**:
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `America/Denver` - Mountain Time
- `America/Los_Angeles` - Pacific Time

**Asia**:
- `Asia/Tokyo` - Japan Standard Time
- `Asia/Shanghai` - China Standard Time
- `Asia/Kolkata` - India Standard Time

**Other**:
- `UTC` - Coordinated Universal Time
- `Australia/Sydney` - Australian Eastern Time

## Troubleshooting

**Invalid Timezone**: If an invalid timezone is specified, the application will fall back to `Europe/Berlin`.

**Timezone Not Applied**: Ensure the server is restarted after changing the `APP_TIMEZONE` environment variable.

**Round Status Issues**: If round status calculations seem incorrect, verify the timezone is set correctly and matches your local timezone expectations.
