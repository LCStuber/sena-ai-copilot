# Overview

SENA (Sales Enablement & Next-best Actions) is a comprehensive sales enablement platform built with React/TypeScript frontend and Express.js backend. The application provides sales development representatives (SDRs) with AI-powered tools for company research, call transcript analysis using various sales frameworks, and automated next-best-action recommendations. It supports both LinkedIn Talent Solutions (LTS) and LinkedIn Sales Solutions (LSS) business lines with specialized qualification methodologies.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for type safety and modern development patterns
- **Vite** as the build tool and development server for fast builds and hot module replacement
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query** for server state management, caching, and data synchronization
- **Tailwind CSS** with shadcn/ui component library for consistent design system
- **Custom CSS variables** for brand theming with SENA-specific color palette

## Backend Architecture
- **Express.js** server with TypeScript for API endpoints and middleware
- **Session-based authentication** using Passport.js with local strategy and PostgreSQL session store
- **RESTful API design** with organized route handlers and middleware for authentication
- **Modular service layer** separating business logic from route handlers
- **Error handling middleware** with structured error responses

## Data Storage
- **PostgreSQL** as the primary database using Neon serverless architecture
- **Drizzle ORM** for type-safe database operations and schema management
- **Database schema** includes users, accounts, company research, transcripts, framework notes, next-best actions, and artifacts
- **Session storage** in PostgreSQL using connect-pg-simple for authentication persistence

## Authentication & Authorization
- **Passport.js** with local strategy for username/password authentication
- **Scrypt hashing** for secure password storage with salt
- **Session-based authentication** with secure cookies and CSRF protection
- **Protected route middleware** ensuring authenticated access to API endpoints
- **Mock authentication** in development for streamlined testing

## AI Integration
- **OpenAI GPT-5** integration for company research and content generation
- **Specialized prompts** for different sales frameworks (MEDDPICC, BANT, VEF, etc.)
- **Company research service** generating insights, pressures, objectives, and buying signals
- **Transcript analysis** service converting call recordings into structured sales framework notes
- **Next-best-action generation** providing prioritized recommendations based on call analysis

## External Dependencies
- **Neon Database** for serverless PostgreSQL hosting with WebSocket support
- **OpenAI API** for AI-powered content generation and analysis
- **Radix UI primitives** for accessible component foundations
- **Various utility libraries** including date-fns, clsx, and nanoid for common operations

## Key Features
- **Multi-framework support** for different sales methodologies with specialized note templates
- **Time zone management** for global sales teams with automatic detection and conversion
- **Artifact management** for storing and organizing generated sales materials
- **Dashboard analytics** showing pipeline metrics and activity summaries
- **Real-time updates** using TanStack Query for synchronized data across sessions