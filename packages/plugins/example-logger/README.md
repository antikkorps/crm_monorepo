# Example Logger Plugin

This is a demonstration plugin for the Medical CRM system that logs various system events. It serves as both a useful debugging tool and an example of how to create plugins for the system.

## Features

- Logs system events (user creation, logins, invoice creation, etc.)
- Configurable logging levels
- Selective event logging
- Sanitizes sensitive data
- Provides health check functionality
- Demonstrates all plugin lifecycle methods

## Configuration

The plugin can be configured with the following options:

### `logLevel`

- **Type**: String
- **Default**: "info"
- **Options**: "debug", "info", "warn", "error"
- **Description**: Sets the logging level for events

### `enabledEvents`

- **Type**: Array of strings
- **Default**: ["user:created", "invoice:created"]
- **Description**: List of events to log. Available events:
  - `user:created` - New user registration
  - `user:login` - User login events
  - `institution:created` - New medical institution added
  - `task:created` - New task creation
  - `invoice:created` - New invoice generation
  - `payment:received` - Payment processing

### `includeDetails`

- **Type**: Boolean
- **Default**: false
- **Description**: Whether to include detailed event data in logs (sensitive data is automatically sanitized)

## Example Configuration

```json
{
  "logLevel": "info",
  "enabledEvents": ["user:created", "user:login", "invoice:created", "payment:received"],
  "includeDetails": true
}
```

## Installation

1. The plugin is included by default in the Medical CRM system
2. It can be enabled/disabled via the plugin management API
3. Configuration can be updated through the admin interface

## API Usage

### Enable the plugin

```bash
curl -X PUT http://localhost:3001/api/plugins/example-logger-plugin/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Configure the plugin

```bash
curl -X PUT http://localhost:3001/api/plugins/example-logger-plugin/configure \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "logLevel": "debug",
      "enabledEvents": ["user:created", "invoice:created"],
      "includeDetails": true
    }
  }'
```

### Check plugin health

```bash
curl -X GET http://localhost:3001/api/plugins/health/example-logger-plugin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Log Output Examples

### User Creation Event

```
[2024-01-15 10:30:00] INFO: Event: user:created {
  "plugin": "example-logger-plugin",
  "event": "user:created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userEmail": "john.doe@hospital.com",
  "userRole": "USER"
}
```

### Invoice Creation Event

```
[2024-01-15 14:45:00] INFO: Event: invoice:created {
  "plugin": "example-logger-plugin",
  "event": "invoice:created",
  "timestamp": "2024-01-15T14:45:00.000Z",
  "invoiceNumber": "INV-2024-001",
  "total": 1250.00,
  "institutionId": "inst-123"
}
```

### Payment Received Event

```
[2024-01-15 16:20:00] INFO: Event: payment:received {
  "plugin": "example-logger-plugin",
  "event": "payment:received",
  "timestamp": "2024-01-15T16:20:00.000Z",
  "paymentAmount": 625.00,
  "paymentMethod": "bank_transfer",
  "invoiceNumber": "INV-2024-001"
}
```

## Development Notes

This plugin demonstrates:

1. **Plugin Structure**: Proper package.json manifest and main file
2. **Lifecycle Methods**: All plugin lifecycle hooks (onLoad, onEnable, etc.)
3. **Event Handling**: Registering and handling system events
4. **Configuration**: Schema validation and dynamic configuration updates
5. **Error Handling**: Graceful error handling and logging
6. **Health Checks**: Plugin health monitoring
7. **Data Sanitization**: Removing sensitive information from logs

## Use Cases

- **Development**: Debug system behavior and event flow
- **Monitoring**: Track system activity and user actions
- **Auditing**: Maintain logs for compliance and security
- **Learning**: Understand plugin development patterns

## Security Considerations

- Sensitive data (passwords, tokens, API keys) is automatically removed from logs
- Long strings are truncated to prevent log bloat
- Log level can be adjusted to control verbosity
- Event selection allows filtering of sensitive operations

## Troubleshooting

### Plugin Not Logging Events

1. Check if the plugin is enabled
2. Verify the event names in `enabledEvents` configuration
3. Ensure the log level allows the messages to appear
4. Check plugin health status

### Too Many Log Messages

1. Reduce the `logLevel` (e.g., from "debug" to "info")
2. Limit `enabledEvents` to only necessary events
3. Set `includeDetails` to false

### Missing Event Data

1. Enable `includeDetails` in configuration
2. Check if the event provides the expected data structure
3. Verify the event is being triggered correctly

## Contributing

This plugin serves as a reference implementation. When creating your own plugins:

1. Follow the same structure and patterns
2. Implement proper error handling
3. Provide comprehensive configuration options
4. Include health check functionality
5. Document your plugin thoroughly

## License

MIT License - see the main project license for details.
