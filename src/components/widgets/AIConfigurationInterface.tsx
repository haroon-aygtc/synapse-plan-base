"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Zap,
  Target,
  Settings,
  Globe,
  Shield,
  Palette,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface AIConfigurationInterfaceProps {
  widget: any;
  onUpdate: (updates: any) => void;
  onConfigurationUpdate: (configUpdates: any) => void;
}

interface AIAnalysis {
  suggestedTheme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    reasoning: string;
  };
  suggestedLayout: {
    position: string;
    width: number;
    height: number;
    responsive: boolean;
    reasoning: string;
  };
  suggestedBehavior: {
    autoOpen: boolean;
    showWelcomeMessage: boolean;
    enableTypingIndicator: boolean;
    reasoning: string;
  };
  suggestedSecurity: {
    requireAuth: boolean;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
    };
    reasoning: string;
  };
  confidence: number;
  recommendations: string[];
}

export function AIConfigurationInterface({
  widget,
  onUpdate,
  onConfigurationUpdate,
}: AIConfigurationInterfaceProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [userDescription, setUserDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [newUseCase, setNewUseCase] = useState("");
  const [industry, setIndustry] = useState("");
  const [brandColors, setBrandColors] = useState({
    primary: "",
    secondary: "",
  });

  const handleAnalyze = async () => {
    if (!userDescription.trim()) {
      toast({
        title: "Description Required",
        description:
          "Please provide a description of your widget to get AI recommendations",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await apiClient.post("/ai-assistant/analyze-widget", {
        description: userDescription,
        targetAudience,
        useCases,
        industry,
        brandColors,
        currentConfiguration: widget.configuration,
        sourceType: widget.type,
        sourceId: widget.sourceId,
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (response.data.success) {
        setAnalysis(response.data.data);
        toast({
          title: "Analysis Complete",
          description:
            "AI has analyzed your requirements and generated recommendations",
        });
      } else {
        throw new Error(response.data.message || "Analysis failed");
      }
    } catch (error: any) {
      console.error("AI analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to analyze widget requirements",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 2000);
    }
  };

  const applyRecommendation = (
    category: "theme" | "layout" | "behavior" | "security",
  ) => {
    if (!analysis) return;

    const updates: any = {};

    switch (category) {
      case "theme":
        updates.theme = {
          ...widget.configuration.theme,
          ...analysis.suggestedTheme,
        };
        break;
      case "layout":
        updates.layout = {
          ...widget.configuration.layout,
          ...analysis.suggestedLayout,
        };
        break;
      case "behavior":
        updates.behavior = {
          ...widget.configuration.behavior,
          ...analysis.suggestedBehavior,
        };
        break;
      case "security":
        updates.security = {
          ...widget.configuration.security,
          ...analysis.suggestedSecurity,
        };
        break;
    }

    onConfigurationUpdate(updates);
    toast({
      title: "Applied Recommendation",
      description: `${category.charAt(0).toUpperCase() + category.slice(1)} settings have been updated`,
    });
  };

  const applyAllRecommendations = () => {
    if (!analysis) return;

    onConfigurationUpdate({
      theme: {
        ...widget.configuration.theme,
        ...analysis.suggestedTheme,
      },
      layout: {
        ...widget.configuration.layout,
        ...analysis.suggestedLayout,
      },
      behavior: {
        ...widget.configuration.behavior,
        ...analysis.suggestedBehavior,
      },
      security: {
        ...widget.configuration.security,
        ...analysis.suggestedSecurity,
      },
    });

    toast({
      title: "All Recommendations Applied",
      description:
        "Your widget configuration has been optimized based on AI recommendations",
    });
  };

  const addUseCase = () => {
    if (newUseCase.trim() && !useCases.includes(newUseCase.trim())) {
      setUseCases([...useCases, newUseCase.trim()]);
      setNewUseCase("");
    }
  };

  const removeUseCase = (useCase: string) => {
    setUseCases(useCases.filter((uc) => uc !== useCase));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Configuration
          </CardTitle>
          <CardDescription>
            Describe your widget requirements and let AI optimize the
            configuration for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Widget Description</Label>
            <Textarea
              id="description"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder="Describe what your widget should do, how it should look, and how users will interact with it..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Business professionals, Students, Developers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Use Cases</Label>
            <div className="flex gap-2">
              <Input
                value={newUseCase}
                onChange={(e) => setNewUseCase(e.target.value)}
                placeholder="Add a use case"
                onKeyPress={(e) => e.key === "Enter" && addUseCase()}
              />
              <Button onClick={addUseCase} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {useCases.map((useCase, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeUseCase(useCase)}
                >
                  {useCase} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Brand Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={brandColors.primary}
                  onChange={(e) =>
                    setBrandColors((prev) => ({
                      ...prev,
                      primary: e.target.value,
                    }))
                  }
                  className="w-16 h-9 p-1"
                />
                <Input
                  value={brandColors.primary}
                  onChange={(e) =>
                    setBrandColors((prev) => ({
                      ...prev,
                      primary: e.target.value,
                    }))
                  }
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Brand Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={brandColors.secondary}
                  onChange={(e) =>
                    setBrandColors((prev) => ({
                      ...prev,
                      secondary: e.target.value,
                    }))
                  }
                  className="w-16 h-9 p-1"
                />
                <Input
                  value={brandColors.secondary}
                  onChange={(e) =>
                    setBrandColors((prev) => ({
                      ...prev,
                      secondary: e.target.value,
                    }))
                  }
                  placeholder="#64748b"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !userDescription.trim()}
              className="flex-1"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing
                ? "Analyzing..."
                : "Analyze & Generate Recommendations"}
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing requirements...</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Recommendations
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Confidence: {Math.round(analysis.confidence * 100)}%
              </span>
              <Button onClick={applyAllRecommendations} size="sm">
                Apply All
              </Button>
            </div>
          </div>

          {/* Theme Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme & Styling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: analysis.suggestedTheme.primaryColor,
                      }}
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: analysis.suggestedTheme.secondaryColor,
                      }}
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor:
                          analysis.suggestedTheme.backgroundColor,
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => applyRecommendation("theme")}
                    size="sm"
                    variant="outline"
                  >
                    Apply Theme
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.suggestedTheme.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Layout Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Layout & Positioning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      Position: {analysis.suggestedLayout.position}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Size: {analysis.suggestedLayout.width}×
                      {analysis.suggestedLayout.height}px
                    </div>
                  </div>
                  <Button
                    onClick={() => applyRecommendation("layout")}
                    size="sm"
                    variant="outline"
                  >
                    Apply Layout
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.suggestedLayout.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Behavior Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Behavior & Interaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      {analysis.suggestedBehavior.autoOpen && (
                        <Badge variant="secondary">Auto-open</Badge>
                      )}
                      {analysis.suggestedBehavior.showWelcomeMessage && (
                        <Badge variant="secondary">Welcome message</Badge>
                      )}
                      {analysis.suggestedBehavior.enableTypingIndicator && (
                        <Badge variant="secondary">Typing indicator</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => applyRecommendation("behavior")}
                    size="sm"
                    variant="outline"
                  >
                    Apply Behavior
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.suggestedBehavior.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      {analysis.suggestedSecurity.requireAuth && (
                        <Badge variant="secondary">Auth required</Badge>
                      )}
                      {analysis.suggestedSecurity.rateLimiting.enabled && (
                        <Badge variant="secondary">
                          Rate limit:{" "}
                          {
                            analysis.suggestedSecurity.rateLimiting
                              .requestsPerMinute
                          }
                          /min
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => applyRecommendation("security")}
                    size="sm"
                    variant="outline"
                  >
                    Apply Security
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.suggestedSecurity.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* General Recommendations */}
          {analysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Additional Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
