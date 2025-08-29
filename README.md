# Medical CRM

A modern Customer Relationship Management system designed specifically for managing business relationships with medical institutions such as hospitals and clinics.

## Architecture

This project is organized as a monorepo with the following packages:

- **Frontend** (`packages/frontend`): Vue.js 3 application with PrimeVue components
- **Backend** (`packages/backend`): Koa.js API server with TypeScript
- **Shared** (`packages/shared`): Shared types, constants, and utilities
- **Plugins** (`packages/plugins`): Extensible plugin system for integrations

## Technology Stack

- **Frontend**: Vue.js 3, PrimeVue, Pinia, TypeScript
- **Backend**: Koa.js, Socket.io, Sequelize, PostgreSQL
- **Development**: Lerna, TypeScript, Vite, Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   npm run bootstrap
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development database:

   ```bash
   npm run docker:up
   ```

5. Run database migrations:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. Start the development servers:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

## Development

The application runs on:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

## Features

- Medical institution contact management
- Team collaboration and task management
- Real-time notifications via Socket.io
- Billing and invoice management
- Webhook system for integrations
- Plugin architecture for extensibility
- Medical-specific segmentation and analytics

## License

Private - All rights reserved
