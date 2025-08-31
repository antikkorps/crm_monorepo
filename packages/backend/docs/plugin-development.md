# Plugin Development Guide

This guide explains how to develop plugins for the Medical CRM system.

## Overview

The Medical CRM plugin system allows developers to extend the functionality of the CRM by creating custom plugins that can:

- React to system events through hooks
- Integrate with external services
- Add custom business logic
- Extend API functionality
- Process data transformations

## Plugin Structure

A plugin is a Node.js package with a specific structure:

```
my-plugin/
├── package.json          # Plugin manifest
├── index.js             # Main plugin file
├── README.md            # Plugin documentation
└── config/              # Optional configuration files
    └── schema.json      # Configuration schema
```

## Plugin Manifest (package.json)

The `package.json` file serves as the plugin manifest and must include specific fields:

```json
{
  "name": "my-crm-plugin",
  "version": "1.0.0",
  "description": "A sample plugin for Medical CRM",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "main": "index.js",

  // Plugin-specific fields
  "displayName": "My CRM Plugin",
  "category": "integration",
  "keywords": ["crm", "medical", "integration"],
  "homepage": "https://github.com/yourname/my-crm-plugin",
  "repository": "https://github.com/yourname/my-crm-plugin",

  // Plugin configuration
  "enabled": true,
  "hooks": ["user:created", "invoice:paid", "institution:updated"],
  "permissions": ["read:institutions", "write:invoices"],

  // Configuration schema
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API key for external service"
      },
      "enabled": {
        "type": "boolean",
        "default": true
      }
    },
    "required": ["apiKey"]
  },

  "defaultConfig": {
    "enabled": true,
    "retryAttempts": 3
  }
}
```

### Plugin Categories

- `integration`: External service integrations (SAGE, LMS, etc.)
- `billing`: Billing and payment processing extensions
- `notification`: Custom notification handlers
- `analytics`: Data analysis and reporting
- `workflow`: Business process automation
- `utility`: General utility functions

## Plugin Implementation

### Basic Plugin Structure

```javascript
// index.js
class MyPlugin {
  constructor() {
    this.manifest = require("./package.json")
  }

  // Lifecycle methods
  async onLoad(context) {
    context.logger.info("Plugin loaded", { plugin: this.manifest.name })
    // Initialize plugin resources
  }

  async onUnload(context) {
    context.logger.info("Plugin unloaded", { plugin: this.manifest.name })
    // Cleanup resources
  }

  async onEnable(context) {
    context.logger.info("Plugin enabled", { plugin: this.manifest.name })

    // Register event handlers
    context.hooks.register("user:created", this.handleUserCreated.bind(this))
    context.hooks.register("invoice:paid", this.handleInvoicePaid.bind(this))
  }

  async onDisable(context) {
    context.logger.info("Plugin disabled", { plugin: this.manifest.name })

    // Unregister event handlers
    context.hooks.unregister("user:created", this.handleUserCreated.bind(this))
    context.hooks.unregister("invoice:paid", this.handleInvoicePaid.bind(this))
  }

  // Configuration management
  async onConfigChange(config, context) {
    context.logger.info("Plugin config changed", {
      plugin: this.manifest.name,
      config: Object.keys(config),
    })

    // Handle configuration changes
    this.config = config
  }

  async validateConfig(config) {
    // Validate configuration
    if (!config.apiKey) {
      throw new Error("API key is required")
    }
    return true
  }

  // Health check
  async healthCheck(context) {
    try {
      // Check plugin health (e.g., external service connectivity)
      return {
        status: "healthy",
        message: "Plugin is working correctly",
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: error.message,
      }
    }
  }

  // Event handlers
  async handleUserCreated(user) {
    console.log("New user created:", user.email)
    // Custom logic for user creation
  }

  async handleInvoicePaid(invoice) {
    console.log("Invoice paid:", invoice.invoiceNumber)
    // Custom logic for paid invoices
  }
}

module.exports = new MyPlugin()
```

### Plugin Context

The plugin context provides access to system services:

```javascript
async onEnable(context) {
  // Logger instance
  context.logger.info('Plugin message')

  // Plugin configuration
  const apiKey = context.config.apiKey

  // Hook manager
  context.hooks.register('event:name', this.handler)

  // System services (injected by the application)
  const database = context.services.database
  const notification = context.services.notification
  const webhook = context.services.webhook
}
```

## Available Hooks

### User Events

- `user:created` - New user registered
- `user:updated` - User profile updated
- `user:deleted` - User account deleted
- `user:login` - User logged in
- `user:logout` - User logged out

### Medical Institution Events

- `institution:created` - New medical institution added
- `institution:updated` - Institution information updated
- `institution:deleted` - Institution removed

### Task Events

- `task:created` - New task created
- `task:updated` - Task information updated
- `task:assigned` - Task assigned to user
- `task:completed` - Task marked as completed

### Billing Events

- `quote:created` - New quote created
- `quote:sent` - Quote sent to client
- `quote:accepted` - Quote accepted by client
- `quote:rejected` - Quote rejected by client
- `invoice:created` - New invoice generated
- `invoice:sent` - Invoice sent to client
- `payment:received` - Payment recorded
- `invoice:paid` - Invoice fully paid

### System Events

- `app:startup` - Application started
- `app:shutdown` - Application shutting down
- `webhook:triggered` - Webhook event received
- `notification:sent` - Notification delivered
- `data:import` - Data import operation
- `api:request` - API request received
- `api:response` - API response sent
- `api:error` - API error occurred

## Hook Usage Examples

### Simple Event Handler

```javascript
async onEnable(context) {
  context.hooks.register('user:created', async (user) => {
    // Send welcome email
    await this.sendWelcomeEmail(user.email)
  })
}
```

### Multiple Event Handler

```javascript
async onEnable(context) {
  // Handle multiple invoice events
  const invoiceHandler = async (invoice) => {
    await this.syncToExternalSystem(invoice)
  }

  context.hooks.register('invoice:created', invoiceHandler)
  context.hooks.register('invoice:updated', invoiceHandler)
  context.hooks.register('invoice:paid', invoiceHandler)
}
```

### Conditional Processing

```javascript
async handleInstitutionUpdated(institution) {
  // Only process hospitals
  if (institution.type === 'hospital') {
    await this.processHospitalUpdate(institution)
  }
}
```

## Configuration Management

### Configuration Schema

Define a JSON schema in your `package.json`:

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "apiUrl": {
        "type": "string",
        "format": "uri",
        "description": "External API endpoint"
      },
      "apiKey": {
        "type": "string",
        "description": "API authentication key"
      },
      "timeout": {
        "type": "number",
        "minimum": 1000,
        "maximum": 30000,
        "default": 5000,
        "description": "Request timeout in milliseconds"
      },
      "enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable/disable plugin functionality"
      }
    },
    "required": ["apiUrl", "apiKey"]
  }
}
```

### Configuration Validation

```javascript
async validateConfig(config) {
  // Custom validation logic
  if (config.timeout < 1000) {
    throw new Error('Timeout must be at least 1000ms')
  }

  if (!config.apiUrl.startsWith('https://')) {
    throw new Error('API URL must use HTTPS')
  }

  return true
}
```

### Dynamic Configuration Updates

```javascript
async onConfigChange(newConfig, context) {
  // Reinitialize with new configuration
  if (this.apiClient) {
    this.apiClient.updateConfig(newConfig)
  }

  // Update internal state
  this.config = newConfig

  context.logger.info('Configuration updated', {
    plugin: this.manifest.name,
    changes: Object.keys(newConfig)
  })
}
```

## Error Handling

### Graceful Error Handling

```javascript
async handleUserCreated(user) {
  try {
    await this.processUser(user)
  } catch (error) {
    // Log error but don't break the system
    this.context.logger.error('Failed to process user', {
      plugin: this.manifest.name,
      userId: user.id,
      error: error.message
    })
  }
}
```

### Health Monitoring

```javascript
async healthCheck(context) {
  try {
    // Test external service connectivity
    await this.testConnection()

    return {
      status: 'healthy',
      message: 'All systems operational',
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Connection failed: ${error.message}`,
      lastError: new Date().toISOString()
    }
  }
}
```

## Best Practices

### 1. Resource Management

```javascript
async onLoad(context) {
  // Initialize resources
  this.httpClient = new HttpClient(context.config)
  this.cache = new Map()
}

async onUnload(context) {
  // Clean up resources
  if (this.httpClient) {
    await this.httpClient.close()
  }
  this.cache.clear()
}
```

### 2. Asynchronous Processing

```javascript
async handleInvoiceCreated(invoice) {
  // Don't block the main thread
  setImmediate(async () => {
    try {
      await this.processInvoiceAsync(invoice)
    } catch (error) {
      this.context.logger.error('Async processing failed', error)
    }
  })
}
```

### 3. Configuration Defaults

```javascript
constructor() {
  this.manifest = require('./package.json')
  this.defaultConfig = {
    retryAttempts: 3,
    timeout: 5000,
    enabled: true,
    ...this.manifest.defaultConfig
  }
}
```

### 4. Logging

```javascript
async processData(data) {
  const logger = this.context.logger

  logger.debug('Processing data', {
    plugin: this.manifest.name,
    dataSize: data.length
  })

  try {
    const result = await this.transform(data)
    logger.info('Data processed successfully', {
      resultSize: result.length
    })
    return result
  } catch (error) {
    logger.error('Data processing failed', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}
```

## Testing Plugins

### Unit Testing

```javascript
// test/plugin.test.js
const MyPlugin = require("../index")

describe("MyPlugin", () => {
  let plugin
  let mockContext

  beforeEach(() => {
    plugin = new MyPlugin()
    mockContext = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      config: {
        apiKey: "test-key",
        enabled: true,
      },
      hooks: {
        register: jest.fn(),
        unregister: jest.fn(),
      },
      services: {},
    }
  })

  test("should load successfully", async () => {
    await plugin.onLoad(mockContext)
    expect(mockContext.logger.info).toHaveBeenCalled()
  })

  test("should validate config", async () => {
    const validConfig = { apiKey: "test-key" }
    const result = await plugin.validateConfig(validConfig)
    expect(result).toBe(true)
  })

  test("should handle user creation", async () => {
    const user = { id: 1, email: "test@example.com" }
    await plugin.handleUserCreated(user)
    // Assert expected behavior
  })
})
```

### Integration Testing

```javascript
// test/integration.test.js
const request = require("supertest")
const app = require("../../../app")

describe("Plugin Integration", () => {
  test("should install plugin via API", async () => {
    const response = await request(app)
      .post("/api/plugins/install")
      .send({ pluginPath: "/path/to/plugin" })
      .expect(201)

    expect(response.body.plugin.manifest.name).toBe("my-plugin")
  })
})
```

## Example Plugins

### SAGE Integration Plugin

```javascript
// sage-integration/index.js
const SageAPI = require("./lib/sage-api")

class SageIntegrationPlugin {
  constructor() {
    this.manifest = require("./package.json")
    this.sageClient = null
  }

  async onEnable(context) {
    this.context = context
    this.sageClient = new SageAPI(context.config)

    // Register hooks
    context.hooks.register("invoice:created", this.syncInvoiceToSage.bind(this))
    context.hooks.register("payment:received", this.syncPaymentToSage.bind(this))
  }

  async syncInvoiceToSage(invoice) {
    try {
      const sageInvoice = this.transformInvoice(invoice)
      await this.sageClient.createInvoice(sageInvoice)

      this.context.logger.info("Invoice synced to SAGE", {
        invoiceId: invoice.id,
        sageId: sageInvoice.id,
      })
    } catch (error) {
      this.context.logger.error("SAGE sync failed", error)
    }
  }

  transformInvoice(crmInvoice) {
    return {
      customerRef: crmInvoice.institution.sageId,
      amount: crmInvoice.total,
      currency: "EUR",
      dueDate: crmInvoice.dueDate,
      items: crmInvoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    }
  }
}

module.exports = new SageIntegrationPlugin()
```

### Email Notification Plugin

```javascript
// email-notifications/index.js
const nodemailer = require("nodemailer")

class EmailNotificationPlugin {
  constructor() {
    this.manifest = require("./package.json")
    this.transporter = null
  }

  async onEnable(context) {
    this.context = context
    this.transporter = nodemailer.createTransporter(context.config.smtp)

    // Register notification hooks
    context.hooks.register("user:created", this.sendWelcomeEmail.bind(this))
    context.hooks.register("invoice:sent", this.sendInvoiceNotification.bind(this))
    context.hooks.register("task:assigned", this.sendTaskAssignmentEmail.bind(this))
  }

  async sendWelcomeEmail(user) {
    const mailOptions = {
      from: this.context.config.fromEmail,
      to: user.email,
      subject: "Welcome to Medical CRM",
      template: "welcome",
      context: { user },
    }

    await this.transporter.sendMail(mailOptions)
  }

  async sendInvoiceNotification(invoice) {
    const institution = invoice.institution
    const mailOptions = {
      from: this.context.config.fromEmail,
      to: institution.email,
      subject: `Invoice ${invoice.invoiceNumber}`,
      template: "invoice",
      context: { invoice, institution },
    }

    await this.transporter.sendMail(mailOptions)
  }
}

module.exports = new EmailNotificationPlugin()
```

## Deployment

### Plugin Installation

1. **Manual Installation**: Copy plugin directory to `packages/plugins/`
2. **API Installation**: Use the plugin management API
3. **Package Manager**: Install via npm/yarn (future feature)

### Plugin Directory Structure

```
packages/plugins/
├── sage-integration/
│   ├── package.json
│   ├── index.js
│   └── lib/
├── email-notifications/
│   ├── package.json
│   ├── index.js
│   └── templates/
└── custom-analytics/
    ├── package.json
    ├── index.js
    └── config/
```

### Environment Configuration

```bash
# .env
PLUGIN_DIRECTORY=/path/to/plugins
PLUGIN_AUTO_ENABLE=true
```

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**

   - Check package.json format
   - Verify main file exists
   - Check for syntax errors

2. **Hook Not Triggering**

   - Ensure hook name is correct
   - Verify plugin is enabled
   - Check hook registration

3. **Configuration Errors**
   - Validate configuration schema
   - Check required fields
   - Verify data types

### Debug Mode

Enable debug logging to troubleshoot plugin issues:

```bash
LOG_LEVEL=debug npm start
```

### Plugin Status API

Check plugin status via API:

```bash
curl -X GET http://localhost:3001/api/plugins/health
```

## Security Considerations

1. **Input Validation**: Always validate external data
2. **Error Handling**: Don't expose sensitive information
3. **Resource Limits**: Implement timeouts and limits
4. **Permissions**: Follow principle of least privilege
5. **Dependencies**: Keep dependencies updated

## Support

For plugin development support:

1. Check the API documentation
2. Review example plugins
3. Join the developer community
4. Submit issues on GitHub

---

This guide provides the foundation for developing plugins for the Medical CRM system. For more advanced topics and API references, consult the full documentation.
