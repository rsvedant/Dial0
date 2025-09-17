# Issue Tracker Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Required: Gemini API Key for LLM chat functionality
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: For production Inkeep integration
INKEEP_API_KEY=your_inkeep_api_key_here

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

### Inkeep API Key (Required for Full Functionality)
1. Sign up at [Inkeep](https://inkeep.com/)
2. Create a new project
3. Go to **Projects** → **Assistants** tab
4. Click **Create assistant** → Choose **API**
5. Name your assistant (e.g., "Support Assistant")
6. Copy the generated API key
7. Add it to your `.env.local` file as `INKEEP_API_KEY`
8. Upload your documentation/knowledge base content to Inkeep
9. Configure your knowledge base settings

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
4. Watch as the AI gathers information and processes it through the system

### Inkeep Integration Testing
Test your Inkeep integration with these endpoints:

1. **Connection Test**: `GET /api/inkeep/test?type=connection`
2. **Search Test**: `GET /api/inkeep/test?type=search&query=your-search-term`
3. **Context Test**: `GET /api/inkeep/test?type=context&topic=your-topic`
4. **Full Analysis Test**: `POST /api/inkeep/test` with body `{"testQuery": "I'm having login issues"}`

### Testing Without Inkeep API Key
The system will automatically fall back to mock responses if:
- No `INKEEP_API_KEY` is provided
- The Inkeep API connection fails
- You'll see `"usingRealInkeep": false` in the API responses

## Current Status

- ✅ Clean UI (liquid glass styling removed)
- ✅ Gemini LLM integration for intelligent chat
- ✅ **Real Inkeep integration** with OpenAI-compatible API
- ✅ Knowledge base search and analysis
- ✅ Automatic fallback to mock responses when Inkeep is unavailable
- ✅ Vapi integration for automated calling (mock implementation)
- ✅ Complete workflow from chat to human escalation
- ✅ Comprehensive testing endpoints

## Integration Features

### Inkeep Integration
- **Real API Integration**: Uses Inkeep's OpenAI-compatible endpoints
- **Multiple Models**: Supports `inkeep-qa-expert`, `inkeep-context`, `inkeep-base`, and `inkeep-rag`
- **Knowledge Base Search**: Searches your uploaded documentation
- **Contextual Analysis**: Provides AI-powered issue analysis
- **Graceful Fallback**: Automatically switches to mock responses if API is unavailable
- **Connection Validation**: Tests API connectivity before making requests

### Next Steps for Full Production
1. **Set up your Inkeep account** and get your API key
2. **Upload your documentation** to Inkeep's knowledge base
3. **Configure Vapi integration** for real voice calls (when ready)
4. **Test the full workflow** with real data

