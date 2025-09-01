# ATXP Agent Onboarding Guide

## Understanding ATXP

*Learn the core concepts, benefits, and underlying technology that makes ATXP valuable for agent development.*

### Learn the Core Benefits

**Objective**: Understand why ATXP is valuable for agent development

**What ATXP Provides:**
- **Reduced Friction**: Try new tools in minutes without signups, API keys, or billing setup
- **Pay-as-you-go Cost Control**: Per-MCP-tool-call pricing - only pay for what you use
- **Better Security**: Keep secrets out of your app with signed payment authorization instead of shared keys
- **Composable Tooling**: Combine multiple paid MCP servers behind a single client and consistent API

**Recommended Resources:**
- ATXP Documentation - *URL not provided in source*
- What is ATXP? Overview Video - *URL not provided in source*

### Understand MCP (Model Context Protocol)

**Objective**: Learn about the protocol that powers ATXP tools

**Key Concepts:**
- MCP servers provide tools that AI agents can discover and use
- Tools are defined with schemas that specify inputs and outputs
- ATXP adds a payment layer to MCP tools

**Recommended Resources:**
- MCP Protocol Documentation - *URL not provided in source*
- MCP GitHub Repository - *URL not provided in source*

---

## Environment Setup

*Set up your development environment with ATXP client SDK and create the basic project structure.*

### Install Required Dependencies

**Objective**: Set up your development environment with ATXP client SDK

**Actions:**
1. Open your terminal/command prompt
2. Navigate to your project directory
3. Install the ATXP client SDK:
   ```bash
   npm install @atxp/client
   ```

**Prerequisites:**
- Node.js version 16 or higher
- npm or yarn package manager

**Troubleshooting:**
- If you encounter permission errors, try using `sudo` (macOS/Linux) or run as administrator (Windows)
- For corporate networks, you may need to configure npm proxy settings

### Create Project Structure

**Objective**: Set up a basic project structure for your ATXP agent

**Actions:**
1. Create a new directory for your project (if not already done):
   ```bash
   mkdir my-atxp-agent
   cd my-atxp-agent
   ```

2. Initialize a new npm project:
   ```bash
   npm init -y
   ```

3. Create the following files:
   - `index.js` or `index.ts` (main agent file)
   - `.env` (environment variables)
   - `.gitignore` (version control exclusions)

**File Structure:**
```
my-atxp-agent/
├── index.js
├── .env
├── .gitignore
├── package.json
└── node_modules/
```

---

## Account Configuration

*Select and set up the appropriate account type for your needs with proper security practices.*

### Choose Your Account Type

**Objective**: Select and set up the appropriate account type for your needs

**Account Options:**

**Option A: ATXP Account (Recommended for beginners)**
- Easiest to set up
- Built-in wallet management
- Integrated billing

**Option B: Solana Account**
- Use existing Solana wallet
- Direct blockchain interaction
- More control over transactions

**Option C: EVM-Compatible Account**
- Ethereum and other EVM chains
- Advanced users only
- Contact support for setup

### Set Up ATXP Account

**Objective**: Create and configure an ATXP account (Option A)

**Actions:**
1. Visit the ATXP Account Creation Page - `/client/create_an_account` (relative URL from source)
2. Follow the account creation process
3. Copy your connection string
4. Add to your `.env` file:
   ```bash
   ATXP_CONNECTION=https://accounts.atxp.ai?connection_token=<your_token_here>
   ```

**Security Note**: Never commit your `.env` file to version control

**Recommended Resources:**
- Create ATXP Account - `/client/create_an_account` (relative URL from source)
- Account Security Best Practices - *URL not provided in source*

### Set Up Solana Account (Alternative)

**Objective**: Configure a Solana wallet for ATXP (Option B)

**Actions:**
1. Obtain your Solana private key from your wallet
2. Choose a Solana RPC endpoint (e.g., Mainnet, Devnet)
3. Add to your `.env` file:
   ```bash
   SOLANA_ENDPOINT=<your_solana_endpoint>
   SOLANA_PRIVATE_KEY=<your_private_key>
   ```

**Recommended Solana RPC Providers:**
- Alchemy
- QuickNode
- Helius
- Public RPC (for testing only)

### Secure Your Environment

**Objective**: Implement security best practices

**Actions:**
1. Add `.env` to your `.gitignore`:
   ```bash
   echo .env >> .gitignore
   ```

2. Set appropriate file permissions:
   ```bash
   chmod 600 .env  # Unix/Linux/macOS
   ```

3. Consider using environment variable management tools for production

---

## Service Definition and Client Creation

*Configure paid MCP services and initialize the ATXP client with your account credentials.*

### Define Your First Service

**Objective**: Configure a paid MCP service for your agent to use

**Actions:**
1. Define the browse service in your main file:

```typescript
const browseService = {
  mcpServer: 'https://browse.mcp.atxp.ai/',
  toolName: 'atxp_browse',
  description: 'Web browsing and content extraction',
  getArguments: (prompt: string) => ({ query: prompt }),
  getResult: (result: any) => result.content[0].text
};
```

**Service Configuration Explained:**
- `mcpServer`: The URL of the MCP server hosting the tool
- `toolName`: The specific tool identifier within the server
- `description`: Human-readable description of what the service does
- `getArguments`: Function to format input arguments
- `getResult`: Function to extract useful results from the response

### Create ATXP Client

**Objective**: Initialize the ATXP client with your account credentials

**For ATXP Account:**
```typescript
import { atxpClient, ATXPAccount } from '@atxp/client';

const atxpConnectionString = process.env.ATXP_CONNECTION;
const client = await atxpClient({
  mcpServer: browseService.mcpServer,
  account: new ATXPAccount(atxpConnectionString),
});
```

**For Solana Account:**
```typescript
import { atxpClient, SolanaAccount } from '@atxp/client';

const solanaEndpoint = process.env.SOLANA_ENDPOINT;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;
const client = await atxpClient({
  mcpServer: browseService.mcpServer,
  account: new SolanaAccount(solanaEndpoint, solanaPrivateKey),
});
```

---

## Implementation and Testing

*Execute paid tool calls through your ATXP agent and verify complete functionality with proper error handling.*

### Implement Your First Tool Call

**Objective**: Execute a paid tool call through your ATXP agent

**Complete Implementation:**
```typescript
const prompt = "What are the top 3 articles by points on https://news.ycombinator.com?";

try {
  const result = await client.callTool({
    name: browseService.toolName,
    arguments: browseService.getArguments(prompt),
  });
  
  console.log(`${browseService.description} result successful!`);
  console.log('Result:', browseService.getResult(result));
} catch (error) {
  console.error(`Error with ${browseService.description}:`, error);
  process.exit(1);
}
```

### Test Your Agent

**Objective**: Verify that your agent works correctly

**Testing Steps:**
1. Save your complete implementation
2. Run your agent:
   ```bash
   node index.js
   ```
3. Verify the output shows successful browsing results
4. Check that payment was processed correctly

**Expected Output:**
```
browse result successful!
Result: [Content from Hacker News showing top 3 articles]
```

### Handle Errors and Edge Cases

**Objective**: Implement robust error handling

**Common Issues and Solutions:**
- **Network errors**: Implement retry logic
- **Insufficient funds**: Check account balance
- **Invalid arguments**: Validate inputs before calling tools
- **Server unavailable**: Implement fallback mechanisms

**Enhanced Error Handling:**
```typescript
try {
  const result = await client.callTool({
    name: browseService.toolName,
    arguments: browseService.getArguments(prompt),
  });
  // Process result...
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Please add funds to your account');
  } else if (error.message.includes('network')) {
    console.error('Network error, please try again');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Advanced Features and Next Steps

*Discover additional MCP tools, build complex multi-service agents, and implement monitoring for production use.*

### Explore Additional MCP Services

**Objective**: Discover and integrate more paid MCP tools

**Available Services (examples):**
- Web browsing and scraping
- Image generation and processing
- Data analysis and computation
- API integrations
- Database operations

**Service Discovery:**
- Browse the ATXP marketplace for available tools
- Check MCP server documentation for tool schemas
- Test tools with small amounts before production use

### Build More Complex Agents

**Objective**: Create agents that use multiple tools and services

**Multi-Service Agent Pattern:**
```typescript
const services = [
  browseService,
  imageService,
  analysisService
];

// Use multiple services in sequence or parallel
for (const service of services) {
  const client = await atxpClient({
    mcpServer: service.mcpServer,
    account: new ATXPAccount(atxpConnectionString),
  });
  
  // Execute service-specific logic
}
```

### Monitoring and Analytics

**Objective**: Track your agent's performance and costs

**Key Metrics to Monitor:**
- Tool call success rates
- Response times
- Cost per operation
- Error patterns

**Recommended Tools:**
- ATXP Dashboard (for cost tracking)
- Application logging frameworks
- Performance monitoring tools

---

## Resources and Community

### Documentation
- **ATXP Client Documentation** - *URL not provided in source*
- **MCP Protocol Specification** - *URL not provided in source*
- **TypeScript/JavaScript SDK Reference** - https://www.npmjs.com/package/@atxp/client

### Community and Support
- **ATXP Discord Community** - https://discord.gg/atxp
- **Developer Relations Team** - mailto:devrel@atxp.ai
- **GitHub Issues** - *URL not provided in source*

### Advanced Tutorials
- **Complete Agent Tutorial** - `/client/guides/tutorial` (relative URL from source)
- **Monetize Your MCP Server** - `/server/index` (relative URL from source)
- **Production Deployment Guide** - *URL not provided in source*

### Attachments and Downloads
- **Sample Code Repository** - *URL not provided in source*
- **Environment Template (.env.example)** - *URL not provided in source*
- **Agent Boilerplate** - *URL not provided in source*

---

## Completion Checklist

Before moving to production, ensure you have:

- [ ] Successfully installed the ATXP client SDK
- [ ] Set up and secured your account credentials
- [ ] Created your first service definition
- [ ] Initialized an ATXP client successfully
- [ ] Executed at least one successful tool call
- [ ] Implemented proper error handling
- [ ] Tested your agent with various inputs
- [ ] Added monitoring and logging
- [ ] Reviewed security best practices
- [ ] Joined the ATXP community for ongoing support

**Congratulations! You've successfully built your first ATXP-powered agent!**