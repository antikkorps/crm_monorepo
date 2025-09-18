# Implementation Plan

- [x] 1. Set up monorepo structure and development environment

  - Create monorepo structure with packages for frontend, backend, shared, and plugins
  - Configure Lerna or Nx for workspace management and shared dependencies
  - Set up TypeScript configuration for all packages
  - Create Docker Compose file for PostgreSQL development database
  - _Requirements: 7.1, 7.4_

- [x] 2. Initialize backend foundation with Koa.js and database

  - [x] 2.1 Set up Koa.js server with TypeScript and basic middleware

    - Create Koa.js application with TypeScript configuration
    - Implement CORS, body parser, and error handling middleware
    - Set up environment configuration and validation
    - _Requirements: 7.1, 7.4_

  - [x] 2.2 Configure PostgreSQL database with Sequelize ORM

    - Set up Sequelize with PostgreSQL connection
    - Create database configuration and connection management
    - Implement migration system for schema management
    - Write initial database seeding utilities
    - _Requirements: 7.3, 11.1_

  - [x] 2.3 Implement user authentication system with JWT

    - Create User model with Sequelize including role-based fields
    - Implement JWT token generation and validation middleware
    - Create authentication endpoints (login, refresh, logout)
    - Write unit tests for authentication service
    - _Requirements: 4.1, 4.2, 4.3, 10.1_

  - [x] 2.4 Implement advanced role-based access control (RBAC)

    - Update User model with new role structure (SUPER_ADMIN, TEAM_ADMIN, USER)
    - Create comprehensive permission matrix for all system features
    - Implement granular permission middleware for API endpoints
    - Add team-based permission validation for resource ownership
    - Write unit tests for permission system and role validation
    - _Requirements: 4.1, 4.2, 10.1, 11.1_

- [x] 3. Create medical institution data models and basic CRUD operations

  - [x] 3.1 Design and implement medical institution Sequelize models

    - Create MedicalInstitution model with medical-specific fields
    - Implement ContactPerson and MedicalProfile associated models
    - Add validation for medical data (bed capacity, surgical rooms, specialties)
    - Write model unit tests with medical data scenarios
    - _Requirements: 1.2, 8.1, 8.3_

  - [x] 3.2 Build medical institution CRUD API endpoints

    - Implement REST endpoints for medical institution management
    - Add search and filtering capabilities for medical criteria
    - Create data validation middleware for medical institution data
    - Write integration tests for all CRUD operations
    - _Requirements: 1.1, 1.3, 1.4, 8.1_

  - [x] 3.3 Implement CSV import functionality for medical institutions

    - Create CSV parsing service with medical data validation
    - Implement duplicate detection and merge logic for institutions
    - Add error handling and validation reporting for imports
    - Write tests for CSV import with medical institution data
    - _Requirements: 1.1, 1.5_

- [x] 4. Develop team management and user profile system

  - [x] 4.1 Create team and user management models

    - Implement Team model with Sequelize associations
    - Add user profile fields and team assignment relationships
    - Create DiceBear avatar generation service integration
    - Write unit tests for team and user models
    - _Requirements: 9.4, 10.1, 10.2_

  - [x] 4.2 Build user profile and team management API

    - Create endpoints for user profile management with DiceBear avatars
    - Implement team creation and member assignment endpoints
    - Add territory assignment functionality for medical institutions
    - Write integration tests for team management operations
    - _Requirements: 10.2, 10.4, 10.5_

- [x] 5. Implement task management system for team collaboration

  - [x] 5.1 Create task model and database schema

    - Design Task model with assignment and medical institution relationships

    - Implement task status, priority, and due date management
    - Add task assignment validation and business logic
    - Write unit tests for task model operations
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 5.2 Build task management API endpoints

    - Create CRUD endpoints for task management
    - Implement task assignment and status update functionality
    - Add filtering and search capabilities for team tasks
    - Write integration tests for task management workflows
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 6. Set up real-time communication with Socket.io

  - [x] 6.1 Configure Socket.io server and connection management

    - Set up Socket.io server with Koa.js integration
    - Implement user authentication for Socket.io connections
    - Create room management for team-based notifications
    - Write tests for Socket.io connection and authentication
    - _Requirements: 3.1, 3.4, 9.3_

  - [x] 6.2 Implement real-time notification system

    - Create notification service for broadcasting team activities
    - Implement task assignment and status change notifications
    - Add medical institution update notifications for team members
    - Write tests for real-time notification delivery
    - _Requirements: 3.1, 3.2, 3.3, 9.3_

- [-] 7. Develop advanced billing system with quotes, invoices, and partial payments

  - [x] 7.1 Create quote management data models and business logic

    - Design Quote and QuoteLine models with Sequelize for granular line management
    - Implement line-by-line discount system (percentage and fixed amount)
    - Add quote status management (draft, sent, accepted, rejected, expired)
    - Create quote validation logic and tax calculation per line
    - Write unit tests for quote models and discount calculations
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 7.2 Build quote management API with line-level operations

    - Create quote CRUD endpoints with medical institution linking
    - Implement quote line management (add, update, delete, reorder)
    - Add quote status workflow (send, accept, reject, expire)
    - Create quote to invoice conversion functionality
    - Write integration tests for quote management workflows
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 7.3 Create invoice and partial payment data models

    - Design Invoice, InvoiceLine, and Payment models with Sequelize
    - Implement partial payment tracking with multiple payment records
    - Add invoice status management (draft, sent, partially paid, paid, overdue)
    - Create payment method tracking and reconciliation logic
    - Write unit tests for invoice and payment model operations
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 7.4 Build invoice management API with payment tracking

    - Create invoice CRUD endpoints with line-level discount management
    - Implement partial payment recording and status updates
    - Add automatic invoice status calculation based on payments
    - Create payment history and reconciliation endpoints
    - Write integration tests for invoice and payment workflows
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 7.5 Implement PDF generation and document management

    - Create PDF generation service for quotes and invoices
    - Implement customizable document templates with line details
    - Add email service integration for document delivery
    - Create document versioning and audit trail
    - Write tests for PDF generation and email delivery
    - _Requirements: 2.3, 2.5_

- [x] 8. Initialize Vue.js frontend with Vuetify components and internationalization

  - [x] 8.1 Set up Vue.js application with Vuetify and routing

    - Create Vue.js 3 application with Composition API setup
    - Configure Vuetify 3 component library with Material Design 3 theming
    - Set up Vue I18n for internationalization with French, English, Spanish, and German support
    - Set up Vue Router for application navigation
    - Implement Pinia store for state management
    - _Requirements: 7.1, 7.4_

  - [x] 8.2 Create authentication and layout components

    - Build login form component with validation
    - Create main application layout with navigation
    - Implement user profile display with DiceBear avatars
    - Add authentication guards for protected routes
    - _Requirements: 4.1, 4.2, 10.1, 10.2_

  - [x] 8.2 Implement internationalization system

    - Create translation files for French, English, Spanish, and German
    - Set up locale detection and user preference storage
    - Implement date, number, and currency formatting per locale
    - Create language switcher component with real-time updates
    - Add fallback logic for missing translations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Build medical institution management frontend

  - [x] 9.1 Create medical institution list and search interface

    - Build medical institution listing component with Vuetify DataTable
    - Implement advanced search and filtering for medical criteria
    - Add segmentation interface for surgical rooms, bed capacity, specialties
    - Create responsive design for medical institution cards
    - _Requirements: 1.3, 8.1, 8.2_

  - [x] 9.2 Develop medical institution detail and form components

    - Create comprehensive medical institution profile view
    - Build medical institution creation and editing forms
    - Implement medical-specific form fields and validation
    - Add contact person management within institution profiles
    - _Requirements: 1.2, 1.4, 8.3_

  - [x] 9.3 Implement CSV import interface for medical institutions
    - Create file upload component for CSV import
    - Build import preview and validation interface
    - Implement duplicate resolution workflow
    - Add import progress tracking and error reporting
    - _Requirements: 1.1, 1.5_

- [x] 10. Develop team collaboration and task management frontend

  - [x] 10.1 Create task management dashboard and components

    - Build task dashboard with filtering and assignment views
    - Create task creation and editing forms
    - Implement task status tracking and priority management
    - Add due date management and overdue task highlighting
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 10.2 Build team management and user profile interface
    - Create team member listing and management interface
    - Implement user profile editing with DiceBear avatar display
    - Add territory assignment interface for medical institutions
    - Build team activity feed and collaboration features
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 11. Implement real-time notifications in frontend

  - [x] 11.1 Set up Socket.io client and notification system

    - Configure Socket.io client with authentication
    - Create notification center component for displaying alerts
    - Implement real-time task assignment notifications
    - Add medical institution update notifications for team members
    - _Requirements: 3.1, 3.4, 9.3_

  - [x] 11.2 Build notification preferences and management
    - Create notification settings interface
    - Implement notification history and management
    - Add offline notification queuing and delivery
    - Build notification sound and visual indicators
    - _Requirements: 3.3, 3.5_

- [-] 12. Develop advanced billing and payment management frontend

  - [x] 12.1 Create quote builder with line-level discount management

    - Build quote creation interface with dynamic line addition/removal
    - Implement line-by-line discount controls (percentage and fixed amount)
    - Create real-time total calculation with tax and discount preview
    - Add quote status workflow interface (send, accept, reject)
    - Build quote to invoice conversion interface
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 12.2 Build invoice management with partial payment tracking

    - Create invoice listing with payment status indicators
    - Build invoice creation and editing forms with line management
    - Implement partial payment recording interface
    - Add payment history display and reconciliation tools
    - Create invoice status tracking and overdue alerts
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 12.3 Implement document generation and delivery interface

    - Build PDF preview and download functionality for quotes and invoices
    - Create customizable document template management
    - Implement email delivery interface with tracking
    - Add document history and version management
    - Build print-friendly views for quotes and invoices
    - _Requirements: 2.3, 2.5_

  - [x] 12.4 Create document template management system

    - [x] 12.4.1 Build document template backend models and services

      - Create DocumentTemplate model with company information and branding fields
      - Implement template CRUD operations with validation
      - Add logo upload service with file processing and storage
      - Create template versioning and default template management
      - Write unit tests for template service functionality
      - _Requirements: 2.1.1, 2.1.2, 2.1.4_

    - [x] 12.4.2 Implement template management frontend interface

      - Create template listing and management dashboard
      - Build template creation and editing forms with company information
      - Implement logo upload component with drag-and-drop functionality
      - Add template preview with real-time updates
      - Create template selection interface for quotes and invoices
      - _Requirements: 2.1.1, 2.1.3, 2.1.4, 2.1.5_

    - [x] 12.4.3 Integrate templates with PDF generation

      - Update PDF generation service to use document templates
      - Implement template-based quote and invoice rendering
      - Add logo positioning and company branding in PDF output
      - Create fallback template system for missing templates
      - Write integration tests for template-based PDF generation
      - _Requirements: 2.1.2, 2.1.5_

  - [x] 12.5 Build billing analytics and financial reporting dashboard
    - Create revenue analytics dashboard with payment tracking charts
    - Implement outstanding invoice and partial payment monitoring
    - Add payment method analysis and reconciliation reports
    - Build billing reports specific to medical institution segments
    - Create cash flow projections based on partial payments
    - _Requirements: 2.5, 8.2_

  - [ ] 12.6 Implement product/service catalog system for quote and invoice lines

    - [ ] 12.6.1 Create catalog backend models and services
      - Create Item/Product model with description, unit price, tax rate, category
      - Implement item CRUD operations with validation and search
      - Add item category management and hierarchical organization
      - Create item versioning and price history tracking
      - Write unit tests for catalog service functionality
      - _Requirements: 2.1, 2.2_

    - [ ] 12.6.2 Build catalog CSV import functionality
      - Create CSV import service for bulk item creation/updates
      - Implement item duplicate detection and merge logic
      - Add validation and error reporting for catalog imports
      - Create import templates and format documentation
      - Write integration tests for CSV import operations
      - _Requirements: 1.5, 2.1_

    - [ ] 12.6.3 Develop catalog management frontend interface
      - Create item catalog dashboard with search and filtering
      - Build item creation and editing forms with category selection
      - Implement item search and selection for quote/invoice lines
      - Add CSV import interface with preview and validation
      - Create item usage analytics and reporting
      - _Requirements: 2.1, 2.3_

    - [ ] 12.6.4 Integrate catalog with quote and invoice line creation
      - Update quote line forms to use catalog item selection
      - Implement auto-completion and item search in line creation
      - Add custom item creation option for non-catalog items
      - Update invoice line creation with same catalog integration
      - Maintain backward compatibility with existing quote/invoice data
      - _Requirements: 2.1, 2.2, 2.4_

- [x] 13. Implement webhook management system

  - [x] 13.1 Create webhook registration and management backend

    - Build webhook model and database schema
    - Implement webhook CRUD operations and validation
    - Create webhook delivery service with retry logic
    - Add webhook authentication and security features
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 13.2 Build webhook management frontend interface
    - Create webhook registration and configuration forms
    - Implement webhook testing and validation interface
    - Build webhook delivery logs and monitoring dashboard
    - Add webhook status tracking and error reporting
    - _Requirements: 5.1, 5.4, 5.5_

- [x] 14. Develop plugin architecture foundation

  - [x] 14.1 Create plugin system backend infrastructure

    - Design plugin registration and lifecycle management system
    - Implement plugin loading and dependency resolution
    - Create plugin API and hook system for integrations
    - Write plugin development documentation and examples
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 14.2 Build plugin management frontend interface
    - Create plugin marketplace and installation interface
    - Implement plugin configuration and settings management
    - Build plugin status monitoring and error handling
    - Add plugin documentation and help system
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 15. Create SAGE accounting integration plugin

  - [ ] 15.1 Develop SAGE plugin backend integration

    - Create SAGE API client and authentication handling
    - Implement customer and invoice data synchronization
    - Add bidirectional data mapping and transformation
    - Write integration tests for SAGE plugin functionality
    - _Requirements: 6.4, 6.5_

  - [ ] 15.2 Build SAGE plugin configuration interface
    - Create SAGE connection setup and authentication forms
    - Implement data mapping configuration interface
    - Add synchronization status and error monitoring
    - Build SAGE integration testing and validation tools
    - _Requirements: 6.3, 6.4_

- [ ] 16. Implement comprehensive testing and quality assurance

  - [ ] 16.1 Write comprehensive backend test suite

    - Create unit tests for all service classes and models
    - Implement integration tests for API endpoints
    - Add database operation and migration tests
    - Write plugin system and webhook delivery tests
    - _Requirements: All backend requirements_

- [x] 16.1.1 **Corriger l'erreur TypeScript dans institutions.ts (ligne 30,7)** ✅

  - Problème : Expected 2 arguments, but got 1 dans le callback multer fileFilter
  - Solution : Ajout du deuxième argument `false` au callback d'erreur
  - Impact : Compilation backend restaurée
  - Priorité : Haute (bloqueur) - RÉSOLU

- [x] 16.1.2 **Refactoriser ExportController pour réduire la duplication de code** ✅

  - Problème : Duplication massive de code dans les méthodes d'export
  - Solution : Création de méthodes utilitaires communes (validateUserAndPermissions, parseExportOptions, handleExportResult, handleExport)
  - Impact : Réduction de ~400 lignes à ~150 lignes pour les exports principaux
  - Bénéfices : Maintenance facilitée, réduction des bugs, cohérence accrue
  - Priorité : Haute (qualité de code) - RÉSOLU

- [ ] 17. Security implementation and compliance features

  - [ ] 17.1 Implement security middleware and data protection

    - Add input validation and sanitization middleware
    - Implement rate limiting and abuse protection
    - Create audit logging for healthcare compliance
    - Add data encryption for sensitive medical information
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 17.2 Build compliance monitoring and reporting

  - Create healthcare compliance tracking interface
  - Implement data access audit trails and reporting
  - Add security incident logging and notification
  - Build data retention and privacy management tools
  - _Requirements: 11.3, 11.4, 11.5_

- [ ] 18. Performance optimization and production readiness

  - [ ] 18.1 Optimize database performance and caching

    - Add database indexing for medical institution queries
    - Implement Redis caching for frequently accessed data
    - Optimize Sequelize queries and eager loading
    - Add database connection pooling and optimization
    - _Requirements: 7.3, 8.1, 8.2_

    **🔄 En attente :** Dépend de la correction du bug TypeScript (institutions.ts:30,7)

- [ ] 18.2 Implement frontend performance optimizations

  - Add code splitting and lazy loading for Vue.js routes
  - Optimize Vuetify component loading and bundle size with tree-shaking
  - Implement virtual scrolling for large medical institution lists
  - Add image optimization for DiceBear avatars and assets
  - _Requirements: 7.1, 8.1, 10.1_

  **🔄 En attente :** Dépend de la correction du bug TypeScript (institutions.ts:30,7)

- [ ] 19. Final integration testing and deployment preparation

  - [ ] 19.1 Conduct comprehensive system integration testing

    - Test complete user workflows from authentication to billing
    - Validate real-time notifications across team collaboration scenarios
    - Test plugin system with SAGE integration end-to-end
    - Verify medical institution management with all features integrated
    - _Requirements: All requirements integration_

    **🔄 En attente :** Dépend de la correction du bug TypeScript (institutions.ts:30,7)

- [ ] 19.2 Prepare production deployment configuration

  - Create production Docker configurations and environment setup
  - Implement database migration and seeding for production
  - Configure monitoring and logging for production environment
  - Create deployment documentation and operational procedures
  - _Requirements: 7.4, 11.2, 11.3_

- [x] 20. Collaboration features integration (Notes, Meetings, Calls, Reminders)

  - [x] 20.1 Backend models, APIs, and security

    - Implement Note, Meeting, Call, Reminder models with validation
    - Add sharing (notes), participants (meetings), ownership rules
    - Enforce RBAC + team-based access middleware for collaboration features
    - Provide consistent error handling across endpoints
    - _Requirements: 1.1–4.6, 5.2, 5.4, 11.1_

  - [x] 20.2 Institution integration: collaboration and timeline endpoints

    - `GET /api/institutions/:id/collaboration`: consolidated stats + recent items
    - `GET /api/institutions/:id/timeline`: chronological interactions with pagination
    - _Requirements: 5.1, 5.3, 1.5, 2.5, 3.2, 4.4_

  - [x] 20.3 Unified search across CRM entities

    - `GET /api/institutions/search/unified` across institutions, tasks, notes, meetings, calls, reminders
    - Add `scope=own|team|all` with RBAC-constrained behavior
    - Apply team filtering for tasks/notes/meetings/calls/reminders
    - Respect note privacy and sharing
    - _Requirements: 5.1, 5.3_

  - [x] 20.4 Notifications for collaboration features

    - Meeting invitations/updates/comments notifications
    - Reminder created/due soon/overdue/completed notifications
    - Team activity notifications
    - _Requirements: 2.2, 2.4, 4.2_

  - [x] 20.5 Backend API documentation for frontend development

    - Add `packages/backend/BACKEND_API.md` documenting endpoints and scope rules
    - Provide request/response examples and parameter descriptions
    - _Requirements: 7.1, 7.4, 11.1_

- [x] 20.6 Frontend integration on Institution detail

  - Add collaboration summary panel (stats + recent items)
  - Add timeline tab with pagination
  - Add unified search tab with `scope=own|team|all` selector
  - Wire API services for collaboration, timeline, and unified search
  - _Requirements: 5.1, 5.3_

- [ ] 25. Enhance main dashboard with dynamic metrics and Digiforma integration insights

  - [ ] 25.1 Implement dynamic CRM metrics (Phase 1 - Independent of Digiforma)

    - Replace hardcoded stats with real-time API data (institutions count, active tasks, team members, reports)
    - Add performance indicators (revenue growth, new clients this month, conversion rates)
    - Implement role-based metric filtering (SUPER_ADMIN sees all, USER sees team data)
    - Create metric caching for better performance
    - Connect to existing CRM data (institutions, contacts, tasks, billing) without Digiforma dependency
    - _Requirements: 7.1, 8.1, 10.1_

  - [ ] 25.2 Add Digiforma synchronization status widget (Phase 2 - After Digiforma integration)

    - Display last sync timestamp and status for each data type (clients, quotes, invoices)
    - Show sync statistics (new records, updated records, errors)
    - Add quick sync trigger button with progress indicator
    - Implement sync health monitoring (success rate, average sync time)
    - _Requirements: 6.4, 6.5_

  - [ ] 25.3 Create recent activities timeline

    - Build unified activity feed (new clients, created quotes/invoices, task assignments, Digiforma syncs)
    - Add activity filtering by type, date range, and user/team
    - Implement real-time updates via WebSocket for new activities
    - Create activity detail modals with quick actions
    - Start with existing CRM activities, add Digiforma events later
    - _Requirements: 3.1, 5.1, 9.3_

  - [ ] 25.4 Implement smart alerts and notifications panel

    - Add critical alerts (overdue tasks, unpaid invoices, sync failures)
    - Create priority-based alert system with dismissible notifications
    - Implement alert history and management
    - Add alert configuration preferences per user
    - Include alerts for Digiforma sync issues when integration is ready
    - _Requirements: 3.2, 3.3, 11.1_

  - [ ] 25.5 Build personalized quick actions based on user behavior

    - Track user actions and suggest relevant shortcuts
    - Add frequently used features to quick actions dynamically
    - Implement contextual actions based on current metrics (e.g., "Create invoice" if revenue is low)
    - Create role-specific action recommendations
    - _Requirements: 10.1, 10.2_

  - [ ] 25.6 Add performance charts and KPIs overview

    - Create mini-charts for key metrics (revenue trend, client growth, task completion rate)
    - Implement chart drill-down to detailed analytics views
    - Add period comparison (this month vs last month)
    - Create visual KPI indicators with color coding
    - Use existing billing analytics data as foundation
    - _Requirements: 2.5, 8.2_

- [ ] 21. Implement comprehensive data export and segmentation system

  - [x] 21.1 Create data export backend functionality ✅

    - Implement CSV/Excel export service for medical institutions ✅
    - Create contact export functionality with filtering options ✅
    - Add quote and invoice export capabilities with date ranges ✅
    - Implement task export with team and status filtering ✅
    - Add permission-based export restrictions (team/own data only) ✅
    - Create export job queue for large datasets ✅ (foundation with TODOs for Bull implementation)
    - Write unit tests for export services ✅
    - _Requirements: 1.1, 1.5, 2.1, 9.1, 10.1_

    **✅ Améliorations supplémentaires implémentées :**

    - Support XLSX avec ExcelJS (formatage professionnel, auto-fit des colonnes)
    - Pagination avec limit/offset pour les gros exports
    - Système de logging avancé avec Winston (JSON, rotation des fichiers)
    - Architecture de queue pour exports asynchrones (endpoints API + estimation de taille)

  - [x] 21.2 Build contact and institution segmentation backend

    - Create segmentation model and database schema
    - Implement dynamic filtering system for institutions (specialties, bed capacity, regions)
    - Add contact segmentation by role, activity, engagement level
    - Create saved segment functionality with sharing capabilities
    - Implement segment-based bulk operations (tasks, communications)
    - Add segment analytics and reporting endpoints
    - Write unit tests for segmentation logic
    - _Requirements: 1.2, 1.3, 8.1, 10.2, 10.4_

  - [x] 21.3 Develop export management frontend interface

    - Create export center dashboard with history and status tracking
    - Build export configuration forms with field selection
    - Implement export preview with sample data display
    - Add export scheduling and automation interface
    - Create export format selection (CSV, Excel, PDF reports)
    - Build export download and email delivery interface
    - Add export permissions and team access controls
    - _Requirements: 1.5, 2.3, 10.1, 11.1_

  - [x] 21.4 Build advanced segmentation and filtering frontend ✅

    - ✅ Create segment builder with drag-and-drop criteria interface (SegmentBuilder.vue)
    - ✅ Implement real-time segment preview with count updates (SegmentPreview.vue)
    - ✅ Build saved segment management and sharing interface (SavedSegmentsManager.vue, SegmentSharingDialog.vue)
    - ✅ Add segment-based bulk action tools (BulkActionsDialog.vue with assign tasks, send communications)
    - ✅ Create segment analytics dashboard with engagement metrics (SegmentAnalyticsDashboard.vue)
    - ✅ Implement segment export integration with custom fields (SegmentExportDialog.vue)
    - ✅ Build segment comparison and overlap analysis tools (SegmentComparisonTool.vue)
    - _Requirements: 1.3, 8.1, 8.2, 10.2, 10.4_

- [x] 22. Implement Contact Management CRUD API ✅ **COMPLÉTÉ**

  - [x] 22.1 Create ContactController with comprehensive CRUD operations ✅

    - ✅ Implement ContactController with all CRUD operations (GET, POST, PUT, DELETE)
    - ✅ Add contact listing with pagination, filtering by institution, role, active status
    - ✅ Create contact detail endpoint with institution information
    - ✅ Implement contact search functionality across name, email, phone, title
    - ✅ Add validation for contact data (email uniqueness, phone format, required fields)
    - ✅ **Enforce team-based permissions for contact access (RBAC) - AJOUTÉ**
    - ✅ Add primary contact management (ensure only one primary per institution)
    - ✅ Write comprehensive error handling for all contact operations
    - _Requirements: 1.2, 4.1, 4.2, 10.1, 11.1_

  - [x] 22.2 Create contact routes and integrate with existing endpoints ✅

    - ✅ Add contact routes to main router (/api/contacts)
    - ✅ **Frontend ContactsView avec interface complète de gestion**
    - ✅ **ContactForm pour création/édition avec validation**
    - ✅ **Service API contactsApi intégré**
    - ✅ **Navigation et routing configurés**
    - ✅ Contact creation within institution creation workflow (via InstitutionDetailView)
    - ✅ Bulk contact operations available via export system
    - ✅ Contact activity tracking via audit logging système
    - ✅ Contact-institution relationship integrity enforced
    - _Requirements: 1.1, 1.3, 1.4, 8.3, 10.4_

  **ÉTAT:** Complètement implémenté backend + frontend avec permissions RBAC team-based.
  **FONCTIONNALITÉS:** CRUD complet, pagination, recherche, filtres, validation, permissions.
  **PRIORITÉ:** ✅ TERMINÉ - Système de gestion des contacts entièrement fonctionnel.

- [ ] 23. Frontend Harmonization and Polish

  - [ ] 23.1 Refine and complete Quotes/Invoices UI

    - Ensure consistent design between Quotes and Invoices views.
    - Improve forms for creating/editing lines.
    - Add missing UI elements for actions (e.g., email tracking, history).

  - [ ] 23.2 Refine and complete Notifications UI

    - Improve the notification center component.
    - Ensure all user-facing notifications are clear, translatable, and actionable.
    - Review real-time updates for notifications.

  - [ ] 23.3 Implement enhanced loading states

    - Replace spinners with `v-skeleton-loader` where appropriate for a better perceived performance.

  - [ ] 23.4 Conduct full accessibility (a11y) audit
    - Check color contrasts, keyboard navigation, and ARIA attributes across the application.

- [ ] 24. Implement Digiforma read-only data synchronization via GraphQL API (Customer Management Only)

  - [ ] 24.1 Set up Digiforma GraphQL API read-only integration

    - Configure GraphQL client with authentication (Bearer token from Digiforma)
    - Set up API connection management and error handling for read operations
    - Implement rate limiting and retry logic for API calls
    - Create data mapping for Digiforma entities (companies, trainees, quotes, invoices) to CRM contacts/institutions/quotes/invoices
    - _Requirements: 6.4, 6.5_

  - [ ] 24.2 Implement customer and billing data synchronization logic (read-only)

    - Build GraphQL queries for retrieving companies, trainees, quotes, and invoices data
    - Add pagination support for large datasets
    - Implement duplicate detection and merge logic for existing CRM customers/billing data
    - Create incremental sync with status tracking and error handling
    - Add data transformation and validation rules for read-only operations
    - Write integration tests for data synchronization (read-only)
    - _Requirements: 6.4, 6.5_

  - [ ] 24.3 Build Digiforma sync management interface (read-only focus)

    - Create Digiforma API connection configuration dashboard
    - Implement sync status monitoring and error reporting for read operations
    - Add manual sync trigger and history viewing for imported data
    - Build data mapping configuration interface for CRM integration
    - Create sync testing and validation tools (read-only)
    - _Requirements: 6.3, 6.4_

  - [ ] 24.4 Implement Digiforma quotes/invoices visual tracking system

    - [ ] 24.4.1 Create Digiforma document tracking models
      - Create DigiformaDocument model to track external quotes/invoices
      - Store Digiforma document ID, type (quote/invoice), status, amount, date
      - Link to CRM institutions/contacts for relationship tracking
      - Add metadata fields for Qualiopi compliance tracking
      - Implement document synchronization status and last sync date
      - _Requirements: 6.4, 6.5, 2.1_

    - [ ] 24.4.2 Implement Digiforma document sync and tracking logic
      - Build GraphQL queries to retrieve Digiforma quotes and invoices
      - Create sync service to import document metadata (not full content)
      - Implement document status tracking (draft, sent, paid, cancelled)
      - Add relationship mapping between Digiforma docs and CRM entities
      - Create audit trail for document lifecycle changes
      - Write integration tests for document tracking
      - _Requirements: 6.4, 6.5_

    - [ ] 24.4.3 Build visual tracking interface in CRM
      - Add Digiforma documents section to institution detail view
      - Create visual indicators for document status (badges, colors)
      - Implement document timeline showing Digiforma activity
      - Add filtering by document type, status, date range
      - Create quick stats dashboard for Digiforma vs CRM billing comparison
      - Build document reconciliation tools for dual-tracking visibility
      - _Requirements: 6.3, 2.3, 5.1_

    - [ ] 24.4.4 Implement dual billing system dashboard
      - Create unified billing overview showing both CRM and Digiforma documents
      - Add revenue comparison between CRM billing and Digiforma tracking
      - Implement compliance status indicators for Qualiopi requirements
      - Create alerts for missing or inconsistent document tracking
      - Build reporting tools for dual-source billing analysis
      - Add export functionality for compliance and audit purposes
      - _Requirements: 2.5, 6.3, 6.4_

## Issues Récurrents à Résoudre

### ⚠️ JSONB Compatibility Issues - Problème Récurrent Critique

**Problème:** Des erreurs récurrentes liées aux champs JSONB (particulièrement le champ `address`) dans les requêtes Sequelize avec includes.

**Exemples d'erreurs observées:**

- Erreurs lors d'includes de MedicalInstitution avec champs d'adresse JSONB
- Incompatibilité entre les requêtes Sequelize et la structure JSONB PostgreSQL
- Échecs de sérialisation/désérialisation des données d'adresse

**Impact:**

- Requêtes échouent fréquemment lors d'opérations complexes
- Nécessité de contournements temporaires (suppression d'includes)
- Dégradation de l'expérience utilisateur

**Actions à entreprendre:**

1. **Audit complet des champs JSONB** - Identifier tous les champs JSONB problématiques
2. **Migration vers structure relationnelle** - Créer des tables séparées pour les adresses et autres structures complexes
3. **Alternative: Normalisation JSONB** - Standardiser la structure et validation JSONB si conservation souhaitée
4. **Tests de régression** - Créer des tests spécifiques pour les opérations JSONB avec includes
5. **Documentation des bonnes pratiques** - Établir des guidelines pour éviter ces problèmes futurs

**Priorité:** 🔴 HAUTE - À traiter en priorité pour stabiliser les opérations de base de données

**Historique des occurrences:**

- Analytics dashboard: Erreurs lors d'includes avec MedicalInstitution
- Quotes system: Problèmes similaires nécessitant simplification temporaire
- Multiple autres endpoints potentiellement affectés
