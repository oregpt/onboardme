import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  X,
  Minimize2,
  Maximize2,
  MessageCircle
} from "lucide-react";
import type { Step, FlowBox, Guide } from "@shared/schema";

interface WhiteLabelChatProps {
  guide: Guide;
  flowBox: FlowBox | null;
  currentStep: Step | null;
  allSteps: Step[];
  allFlowBoxes: FlowBox[];
  isOpen: boolean;
  onToggle: () => void;
  closable?: boolean;
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
}

export function WhiteLabelChat({ 
  guide, 
  flowBox, 
  currentStep, 
  allSteps, 
  allFlowBoxes, 
  isOpen, 
  onToggle,
  closable = true,
  theme 
}: WhiteLabelChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<'claude' | 'openai' | 'xai'>('claude');
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flowBox?.id?.toString() || 'all');
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
      const selectedFlow = selectedFlowId === 'all' ? null : parseInt(selectedFlowId);
      const selectedStep = selectedFlowId === 'all' ? null : currentStep?.id;
      
      // Use public API endpoint for custom domains
      const response = await apiRequest("POST", "/public/ai/chat", {
        message,
        provider,
        guideId: guide.id,
        flowBoxId: selectedFlow,
        stepId: selectedStep,
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        provider: selectedProvider,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setInputValue("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate({ message: inputValue, provider: selectedProvider });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50"
         style={{ backgroundColor: theme?.background }}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-200"
                  style={{ backgroundColor: theme?.secondary }}>
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-600" style={{ color: theme?.primary }} />
          <CardTitle className="text-lg font-semibold" style={{ color: theme?.text }}>
            Guide Assistant
          </CardTitle>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          {closable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Settings */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Flow Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" style={{ color: theme?.text }}>
                Ask about:
              </label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All guide content</SelectItem>
                  {allFlowBoxes.map((fb) => (
                    <SelectItem key={fb.id} value={fb.id.toString()}>
                      {fb.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" style={{ color: theme?.text }}>
                AI Provider:
              </label>
              <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="openai">GPT-4 (OpenAI)</SelectItem>
                  <SelectItem value="xai">Grok (xAI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm" style={{ color: theme?.text }}>
                  Ask me anything about "{guide.title}"
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  I can help explain steps, answer questions, and provide guidance.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`} style={{
                  backgroundColor: message.role === 'user' ? theme?.primary : theme?.secondary,
                  color: message.role === 'user' ? 'white' : theme?.text
                }}>
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-4 h-4 mt-0.5 text-gray-600 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="w-4 h-4 mt-0.5 text-white flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]" style={{ backgroundColor: theme?.secondary }}>
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-gray-600" />
                    <div className="flex space-x-1">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      <span className="text-sm text-gray-600" style={{ color: theme?.text }}>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about this guide..."
                className="flex-1 min-h-[60px] resize-none"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || chatMutation.isPending}
                className="px-4 py-2 h-auto"
                style={{ backgroundColor: theme?.primary }}
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2" style={{ color: theme?.text }}>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
}