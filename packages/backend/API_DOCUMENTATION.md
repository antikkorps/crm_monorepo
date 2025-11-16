# Medical CRM - API Documentation

## 📚 Accessing API Documentation

The Medical CRM API is fully documented using **OpenAPI 3.0 / Swagger**.

### Swagger UI (Interactive Documentation)

Access the interactive API documentation at:

```
http://localhost:4000/api-docs
```

**Features:**
- 📖 Complete endpoint reference
- 🧪 Try-it-out functionality
- 🔐 JWT authentication support
- 📋 Request/response examples
- 🏷️ Organized by tags (Authentication, Institutions, Opportunities, etc.)

### OpenAPI JSON Specification

Download the raw OpenAPI JSON spec at:

```
http://localhost:4000/api-docs.json
```

Use this for:
- Generating client SDKs (TypeScript, Python, etc.)
- Importing into Postman/Insomnia
- API testing automation

---

## 🔑 Authentication

Most endpoints require JWT authentication.

### 1. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@medical-crm.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@medical-crm.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "super_admin"
  }
}
```

### 2. Using the Token

Include the JWT token in the `Authorization` header:

```bash
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Using Swagger UI with Authentication

1. Click the **"Authorize"** button in Swagger UI
2. Enter your JWT token: `Bearer <your-token>`
3. Click **"Authorize"**
4. All subsequent requests will include the token

---

## 📍 Core Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `POST /api/auth/change-password` - Change password

### Medical Institutions
- `GET /api/institutions` - List institutions
- `POST /api/institutions` - Create institution
- `GET /api/institutions/:id` - Get institution
- `PUT /api/institutions/:id` - Update institution
- `DELETE /api/institutions/:id` - Delete institution
- `GET /api/institutions/:id/lead-score` - Get lead score
- `GET /api/institutions/:id/next-actions` - Get recommended actions
- `GET /api/institutions/hot-leads` - Get hot leads

### Opportunities (Sales Pipeline)
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity
- `GET /api/opportunities/:id` - Get opportunity
- `PUT /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity
- `PUT /api/opportunities/:id/stage` - Move to stage
- `GET /api/opportunities/analytics` - Pipeline analytics
- `GET /api/opportunities/forecast/advanced` - Revenue forecast

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/:id` - Get quote
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote
- `POST /api/quotes/:id/send-email` - Send quote by email
- `GET /api/quotes/:id/pdf` - Download quote PDF

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/payments` - Record payment
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Meetings
- `GET /api/meetings` - List meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `GET /api/meetings/:id/export/ics` - Export to calendar (.ics)
- `POST /api/meetings/:id/send-invitation` - Send invitation

### Calls
- `GET /api/calls` - List calls
- `POST /api/calls` - Log call
- `GET /api/calls/:id` - Get call
- `PUT /api/calls/:id` - Update call
- `DELETE /api/calls/:id` - Delete call

### Notes
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Reminders
- `GET /api/reminders` - List reminders
- `POST /api/reminders` - Create reminder
- `GET /api/reminders/:id` - Get reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

---

## 🧪 Testing with cURL

### Login Example

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@medical-crm.com",
    "password": "SecurePassword123!"
  }'
```

### Get Hot Leads Example

```bash
curl -X GET "http://localhost:4000/api/institutions/hot-leads?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Opportunity Example

```bash
curl -X POST http://localhost:4000/api/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Équipement Scanner IRM",
    "institutionId": "institution-uuid",
    "stage": "qualification",
    "value": 50000,
    "probability": 60,
    "expectedCloseDate": "2024-12-31"
  }'
```

---

## 📦 Generating Client SDKs

### Using OpenAPI Generator

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:4000/api-docs.json \
  -g typescript-axios \
  -o ./generated/typescript-client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:4000/api-docs.json \
  -g python \
  -o ./generated/python-client
```

### Importing into Postman

1. Open Postman
2. Click **Import**
3. Enter URL: `http://localhost:4000/api-docs.json`
4. Click **Import**
5. All endpoints will be automatically imported

---

## 🔍 Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## 🚦 Rate Limiting

- **General endpoints**: 100 requests / 15 minutes
- **Authentication endpoints**: 5 requests / 15 minutes
- **Sensitive operations**: 3 requests / 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🔐 Security

### HTTPS Required (Production)

All production endpoints require HTTPS.

### API Key (Coming Soon)

Future support for API keys alongside JWT tokens.

### Webhook Signatures

Webhook payloads are signed with HMAC-SHA256.

---

## 📮 Webhooks

Subscribe to events:
- `institution.created`
- `opportunity.stage_changed`
- `invoice.paid`
- `task.completed`

Configure webhooks at: `POST /api/webhooks`

---

## 💡 Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Refresh tokens before expiry** (15-minute access token lifetime)
4. **Handle rate limits gracefully** (implement exponential backoff)
5. **Validate input** on client-side before sending
6. **Use pagination** for large datasets (`page` and `limit` query params)

---

## 🐛 Troubleshooting

### 401 Unauthorized

- Check that JWT token is included in `Authorization` header
- Verify token hasn't expired (use `/api/auth/refresh`)
- Ensure Bearer prefix: `Authorization: Bearer <token>`

### 429 Too Many Requests

- You've exceeded rate limits
- Wait for rate limit reset (check `X-RateLimit-Reset` header)
- Implement exponential backoff in your client

### 422 Validation Error

- Check request body matches schema in Swagger UI
- Validate required fields
- Ensure correct data types

---

## 📧 Support

For API support, contact: support@medical-crm.com

For bugs/issues: https://github.com/your-org/medical-crm/issues
