# Issue Tracker Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Required: Gemini API Key for LLM chat functionality
GEMINI_API_KEY=your_gemini_api_key_here

# Required: Anthropic for routing agent (Claude 3 Opus)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Convex URL (from the Convex dashboard)
NEXT_PUBLIC_CONVEX_URL=https://<your-convex-deployment>.convex.cloud

# Optional: For production Vapi integration  
VAPI_PUBLIC_KEY=your_vapi_public_key_here
VAPI_PRIVATE_KEY=your_vapi_private_key_here
```

## Getting API Keys

### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new project or select existing one
3. Generate an API key
4. Add it to your `.env.local` file

### Anthropic API Key
1. Create an Anthropic account and API key: https://console.anthropic.com/
2. Add it to your `.env.local` file

### Vapi API Keys (Optional)
1. Sign up at [Vapi](https://vapi.ai/)
2. Get your public and private keys from the dashboard
3. Add them to your `.env.local` file

## How It Works

1. **Chat Interface**: Users describe their issues through an intelligent chat powered by Gemini
2. **Issue Analysis**: Gemini gathers complete information about the issue
3. **Inkeep Integration**: Once complete, the issue is sent to Inkeep for documentation search and analysis
4. **Vapi Escalation**: If human intervention is needed, Vapi automatically calls the appropriate team member

## Testing the System

### Basic Testing
1. Start the development server: `npm run dev`
2. Create a new issue from the homepage
3. Describe a problem in the chat interface
4. When Gemini responds with ISSUE_COMPLETE, the routing agent (Claude via Anthropic) builds a voice-call context
5. Check browser console for "Inkeep routing context (client): ..." and server logs for the structured JSON

### Routing Agent Testing
Use these endpoints for quick checks:

1. **Smoke Test**: `GET /api/inkeep/test?type=connection`
2. **Full Routing Test**: `POST /api/inkeep/test` with body `{"testQuery": "Schedule an appointment with Dr. Smith for a check-up next week"}`

### Testing Without Inkeep API Key
The system will automatically fall back to mock responses if:
- No `INKEEP_API_KEY` is provided
- The Inkeep API connection fails
- You'll see `"usingRealInkeep": false` in the API responses

## Current Status

- ✅ Clean UI (liquid glass styling removed)
- ✅ Gemini LLM integration for intelligent chat
- ✅ Multi-agent orchestration: Gemini (chat) → Claude (routing)
- ✅ Routing context persisted in Convex (global)
- ✅ Client and server console logging of built context
- ✅ Vapi integration placeholder (call not yet placed)
- ✅ Clean workflow from chat to context build
- ✅ Comprehensive testing endpoints

## Integration Features

### Orchestration Details
- Chat: Gemini (via `@google/generative-ai`) guides the user to a complete issue summary (`ISSUE_COMPLETE: ...`).
- Routing Agent: Claude 3 Opus (via `@anthropic-ai/sdk`) transforms the summary into strict JSON for a voice agent.
- Persistence: Latest routing context saved to Convex (`orchestrationContexts` table).
- UI: After completion, frontend calls `/api/inkeep`, prints context to console, and shows a brief confirmation.

### Next Steps for Full Production
1. **Set up your Inkeep account** and get your API key
2. **Upload your documentation** to Inkeep's knowledge base
3. **Configure Vapi integration** for real voice calls (when ready)
4. **Test the full workflow** with real data

