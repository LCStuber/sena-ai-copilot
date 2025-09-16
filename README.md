# SENA - Sales Enablement & Next-best Actions

SENA is a comprehensive sales enablement platform built with React/TypeScript frontend and Express.js backend. The application provides sales development representatives (SDRs) with AI-powered tools for company research, call transcript analysis using various sales frameworks, and automated next-best-action recommendations.

## 🚀 Features

### Core Capabilities
- **AI-Powered Company Research**: Generate comprehensive company insights, pressures, objectives, and buying signals using OpenAI GPT-5-mini
- **Multi-Framework Call Analysis**: Support for MEDDPICC, BANT, VEF, Qual-LTS/LSS, and LicenseDemandPlan frameworks
- **Notes Studio**: Interactive transcript analysis with structured framework notes generation
- **Next Best Actions**: AI-generated prioritized recommendations based on call analysis
- **Historical Notes**: Centralized repository for all generated sales materials and artifacts
- **Active Accounts Management**: Track and manage sales pipeline with real-time health metrics
- **AI Chat Assistant**: Account-aware conversational AI for sales guidance and coaching
- **Dashboard Analytics**: Pipeline metrics, activity summaries, and performance insights

### Sales Framework Support
- **VEF (Value Engagement Framework)**: Customer pressures, objectives, challenges, LinkedIn solutions, experience, and unique value
- **BANT**: Budget, Authority, Need, Timeline qualification
- **MEDDPICC**: Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Pain, Champion, Competition
- **Qual-LTS/LSS**: Specialized qualification for LinkedIn Talent Solutions and Sales Solutions
- **LicenseDemandPlan**: Comprehensive license distribution and demand planning

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast builds and hot module replacement
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **Tailwind CSS** with shadcn/ui component library
- **Custom CSS variables** for SENA brand theming

### Backend
- **Express.js** server with TypeScript
- **Session-based authentication** using Passport.js
- **RESTful API design** with organized route handlers
- **Modular service layer** separating business logic
- **Error handling middleware** with structured responses

### Database & Storage
- **PostgreSQL** (Neon serverless) as primary database
- **Drizzle ORM** for type-safe database operations
- **Session storage** in PostgreSQL for authentication
- **Automated schema management** with Drizzle migrations

### AI Integration
- **OpenAI GPT-5-mini** for content generation and analysis
- **Specialized prompts** for different sales frameworks
- **Company research service** with market insights
- **Transcript analysis** with structured output
- **Next-best-action generation** with prioritization

## 🛠️ Technology Stack

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Wouter, TanStack Query
- **Backend**: Express.js, TypeScript, Passport.js
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **AI**: OpenAI GPT-5-mini API
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI primitives

### Development Tools
- **Package Manager**: npm
- **Build Tool**: Vite with TypeScript compilation
- **Database Migrations**: Drizzle Kit
- **Session Management**: connect-pg-simple
- **Authentication**: Passport.js with local strategy

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon account)
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sena
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Required environment variables
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret
```

4. **Initialize database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📖 Usage

### Company Research
1. Navigate to **Research** tab
2. Enter company name and select business line (LTS/LSS)
3. Click "Generate Research" to create AI-powered company insights
4. Review generated pressures, objectives, and buying signals

### Transcript Analysis
1. Go to **Notes Studio**
2. Select an existing account or create a new one
3. Paste meeting transcript content
4. Choose applicable frameworks (MEDDPICC, BANT, VEF, etc.)
5. Click "Process Transcript" to generate structured notes
6. Review framework-specific insights and next best actions

### Historical Notes Management
1. Visit **Historical Notes** section
2. Browse all generated artifacts by account
3. Filter by framework type or date range
4. Export or share notes with team members

### Active Accounts Pipeline
1. Access **Active Accounts** dashboard
2. View pipeline health metrics and account status
3. Track engagement levels and opportunity progression
4. Monitor next best actions across all accounts

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Accounts Management
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account

### Company Research
- `POST /api/company-research` - Generate company research
- `GET /api/company-research/:accountId` - Get research by account

### Transcript Processing
- `POST /api/transcripts/process` - Process transcript with frameworks
- `GET /api/transcripts/:accountId` - Get transcripts by account

### Framework Notes
- `GET /api/framework-notes/:accountId` - Get framework notes
- `PUT /api/framework-notes/:id` - Update framework notes

### Next Best Actions
- `GET /api/nbas` - List all next best actions
- `POST /api/nbas` - Create next best action
- `PUT /api/nbas/:id` - Update NBA status

### AI Chat
- `POST /api/agent/chat` - Chat with AI assistant
- `POST /api/agent/ask` - Ask account-specific questions

## 🏃‍♂️ Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility libraries
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API route definitions
│   └── storage.ts         # Database operations
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
└── package.json
```

### Database Migrations
```bash
# Push schema changes to database
npm run db:push

# Force push (data loss warning)
npm run db:push --force
```

### Environment Configuration
The application supports both development and production environments with automatic configuration:

- **Development**: Uses local authentication and relaxed CORS
- **Production**: Enforces secure authentication and strict CORS policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Implement proper error handling
- Write comprehensive tests
- Maintain consistent code formatting

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Review the codebase documentation in `replit.md`
- Check the API endpoint documentation above
- Consult the framework-specific prompts in `server/services/openai.ts`

---

**Built with ❤️ for sales teams everywhere**