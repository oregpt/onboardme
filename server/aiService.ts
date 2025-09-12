import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import type { Guide, FlowBox, Step, Project, InsertConversationHistory } from "@shared/schema";
import type { IStorage } from "./storage";

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'xai';

// Chat message interface
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI response interface
export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  timestamp: Date;
}

// Knowledge base context interface
export interface KnowledgeContext {
  guide: Guide;
  flowBox?: FlowBox | null;
  currentStep?: Step | null;
  allSteps: Step[];
  generalFiles: any[];
  faqFiles: any[];
  otherHelpFiles: any[];
  agentInstructions?: string | null;
}

// Conversation history context interface
export interface ConversationContext {
  project: Project;
  conversationId: string;
  userId: string;
  storage: IStorage;
}

// OpenAI client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic client
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// xAI client (using OpenAI-compatible API)
const xaiClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

// Knowledge base system
export class KnowledgeBaseService {
  // Build context from guide, steps, and attachments
  static buildContext(context: KnowledgeContext): string {
    const {
      guide,
      flowBox,
      currentStep,
      allSteps,
      generalFiles,
      faqFiles,
      otherHelpFiles,
      agentInstructions
    } = context;

    let contextText = `# ${guide.title}\n\n`;
    
    if (guide.description) {
      contextText += `## Guide Description\n${guide.description}\n\n`;
    }

    if (guide.globalInformation) {
      contextText += `## Global Information\n${guide.globalInformation}\n\n`;
    }

    // Current flow box context (if specific flow is selected)
    if (flowBox) {
      contextText += `## Current Flow: ${flowBox.title}\n`;
      if (flowBox.description) {
        contextText += `${flowBox.description}\n\n`;
      }

      // Agent instructions for this flow
      if (agentInstructions) {
        contextText += `## Agent Instructions for this Flow\n${agentInstructions}\n\n`;
      }
    } else {
      contextText += `## Context: All Flows\nUser is asking about the entire guide across all flows.\n\n`;
    }

    // Current step context (if specific step is selected)
    if (currentStep) {
      contextText += `## Current Step: ${currentStep.title}\n`;
      if (currentStep.content) {
        contextText += `${currentStep.content}\n\n`;
      }
    }

    // All steps in the guide for broader context
    if (allSteps && allSteps.length > 0) {
      contextText += `## All Steps in Guide\n`;
      allSteps.forEach((step, index) => {
        contextText += `### Step ${index + 1}: ${step.title}\n`;
        if (step.content) {
          contextText += `${step.content}\n\n`;
        }
      });
    }

    // Attachment context by category
    if (generalFiles && generalFiles.length > 0) {
      contextText += `## General Documentation Files\n`;
      contextText += `Available files: ${generalFiles.map(f => f.name).join(', ')}\n`;
      contextText += `These are general documentation and resource files that provide background information.\n\n`;
    }

    if (faqFiles && faqFiles.length > 0) {
      contextText += `## FAQ Files\n`;
      contextText += `Available FAQ files: ${faqFiles.map(f => f.name).join(', ')}\n`;
      contextText += `These contain frequently asked questions and their answers specific to this integration.\n\n`;
    }

    if (otherHelpFiles && otherHelpFiles.length > 0) {
      contextText += `## Additional Help Files\n`;
      contextText += `Available help files: ${otherHelpFiles.map(f => f.name).join(', ')}\n`;
      contextText += `These contain supplementary help materials and troubleshooting guides.\n\n`;
    }

    return contextText;
  }

  // Extract text content from attachments (for actual file content)
  static extractAttachmentContent(attachments: any[]): string {
    // This would be enhanced to actually parse file contents
    // For now, we'll use file names and metadata
    return attachments.map(att => {
      return `File: ${att.name} (${att.category || 'uncategorized'})`;
    }).join('\n');
  }
}

// AI Service class
export class AIService {
  // Generate AI response using specified provider
  static async generateResponse(
    messages: ChatMessage[],
    context: KnowledgeContext,
    provider: AIProvider = 'anthropic',
    conversationContext?: ConversationContext
  ): Promise<AIResponse> {
    const contextText = KnowledgeBaseService.buildContext(context);
    
    // Build system message with context
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are an AI assistant helping users with an onboarding guide. You have access to the complete guide content, step information, and attached files.

Use this context to answer questions accurately:

${contextText}

Guidelines:
- Always base your answers on the provided context
- Reference specific steps, files, or guide sections when relevant
- If asked about files, mention which category they belong to (General, FAQ, or Other Help)
- Be helpful and provide actionable guidance
- If you don't have enough information in the context, say so clearly
- Keep responses concise but comprehensive`
    };

    const allMessages = [systemMessage, ...messages];

    // Store user message in conversation history if enabled
    if (conversationContext) {
      const { project, conversationId, userId, storage } = conversationContext;
      const settings = project.settings as any;
      
      if (settings?.conversationHistoryEnabled) {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
          await storage.storeConversationMessage({
            projectId: project.id,
            guideId: context.guide.id,
            stepId: context.currentStep?.id || null,
            flowBoxId: context.flowBox?.id || null,
            userId: userId,
            conversationId: conversationId,
            messageRole: 'user',
            messageContent: lastUserMessage.content,
            aiProvider: null,
            aiModel: null,
            contextData: {
              selectedFlow: context.flowBox?.id || 'all',
              provider: provider,
            },
          });
        }
      }
    }

    try {
      let response: AIResponse;
      
      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(allMessages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(allMessages);
          break;
        case 'xai':
          response = await this.callXAI(allMessages);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Store AI response in conversation history if enabled
      if (conversationContext) {
        const { project, conversationId, userId, storage } = conversationContext;
        const settings = project.settings as any;
        
        if (settings?.conversationHistoryEnabled) {
          await storage.storeConversationMessage({
            projectId: project.id,
            guideId: context.guide.id,
            stepId: context.currentStep?.id || null,
            flowBoxId: context.flowBox?.id || null,
            userId: userId,
            conversationId: conversationId,
            messageRole: 'assistant',
            messageContent: response.content,
            aiProvider: response.provider,
            aiModel: response.model,
            contextData: {
              selectedFlow: context.flowBox?.id || 'all',
              provider: provider,
            },
          });
        }
      }

      return response;
    } catch (error) {
      console.error(`AI Service Error (${provider}):`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
  }

  // OpenAI GPT-5 implementation
  private static async callOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      max_completion_tokens: 1500,
    });

    return {
      content: response.choices[0].message.content || 'No response generated',
      provider: 'openai',
      model: 'gpt-5',
      timestamp: new Date(),
    };
  }

  // Anthropic Claude implementation
  private static async callAnthropic(messages: ChatMessage[]): Promise<AIResponse> {
    // Extract system message and user messages
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-20250514", // newest Anthropic model
      system: systemMessage,
      messages: conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      max_tokens: 1500,
      temperature: 0.7,
    });

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : 'No response generated',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      timestamp: new Date(),
    };
  }

  // xAI Grok implementation
  private static async callXAI(messages: ChatMessage[]): Promise<AIResponse> {
    const response = await xaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 1500,
    });

    return {
      content: response.choices[0].message.content || 'No response generated',
      provider: 'xai',
      model: 'grok-2-1212',
      timestamp: new Date(),
    };
  }
}