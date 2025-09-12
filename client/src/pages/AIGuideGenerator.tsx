import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guide } from "@shared/schema";
import { Bot, User, Send, Sparkles, FileText, CheckCircle, Loader2, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIResponse {
  success: boolean;
  content: string;
  provider?: string;
  model?: string;
  timestamp?: string;
}

export default function AIGuideGenerator() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch all guides for selection
  const { data: guides, isLoading: guidesLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
    enabled: isAuthenticated,
  });

  // AI Generation mutation
  const generateMutation = useMutation({
    mutationFn: async ({ messages, guideId }: { messages: ChatMessage[]; guideId?: number }) => {
      const requestBody = {
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        ...(guideId && { guideId })
      };
      const response = await apiRequest("POST", "/api/guides/generate-ai", requestBody);
      return await response.json();
    },
  });

  // Import markdown mutation  
  const importMutation = useMutation({
    mutationFn: async ({ guideId, markdown }: { guideId: number; markdown: string }) => {
      // Parse markdown into flow boxes structure
      const flowBoxes = parseMarkdownContent(markdown);
      return await apiRequest("POST", "/api/guides/import-markdown", { guideId, flowBoxes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/steps"] });
      toast({
        title: "Success",
        description: "Guide imported successfully!",
        variant: "default",
      });
      // Reset the chat for a new guide generation session
      setMessages([]);
      setGeneratedMarkdown("");
      setShowPreview(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import the guide",
        variant: "destructive",
      });
    }
  });

  // Parse markdown content (reuse logic from MarkdownImport)
  const parseMarkdownContent = (content: string) => {
    const flowBoxes: any[] = [];
    const lines = content.split('\n');
    
    let currentFlowBox: any = null;
    let currentStep: any = null;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Flow box title (## Flow Name)
      if (line.startsWith('## ')) {
        // Save previous step if exists
        if (currentStep && currentFlowBox) {
          currentStep.content = contentLines.join('\n').trim();
          currentFlowBox.steps.push(currentStep);
        }
        
        // Save previous flow box if exists
        if (currentFlowBox) {
          flowBoxes.push(currentFlowBox);
        }
        
        // Start new flow box - match existing MarkdownImport logic
        const title = line.substring(3).trim();
        currentFlowBox = {
          title,
          description: '', // Will be filled from next line if it's italic
          steps: []
        };
        
        // Check if next line is the description (italic text)
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('*') && lines[i + 1].trim().endsWith('*')) {
          currentFlowBox.description = lines[i + 1].trim().slice(1, -1);
          i++; // Skip description line
        }
        
        currentStep = null;
        contentLines = [];
      }
      // Step title (### Step Name)
      else if (line.startsWith('### ')) {
        // Save previous step if exists
        if (currentStep && currentFlowBox) {
          currentStep.content = contentLines.join('\n').trim();
          currentFlowBox.steps.push(currentStep);
        }
        
        // Start new step
        const title = line.substring(4).trim();
        currentStep = {
          title,
          content: ''
        };
        contentLines = [];
      }
      // Content lines
      else if (currentStep && line.length > 0) {
        contentLines.push(lines[i]); // Keep original formatting
      }
    }
    
    // Save final step and flow box
    if (currentStep && currentFlowBox) {
      currentStep.content = contentLines.join('\n').trim();
      currentFlowBox.steps.push(currentStep);
    }
    if (currentFlowBox) {
      flowBoxes.push(currentFlowBox);
    }
    
    return flowBoxes;
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if message contains markdown guide (starts with ##)
  const isMarkdownGuide = (content: string) => {
    return content.trim().startsWith('##') && content.includes('###');
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsGenerating(true);

    try {
      const guideId = selectedGuideId ? parseInt(selectedGuideId) : undefined;
      const response = await generateMutation.mutateAsync({ 
        messages: updatedMessages, 
        guideId 
      });

      // Handle response properly - it might be wrapped or direct content
      const content = typeof response === 'string' ? response : 
                     response?.content || response?.message || 
                     JSON.stringify(response);

      if (content) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content,
          timestamp: new Date()
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Check if this is the final markdown guide
        if (isMarkdownGuide(content)) {
          setGeneratedMarkdown(content);
          setShowPreview(true);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Speech recognition error",
          description: "Please try again or check microphone permissions",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [toast]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        toast({
          title: "Speech recognition unavailable",
          description: "Your browser doesn't support speech recognition",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImportGuide = async () => {
    if (!selectedGuideId || !generatedMarkdown) {
      toast({
        title: "Missing information",
        description: "Please select a guide and ensure markdown is generated",
        variant: "destructive",
      });
      return;
    }

    await importMutation.mutateAsync({
      guideId: parseInt(selectedGuideId),
      markdown: generatedMarkdown
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Sign In Required</h1>
            <p className="text-muted-foreground">
              Please sign in to use the AI Guide Generator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">AI Guide Generator</h1>
          </div>
          <p className="text-muted-foreground">
            Chat with AI to create comprehensive onboarding guides automatically
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2 space-y-4">
            {/* Guide Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Target Guide (Optional - for context)
                  </label>
                  <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                    <SelectTrigger data-testid="select-guide">
                      <SelectValue placeholder={guidesLoading ? "Loading guides..." : "Select a guide to enhance (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {guides?.map((guide) => (
                        <SelectItem key={guide.id} value={guide.id.toString()}>
                          {guide.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Chat Messages */}
            <Card className="flex-1 min-h-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Guide Generation Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[500px]">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Start chatting to generate your guide!</p>
                        <p className="text-sm">Try: "I need to create a guide for setting up our API integration"</p>
                      </div>
                    )}
                    
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <div className="prose prose-sm max-w-none">
                            {isMarkdownGuide(message.content) ? (
                              <div className="bg-background/10 rounded p-2">
                                <Badge variant="secondary" className="mb-2">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Generated Guide
                                </Badge>
                                <div className="text-xs prose prose-xs">
                                  <ReactMarkdown>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            )}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isGenerating && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating response...
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <Separator className="my-4" />
                
                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe what kind of guide you want to create..."
                    disabled={isGenerating}
                    className="flex-1 min-h-[120px] resize-none"
                    data-testid="input-chat-message"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isGenerating}
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      data-testid="button-microphone"
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={isGenerating || !inputValue.trim()}
                      size="icon"
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview & Import Panel */}
          <div className="space-y-4">
            {showPreview && generatedMarkdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generated Guide Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <ScrollArea className="h-[300px]">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{generatedMarkdown}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Import this guide to create flow boxes and steps automatically.
                    </div>
                    
                    <Button
                      onClick={handleImportGuide}
                      disabled={!selectedGuideId || importMutation.isPending}
                      className="w-full"
                      data-testid="button-import-guide"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Import to Guide
                        </>
                      )}
                    </Button>
                    
                    {!selectedGuideId && (
                      <p className="text-xs text-orange-600">
                        Please select a target guide to import
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <strong>Describe your guide:</strong> Tell the AI what kind of onboarding guide you need
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <strong>Refine together:</strong> The AI will ask questions and show you a proposed structure
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <strong>Confirm & Generate:</strong> Say "Confirm" when ready and AI will create the full guide
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">4</span>
                    </div>
                    <div>
                      <strong>Import automatically:</strong> One click to add all flow boxes and steps to your guide
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}