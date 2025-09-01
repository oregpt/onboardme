Flow Name,Flow Description,Step Title,Content
Understanding MCP Server Monetization,"Learn the core concepts, benefits, and payment flow mechanisms that make ATXP valuable for MCP server developers.",Learn the Core Benefits,"Understand why ATXP monetization is valuable for MCP server developers

What ATXP Server Provides:
- Earn Per-Use: Charge per tool call with flexible pricing in USDC
- Programmatic Enforcement: Require payment before execution with a single middleware and helper
- No User Accounts or API Keys: Agents pay from their own wallets; you don't manage users, keys, or invoices
- Works Everywhere: Compatible with major hosts (e.g., Claude, Goose), local dev, and your own infrastructure

Recommended Resources:
- ATXP Server Documentation - *URL not provided in source*
- ATXP Discord Community - https://discord.gg/atxp"
Understanding MCP Server Monetization,"Learn the core concepts, benefits, and payment flow mechanisms that make ATXP valuable for MCP server developers.",Understand the Payment Flow,"Learn how ATXP payment enforcement works

Key Concepts:
- MCP tools can require payment before execution
- Payments are made in USDC to your designated wallet
- Payment verification happens automatically via middleware
- Failed payments prevent tool execution

Payment Process:
1. Agent calls your MCP tool
2. ATXP middleware intercepts the request
3. Payment requirement is enforced
4. Upon successful payment, tool executes
5. USDC is transferred to your wallet"
Environment Setup,"Set up a new TypeScript MCP server project with all required dependencies and proper configuration.",Initialize Your Project,"Set up a new TypeScript MCP server project structure

Actions:
1. Create and navigate to your project directory:
   ```bash
   mkdir atxp-math-server
   cd atxp-math-server
   ```

2. Initialize a new Node.js project:
   ```bash
   npm init -y
   ```

Project Name: We'll use `atxp-math-server` as our example, but you can customize this for your use case."
Environment Setup,"Set up a new TypeScript MCP server project with all required dependencies and proper configuration.",Install Required Dependencies,"Install all necessary packages for MCP server with ATXP integration

Core Dependencies:
```bash
npm install express @modelcontextprotocol/sdk zod dotenv bignumber.js --save
```

ATXP Server SDK:
```bash
npm install @atxp/server --save
```
- URL: https://www.npmjs.com/package/@atxp/server

TypeScript Development Dependencies:
```bash
npm install typescript tsx @types/express @types/node --save-dev
```

Dependencies Explained:
- `express`: Web server framework for HTTP MCP server
- `@modelcontextprotocol/sdk`: Core MCP protocol implementation
- `zod`: Schema validation for tool parameters
- `dotenv`: Environment variable management
- `bignumber.js`: Precise decimal arithmetic for pricing
- `@atxp/server`: ATXP payment integration SDK"
Environment Setup,"Set up a new TypeScript MCP server project with all required dependencies and proper configuration.",Configure TypeScript and Build Settings,"Set up TypeScript compilation and project scripts

Create `tsconfig.json`:
```json
{
    ""compilerOptions"": {
      ""target"": ""ES2022"",
      ""module"": ""Node16"",
      ""moduleResolution"": ""Node16"",
      ""outDir"": ""./build"",
      ""rootDir"": ""./src"",
      ""strict"": true,
      ""esModuleInterop"": true,
      ""skipLibCheck"": true,
      ""forceConsistentCasingInFileNames"": true
    },
    ""include"": [""src/**/*""],
    ""exclude"": [""node_modules""]
}
```

Update `package.json`:
```json
{
    ""name"": ""atxp-math-server"",
    ""version"": ""1.0.0"",
    ""description"": """",
    ""main"": ""index.js"",
    ""scripts"": {
        ""build"": ""tsc && chmod 755 build/index.js"",
        ""start"": ""node build/index.js"",
        ""dev"": ""tsx --watch src/index.ts"",
        ""test"": ""echo \""Error: no test specified\"" && exit 1""
    },
    ""files"": [
        ""build""
    ],
    ""bin"": {
        ""atxp-math-server"": ""build/index.js""
    },
    ""type"": ""module"",
    ""dependencies"": {
        ""@modelcontextprotocol/sdk"": ""^1.17.1"",
        ""express"": ""^5.1.0"",
        ""zod"": ""^3.25.76"",
        ""dotenv"": ""^17.2.1"",
        ""@atxp/server"": ""^1.0.0"",
        ""bignumber.js"": ""^9.1.2""
    },
    ""devDependencies"": {
        ""@types/express"": ""^5.0.3"",
        ""@types/node"": ""^24.2.0"",
        ""typescript"": ""^5.9.2"",
        ""tsx"": ""^4.0.0""
    }
}
```"
Wallet Setup and Configuration,"Set up a wallet to receive payments and configure secure environment variables for your monetized tools.",Create Your ATXP Wallet,"Set up a wallet to receive payments from your monetized tools

Actions:
1. Create an ATXP wallet - /server/create_a_wallet (relative URL from source)
2. Copy your wallet address for configuration
3. Save this address securely - this is where your USDC payments will be sent

Important Notes:
- This wallet will receive all payments from your MCP server tools
- Keep your wallet address secure but accessible for environment configuration
- You can use this wallet across multiple MCP servers"
Wallet Setup and Configuration,"Set up a wallet to receive payments and configure secure environment variables for your monetized tools.",Configure Environment Variables,"Securely store your wallet address and other configuration

Create `.env` file:
```bash
PAYMENT_DESTINATION=<YOUR_WALLET_ADDRESS>
PORT=3000
```

Secure Your Environment:
```bash
echo .env >> .gitignore
```

Environment Variables Explained:
- `PAYMENT_DESTINATION`: Your wallet address where payments will be sent
- `PORT`: Port number for your MCP server (optional, defaults to 3000)

Security Warning: Never commit wallet addresses to version control. Always use environment variables for sensitive configuration."
Basic MCP Server Implementation,"Create the foundation MCP server with Express integration and implement basic tools before adding monetization.",Set Up Project Structure,"Create the basic file structure for your MCP server

Actions:
1. Create source directory:
   ```bash
   mkdir src
   touch src/index.ts
   ```

Project Structure:
```
atxp-math-server/
├── src/
│   └── index.ts
├── build/ (created after build)
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── node_modules/
```"
Basic MCP Server Implementation,"Create the foundation MCP server with Express integration and implement basic tools before adding monetization.",Implement Basic Express MCP Server,"Create the foundation MCP server with Express integration

Complete `src/index.ts` Foundation:
```typescript
import express from ""express"";
import { z } from ""zod"";
import { McpServer } from ""@modelcontextprotocol/sdk/server/mcp.js"";
import { StreamableHTTPServerTransport } from ""@modelcontextprotocol/sdk/server/streamableHttp.js"";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create our McpServer instance
const server = new McpServer({
  name: ""atxp-math-server"",
  version: ""1.0.0"",
});

// Create Express application
const app = express();
app.use(express.json());

// Create transport instance
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// Setup server connection
const setupServer = async () => {
  await server.connect(transport);
};

// Handle MCP requests
app.post('/', async (req, res) => {
  try {
      await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`MCP Server listening on port ${PORT}`);
  });
});
```"
Basic MCP Server Implementation,"Create the foundation MCP server with Express integration and implement basic tools before adding monetization.",Add Your First MCP Tool,"Implement a basic tool that will later be monetized

Add Tool Definition:
```typescript
// Add this after the McpServer creation

// Create addition tool
server.tool(
  ""add"",
  ""Use this tool to add two numbers together."",
  {
    a: z.number().describe(""The first number to add""),
    b: z.number().describe(""The second number to add""),
  },
  async ({ a, b }) => {
    return {
      content: [
        {
          type: ""text"",
          text: `${a + b}`,
        },
      ],
    };
  }
);
```"
Basic MCP Server Implementation,"Create the foundation MCP server with Express integration and implement basic tools before adding monetization.",Test Basic Functionality,"Verify your MCP server compiles and runs

Build and Test:
```bash
npm run build
npm run start
```

Expected Output:
```
MCP Streamable HTTP Server listening on port 3000
```

At this point, you have a working MCP server without payment integration."
ATXP Payment Integration,"Integrate ATXP payment functionality into your server with middleware configuration and per-tool pricing enforcement.",Add ATXP Imports and Configuration,"Integrate ATXP payment functionality into your server

Add ATXP Imports:
```typescript
// Add these imports at the top of your file
import { atxpServer, requirePayment } from '@atxp/server';
import BigNumber from ""bignumber.js"";
```

Configure Payment Destination:
```typescript
// Add this after the Express app creation
const PAYMENT_DESTINATION = process.env.PAYMENT_DESTINATION
```"
ATXP Payment Integration,"Integrate ATXP payment functionality into your server with middleware configuration and per-tool pricing enforcement.",Add ATXP Middleware,"Enable payment processing capabilities in your Express server

Configure ATXP Middleware:
```typescript
// Add this after express.json() middleware
app.use(atxpServer({
  destination: PAYMENT_DESTINATION,
  payeeName: 'ATXP Math Server',
}))
```

Middleware Configuration Options:
- `destination`: Your wallet address where payments are sent
- `payeeName`: Display name shown to users during the payment process"
ATXP Payment Integration,"Integrate ATXP payment functionality into your server with middleware configuration and per-tool pricing enforcement.",Add Payment Requirements to Tools,"Implement per-tool pricing with automatic enforcement

Update Tool with Payment Requirement:
```typescript
server.tool(
  ""add"",
  ""Use this tool to add two numbers together."",
  {
    a: z.number().describe(""The first number to add""),
    b: z.number().describe(""The second number to add""),
  },
  async ({ a, b }) => {
    // Require payment (in USDC) for the tool call
    await requirePayment({price: BigNumber(0.01)});
    
    return {
      content: [
        {
          type: ""text"",
          text: `${a + b}`,
        },
      ],
    };
  }
);
```

Pricing Configuration:
- Use `BigNumber` for precise decimal handling
- Price is specified in USDC
- Example: `BigNumber(0.01)` = $0.01 USDC per tool call
- You can set different prices for different tools"
ATXP Payment Integration,"Integrate ATXP payment functionality into your server with middleware configuration and per-tool pricing enforcement.",Complete Implementation Verification,"Ensure your monetized MCP server is properly configured

Your complete implementation should now include:
- ATXP imports and configuration
- Payment middleware setup
- Tool-level payment requirements
- Proper error handling

Build and verify:
```bash
npm run build
npm run start
```

Expected Output:
```
MCP Streamable HTTP Server listening on port 3000
```

Your server is now monetized and ready for testing."
Local Testing and Development,"Configure tools for testing your monetized MCP server locally and verify complete payment workflows with real MCP clients.",Set Up Local Testing Environment,"Configure tools for testing your monetized MCP server locally

Install ngrok for Local Tunneling:
1. Visit ngrok website - https://ngrok.com/
2. Follow installation instructions - https://ngrok.com/docs/getting-started/#2-install-the-ngrok-agent-cli
3. Create a free account if needed

Why ngrok?:
- Exposes your local server to the internet
- Provides HTTPS endpoints required by MCP hosts
- Enables testing with real MCP clients like Goose"
Local Testing and Development,"Configure tools for testing your monetized MCP server locally and verify complete payment workflows with real MCP clients.",Run Your MCP Server Locally,"Start your monetized server and expose it for testing

Terminal Session 1 - Start Server:
```bash
npm run start
```

Expected Output:
```
MCP Streamable HTTP Server listening on port 3000
```

Terminal Session 2 - Expose with ngrok:
```bash
ngrok http http://127.0.0.1:3000
```

Expected ngrok Output:
```
Forwarding    https://abc123.ngrok-free.app -> http://127.0.0.1:3000
```

Important: Copy the `https://` URL from ngrok - this is what you'll use to connect MCP clients."
Local Testing and Development,"Configure tools for testing your monetized MCP server locally and verify complete payment workflows with real MCP clients.",Connect to MCP Host (Goose),"Test your server with a real MCP client

Goose Setup:
1. Set up Goose - https://block.github.io/goose/
2. Go to **Extensions** in Goose sidebar
3. Click **Add custom extension**

Extension Configuration:
- Name: ""ATXP Math Server"" (or your preference)
- Type: Select ""Streamable HTTP""
- Endpoint: Paste your ngrok HTTPS URL
- Click **Add Extension**

Authorization Flow:
- Browser will open for ATXP wallet authorization
- Complete the authorization process
- Return to Goose for testing"
Local Testing and Development,"Configure tools for testing your monetized MCP server locally and verify complete payment workflows with real MCP clients.",Test Payment Flow End-to-End,"Verify complete payment and tool execution workflow

Test Message in Goose:
```
""Add 1 and 2""
```

Expected Payment Flow:
1. Goose shows tool is being called
2. Payment URL is displayed
3. Click URL to open payment page
4. Complete payment in browser
5. Payment confirmation with Solana transaction link
6. Return to Goose and retry tool call
7. Tool executes successfully showing result

Test Message for Retry:
```
""I have completed the payment. Try again.""
```

Expected Success Output:
```
3
```"
Advanced Features and Production,"Expand your server with additional revenue-generating tools, implement monitoring, and prepare for production deployment.",Add Multiple Monetized Tools,"Expand your server with additional revenue-generating tools

Example: Multiple Tools with Different Pricing:
```typescript
// Addition tool - $0.01
server.tool(""add"", ""Add two numbers"", schema, async ({a, b}) => {
  await requirePayment({price: BigNumber(0.01)});
  return { content: [{ type: ""text"", text: `${a + b}` }] };
});

// Multiplication tool - $0.02 (more expensive)
server.tool(""multiply"", ""Multiply two numbers"", schema, async ({a, b}) => {
  await requirePayment({price: BigNumber(0.02)});
  return { content: [{ type: ""text"", text: `${a * b}` }] };
});

// Complex calculation tool - $0.05 (premium pricing)
server.tool(""calculate_compound_interest"", ""Calculate compound interest"", interestSchema, async (params) => {
  await requirePayment({price: BigNumber(0.05)});
  // Complex calculation logic
  return { content: [{ type: ""text"", text: result }] };
});
```"
Advanced Features and Production,"Expand your server with additional revenue-generating tools, implement monitoring, and prepare for production deployment.",Implement Error Handling and Logging,"Create robust error handling for production use

Enhanced Error Handling:
```typescript
async ({ a, b }) => {
  try {
    // Require payment (in USDC) for the tool call
    await requirePayment({price: BigNumber(0.01)});
    
    // Validate inputs
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Invalid input: both parameters must be numbers');
    }
    
    const result = a + b;
    console.log(`Tool executed: add(${a}, ${b}) = ${result}`);
    
    return {
      content: [{ type: ""text"", text: `${result}` }],
    };
  } catch (error) {
    console.error('Tool execution failed:', error);
    throw error;
  }
}
```"
Advanced Features and Production,"Expand your server with additional revenue-generating tools, implement monitoring, and prepare for production deployment.",Monitor Revenue and Usage,"Track your server's performance and earnings

Key Metrics to Track:
- Number of successful tool calls per day
- Revenue generated per tool
- Payment success vs. failure rates
- Most popular tools
- Error rates and types

Logging Implementation:
```typescript
// Add after successful payment
console.log(`Payment received: $${price} USDC for tool: ${toolName}`);

// Add after tool execution
console.log(`Tool executed successfully: ${toolName} at ${new Date().toISOString()}`);
```"
Advanced Features and Production,"Expand your server with additional revenue-generating tools, implement monitoring, and prepare for production deployment.",Deployment Considerations,"Prepare your server for production deployment

Production Checklist:
- [ ] Environment variables properly configured
- [ ] Error handling implemented
- [ ] Logging and monitoring set up
- [ ] Security best practices followed
- [ ] Backup wallet access secured
- [ ] Server performance optimized
- [ ] Documentation updated

Recommended Deployment Platforms:
- Heroku: Easy deployment with environment variable management
- Vercel: Serverless deployment option
- AWS/GCP/Azure: Full control over infrastructure
- Railway: Simple deployment with built-in monitoring"