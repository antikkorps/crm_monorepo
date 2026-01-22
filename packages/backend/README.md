# OPEx_CRM - Backend

Node.js/TypeScript backend for the OPEx_CRM application, built with Koa.js and PostgreSQL.

## Architecture

- **Framework**: Koa.js with TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Email**: Nodemailer with SMTP support
- **Scheduling**: node-cron for automated jobs

## Project Structure

```
packages/backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Sequelize models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware (auth, validation, etc.)
│   ├── utils/           # Utilities and helpers
│   ├── config/          # Configuration files
│   └── server.ts        # Application entry point
├── migrations/          # Database migrations
├── docs/                # Additional documentation
└── __tests__/           # Test files
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- SMTP server (for email notifications)

### Installation

1. Install dependencies:

   ```bash
   cd packages/backend
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run database migrations:

   ```bash
   npm run migrate
   ```

4. Seed development data (optional):

   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## Environment Configuration

See `.env.example` for all available environment variables. Key configurations:

### Database

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SYNC_ON_START`: Auto-sync models on startup (dev only)

### Authentication

- `JWT_SECRET`, `JWT_REFRESH_SECRET`: JWT signing keys
- `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`: Token validity periods

### Email/SMTP

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP server config
- `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`: Default sender identity

### Reminder System

- `ENABLE_EMAIL_REMINDERS`: Enable/disable email notifications (default: `true`)
- `REMINDER_TIMEZONE`: Timezone for cron jobs (default: `Europe/Paris`)
- `REMINDER_CRON_SCHEDULE`: Cron schedule for reminder processing (default: `0 9 * * *` = daily at 9am)
- `REMINDER_BATCH_SIZE`: Max entities per type to process (default: `100`)
- `REMINDER_CACHE_CLEANUP_DAYS`: Anti-spam cache retention (default: `7` days)
- `FRONTEND_URL`: Frontend URL for email links (e.g., `http://localhost:3000`)

## Automated Reminder System

The backend includes an automated reminder system for:

- **Tasks**: Alerts 7 days before due date and when overdue
- **Quotes**: Alerts 7 days before expiration
- **Invoices**: Alerts 30 days after due date for unpaid invoices

### How It Works

1. **Cron Job**: Runs daily (configurable via `REMINDER_CRON_SCHEDULE`)
2. **Rule Matching**: Checks active reminder rules against entities
3. **Notifications**: Sends in-app notifications and optional emails
4. **Anti-Spam**: Prevents duplicate notifications within 23 hours

### Configuration

Reminder rules can be configured via:

- **API**: `POST /api/reminder-rules` (SUPER_ADMIN only)
- **Database Seeder**: Creates default rules on first run
- **Admin UI**: Manage rules via frontend settings

### Email Templates

Professional HTML email templates are automatically generated with:

- Responsive design for mobile/desktop
- Direct links to entities in the CRM
- Dynamic content (days remaining, amounts, etc.)
- Branded footer with CRM information

For detailed documentation, see [`docs/REMINDERS.md`](./docs/REMINDERS.md)

## API Documentation

API endpoints are organized by domain:

- **Authentication**: `/api/auth/*` - Login, refresh, logout
- **Users**: `/api/users/*` - User management
- **Teams**: `/api/teams/*` - Team management
- **Institutions**: `/api/institutions/*` - Medical institutions
- **Contacts**: `/api/contacts/*` - Contact persons
- **Tasks**: `/api/tasks/*` - Task management
- **Quotes**: `/api/quotes/*` - Quote/billing
- **Invoices**: `/api/invoices/*` - Invoice management
- **Reminders**: `/api/reminder-rules/*` - Reminder configuration
- **Segments**: `/api/segments/*` - Customer segmentation
- **Settings**: `/api/settings/*` - System settings

### Authentication

Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

Role-based access control (RBAC) levels:

- `SUPER_ADMIN`: Full system access
- `TEAM_ADMIN`: Team management and data access
- `USER`: Limited to assigned data

## Database Migrations

```bash
# Create a new migration
npm run migration:generate -- --name migration-name

# Run pending migrations
npm run migrate

# Rollback last migration
npm run migrate:undo
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Tests use Vitest with a dedicated PostgreSQL test database.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database and SMTP credentials
3. Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
4. Run migrations: `npm run migrate`
5. Start the server: `npm start`

For detailed deployment instructions, see the main repository README.

## Troubleshooting

### Common Issues

**Database Connection Errors**

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb medical_crm_dev`

**Email Not Sending**

- Verify SMTP credentials in `.env`
- Check `ENABLE_EMAIL_REMINDERS=true`
- Review logs for SMTP connection errors
- Test with Mailtrap for development

**Reminders Not Working**

- Verify cron job is running (check logs for "Processing reminders...")
- Ensure reminder rules exist: `SELECT * FROM reminder_rules WHERE is_active = true`
- Check entities match rule criteria (due dates, statuses, etc.)
- Review anti-spam cache if notifications seem missing

For more help, check:

- [`docs/REMINDERS.md`](./docs/REMINDERS.md) - Reminder system documentation
- [`docs/EMAIL_REMINDERS.md`](./docs/EMAIL_REMINDERS.md) - Email configuration guide

## License

Copyright © 2025 OPEx_CRM. All rights reserved.
