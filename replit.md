# OXYP1 Call Center Application

## Overview

This is a full-stack call center application called OXYP1, built with React, Express, and PostgreSQL. The application allows users to make phone calls through the Apidaze API and manage call history. It features a modern UI built with shadcn/ui components and TailwindCSS, with real-time call tracking and statistics, comprehensive admin management, and a complete credit system.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 23, 2025)

### Domain Configuration and Branding Updates ✓
- **Custom Domain Setup**: Updated application to use custom domain `https://oxyp1.xyz`
- **XML Settings Update**: Modified connect action URL from `https://jellyfish-app-kctk6.ondigitalocean.app/connect` to `https://oxyp1.xyz/connect`
- **Webhook Configuration**: Ensured all webhook endpoints are accessible via the new domain
- **Static XML Endpoint**: `/connect` endpoint now accessible at `https://oxyp1.xyz/connect` for SIP dial actions
- **Favicon Implementation**: Created comprehensive favicon set from OXYP1 logo including multiple sizes and formats
- **Web App Manifest**: Added progressive web app support with site.webmanifest for mobile installation

### Database Relations and Integrity Audit ✓
- **Foreign Key Constraints**: Added 9 comprehensive foreign key constraints across all tables
- **Performance Indexes**: Created 11 indexes on frequently queried columns (user_id, phone_number, timestamp, etc.)
- **Drizzle Relations**: Implemented complete ORM relations for type-safe database queries
- **Data Integrity**: Verified zero orphaned records across entire database
- **LSP Diagnostics**: Fixed all TypeScript errors in storage layer
- **Webhook Enhancement**: Database columns properly synchronized with schema definitions

### User-Specific Data Access and Copy Functionality ✓
- **User-Specific Webhook Responses**: Modified webhook data to be user-specific instead of global
  - Users can only see their own pressed 1 data, not other users' data
  - Added `getUserWebhookResponses()` method for user-scoped queries
  - Updated `/api/webhook-responses` endpoint to require authentication and filter by user ID
- **Copy Functionality**: Added copy buttons for pressed 1 data in both user and admin interfaces
  - Copy format: "contactdetails|email|phonenumber" when email is available, or "contactdetails|phonenumber" when no email
  - Examples: "John Doe|john@example.com|254748977033" or "Jane Smith|254748977034"
  - Only appears for responses where button "1" was pressed
  - Includes toast notifications for success/error feedback
- **Enhanced Navigation**: Fixed all back button routing consistency across the application
  - Webhook dashboard back button now correctly routes to root (/) instead of non-existent /call-center
  - Added back button to admin panel for easy return to main application

### Complete Data Isolation Implementation ✓
- **User-Specific Call History**: Users can only see their own call records via authenticated `/api/calls` endpoint
- **User-Specific Bulk Campaigns**: Users can only see and manage their own campaigns via authenticated `/api/bulk-calls` endpoint
- **Campaign Ownership Verification**: Added ownership checks before allowing campaign start/stop operations
- **Admin Data Access**: Separate admin endpoints (`/api/admin/calls`, `/api/admin/bulk-calls`, `/api/admin/webhook-responses`) for full system visibility
- **Static Connect XML**: Added `/connect` endpoint serving static XML for SIP dial actions with predefined SIP account configuration

### Concurrent Bulk Calling Enhancement ✓
- **True Concurrent Processing**: Replaced sequential call processing with batch-based concurrent execution
- **Batch Processing**: Processes up to 100 concurrent calls per batch for optimal performance
- **Improved Speed**: Eliminated 1-second delays between individual calls for faster campaign execution
- **API Rate Management**: Maintains 2-second delays between batches to respect API limits
- **Progress Tracking**: Enhanced batch-by-batch progress reporting for better monitoring

### Campaign Cancellation Feature ✓
- **Real-time Cancellation**: Added ability to cancel in-progress bulk call campaigns
- **Backend API**: Implemented `/api/bulk-calls/:id/cancel` endpoint with ownership verification
- **Campaign Status Monitoring**: Bulk calling function checks for cancellation status between batches
- **Frontend Controls**: Added red "Cancel" button for in-progress campaigns in the UI
- **Immediate Response**: Campaign stops processing new batches immediately when cancelled
- **Status Management**: Properly clears active campaign status and unlocks XML updates upon cancellation

### Enhanced Call Failure Detection ✓
- **Proper API Response Analysis**: Updated both single and bulk call endpoints to correctly detect failures
- **Status Code vs Response Content**: Apidaze returns 202 for both success and failure - now checking response body content
- **Success Indicators**: Validating presence of 'ok' field or call_uuid/id in successful responses
- **Failure Detection**: Detecting 'failure' field in response body to properly record failed calls
- **Accurate Statistics**: Failed calls now properly recorded and counted in campaign statistics

### Real-Time Webhook Notifications ✓
- **WebSocket Integration**: Added WebSocket server for real-time communication between server and clients
- **Popup Notifications**: Created animated notification popups that appear when someone presses 1 on campaigns
- **Auto-Fade System**: Notifications automatically fade after 5 seconds and close after 8 seconds
- **Connection Status**: Added live connection indicator in the header showing WebSocket status
- **Multi-Campaign Support**: When a phone number exists in multiple campaigns, separate notifications are sent to each campaign owner
- **User-Specific Notifications**: Only campaign owners receive notifications for their own campaigns
- **Real-Time Updates**: Instant notifications appear without page refresh when webhook responses are received

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui component library based on Radix UI primitives
- **Styling**: TailwindCSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **API Design**: RESTful API endpoints
- **Session Management**: Express sessions with PostgreSQL storage
- **External API**: Apidaze integration for phone call functionality

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM featuring complete relational integrity
- **Database Schema**: 
  - Users table for authentication and credit management
  - Calls table for call history and status tracking
  - Bulk Calls table for campaign management with user ownership
  - Contacts table linking to bulk call campaigns
  - Webhook Responses table for tracking caller interactions with full relational data
  - System Logs table for admin monitoring and audit trails
  - Campaign Status table for system-wide campaign control
  - XML Settings table for dynamic call script configuration
- **Relational Integrity**: 9 foreign key constraints ensuring proper data relationships
- **Performance Optimization**: 11 indexes on frequently queried columns
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **Data Relations**: Complete Drizzle ORM relations defined for type-safe queries

## Key Components

### Database Schema
- **Users**: ID, username, password (for future authentication)
- **Calls**: ID, call_from, call_to, region, status, duration, call_id, error_message, timestamp
- **Contacts**: ID, name, email, phone, original_phone, created_at
- **Bulk Calls**: ID, name, total_contacts, completed_calls, failed_calls, status, region, call_from, created_at, updated_at
- **Webhook Responses**: ID, phone_number, button_pressed, bulk_call_id, contact_id, timestamp

### API Endpoints
- `POST /api/calls` - Initiate a new phone call
- `GET /api/calls` - Retrieve call history
- `GET /api/calls/stats` - Get call statistics
- `GET /api/mediafiles` - Fetch available audio files from Apidaze
- `GET /api/xml-settings` - Get current XML script configuration
- `PUT /api/xml-settings` - Update XML script settings
- `POST /api/bulk-calls` - Create bulk call campaign with contact parsing
- `GET /api/bulk-calls` - Retrieve bulk call campaigns
- `POST /api/bulk-calls/:id/start` - Start a bulk call campaign
- `GET /api/contacts` - Retrieve parsed contacts
- `GET /webhook` - Webhook endpoint for tracking button presses during calls
- `GET /api/webhook-responses` - Retrieve recorded button press responses

### Frontend Pages
- **Call Center**: Main interface for making calls and viewing history with navigation to XML Settings and Bulk Calls
- **XML Settings**: Dynamic XML script configuration with audio file selection from Apidaze
- **Bulk Calls**: Interface for creating and managing bulk call campaigns with contact parsing and phone number formatting
- **Not Found**: 404 error page

### External Integrations
- **Apidaze API**: Third-party service for making phone calls with XML script integration
- **XML Call Script**: Hosted at `/call-script.xml` for Apidaze call flow automation with static webhook integration
- **Webhook System**: Uses static URL `https://jellyfish-app-kctk6.ondigitalocean.app/connect` for button press tracking instead of dynamic ANI variables
- **Webhook Dashboard**: Real-time analytics dashboard at `/webhook-dashboard` showing caller response statistics
- **Neon Database**: Serverless PostgreSQL hosting

## Data Flow

### Single Call Flow
1. **Call Initiation**: User fills out call form → Frontend validation → API request to backend
2. **Backend Processing**: Validate request → Call Apidaze API → Store call record in database
3. **Response Handling**: Return API response → Update frontend state → Show success/error toast
4. **History Display**: Fetch call history from database → Display in table format with status indicators

### Bulk Call Flow
1. **Campaign Creation**: User pastes contacts → Parse and format phone numbers → Create bulk call campaign
2. **Contact Processing**: Link contacts to campaign → Store formatted and original phone numbers
3. **Campaign Execution**: Asynchronous call processing → 1-second delays between calls → Real-time status tracking
4. **Progress Updates**: Track completed/failed calls → Update campaign status → Store individual call records

## External Dependencies

### Production Dependencies
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-zod`
- **UI Framework**: React ecosystem with Radix UI primitives
- **Validation**: Zod for schema validation
- **HTTP Client**: Native fetch API
- **Session Management**: `connect-pg-simple` for PostgreSQL sessions

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full TypeScript support across frontend and backend
- **Replit Integration**: Vite plugins for Replit development environment

## Deployment Strategy

### Development
- **Local Development**: Uses Vite dev server with Express backend
- **Hot Reloading**: Vite HMR for frontend, tsx for backend auto-restart
- **Environment**: NODE_ENV=development with development-specific middleware

### Production
- **Build Process**: 
  1. Frontend: Vite builds React app to `dist/public`
  2. Backend: esbuild bundles Express server to `dist/index.js`
- **Static Serving**: Express serves built frontend files in production
- **Environment Variables**: 
  - `DATABASE_URL` for PostgreSQL connection
  - `APIDAZE_API_KEY` and `APIDAZE_API_SECRET` for phone service

### Database Management
- **Migrations**: Drizzle Kit for database schema management
- **Schema Location**: Shared schema in `shared/schema.ts`
- **Push Command**: `npm run db:push` for schema updates

### Replit-Specific Features
- **Runtime Error Overlay**: Development error handling
- **Cartographer Plugin**: Replit-specific debugging tools
- **Development Banner**: Automatic banner injection for external access