# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: PromptBuilder - Prompt Operations Platform for SMBs  
**Stack**: TypeScript, Next.js 14, React 18, Supabase, n8n, React Flow  

## Project Overview

### Purpose & Architecture
PromptBuilder is a comprehensive Prompt Operations Platform designed for small to medium-sized businesses. It provides visual-first prompt management, multi-LLM integration, and enterprise-grade analytics. The platform uses a modern microservices architecture with Next.js for the frontend, Supabase for backend services and real-time collaboration, and n8n for AI workflow orchestration.

### Key Dependencies
- **Next.js 14**: Server-side rendering and optimal performance
- **React Flow 12.7+**: Drag-and-drop visual workflow designer
- **Supabase**: PostgreSQL database, authentication, and real-time features
- **n8n**: AI workflow automation and multi-LLM orchestration
- **Yjs**: Conflict-free real-time collaboration
- **tRPC**: Type-safe client-server communication
- **Tailwind CSS**: Consistent, responsive design system

### Directory Structure (Planned)
```
prompt-builder/
├── src/
│   ├── app/                    # Next.js 14 app directory
│   ├── components/             # React components
│   │   ├── workflow/          # React Flow workflow components
│   │   ├── analytics/         # Dashboard and metrics components
│   │   └── marketplace/       # Prompt marketplace components
│   ├── server/                # Backend logic
│   │   ├── api/              # tRPC routers
│   │   ├── db/               # Database schemas and migrations
│   │   └── services/         # Business logic and integrations
│   ├── lib/                   # Shared utilities
│   └── types/                 # TypeScript type definitions
├── n8n/                       # n8n workflow configurations
├── supabase/                  # Supabase migrations and policies
├── tests/                     # Test files
├── public/                    # Static assets
└── .github/workflows/         # CI/CD workflows
```

## Development Commands

```bash
# Core Development
build: npm run build
test: npm test
test:watch: npm run test:watch
test:coverage: npm run test:coverage
lint: npm run lint
lint:fix: npm run lint:fix
format: npm run format
typecheck: npm run typecheck

# Development Server
dev: npm run dev
dev:debug: npm run dev:debug

# Database
db:migrate: npm run supabase:migrate
db:reset: npm run supabase:reset
db:seed: npm run supabase:seed
db:types: npm run supabase:types

# n8n Workflows
n8n:dev: npm run n8n:dev
n8n:deploy: npm run n8n:deploy
```

## Code Standards

### Component Guidelines
- Use functional components with TypeScript
- Implement proper error boundaries
- Use React.memo for expensive renders
- Keep components under 200 lines
- Separate business logic into custom hooks

### State Management
- Use Zustand for client-side global state
- Use React Query for server state with proper caching
- Implement optimistic updates for better UX
- Use Yjs for collaborative features

### Database Patterns
- Always use Row Level Security (RLS) policies
- Create proper indexes for query performance
- Use database functions for complex operations
- Implement soft deletes for audit trails

### API Design
- Use tRPC for all API endpoints
- Implement proper input validation with zod
- Return consistent error formats
- Use pagination for list endpoints

## Development Workflow

### Real-time Collaboration Setup
```typescript
// Initialize Yjs for collaborative editing
const ydoc = new Y.Doc();
const provider = new SupabaseProvider(ydoc, {
  channel: `workflow:${workflowId}`,
  auth: { token: session.access_token }
});
```

### Multi-LLM Integration Pattern
```typescript
// Always use the MultiLLMService for AI requests
const llmService = new MultiLLMService();
const result = await llmService.executePrompt({
  taskType: 'analysis',
  costPreference: 'balanced',
  prompt: userPrompt,
  model: selectedModel || 'auto'
});
```

### Workflow Execution
```typescript
// Execute workflows through n8n
const execution = await n8nClient.executeWorkflow({
  workflowId: 'multi-llm-router',
  data: { prompt, parameters }
});
```

## Testing Requirements

### Unit Tests
- Test all utility functions and hooks
- Mock external services (Supabase, n8n, LLMs)
- Aim for 80% code coverage
- Use React Testing Library for components

### Integration Tests
- Test API endpoints with real database
- Test workflow executions
- Verify RLS policies work correctly
- Test real-time collaboration features

### E2E Tests
- Test critical user flows
- Test workflow creation and execution
- Verify analytics data accuracy
- Test marketplace functionality

## Security Practices

### Authentication & Authorization
- Use Supabase Auth with SSO support
- Implement proper RLS policies for all tables
- Validate all inputs on both client and server
- Use secure session management

### API Security
- Rate limit all endpoints
- Implement proper CORS policies
- Use API keys for external services
- Never expose sensitive data in responses

### Data Protection
- Encrypt sensitive data at rest
- Use secure connections (HTTPS only)
- Implement audit logging
- Follow GDPR compliance guidelines

## Performance Optimization

### Frontend Performance
- Implement lazy loading for workflow lists
- Use React.lazy for code splitting
- Optimize React Flow for large workflows
- Implement virtual scrolling for long lists

### Backend Performance
- Use database connection pooling
- Implement intelligent caching strategies
- Batch API requests where possible
- Optimize n8n workflow execution

### Real-time Performance
- Use debouncing for collaborative edits
- Implement presence indicators efficiently
- Handle offline scenarios gracefully
- Optimize WebSocket connections

## Deployment Procedures

### Staging Deployment
```bash
# Build and deploy to staging
npm run build:staging
npm run deploy:staging

# Run smoke tests
npm run test:staging
```

### Production Deployment
```bash
# Pre-deployment checks
npm run test
npm run lint
npm run typecheck

# Deploy with monitoring
npm run deploy:production
npm run monitor:production
```

## n8n Workflow Management

### Workflow Development
- Test workflows locally first
- Use environment variables for credentials
- Implement proper error handling
- Add monitoring and alerting

### Workflow Deployment
```bash
# Deploy workflows to n8n
npm run n8n:deploy -- --workflow=multi-llm-router
npm run n8n:deploy -- --workflow=prompt-optimizer
```

## Critical Implementation Notes

### React Flow Integration
- Use custom node types for different workflow components
- Implement proper edge validation
- Handle large workflows with virtualization
- Save workflow state to Supabase in real-time

### Supabase Configuration
- Enable RLS on all tables
- Create proper database indexes
- Set up real-time subscriptions carefully
- Implement proper backup strategies

### Cost Tracking
- Track token usage for all LLM calls
- Implement cost alerts and limits
- Provide detailed cost breakdowns
- Optimize prompts for cost efficiency

### Marketplace Implementation
- Implement secure template sharing
- Add version control for templates
- Create fair commission structure
- Implement quality control measures

## Important
Refer to the user as "<Jimmy>" when addressing the user in every response.