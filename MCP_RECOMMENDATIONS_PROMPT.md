# MCP Tool Recommendations for Dial0 Multi-Agent System

## Context: What is Dial0?

Dial0 is an AI-powered phone call automation platform that makes calls on behalf of users to resolve issues with companies (billing disputes, insurance claims, appointment booking, etc.). 

We use a **multi-agent architecture** where:
1. A **router agent** classifies user intent
2. Specialized agents handle specific domains
3. Agents research thoroughly before calling
4. Users approve the strategy before the call is initiated
5. A voice AI (Vapi) executes the actual phone call

## Current Architecture

### Agent Types & Their Domains

**1. Financial Agent**
- **Handles**: Bill negotiation, fee disputes, refunds, subscription cancellation, cost reduction
- **Tasks**: Lower internet/cable/phone bills, dispute charges, negotiate credit card fees, cancel subscriptions, request refunds
- **Current Tools**: Firecrawl (web search/scrape)
- **Workflow**: Gather bill details → Research competitor pricing → Present negotiation strategy → Call

**2. Insurance Agent**
- **Handles**: Claims filing, claim appeals, premium negotiation, flight compensation, medical bill reduction
- **Tasks**: File insurance claims, appeal denials, calculate flight delay compensation (EU261/DOT), negotiate medical bills, verify coverage
- **Current Tools**: Firecrawl (web search/scrape)
- **Workflow**: Gather claim details → Research policies/regulations → Present case strategy → Call

**3. Booking Agent**
- **Handles**: Appointment scheduling, reservations
- **Tasks**: Medical appointments, auto service, salon/spa booking, restaurant reservations, DMV/SSA appointments, entertainment tickets
- **Current Tools**: Firecrawl (web search/scrape)
- **Workflow**: Gather preferences → Research availability/providers → Present booking options → Call

**4. Account Agent**
- **Handles**: Account management, service changes
- **Tasks**: Update account info, activate/cancel services, downgrade plans, return equipment, reactivate accounts
- **Current Tools**: Firecrawl (web search/scrape)
- **Workflow**: Gather account details → Research requirements/policies → Present action plan → Call

**5. Support Agent**
- **Handles**: General inquiries, status checks, information lookup
- **Tasks**: Package tracking, application status, business hours lookup, provider search, price research, document retrieval
- **Current Tools**: Firecrawl (web search/scrape)
- **Workflow**: Understand inquiry → Research online → **Answer without calling if possible** → Call only if needed

## Our Case-Building Workflow (Critical)

Each agent follows a **5-phase workflow**:

1. **Gather Facts** - Ask 1-2 focused questions
2. **Research** - Use tools to find leverage/evidence
3. **Present Strategy** - Show user the complete plan
4. **Get Confirmation** - Wait for user approval
5. **Call** - Execute start_call with full context

**Example (Financial Agent)**:
```
User: "My Xfinity bill is too high"
Agent: "What's your current monthly bill?"
User: "$120"

[Agent researches competitor pricing]

Agent: "Based on research:
- AT&T offers 500Mbps for $80/month (you pay $120 for similar)
- Strategy: Call Xfinity, cite AT&T pricing, request $40 discount

Proceed with this?"
User: "Yes"
[Agent calls]
```

## Current Limitations (Where We Need MCPs)

### 1. Financial Agent Limitations
- **No real competitor pricing data** - Just web scraping unreliable pricing pages
- **No bill analysis** - Can't parse uploaded bills to identify overcharges
- **No historical pricing** - Can't show "you paid $X last year, now $Y"
- **No contract analysis** - Can't check if user's contract has early termination fees

### 2. Insurance Agent Limitations
- **No policy interpretation** - Can't parse complex insurance policy PDFs
- **No claims database** - Can't check if similar claims were approved/denied
- **No medical coding** - Can't validate CPT/ICD codes on medical bills
- **No flight data** - Manually searches for flight delay details instead of using aviation APIs

### 3. Booking Agent Limitations
- **No real-time availability** - Just scrapes business websites (often wrong)
- **No calendar integration** - Can't check user's actual availability
- **No provider ratings** - Relies on scraped reviews instead of verified data
- **No booking confirmations** - Can't verify if booking actually succeeded

### 4. Account Agent Limitations
- **No account verification** - Can't validate account numbers or status
- **No contract parsing** - Can't read uploaded service contracts
- **No equipment tracking** - Can't check if returned equipment was received

### 5. Support Agent Limitations
- **Limited package tracking** - Only scrapes carrier websites
- **No application APIs** - Can't check real IRS/USCIS/insurance application status
- **No business database** - Scraping Yelp/Google is slow and unreliable

## What We're Looking For

We need **MCP (Model Context Protocol) servers** that can:

1. **Provide structured data** instead of web scraping
2. **Integrate with existing APIs** (FedEx tracking, insurance databases, pricing APIs, etc.)
3. **Parse documents** (bills, policies, contracts, medical records)
4. **Validate information** (account numbers, claim eligibility, policy terms)
5. **Calculate compensation** (flight delays, medical bill errors, overcharges)
6. **Check real-time data** (availability, pricing, application status)

## Technical Constraints

- **MCP over HTTP** - We use the Model Context Protocol standard
- **Tool-based interface** - Each MCP exposes tools the agents can call
- **Structured output** - Tools should return JSON, not just text
- **Async-friendly** - Some operations (bill parsing, document analysis) may take time
- **Authentication** - Tools may need API keys (we can provide)

## Example of What We Want

**Bad (current)**:
```typescript
// Agent uses Firecrawl to scrape competitor pricing
firecrawl_search("Comcast competitors pricing")
// Result: Messy HTML, outdated info, manual parsing needed
```

**Good (with MCP)**:
```typescript
// Agent uses specialized pricing MCP
telecom_pricing_lookup({
  current_provider: "Comcast",
  service_type: "internet",
  speed: "500mbps",
  location: "94102"
})
// Result: { competitors: [{ name: "AT&T", price: 79.99, speed: "500mbps" }] }
```

## Your Task

**Please recommend specific MCP servers** (existing or ones we should build) for each agent type.

For each recommendation, specify:
1. **MCP name/description**
2. **Which agent(s) would use it**
3. **What tools it should expose**
4. **What data sources it integrates with** (APIs, databases, etc.)
5. **Example tool call** showing input/output

**Priority**: Focus on MCPs that would:
- Eliminate unreliable web scraping
- Provide structured, verified data
- Enable agents to build stronger cases
- Reduce research time
- Increase success rate of calls

**Categories to consider**:
- Financial/billing APIs
- Insurance/claims databases
- Healthcare/medical coding
- Travel/aviation APIs
- Package tracking APIs
- Business/provider databases
- Document parsing (PDFs, images)
- Calendar/scheduling integrations
- Account verification services
- Pricing/market data APIs

**Output format**: For each MCP, provide:
```
## [MCP Name]
**Agent**: [financial/insurance/booking/account/support]
**Purpose**: [What problem it solves]
**Tools**:
  - tool_name(args) -> output
**Data Sources**: [APIs/databases it uses]
**Example**:
  Input: {...}
  Output: {...}
**Priority**: [High/Medium/Low]
```

Thank you! We're looking to transform our agents from "web scrapers with LLMs" to "intelligent specialists with real data access.". Recommend the appropriate MCPs for each agent to add.