# Replit.md

## Overview

This is a custom onboarding guide tool designed to help developers create interactive, step-by-step integration guides. The platform features a visual drag-and-drop flow editor for building hierarchical process flows, progress tracking capabilities, and AI-powered Q&A support. Built with modern web technologies, it serves as a comprehensive solution for creating and managing developer onboarding experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and developer experience
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible components
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js for RESTful API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage for user state persistence
- **API Design**: RESTful endpoints with consistent error handling and request/response patterns

### Authentication System
- **Provider**: Replit Auth integration using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Authorization**: Middleware-based route protection with user context injection
- **User Management**: Automatic user creation and profile synchronization

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle migrations with version control
- **Core Entities**:
  - Users with profile information
  - Guides with metadata and persona configurations
  - Flow boxes for hierarchical step organization
  - Steps with rich content and persona-specific variations
  - Progress tracking for user completion state
  - Q&A conversations for AI support
  - Knowledge base for AI context

### Visual Editor System
- **Drag-and-Drop**: Custom sortable components for flow arrangement
- **Hierarchical Structure**: Flow boxes containing multiple steps with dual-level completion tracking
- **Content Management**: Rich text editing with Markdown support and file attachments
- **Persona Variations**: Single guide with multiple user-type specific content views

### Progress Tracking
- **Granular Tracking**: Individual step and flow box completion states
- **Session Persistence**: Database-stored progress with user authentication
- **Real-time Updates**: Optimistic UI updates with server synchronization
- **Visual Indicators**: Progress bars and completion badges throughout the interface

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL for primary data storage
- **Replit Authentication**: OAuth/OIDC provider for user management
- **Anthropic AI**: Claude API integration for Q&A chat functionality

### UI and Interaction Libraries
- **Radix UI**: Accessibility-focused primitive components
- **Framer Motion**: Animation library for enhanced user interactions
- **React Hook Form**: Form state management with validation
- **React Markdown**: Markdown rendering for content display

### Development and Build Tools
- **Vite**: Build tool with HMR and optimized bundling
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Static type checking across the entire stack
- **Drizzle Kit**: Database migration and schema management tools

### Additional Integrations
- **File Upload Support**: Multer for handling content attachments
- **WebSocket Support**: For potential real-time features
- **Session Storage**: PostgreSQL-based session persistence
- **Environment Configuration**: Dotenv for configuration management