'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';
import {
  Brain,
  Sparkles,
  Target,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Zap
} from 'lucide-react';
import { aiAssistant } from '@/lib/ai-assistant';
import type { IntentAnalysis, SemanticAnalysis } from '@/lib/ai-assistant';

interface NaturalLanguageProcessorProps {
  onAnalysisComplete?: (analysis: IntentAnalysis, semanticAnalysis: SemanticAnalysis) => void;
  className?: string;
}

export function NaturalLanguageProcessor({ onAnalysisComplete, className }: NaturalLanguageProcessorProps) {
  const [userInput, setUserInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intentAnalysis, setIntentAnalysis] = useState<IntentAnalysis | null>(null);
  const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analyzeUserIntent = useCallback(async () => {
    if (!userInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please describe what you want your agent to do.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Step 1: Intent Analysis
      setAnalysisProgress(25);
      const intentResult = await aiAssistant.analyzeIntent(userInput);
      setIntentAnalysis(intentResult);

      // Step 2: Semantic Analysis
      setAnalysisProgress(50);
      const semanticResult = await (aiAssistant as any).performSemanticAnalysis(userInput);
      setSemanticAnalysis(semanticResult);

      setAnalysisProgress(100);

      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete(intentResult, semanticResult);
      }

      toast({
        title: 'Analysis Complete',
        description: 'Successfully analyzed your requirements.',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze your input. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, [userInput, onAnalysisComplete]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Natural Language Processing</span>
          </CardTitle>
          <CardDescription>
            Describe what you want your agent to do, and we'll analyze your requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe your agent's purpose</label>
            <Textarea
              placeholder="I want an agent that can help customers with product inquiries, handle complaints professionally, and provide detailed product information. It should be friendly but professional, and able to escalate complex issues to human support when needed."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="min-h-[120px]"
              disabled={isAnalyzing}
            />
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing...</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}

          <Button
            onClick={analyzeUserIntent}
            disabled={isAnalyzing || !userInput.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Requirements
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Intent Analysis Results */}
      {intentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Intent Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Category:</span>
                  <Badge variant="outline">{intentAnalysis.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence:</span>
                  <span className={`text-sm font-medium ${getConfidenceColor(intentAnalysis.confidence)}`}>
                    {Math.round(intentAnalysis.confidence * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Suggested Model:</span>
                  <Badge variant="secondary">{intentAnalysis.suggestedModel}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Personality:</span>
                  <Badge variant="outline">{intentAnalysis.suggestedPersonality}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Suggested Capabilities:</span>
                <div className="flex flex-wrap gap-1">
                  {intentAnalysis.suggestedCapabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Analysis Reasoning</p>
                  <p className="text-sm text-muted-foreground mt-1">{intentAnalysis.reasoning}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Semantic Analysis Results */}
      {semanticAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span>Semantic Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium mb-2 block">Detected Entities:</span>
                  <div className="space-y-1">
                    {semanticAnalysis.entities.length > 0 ? (
                      semanticAnalysis.entities.map((entity, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{entity.text}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                            <span className={`text-xs ${getConfidenceColor(entity.confidence)}`}>
                              {Math.round(entity.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No entities detected</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium mb-2 block">Detected Intents:</span>
                  <div className="space-y-1">
                    {semanticAnalysis.intents.length > 0 ? (
                      semanticAnalysis.intents.map((intent, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{intent.intent}</span>
                          <span className={`text-xs ${getConfidenceColor(intent.confidence)}`}>
                            {Math.round(intent.confidence * 100)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific intents detected</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sentiment:</span>
                  <Badge className={getSentimentColor(semanticAnalysis.sentiment.label)}>
                    {semanticAnalysis.sentiment.label} ({semanticAnalysis.sentiment.score.toFixed(2)})
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complexity:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${semanticAnalysis.complexity * 100}%` }}
                      />
                    </div>
                    <span className="text-xs">{Math.round(semanticAnalysis.complexity * 100)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Domain:</span>
                  <Badge variant="outline">{semanticAnalysis.domain}</Badge>
                </div>

                <div>
                  <span className="text-sm font-medium mb-2 block">Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {semanticAnalysis.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}