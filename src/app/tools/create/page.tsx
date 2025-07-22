"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Code,
  Database,
  Globe,
  Plus,
  Save,
  TestTube,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ToolCreationPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [testStatus, setTestStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");

  const runTest = () => {
    setTestStatus("running");
    // Simulate API test
    setTimeout(() => {
      setTestStatus("success");
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create Tool</h1>
          <p className="text-muted-foreground">
            Connect your APIs and services as reusable tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Tool
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tool Configuration</CardTitle>
              <CardDescription>
                Configure your tool's details, API connection, and parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="general">
                    <div className="flex items-center">
                      <span className="mr-2">General</span>
                      {activeTab !== "general" && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="connection">
                    <div className="flex items-center">
                      <span className="mr-2">Connection</span>
                      {activeTab !== "connection" && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="parameters">
                    <div className="flex items-center">
                      <span className="mr-2">Parameters</span>
                      {activeTab !== "parameters" && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="test">
                    <div className="flex items-center">
                      <span className="mr-2">Test</span>
                      {activeTab !== "test" && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tool Name</Label>
                        <Input id="name" placeholder="Enter tool name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="api">API Integration</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="file">
                              File Processing
                            </SelectItem>
                            <SelectItem value="messaging">Messaging</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this tool does and how it should be used"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        placeholder="Enter tags separated by commas"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">API</Badge>
                        <Badge variant="secondary">Integration</Badge>
                        <Badge variant="secondary">External</Badge>
                        <Button variant="outline" size="sm" className="h-6">
                          <Plus className="h-3 w-3 mr-1" /> Add Tag
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="public" />
                      <Label htmlFor="public">
                        Make this tool available to all organization members
                      </Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="connection" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="connection-type">Connection Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select connection type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rest">REST API</SelectItem>
                            <SelectItem value="graphql">GraphQL</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth-type">Authentication Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select authentication type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="api-key">API Key</SelectItem>
                            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base-url">Base URL</Label>
                      <Input
                        id="base-url"
                        placeholder="https://api.example.com/v1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="Enter your API key"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your API key is securely encrypted and stored
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="headers">Headers</Label>
                      <Textarea
                        id="headers"
                        placeholder='{"Content-Type": "application/json"}'
                        rows={3}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parameters" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Input Parameters</h3>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" /> Add Parameter
                      </Button>
                    </div>

                    <Card className="border border-dashed">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="param-name">Name</Label>
                            <Input id="param-name" placeholder="query" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="param-type">Type</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="string" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="param-required">Required</Label>
                            <div className="pt-2">
                              <Switch id="param-required" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="param-description">Description</Label>
                          <Input
                            id="param-description"
                            placeholder="Search query parameter"
                          />
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="param-example">Example</Label>
                          <Input
                            id="param-example"
                            placeholder="example value"
                          />
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between items-center mt-6">
                      <h3 className="text-lg font-medium">Output Schema</h3>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" /> Add Field
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="output-schema">JSON Schema</Label>
                      <Textarea
                        id="output-schema"
                        placeholder='{"type": "object", "properties": {"results": {"type": "array"}, "count": {"type": "number"}}}'
                        rows={5}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Test Your Tool</h3>
                      <Button
                        onClick={runTest}
                        disabled={testStatus === "running"}
                        variant={
                          testStatus === "success" ? "outline" : "default"
                        }
                      >
                        {testStatus === "idle" && (
                          <>
                            <TestTube className="h-4 w-4 mr-1" /> Run Test
                          </>
                        )}
                        {testStatus === "running" && "Testing..."}
                        {testStatus === "success" && (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Test Passed
                          </>
                        )}
                        {testStatus === "error" && "Test Failed"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="test-input">Test Input</Label>
                      <Textarea
                        id="test-input"
                        placeholder='{"query": "example search"}'
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </div>

                    {testStatus === "success" && (
                      <Alert className="bg-green-50 border-green-200">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">
                          Test Successful
                        </AlertTitle>
                        <AlertDescription className="text-green-700">
                          Your tool connected successfully and returned valid
                          results.
                        </AlertDescription>
                      </Alert>
                    )}

                    {testStatus === "error" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Test Failed</AlertTitle>
                        <AlertDescription>
                          Connection error: Unable to reach API endpoint. Please
                          check your URL and authentication.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="test-output">Test Output</Label>
                      <div className="relative">
                        <Textarea
                          id="test-output"
                          value={
                            testStatus === "success"
                              ? JSON.stringify(
                                  {
                                    results: [
                                      { id: 1, name: "Example result" },
                                    ],
                                    count: 1,
                                  },
                                  null,
                                  2,
                                )
                              : ""
                          }
                          rows={6}
                          readOnly
                          className="font-mono text-sm bg-muted"
                        />
                        {testStatus === "running" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <div className="animate-pulse">
                              Testing connection...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const prevTabs = {
                    general: "general",
                    connection: "general",
                    parameters: "connection",
                    test: "parameters",
                  };
                  setActiveTab(
                    prevTabs[activeTab as keyof typeof prevTabs] || "general",
                  );
                }}
                disabled={activeTab === "general"}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  const nextTabs = {
                    general: "connection",
                    connection: "parameters",
                    parameters: "test",
                    test: "test",
                  };
                  setActiveTab(
                    nextTabs[activeTab as keyof typeof nextTabs] || "test",
                  );
                }}
                disabled={activeTab === "test"}
              >
                Next
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tool Templates</CardTitle>
                <CardDescription>
                  Start with a pre-configured template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="mr-2 h-4 w-4" />
                  REST API
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  Database Query
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Code className="mr-2 h-4 w-4" />
                  Custom Function
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Learn how to create effective tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  •{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Tool creation guide
                  </a>
                </p>
                <p className="text-sm">
                  •{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    API connection best practices
                  </a>
                </p>
                <p className="text-sm">
                  •{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Parameter configuration
                  </a>
                </p>
                <p className="text-sm">
                  •{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Testing and validation
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
