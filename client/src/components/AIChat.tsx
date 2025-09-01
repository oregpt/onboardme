import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain,
  X,
  Minimize2,
  Maximize2
} from "lucide-react";
import type { Step, FlowBox, Guide } from "@shared/schema";

interface AIChatProps {
  guide: Guide;
  flowBox: FlowBox;
  currentStep: Step;
  allSteps: Step[];
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

export function AIChat({ guide, flowBox, currentStep, allSteps, isOpen, onToggle }: AIChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'xai'>('anthropic');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, provider }: { message: string; provider: string }) => {
      return await apiRequest("POST", "/api/ai/chat", {
        message,
        provider,
        guideId: guide.id,
        flowBoxId: flowBox.id,
        stepId: currentStep.id,
      });
    },
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        provider: response.provider,
        model: response.model,
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      console.error("Chat error:", error);
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    chatMutation.mutate({
      message: inputValue.trim(),
      provider: selectedProvider,
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

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        data-testid="button-open-ai-chat"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 shadow-xl z-50 ${isMinimized ? 'h-14' : 'h-[600px]'} flex flex-col`}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
          <Badge variant="outline" className="text-xs">
            {currentStep.title}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            data-testid="button-minimize-chat"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            data-testid="button-close-chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <div className="flex items-center justify-between p-2 border-b bg-muted/30">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">AI Model:</span>
              <div className="flex space-x-1">
                {(['anthropic', 'openai', 'xai'] as const).map(provider => (
                  <Button
                    key={provider}
                    variant={selectedProvider === provider ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProvider(provider)}
                    className="h-6 px-2 text-xs"
                    data-testid={`button-select-${provider}`}
                  >
                    {provider === 'anthropic' && 'Claude'}
                    {provider === 'openai' && 'GPT-5'}
                    {provider === 'xai' && 'Grok'}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="h-6 px-2 text-xs"
              data-testid="button-clear-chat"
            >
              Clear
            </Button>
          </div>

          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm">Ask me anything about this guide!</p>
                    <p className="text-xs mt-1">I have access to all steps, files, and agent instructions.</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-2 ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                      data-testid={`message-${index}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block rounded-lg px-3 py-2 max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.provider && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.provider} • {message.model}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatMutation.isPending && (
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block rounded-lg px-3 py-2 bg-muted">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-3">
                <div className="flex space-x-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about this step, the guide, or attached files..."
                    className="flex-1 resize-none"
                    rows={2}
                    disabled={chatMutation.isPending}
                    data-testid="textarea-chat-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || chatMutation.isPending}
                    size="sm"
                    className="self-end"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}