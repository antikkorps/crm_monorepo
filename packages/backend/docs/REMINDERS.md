# Automated Reminder System - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Reminder Rules](#reminder-rules)
5. [Email Templates](#email-templates)
6. [Cron Jobs](#cron-jobs)
7. [Anti-Spam Protection](#anti-spam-protection)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [Examples](#examples)

---

## Overview

The Automated Reminder System sends timely notifications to users about:

- **Tasks**: Approaching deadlines (7 days before) and overdue tasks
- **Quotes**: Expiring quotes (7 days before expiration)
- **Invoices**: Unpaid invoices (30 days after due date)

Notifications are delivered via:

- **In-app notifications**: Visible in the notification center
- **Email**: Professional HTML emails with direct links to entities

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Scheduler                          │
│              (node-cron, configurable schedule)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ReminderService                            │
│  • processAllReminders()                                    │
│  • processReminderRule(rule)                                │
│  • shouldSendNotification(cache check)                      │
│  • markNotificationSent(cache update)                       │
└────────┬───────────────────────┬────────────────────────────┘
         │                       │
         ▼                       ▼
┌────────────────────┐  ┌──────────────────────┐
│ NotificationService│  │   EmailService       │
│ • In-app alerts    │  │ • HTML templates     │
│ • Badges           │  │ • SMTP delivery      │
│ • Push notifications│  │ • Link generation    │
└────────────────────┘  └──────────────────────┘
```

### Database Models

**ReminderRule**

- Defines when and how reminders are triggered
- Supports task, quote, and invoice entities
- Configurable trigger types (due_soon, overdue, unpaid, expiring)

**Notification**

- Stores in-app notifications
- Links to user, entity type, and entity ID
- Tracks read/unread status

**Task, Quote, Invoice**

- Business entities monitored by the reminder system
- Include due dates, statuses, and assignment information

---

## Configuration

### Environment Variables

Configure the reminder system via `.env`:

```bash
# Enable/disable email reminders globally
ENABLE_EMAIL_REMINDERS=true

# Timezone for cron job execution
# Affects when "9am daily" actually runs
REMINDER_TIMEZONE=Europe/Paris

# Maximum entities to process per type per run
# Increase if you have >100 tasks/quotes/invoices due simultaneously
REMINDER_BATCH_SIZE=100

# Cron schedule (minute hour day month weekday)
# Examples:
#   0 9 * * *     = Daily at 9:00 AM
#   0 */6 * * *   = Every 6 hours
#   0 9,18 * * *  = Daily at 9:00 AM and 6:00 PM
REMINDER_CRON_SCHEDULE=0 9 * * *

# Anti-spam cache cleanup interval (days)
REMINDER_CACHE_CLEANUP_DAYS=7

# Frontend URL for email links
# Must be accessible by email recipients
FRONTEND_URL=https://crm.yourcompany.com
```

### SMTP Configuration

Email reminders require SMTP configuration:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

EMAIL_FROM_ADDRESS=noreply@yourcompany.com
EMAIL_FROM_NAME=OPEx_CRM
```

**SMTP Providers:**

| Provider       | Host                  | Port | Secure |
| -------------- | --------------------- | ---- | ------ |
| Gmail          | smtp.gmail.com        | 587  | false  |
| Outlook        | smtp-mail.outlook.com | 587  | false  |
| SendGrid       | smtp.sendgrid.net     | 587  | false  |
| Mailgun        | smtp.mailgun.org      | 587  | false  |
| Mailtrap (dev) | smtp.mailtrap.io      | 2525 | false  |

---

## Reminder Rules

### Default Rules

The system creates these default reminder rules on first run:

| Entity  | Trigger Type | Days Before/After | Description                |
| ------- | ------------ | ----------------- | -------------------------- |
| Task    | `due_soon`   | 7 days before     | Alert before task deadline |
| Task    | `overdue`    | 0 days after      | Alert for overdue tasks    |
| Quote   | `expiring`   | 7 days before     | Alert before quote expires |
| Invoice | `unpaid`     | 30 days after     | Alert for unpaid invoices  |

### Creating Custom Rules

**Via API (SUPER_ADMIN only):**

```bash
POST /api/reminder-rules
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Critical Tasks - 3 Day Warning",
  "description": "Alert 3 days before critical task deadline",
  "entityType": "task",
  "triggerType": "due_soon",
  "daysBefore": 3,
  "targetRole": null,
  "isActive": true,
  "sendEmail": true,
  "sendNotification": true
}
```

**Via Database Seeder:**

```typescript
// packages/backend/src/utils/seeder.ts
await ReminderRule.create({
  name: "High Priority Invoice Follow-up",
  entityType: "invoice",
  triggerType: "unpaid",
  daysAfter: 15,
  sendEmail: true,
  sendNotification: true,
  isActive: true,
})
```

### Rule Properties

| Field              | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `name`             | string  | Human-readable rule name                       |
| `description`      | string  | Optional description                           |
| `entityType`       | enum    | `task`, `quote`, or `invoice`                  |
| `triggerType`      | enum    | `due_soon`, `overdue`, `expiring`, `unpaid`    |
| `daysBefore`       | number  | Days before event (for `due_soon`, `expiring`) |
| `daysAfter`        | number  | Days after event (for `overdue`, `unpaid`)     |
| `targetRole`       | string  | Optional: limit to specific user role          |
| `isActive`         | boolean | Enable/disable rule                            |
| `sendEmail`        | boolean | Send email notification                        |
| `sendNotification` | boolean | Send in-app notification                       |

### Trigger Types

**`due_soon`** (Tasks, Quotes)

- Fires when entity due date is within `daysBefore` days
- Example: Alert 7 days before task deadline

**`overdue`** (Tasks)

- Fires when task is past due date
- Triggers immediately on first cron run after due date

**`expiring`** (Quotes)

- Fires when quote `validUntil` is within `daysBefore` days
- Only for quotes with status `draft` or `sent`

**`unpaid`** (Invoices)

- Fires `daysAfter` days after invoice due date
- Only for invoices with status `sent` (not paid)

---

## Email Templates

### Template Structure

Email templates are dynamically generated with:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      /* Responsive styles */
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <h2>{Entity Type} Reminder</h2>
      </div>

      <!-- Content -->
      <div class="content">
        <p>Hello {User Name},</p>
        <p>{Context-specific message}</p>

        <div class="details-box">
          <h3>{Entity Title}</h3>
          <p><strong>Due Date:</strong> {Formatted Date}</p>
          <p><strong>Institution:</strong> {Institution Name}</p>
          <p><strong>Amount:</strong> {Formatted Amount}</p>
        </div>

        <a href="{CRM Link}" class="cta-button"> View in CRM </a>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Sent by OPEx_CRM</p>
      </div>
    </div>
  </body>
</html>
```

### Task Reminder Example

**Subject:** Task Due Soon: "{Task Title}"

**Body:**

```
Hello John Doe,

Your task "Follow-up with Clinic Saint-Martin" is due in 5 days.

Task Details:
- Due Date: November 20, 2025
- Institution: Clinic Saint-Martin
- Priority: High
- Status: In Progress

[View in CRM]

---
Sent by OPEx_CRM
```

### Quote Reminder Example

**Subject:** Quote Expiring Soon: #{Quote Number}

**Body:**

```
Hello Jane Smith,

Your quote #QT-2025-042 for "Medical Equipment Package" is expiring in 7 days.

Quote Details:
- Expiration Date: November 25, 2025
- Institution: Hôpital Central
- Amount: €15,420.00
- Status: Sent

[View in CRM]

---
Sent by OPEx_CRM
```

### Invoice Reminder Example

**Subject:** Unpaid Invoice Reminder: #{Invoice Number}

**Body:**

```
Hello Finance Team,

Invoice #INV-2025-128 is overdue by 35 days.

Invoice Details:
- Due Date: October 15, 2025
- Institution: Medical Center Alpha
- Amount: €8,750.00
- Status: Sent (Unpaid)

[View in CRM]

---
Sent by OPEx_CRM
```

---

## Cron Jobs

### Cron Schedule Format

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday - Saturday)
 │ │ │ │ │
 * * * * *
```

### Common Schedules

| Description     | Cron Expression | When it runs               |
| --------------- | --------------- | -------------------------- |
| Daily at 9am    | `0 9 * * *`     | Every day 09:00            |
| Every 6 hours   | `0 */6 * * *`   | 00:00, 06:00, 12:00, 18:00 |
| Twice daily     | `0 9,18 * * *`  | 09:00 and 18:00            |
| Weekdays at 9am | `0 9 * * 1-5`   | Mon-Fri at 09:00           |
| Every hour      | `0 * * * *`     | Top of every hour          |

### Job Execution

When the cron job triggers:

1. **Load Active Rules**: Query all `ReminderRule` where `isActive = true`
2. **Process Each Rule**: For each rule, query matching entities
3. **Anti-Spam Check**: Skip if notification sent within 23 hours
4. **Send Notifications**: Create in-app notification and/or send email
5. **Update Cache**: Mark notification as sent to prevent duplicates
6. **Log Results**: Record successes and failures

**Execution Log Example:**

```
[2025-11-11 09:00:00] Starting reminder processing...
[2025-11-11 09:00:01] Processing rule: Tasks Due Soon (7 days)
[2025-11-11 09:00:02] Found 12 matching tasks
[2025-11-11 09:00:03] Sent 12 notifications (8 email, 12 in-app)
[2025-11-11 09:00:04] Processing rule: Overdue Tasks
[2025-11-11 09:00:05] Found 3 matching tasks
[2025-11-11 09:00:06] Sent 3 notifications (3 email, 3 in-app)
[2025-11-11 09:00:07] Processing complete. Total: 15 notifications
```

---

## Anti-Spam Protection

### In-Memory Cache

The reminder system uses an in-memory cache to prevent duplicate notifications:

**Cache Key Format:**

```
{ruleId}:{entityType}:{entityId}
```

**Example:**

```
uuid-task-rule:task:uuid-task-123
```

**Cache Entry:**

```javascript
{
  lastSent: Date,
  expiresAt: Date // lastSent + 23 hours
}
```

### Cache Lifecycle

1. **Before Sending**: Check if cache entry exists and hasn't expired
2. **If Exists**: Skip notification (already sent recently)
3. **If Not Exists**: Send notification and create cache entry
4. **Cleanup**: Periodic cleanup removes expired entries (configurable)

### Limitations

⚠️ **Current Limitation**: Cache is **in-memory only**

- **Lost on server restart**: All cache entries are cleared
- **Not shared across instances**: Multi-instance deployments may send duplicates

**Solution**: See [Task 28.1](#task-281-persistent-cache-table) for persistent cache implementation

---

## Troubleshooting

### Reminders Not Sending

**Check 1: Cron Job Running**

Look for cron logs in server output:

```
[2025-11-11 09:00:00] Starting reminder processing...
```

If missing:

- Verify `REMINDER_CRON_SCHEDULE` is valid
- Check server is running continuously
- Review server logs for cron initialization errors

**Check 2: Active Reminder Rules**

Query database:

```sql
SELECT * FROM reminder_rules WHERE is_active = true;
```

If no results:

- Run database seeder: `npm run seed`
- Create rules manually via API

**Check 3: Matching Entities**

For tasks due soon (7 days):

```sql
SELECT * FROM tasks
WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND status != 'completed';
```

If no results, reminders won't send (working as designed).

**Check 4: Anti-Spam Cache**

Check if notification was sent recently:

- Cache expires after 23 hours
- Restart server to clear cache (temporary workaround)
- Implement persistent cache (see Task 28.1)

### Emails Not Delivering

**Check 1: SMTP Configuration**

Verify in `.env`:

```bash
ENABLE_EMAIL_REMINDERS=true
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Check 2: SMTP Connection**

Server logs show SMTP verification on startup:

```
[2025-11-11 08:59:55] SMTP connection verified successfully
```

If error:

- Verify credentials
- Check firewall/network access to SMTP server
- Try Mailtrap for testing

**Check 3: Email Logs**

Look for email delivery logs:

```
[2025-11-11 09:00:05] Email sent successfully to user@example.com
```

If errors:

```
[2025-11-11 09:00:05] Failed to send email: SMTP timeout
```

- Review SMTP server logs
- Check recipient email is valid
- Verify `EMAIL_FROM_ADDRESS` is authorized sender

**Check 4: Spam Filters**

Emails might be filtered:

- Check recipient spam folder
- Add sender to whitelist
- Configure SPF/DKIM records (production)

### Performance Issues

**Too Many Entities**

If processing >100 entities per type:

- Increase `REMINDER_BATCH_SIZE` in `.env`
- Implement batch processing (see Task 28.2)

**Slow Query Performance**

Optimize with database indexes:

```sql
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'completed';
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until) WHERE status IN ('draft', 'sent');
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'sent';
```

---

## API Reference

### List Reminder Rules

```http
GET /api/reminder-rules
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tasks Due Soon",
      "entityType": "task",
      "triggerType": "due_soon",
      "daysBefore": 7,
      "isActive": true,
      "sendEmail": true,
      "sendNotification": true,
      "createdAt": "2025-11-11T00:00:00Z"
    }
  ]
}
```

### Create Reminder Rule

```http
POST /api/reminder-rules
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Urgent Task Reminder",
  "description": "Alert 3 days before high-priority tasks",
  "entityType": "task",
  "triggerType": "due_soon",
  "daysBefore": 3,
  "isActive": true,
  "sendEmail": true,
  "sendNotification": true
}
```

**Response:** Same as GET response for single rule

### Update Reminder Rule

```http
PUT /api/reminder-rules/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** Same as create (all fields optional)

### Delete Reminder Rule

```http
DELETE /api/reminder-rules/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Reminder rule deleted successfully"
}
```

### Manually Trigger Reminders (Debug)

⚠️ **Not implemented yet** - Future enhancement

```http
POST /api/reminder-rules/trigger
Authorization: Bearer <token>
```

Would manually trigger reminder processing (useful for testing).

---

## Examples

### Example 1: Create Urgent Task Reminder

**Scenario**: Alert 2 days before high-priority task deadlines

```bash
curl -X POST http://localhost:3001/api/reminder-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Urgent Task - 2 Day Warning",
    "description": "Alert 2 days before high-priority tasks are due",
    "entityType": "task",
    "triggerType": "due_soon",
    "daysBefore": 2,
    "isActive": true,
    "sendEmail": true,
    "sendNotification": true
  }'
```

### Example 2: Quote Expiring in 3 Days

**Scenario**: Earlier warning for quote expiration

```typescript
// In seeder or migration
await ReminderRule.create({
  name: "Quote Expiring - 3 Day Warning",
  description: "Alert sales team 3 days before quote expires",
  entityType: "quote",
  triggerType: "expiring",
  daysBefore: 3,
  targetRole: "TEAM_ADMIN", // Only notify team admins
  isActive: true,
  sendEmail: true,
  sendNotification: true,
})
```

### Example 3: Invoice Overdue - First Warning

**Scenario**: Earlier follow-up on unpaid invoices

```json
{
  "name": "Invoice Overdue - First Warning",
  "description": "Initial reminder 7 days after invoice due date",
  "entityType": "invoice",
  "triggerType": "unpaid",
  "daysAfter": 7,
  "isActive": true,
  "sendEmail": true,
  "sendNotification": true
}
```

### Example 4: Weekend Cron Schedule

**Scenario**: Skip weekends, run Mon-Fri at 9am and 5pm

```bash
# In .env
REMINDER_CRON_SCHEDULE=0 9,17 * * 1-5
```

This runs:

- Monday-Friday only (1-5)
- At 9:00 AM and 5:00 PM (9,17)

---

## Future Enhancements

See Task 28 in `tasks.md` for planned improvements:

### 28.1 - Persistent Cache Table ✅ **Recommended**

Add `reminder_notification_logs` table to persist cache:

- Survives server restarts
- Provides audit trail
- Enables analytics (notification volume, failure rates)

### 28.2 - Configurable Batch Processing

Process >100 entities per type with pagination:

- Prevent timeout on large datasets
- Configurable batch size
- Progress logging

### 28.3 - Default Templates via Migration

Idempotent migration to ensure default rules exist:

- Runs on every deployment
- Restores deleted defaults
- Marks as "system" rules (undeletable)

### 28.4 - Monitoring Dashboard

Frontend widget to visualize reminder activity:

- Notifications sent (today/week/month)
- Top rules by volume
- Failure rates
- Last cron execution

### 28.5 - Enhanced Documentation ✅ **This Document**

Comprehensive guide for developers and administrators.

---

## Support

For issues or questions:

1. Check this documentation
2. Review server logs for errors
3. Verify environment configuration
4. Test SMTP with Mailtrap (development)
5. Consult `docs/EMAIL_REMINDERS.md` for email-specific issues

**Logs Location:**

- Development: Console output
- Production: `logs/` directory (if configured)

**Useful Commands:**

```bash
# View recent reminder logs
grep "reminder" logs/app.log | tail -50

# Test SMTP connection
npm run test:smtp

# Check active rules
psql -d medical_crm_dev -c "SELECT * FROM reminder_rules WHERE is_active = true;"
```

---

**Last Updated**: 2025-11-11
**Version**: 1.0.0
**Maintainer**: OPEx_CRM Development Team
