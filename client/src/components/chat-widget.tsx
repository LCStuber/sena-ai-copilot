import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  X, 
  Send, 
  User, 
  Bot, 
  ExternalLink,
  Search,
  FileText,
  Target,
  CheckCircle,
  Archive
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AgentMessage, AgentChatResponse } from "@shared/schema";

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(
        "POST",
        "/api/agent/chat",
        {
          message,
          conversationHistory: messages.slice(-5) // Send last 5 messages for context
        }
      );
      return await response.json() as AgentChatResponse;
    },
    onSuccess: (response) => {
      const assistantMessage: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        actionResults: response.actionResults
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Invalidate relevant queries if actions were performed
      if (response.actionResults && response.actionResults.length > 0) {
        const actionTypes = response.actionResults?.map(result => result.type) || [];
        if (actionTypes.includes('company_research') || actionTypes.includes('artifact')) {
          queryClient.invalidateQueries({ queryKey: ['/api/artifacts'] });
        }
        if (actionTypes.includes('transcript_analysis') || actionTypes.includes('framework_notes')) {
          queryClient.invalidateQueries({ queryKey: ['/api/framework-notes'] });
        }
        if (actionTypes.includes('next_best_action') || actionTypes.includes('nba')) {
          queryClient.invalidateQueries({ queryKey: ['/api/nbas'] });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    chatMutation.mutate(inputMessage.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "company_research":
        return <Search className="w-4 h-4" />;
      case "transcript_analysis":
      case "framework_notes":
        return <FileText className="w-4 h-4" />;
      case "next_best_action":
      case "nba":
        return <Target className="w-4 h-4" />;
      case "nba_completed":
        return <CheckCircle className="w-4 h-4" />;
      case "artifacts_list":
      case "artifact":
        return <Archive className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "company_research":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "transcript_analysis":
      case "framework_notes":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "next_best_action":
      case "nba":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "nba_completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "artifacts_list":
      case "artifact":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200 ${
          isOpen ? "bg-primary/10 hover:bg-primary/20" : ""
        } ${className}`}
        size="lg"
        data-testid="button-chat-toggle"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Widget */}
      {isOpen && (
        <Card className="fixed bottom-24 right-3 left-3 sm:right-6 sm:left-auto z-40 w-full sm:w-96 max-w-md h-[500px] max-h-[70vh] shadow-2xl border-2 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" data-testid="text-chat-title">Talk to SENA</h3>
                  <p className="text-xs text-muted-foreground">Your AI Sales Assistant</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>👋 Hi! I'm SENA, your AI sales assistant.</p>
                    <p className="mt-2">I can help you with:</p>
                    <ul className="mt-2 text-xs space-y-1">
                      <li>• Company research</li>
                      <li>• Transcript analysis</li>
                      <li>• Meeting preparation</li>
                      <li>• Next best actions</li>
                    </ul>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.role === "user" ? "order-1" : ""}`}>
                      <div 
                        className={`rounded-lg p-3 text-sm ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground ml-auto" 
                            : "bg-muted"
                        }`}
                        data-testid={`message-${message.role}-${message.id}`}
                      >
                        {message.content}
                      </div>
                      
                      {message.actionResults && message.actionResults.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.actionResults.map((result, index) => (
                            <Card key={index} className="text-xs bg-background border">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getActionIcon(result.type)}
                                    <span className="font-medium">{result.title}</span>
                                  </div>
                                  <Badge variant="secondary" className={`text-xs ${getActionColor(result.type)}`}>
                                    {result.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                
                                {result.description && (
                                  <p className="text-muted-foreground mb-2">{result.description}</p>
                                )}
                                
                                {result.link && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    asChild
                                    data-testid={`button-action-link-${index}`}
                                  >
                                    <a href={result.link} className="flex items-center gap-1">
                                      View Details <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {message.role === "user" && (
                      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            <Separator />

            {/* Input Area */}
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your sales process..."
                  className="flex-1 text-sm"
                  disabled={chatMutation.isPending}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chatMutation.isPending}
                  size="sm"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}