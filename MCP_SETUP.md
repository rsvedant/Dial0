# Dial0 MCP Server Setup

This project exposes the `/api/vapi/start-call` endpoint as an MCP (Model Context Protocol) tool, allowing AI agents to initiate phone calls with validated context.

## Configuration

### Environment Variables

Add to your `.env.local`:
```bash
# Vapi credentials (already configured)
VAPI_PRIVATE_API_KEY=your_key
VAPI_PUBLIC_ASSISTANT_ID=your_id
VAPI_PHONE_NUMBER_ID=your_phone_id
```

## HTTP Endpoint (Recommended for External Agents)

The MCP server is exposed as an HTTP endpoint at:

```
POST https://your-ngrok-domain.ngrok-free.app/api/mcp
```

### MCP Protocol Format

The endpoint accepts JSON-RPC 2.0 style requests:

**List available tools:**
```bash
curl -X POST https://your-domain/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/list",
    "params": {}
  }'
```

**Call the start_call tool:**
```bash
curl -X POST https://your-domain/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "start_call",
      "arguments": {
        "issueId": "your-issue-id",
        "authToken": "your-auth-token",
        "context": {
          "contact": {
            "type": "service",
            "name": "Xfinity",
            "phoneNumber": "1-800-934-6489"
          },
          "caller": {
            "name": "Vedant Singh",
            "callback": "4083341829"
          },
          "issue": {
            "summary": "Internet outage",
            "details": "WiFi completely out"
          }
        }
      }
    }
  }'
```

## Local Process (Optional for Claude Desktop)

If you want to run the MCP server as a local process for Claude Desktop:

### Option 1: Standalone
```bash
npm run mcp
```

### Option 2: With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dial0": {
      "command": "bun",
      "args": ["/absolute/path/to/Dial0/mcp-server.ts"],
      "env": {
        "SITE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Restart Claude Desktop after updating the config.

## External Agent Integration

For external agents to use your MCP server, provide them with:

**Endpoint:** `https://your-ngrok-domain.ngrok-free.app/api/mcp`  
**Protocol:** JSON-RPC 2.0 (MCP over HTTP)  
**Available Tools:** `start_call`

## Tool Interface

The `start_call` tool accepts the following parameters:

### Input Parameters

```typescript
{
  issueId: string,
  authToken: string,      // User authentication token
  context: {              // Full call context (validated)
    contact: {
      type: string,
      name: string,
      phoneNumber?: string,
      altChannels?: string[]
    },
    caller: {
      name: string,
      callback?: string,
      identifiers?: string[],
      org?: string,
      employer?: string
    },
    callPurpose?: string,
    callType?: 'customer_service' | 'personal' | 'work' | 'general',
    goal?: {
      summary?: string,
    },
    objective?: string,
    issue?: {
      category?: string,
      summary?: string,
      details?: string,
      urgency?: string,
      desiredOutcome?: string,
    },
    constraints?: string[],
    verification?: string[],
    availability?: {
      timezone?: string,
      preferredWindows?: string[],
    },
    followUp?: {
      nextSteps?: string[],
      notify?: string[],
    },
    notesForAgent?: string,
    work?: {
      org?: string,
    },
    openers?: {
      personal?: string,
      work?: string,
      general?: string,
    },
  }
}
```

## How It Works

1. **Agent calls MCP tool** → `start_call` with parameters
2. **MCP server** → Forwards to `POST /api/vapi/start-call` with headers:
   - `issueId`: Issue tracking ID
   - `authToken`: Authentication token  
   - `context`: JSON-stringified context (validated with Zod)
3. **API endpoint** → Parses headers, validates context schema, initiates Vapi call
4. **Response** → Returns call details or error

## Schema Validation

The `context` header is validated using Zod against a strict schema. Required fields:
- `contact.type` and `contact.name`
- `caller.name`

All other fields are optional. See full schema in `/app/api/vapi/start-call/route.ts`.

## Development

The original logic in `/api/vapi/start-call` remains unchanged. Only the input method changed from body to headers for MCP compatibility.

## Testing

**Test the MCP endpoint:**
```bash
curl -X POST https://your-ngrok-domain/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "start_call",
      "arguments": {
        "issueId": "test-123",
        "authToken": "your-token",
        "context": {
          "contact": {"type": "service", "name": "Test Service"},
          "caller": {"name": "Test User"}
        }
      }
    }
  }'
```

**Test the underlying API directly:**
```bash
curl -X POST http://localhost:3000/api/vapi/start-call \
  -H "issueId: test-123" \
  -H "authToken: your-token" \
  -H "context: {\"contact\":{\"type\":\"service\",\"name\":\"Test\"},\"caller\":{\"name\":\"Test User\"}}"
```

## Troubleshooting

- **"Cannot find module '@modelcontextprotocol/sdk'"** → Run `npm install`
- **"Not authenticated"** → Check `authToken` header is valid
- **"Invalid context schema"** → Verify context JSON matches schema
- **MCP server not connecting** → Check paths in Claude config are absolute
