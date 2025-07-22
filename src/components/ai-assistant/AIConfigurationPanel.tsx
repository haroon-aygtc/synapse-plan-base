"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Wand2,
  Brain,
  Target,
  Settings,
  Zap,
} from "lucide-react";
import {
  aiAssistant,
  type AgentConfiguration,
  type IntentAnalysis,
  type ConfigurationSuggestion,
  type SemanticAnalysis,
} from "@/lib/ai-assistant";

interface AIConfigurationPanelProps {
  onConfigurationUpdate: (config: Partial<AgentConfiguration>) => void;
  currentConfiguration: Partial<AgentConfiguration>;
  userExperience?: "beginner" | "intermediate" | "advanced";
  currentStep?: number;
}

export default function AIConfigurationPanel({
  onConfigurationUpdate,
  currentConfiguration,
  userExperience = "intermediate",
  currentStep = 1,
}: AIConfigurationPanelProps) {
  const [userInput, setUserInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intentAnalysis, setIntentAnalysis] = useState<IntentAnalysis | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<ConfigurationSuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showAdvancedSuggestions, setShowAdvancedSuggestions] = useState(false);

  const handleAnalyzeIntent = async () => {
    if (!userInput.trim()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Analyze user intent
      const analysis = await aiAssistant.analyzeIntent(userInput);
      setIntentAnalysis(analysis);

      // Generate configuration suggestions
      const configSuggestions =
        await aiAssistant.generateConfigurationSuggestions(
          userInput,
          currentConfiguration,
        );
      setSuggestions(configSuggestions);

      // Apply smart defaults based on analysis
      // Create a mock semantic analysis since we don't have real NLP processing
      const mockSemanticAnalysis: SemanticAnalysis = {
        entities: [],
        intents: [],
        sentiment: { score: 0, label: "neutral" },
        keywords: userInput.toLowerCase().split(/\s+/),
        complexity: 0.5,
        domain: "general"
      };
      
      const smartDefaults = aiAssistant.generateSmartDefaults(
        analysis,
        mockSemanticAnalysis,
      );

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      // Auto-apply high-confidence suggestions
      const autoApplyConfig: Partial<AgentConfiguration> = {
        ...smartDefaults,
        category: analysis.category,
        personality: analysis.suggestedPersonality,
        model: analysis.suggestedModel,
      };

      onConfigurationUpdate(autoApplyConfig);

      setTimeout(() => {
        setAnalysisProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: ConfigurationSuggestion) => {
    const newConfig = {
      ...currentConfiguration,
      [suggestion.field]: suggestion.value,
    };
    onConfigurationUpdate(newConfig);
    setAppliedSuggestions(
      (prev) => new Set([...Array.from(prev), suggestion.field as string]),
    );
  };

  const handleOptimizeConfiguration = async () => {
    if (!userInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const optimization = await aiAssistant.optimizeConfiguration(
        currentConfiguration,
        userInput,
      );

      onConfigurationUpdate(optimization.optimizedConfig);

      // Show optimization improvements
      console.log("Optimizations applied:", optimization.improvements);
    } catch (error) {
      console.error("Optimization error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProgressiveDisclosure = () => {
    return aiAssistant.determineProgressiveDisclosure(
      userExperience,
      currentStep,
    );
  };

  const disclosure = getProgressiveDisclosure();

  return (
    <div className="space-y-6 bg-background">
      {/* AI Assistant Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles color="hsl(var(--primary))" size={20} />
            AI Configuration Assistant
            <Badge variant="secondary" className="ml-2">
              {userExperience}
            </Badge>
          </CardTitle>
          <CardDescription>
            Describe your agent's purpose and I'll help configure it optimally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-input">What should your agent do?</Label>
            <Textarea
              id="ai-input"
              placeholder="e.g., 'I need a customer support agent that can handle billing questions, be friendly but professional, and escalate complex issues to humans'"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyzeIntent}
              disabled={isAnalyzing || !userInput.trim()}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze & Configure
                </>
              )}
            </Button>

            {intentAnalysis && (
              <Button
                variant="outline"
                onClick={handleOptimizeConfiguration}
                disabled={isAnalyzing}
              >
                <Zap className="mr-2 h-4 w-4" />
                Optimize
              </Button>
            )}
          </div>

          {isAnalyzing && analysisProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing your requirements...</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intent Analysis Results */}
      {intentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Intent Analysis
              <Badge
                variant={
                  intentAnalysis.confidence > 0.8 ? "default" : "secondary"
                }
              >
                {Math.round(intentAnalysis.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Detected Category</Label>
                <Badge variant="outline" className="mt-1">
                  {intentAnalysis.category.replace("-", " ").toUpperCase()}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Suggested Personality
                </Label>
                <Badge variant="outline" className="mt-1">
                  {intentAnalysis.suggestedPersonality.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Recommended Model</Label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {intentAnalysis.suggestedModel}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Suggested Capabilities
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {intentAnalysis.suggestedCapabilities.map(
                  (capability, index) => (
                    <Badge key={index} variant="outline">
                      {capability}
                    </Badge>
                  ),
                )}
              </div>
            </div>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>AI Reasoning:</strong> {intentAnalysis.reasoning}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Configuration Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-blue-600" />
              Smart Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered recommendations to optimize your agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions
              .filter((s) => s.confidence > 0.6)
              .slice(0, showAdvancedSuggestions ? suggestions.length : 3)
              .map((suggestion, index) => {
                const isApplied = appliedSuggestions.has(
                  suggestion.field as string,
                );
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium capitalize">
                          {suggestion.field
                            .replace(/([A-Z])/g, " $1")
                            .toLowerCase()}
                        </Label>
                        <Badge
                          variant={
                            suggestion.confidence > 0.8
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        {isApplied && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.reasoning}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Suggested: {String(suggestion.value)}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant={isApplied ? "secondary" : "default"}
                      onClick={() => applySuggestion(suggestion)}
                      disabled={isApplied}
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </Button>
                  </div>
                );
              })}

            {suggestions.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setShowAdvancedSuggestions(!showAdvancedSuggestions)
                }
                className="w-full"
              >
                {showAdvancedSuggestions
                  ? "Show Less"
                  : `Show ${suggestions.length - 3} More Suggestions`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progressive Disclosure Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Next Steps
            <Badge variant="outline">Step {currentStep} of 4</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm font-medium">
              Recommended for your level ({userExperience}):
            </Label>
            <ul className="mt-2 space-y-1">
              {disclosure.recommendedNextSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">
              Focus on these fields:
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {disclosure.visibleFields.map((field, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {field.replace(/([A-Z])/g, " $1").toLowerCase()}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Configuration Validation */}
      {Object.keys(currentConfiguration).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Configuration Status
              <Badge variant="outline" className="ml-2">
                {(() => {
                  const validation =
                    aiAssistant.validateConfiguration(currentConfiguration);
                  return validation.readinessScore >= 80
                    ? "Ready"
                    : validation.readinessScore >= 60
                      ? "Good"
                      : validation.readinessScore >= 40
                        ? "Needs Work"
                        : "Incomplete";
                })()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const validation =
                aiAssistant.validateConfiguration(currentConfiguration);
              return (
                <div className="space-y-4">
                  {/* Readiness Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">
                        Readiness Score
                      </Label>
                      <span className="text-sm font-medium">
                        {validation.readinessScore || 0}/100
                      </span>
                    </div>
                    <Progress
                      value={validation.readinessScore || 0}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Incomplete</span>
                      <span>Production Ready</span>
                    </div>
                  </div>

                  {/* Completeness */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">
                        Configuration Completeness
                      </Label>
                      <span className="text-sm font-medium">
                        {validation.completeness || 0}%
                      </span>
                    </div>
                    <Progress
                      value={validation.completeness || 0}
                      className="h-2"
                    />
                  </div>

                  <Separator />

                  {/* Errors */}
                  {validation.errors && validation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Critical Issues:</p>
                          <ul className="list-disc list-inside text-sm">
                            {validation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Warnings */}
                  {validation.warnings && validation.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">Warnings:</p>
                          <ul className="list-disc list-inside text-sm">
                            {validation.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Suggestions */}
                  {validation.suggestions &&
                    validation.suggestions.length > 0 && (
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <p className="font-medium">Suggestions:</p>
                            <ul className="list-disc list-inside text-sm">
                              {validation.suggestions.map(
                                (suggestion, index) => (
                                  <li key={index}>{suggestion}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* Success State */}
                  {validation.isValid &&
                    (validation.readinessScore || 0) >= 80 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Excellent!</strong> Your agent configuration
                          is production-ready. All requirements are met and best
                          practices are followed.
                        </AlertDescription>
                      </Alert>
                    )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
