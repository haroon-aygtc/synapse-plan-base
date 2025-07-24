"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Zap,
  Eye,
  Settings,
} from "lucide-react";

interface TestInContextFormProps {
  tool: any;
  workflowContext?: any;
  onTest: (toolId: string, testData: any) => Promise<any>;
  loading: boolean;
  result?: any;
}

export default function TestInContextForm({
  tool,
  workflowContext,
  onTest,
  loading,
  result,
}: TestInContextFormProps) {
  const [testParameters, setTestParameters] = useState<string>("{}");
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [mockVariables, setMockVariables] = useState<string>("{}");
  const [mockPreviousResults, setMockPreviousResults] = useState<string>("{}");
  const [executionId, setExecutionId] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (workflowContext?.selectedStep) {
      setSelectedStep(workflowContext.selectedStep);
    } else if (workflowContext?.toolSteps?.length > 0) {
      setSelectedStep(workflowContext.toolSteps[0]);
    }
  }, [workflowContext]);

  useEffect(() => {
    if (result) {
      setTestResult(result);
    }
  }, [result]);

  const handleTest = async () => {
    if (!tool) return;

    try {
      const parameters = JSON.parse(testParameters);
      const variables = JSON.parse(mockVariables);
      const previousResults = JSON.parse(mockPreviousResults);

      const testData = {
        functionName: "execute",
        parameters,
        workflowId: workflowContext?.workflowId,
        workflowContext: selectedStep
          ? {
              stepId: selectedStep.stepId,
              stepName: selectedStep.stepName,
              stepType: selectedStep.stepType,
              previousStepResults: previousResults,
              workflowVariables: variables,
              executionId: executionId || `test_${Date.now()}`,
            }
          : undefined,
      };

      await onTest(tool.id, testData);
    } catch (error) {
      console.error("Test failed:", error);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6 bg-background">
      {/* Context Information */}
      {workflowContext && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Workflow Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Workflow:</strong> {workflowContext.workflowName}
              </div>
              <div>
                <strong>ID:</strong> {workflowContext.workflowId}
              </div>
            </div>

            {workflowContext.toolSteps &&
              workflowContext.toolSteps.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">
                    Select Step to Test:
                  </div>
                  <Select
                    value={selectedStep?.stepId || ""}
                    onValueChange={(value) => {
                      const step = workflowContext.toolSteps.find(
                        (s: any) => s.stepId === value,
                      );
                      setSelectedStep(step);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workflow step" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowContext.toolSteps.map((step: any) => (
                        <SelectItem key={step.stepId} value={step.stepId}>
                          Step {step.stepIndex + 1}: {step.stepName} (
                          {step.stepType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {selectedStep && (
              <div className="bg-muted p-3 rounded">
                <div className="text-sm font-medium mb-2">
                  Selected Step Details:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <strong>Name:</strong> {selectedStep.stepName}
                  </div>
                  <div>
                    <strong>Type:</strong> {selectedStep.stepType}
                  </div>
                  <div>
                    <strong>ID:</strong> {selectedStep.stepId}
                  </div>
                  <div>
                    <strong>Index:</strong> {selectedStep.stepIndex}
                  </div>
                </div>
                {selectedStep.contextPreview?.availableVariables && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1">
                      Available Variables:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStep.contextPreview.availableVariables.map(
                        (variable: string) => (
                          <Badge
                            key={variable}
                            variant="secondary"
                            className="text-xs"
                          >
                            {variable}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Test Parameters (JSON)
            </label>
            <Textarea
              value={testParameters}
              onChange={(e) => setTestParameters(e.target.value)}
              placeholder='{ "param1": "value1", "param2": "value2" }'
              className="font-mono text-sm"
              rows={4}
            />
          </div>

          {workflowContext && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mock Workflow Variables (JSON)
                </label>
                <Textarea
                  value={mockVariables}
                  onChange={(e) => setMockVariables(e.target.value)}
                  placeholder='{ "variable1": "value1", "variable2": "value2" }'
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mock Previous Step Results (JSON)
                </label>
                <Textarea
                  value={mockPreviousResults}
                  onChange={(e) => setMockPreviousResults(e.target.value)}
                  placeholder='{ "step1_result": { "data": "value" }, "step2_result": { "status": "success" } }'
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Execution ID (Optional)
                </label>
                <Input
                  value={executionId}
                  onChange={(e) => setExecutionId(e.target.value)}
                  placeholder="Leave empty for auto-generated ID"
                />
              </div>
            </>
          )}

          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {loading ? "Testing..." : "Run Test in Context"}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              Test Results
              <Badge
                variant={testResult.success ? "default" : "destructive"}
                className="ml-2"
              >
                {testResult.success ? "Success" : "Failed"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="result" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="result">Result</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="recommendations">
                  Recommendations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="result" className="space-y-3">
                {testResult.success ? (
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-2">
                      Execution Result:
                    </div>
                    <pre className="text-xs text-green-700 whitespace-pre-wrap">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-red-50 p-4 rounded border border-red-200">
                    <div className="text-sm font-medium text-red-800 mb-2">
                      Error:
                    </div>
                    <div className="text-sm text-red-700">
                      {testResult.error}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="context" className="space-y-3">
                {testResult.context &&
                Object.keys(testResult.context).length > 0 ? (
                  <div className="bg-muted p-4 rounded">
                    <div className="text-sm font-medium mb-2">
                      Execution Context:
                    </div>
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(testResult.context, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No context data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium">
                            Execution Time
                          </div>
                          <div className="text-lg font-bold">
                            {testResult.executionTime}ms
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium">Cost</div>
                          <div className="text-lg font-bold">
                            ${(testResult.cost || 0).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-3">
                {testResult.recommendations &&
                testResult.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {testResult.recommendations.map(
                      (rec: any, index: number) => (
                        <Alert key={index}>
                          <div className="flex items-start gap-2">
                            {rec.type === "error" ? (
                              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                            ) : rec.type === "performance" ? (
                              <Zap className="h-4 w-4 text-yellow-600 mt-0.5" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{rec.title}</div>
                                <Badge
                                  variant={
                                    rec.priority === "high"
                                      ? "destructive"
                                      : rec.priority === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {rec.priority}
                                </Badge>
                              </div>
                              <AlertDescription className="text-sm">
                                {rec.description}
                              </AlertDescription>
                              <div className="text-sm text-muted-foreground mt-1">
                                <strong>Suggestion:</strong> {rec.suggestion}
                              </div>
                            </div>
                          </div>
                        </Alert>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No recommendations available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
