# DialZero AI Coding Instructions

## Architecture Overview

DialZero is an AI-powered customer service automation platform that handles customer support calls using advanced AI technology. The system follows a progressive intake → routing → automation workflow.

### Core Components

**Frontend (Next.js App Router)**
- Marketing site at `app/(marketing)/` - Landing page with conversion focus
- Dashboard at `app/dashboard/` - Main user interface for issue management
- Chat interface at `components/chat-interface.tsx` - Progressive issue intake
- Mobile-responsive design with conditional tabbars

**Backend & Database (Convex)**
- `convex/schema.ts` - Data model: issues, settings, orchestrationContexts, chatMessages, callEvents
- `convex/orchestration.ts` - CRUD operations and business logic with Better Auth integration
- `convex/auth.ts` - Better Auth integration with passkeys, 2FA, and magic links
- Real-time subscriptions and live queries

**AI Integration Layer**
- **Chat Intake**: `app/api/chat/route.ts` - Gemini 1.5 Flash for progressive issue gathering
- **Routing Agent**: `app/api/inkeep/route.ts` - Gemini 2.5 Pro for VAPI context building
- **Voice Calls**: `app/api/vapi/` - Vapi.ai integration for automated calling
- **Email**: Resend integration for notifications

### Data Flow

1. **Issue Creation**: User creates issue via dashboard → stored in `issues` table
2. **Progressive Intake**: Chat interface with Gemini collects issue details progressively
3. **Completion Signal**: When Gemini outputs `ISSUE_COMPLETE: {JSON}`, routing triggers
4. **Context Building**: Gemini analyzes transcript and builds VAPI-ready JSON context
5. **Automation**: Vapi places calls with structured context and follows escalation protocols
6. **Call Events**: Webhooks store transcripts and status updates in `callEvents` table

## Development Workflows

### Essential Commands
```bash
# Development (runs both Next.js and Convex concurrently)
bun dev

# Build for production
bun run build

# Start production server
bun start

# Linting
bun run lint
```

### Testing the System
1. Start development: `bun dev`
2. Create issue from homepage
3. Describe problem in chat interface
4. Wait for `ISSUE_COMPLETE` signal from Gemini
5. Check browser console for routing context
6. Use test endpoints: `/api/inkeep/test?type=connection`

### Environment Setup
Required environment variables in `.env.local`:
- `GEMINI_API_KEY` - Google AI Studio for chat intake (Gemini 1.5 Flash)
- `INKEEP_API_KEY` - Google AI Studio for routing (Gemini 2.5 Pro)
- `ANTHROPIC_API_KEY` - Anthropic API (available but not actively used for routing)
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `VAPI_*` - Vapi.ai integration keys and configuration
- `RESEND_API_KEY` - Email notifications
- `INTERNAL_EMAIL_PROXY_SECRET` - Email proxy for internal testing

## Code Patterns & Conventions

### Frontend Patterns
- **Client Components**: Use `"use client"` for interactive components (chat, dashboard)
- **Convex Integration**: Use `useQuery`, `useMutation` with proper loading states
- **Authentication**: Wrap with `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>`
- **Responsive Design**: Mobile-first with conditional tabbars via `ConditionalMobileTabbar`

### Backend Patterns
- **API Routes**: Strict JSON validation with `zod` schemas
- **Error Handling**: Consistent try/catch with appropriate HTTP status codes
- **Convex Functions**: Use `requireUserId()` for authentication, proper indexing
- **AI Prompts**: System prompts are constants at top of route files
- **ISO Timestamps**: All dates stored as ISO strings (`new Date().toISOString()`)

### AI Integration Patterns
- **Chat Intake**: Uses Gemini 1.5 Flash with progressive context building
- **Routing Agent**: Uses Gemini 2.5 Pro (NOT Claude) with JSON schema validation
- **Completion Detection**: Regex match for `ISSUE_COMPLETE:` signal
- **JSON Validation**: Strict Zod schemas for AI outputs
- **Fallback Handling**: Graceful degradation when APIs fail

### Database Patterns
- **ISO Timestamps**: All dates stored as ISO strings (`new Date().toISOString()`)
- **Indexing**: Proper indexes on user+date combinations for performance
- **Schema Evolution**: Convex handles migrations automatically
- **Call Events**: Deduplication logic to prevent duplicate event storage

## Critical Implementation Details

### Chat Interface Behavior
- Always respond to user's last message directly (never empty)
- Use `KNOWN_CONTEXT` and `SETTINGS` as facts unless corrected
- Ask at most ONE focused follow-up question per response
- Keep responses brief (≤3 sentences or short bullet list)
- Completion signal: `ISSUE_COMPLETE: {JSON with summary, details, desiredOutcome}`

### Routing Agent Requirements
- Uses Gemini 2.5 Pro (NOT Claude as documented elsewhere)
- Output STRICT JSON ONLY (no prose)
- Build precise, actionable VAPI context
- Include contact info, issue details, availability, caller identity
- Handle fallbacks from settings when context is incomplete
- JSON schema validation with fallback to structured mock data

### Voice Call Protocols
- **Persistence**: Don't accept "no" easily, ask for supervisors
- **Information Sharing**: Full authority to share user details and schedule
- **Escalation**: Use specific phrases when representatives can't help
- **End-of-Call**: Required structured report with outcome and follow-ups
- **Webhook Integration**: Real-time call event storage and chat updates

### Authentication System
- **Better Auth**: Primary auth with passkeys, magic links, and optional 2FA
- **Profile Sync**: Automatic sync of user profile to Better Auth
- **Settings Management**: Automatic creation of settings records on user creation
- **Session Management**: Convex-based session storage

## External Dependencies

### AI Services
- **Gemini 1.5 Flash**: Chat intake, progressive issue gathering
- **Gemini 2.5 Pro**: Routing agent, context building (NOT Claude)
- **Anthropic API**: Available but not actively used for routing
- **Vapi.ai**: Voice automation, call placement, webhook handling

### Authentication
- **Better Auth**: Primary auth with passkeys, magic links, and 2FA
- **Convex Auth**: Integration with Better Auth components
- **Passkey Support**: Native passkey authentication

### Communication
- **Resend**: Email notifications and transactional emails
- **Vapi Webhooks**: Real-time call event processing

### UI Components
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Consistent icon system
- **Magic UI**: Special effects components (background-beams, spotlight)

## File Structure Notes

- **Convex Functions**: `convex/orchestration.ts` contains all business logic
- **API Routes**: `app/api/` organized by service (chat, inkeep, vapi)
- **Components**: Reusable UI components in `components/` with subdirectories
- **Libraries**: Shared utilities in `lib/` (auth, search, services)
- **Types**: TypeScript definitions in `types/` for external APIs

## Testing & Debugging

### Common Debug Points
- Browser console for routing context: `"Inkeep routing context (client): ..."`
- Convex dashboard for database state inspection
- API route logs for error tracking
- Check environment variables configuration
- Use `debugAuthUserShape` and `debugAllMySettings` for auth debugging

### Mock Testing
- System falls back to mock responses when API keys missing
- Look for `"usingRealInkeep": false` in responses
- Test endpoints available for smoke testing
- Call event deduplication prevents duplicate storage

### Development Notes
- **Package Manager**: Uses npm (not bun as documented)
- **Build Tool**: Next.js with Turbopack for development
- **Database**: Convex with automatic schema migrations
- **Authentication**: Better Auth with automatic user settings creation