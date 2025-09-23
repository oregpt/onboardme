import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { useProjectContext } from "@/components/AppLayout";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain,
  Trash2
} from "lucide-react";
import type { Guide } from "@shared/schema";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

export default function Chat() {
  const { toast } = useToast();
  const { isWhiteLabel } = useWhiteLabel();
  
  // Only call useAuth if NOT in white-label mode
  const authResult = isWhiteLabel ? { user: null, isAuthenticated: false } : useAuth();
  const { user, isAuthenticated } = authResult;
  const { selectedProjectId } = useProjectContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'xai'>('anthropic');
  const [selectedGuideId, setSelectedGuideId] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get guides that user has access to (enable in white-label mode or when authenticated)
  const { data: allGuides, isLoading: guidesLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
    enabled: isAuthenticated || isWhiteLabel
  });

  // Filter guides by selected project (same logic as Guides component)
  const guides = useMemo(() => {
    if (!allGuides) return [];
    if (!selectedProjectId) return allGuides; // Show all if no project selected
    return allGuides.filter(guide => guide.projectId === selectedProjectId);
  }, [allGuides, selectedProjectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, provider }: { message: string; provider: string }) => {
      // For the page version, we use selectedGuideId instead of flowBoxId/stepId
      const guideId = selectedGuideId === 'all' ? guides?.[0]?.id : parseInt(selectedGuideId);
      
      if (!guideId) {
        throw new Error('Please select a guide to chat about');
      }

      const response = await apiRequest("POST", "/api/ai/chat", {
        message,
        provider,
        guideId: guideId,
        // For the full page version, we don't specify flowBoxId/stepId to get general guide context
        flowBoxId: null,
        stepId: null,
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        provider: data.provider,
        model: data.model
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    chatMutation.mutate({
      message: inputValue.trim(),
      provider: selectedProvider
    });
    
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Only require authentication if NOT in white-label mode
  if (!isAuthenticated && !isWhiteLabel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please sign in to use the chat feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4">
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              <CardTitle>AI Chat Assistant</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                disabled={messages.length === 0}
                data-testid="button-clear-chat"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
          
          {/* Guide and Provider Selection */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Guide Context</label>
              <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                <SelectTrigger data-testid="select-guide">
                  <SelectValue placeholder="Select a guide..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guides</SelectItem>
                  {guides?.map((guide) => (
                    <SelectItem key={guide.id} value={guide.id.toString()}>
                      {guide.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">AI Provider</label>
              <Select value={selectedProvider} onValueChange={(value: 'openai' | 'anthropic' | 'xai') => setSelectedProvider(value)}>
                <SelectTrigger data-testid="select-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>Anthropic (Claude)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <span>OpenAI (GPT-4)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="xai">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>xAI (Grok)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-sm max-w-md">
                  Ask questions about your guides, get help with onboarding steps, or explore guide content. 
                  Select a guide for specific context or choose "All Guides" for general questions.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    {message.role === 'assistant' && message.provider && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <Badge variant="secondary" className="text-xs">
                          {message.provider} {message.model && `• ${message.model}`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about your guides..."
                className="resize-none min-h-[44px] max-h-32"
                disabled={chatMutation.isPending || guidesLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || chatMutation.isPending || guidesLoading}
                className="self-end"
                data-testid="button-send-message"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}