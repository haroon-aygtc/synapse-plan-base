"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Play,
  Plus,
  Settings,
  Trash2,
  Sparkles,
  MessageSquare,
  Bot,
  Wand2,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Target,
  Zap,
  Star,
  BookOpen,
  Users,
  Award,
  Rocket,
  Clock,
  TrendingUp,
  Shield,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Pause,
  SkipForward,
  RotateCcw,
  X,
} from "lucide-react";
import AIConfigurationPanel from "@/components/ai-assistant/AIConfigurationPanel";
import VisualAgentBuilder from "@/components/agent-builder/VisualAgentBuilder";
import ComponentPalette from "@/components/agent-builder/ComponentPalette";
import { type AgentConfiguration } from "@/lib/ai-assistant";

// Tutorial and onboarding interfaces
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  content: React.ReactNode;
  action?: () => void;
  position: "top" | "bottom" | "left" | "right";
  skippable: boolean;
}

interface OnboardingState {
  isActive: boolean;
  currentTutorialStep: number;
  completedSteps: string[];
  showContextualHelp: boolean;
  userProgress: {
    timeSpent: number;
    stepsCompleted: number;
    featuresDiscovered: string[];
    achievements: string[];
  };
  preferences: {
    showHints: boolean;
    autoAdvance: boolean;
    soundEnabled: boolean;
    animationsEnabled: boolean;
  };
}

interface ContextualHint {
  id: string;
  trigger: string;
  content: string;
  type: "tip" | "warning" | "success" | "info";
  position: { x: number; y: number };
  persistent: boolean;
}

export default function AgentCreatePage() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(false);
  const [userExperience, setUserExperience] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");

  // Onboarding and tutorial state
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    isActive: true,
    currentTutorialStep: 0,
    completedSteps: [],
    showContextualHelp: true,
    userProgress: {
      timeSpent: 0,
      stepsCompleted: 0,
      featuresDiscovered: [],
      achievements: [],
    },
    preferences: {
      showHints: true,
      autoAdvance: false,
      soundEnabled: true,
      animationsEnabled: true,
    },
  });

  const [contextualHints, setContextualHints] = useState<ContextualHint[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [currentHint, setCurrentHint] = useState<ContextualHint | null>(null);

  const [agentConfiguration, setAgentConfiguration] = useState<
    Partial<AgentConfiguration>
  >({
    name: "",
    description: "",
    category: "customer-support",
    personality: "helpful",
    model: "gpt-4",
    temperature: 0.7,
    memoryEnabled: true,
    contextWindow: 10,
    tone: "friendly",
    style: "conversational",
    traits: [],
    capabilities: [],
    knowledgeSources: [],
    tools: [],
  });

  // Legacy state for backward compatibility
  const [agentName, setAgentName] = useState(agentConfiguration.name || "");
  const [agentDescription, setAgentDescription] = useState(
    agentConfiguration.description || "",
  );
  const [selectedPersonality, setSelectedPersonality] = useState(
    agentConfiguration.personality || "helpful",
  );
  const [selectedModel, setSelectedModel] = useState(
    agentConfiguration.model || "gpt-4",
  );
  const [temperature, setTemperature] = useState([
    agentConfiguration.temperature || 0.7,
  ]);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(
    agentConfiguration.memoryEnabled ?? true,
  );
  const [contextWindow, setContextWindow] = useState([
    agentConfiguration.contextWindow || 10,
  ]);

  const totalSteps = 4;

  // Tutorial steps definition
  const tutorialSteps: TutorialStep[] = [
    {
      id: "welcome",
      title: "Welcome to SynapseAI! 🎉",
      description:
        "Let's create your first AI agent in under 5 minutes. This interactive tutorial will guide you through every step.",
      target: "main-container",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                Ready to build something amazing?
              </h3>
              <p className="text-sm text-muted-foreground">
                We'll help you create a working AI agent step by step.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-xs font-medium">5 Minutes</div>
              <div className="text-xs text-muted-foreground">To completion</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Real Agent</div>
              <div className="text-xs text-muted-foreground">
                Actually works
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-medium">No Code</div>
              <div className="text-xs text-muted-foreground">
                Visual builder
              </div>
            </div>
          </div>
        </div>
      ),
      position: "bottom",
      skippable: true,
    },
    {
      id: "name-agent",
      title: "Name Your Agent",
      description:
        "Give your agent a memorable name. This helps you identify it later and sets the tone for interactions.",
      target: "agent-name-input",
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Pro tip:</p>
              <p className="text-sm text-muted-foreground">
                Choose a name that reflects your agent's purpose. For example:
                "Support Helper", "Sales Assistant", or "Content Creator".
              </p>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 The AI will suggest improvements as you type!
            </p>
          </div>
        </div>
      ),
      position: "right",
      skippable: false,
    },
    {
      id: "describe-purpose",
      title: "Describe Your Agent's Purpose",
      description:
        "Tell us what your agent should do. Be specific - this helps our AI configure everything perfectly.",
      target: "agent-description-input",
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Great examples:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                • "Help customers with billing questions and account issues"
              </div>
              <div>• "Qualify sales leads and schedule product demos"</div>
              <div>• "Create social media content and marketing copy"</div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-800">
              🎯 The more specific you are, the better your agent will perform!
            </p>
          </div>
        </div>
      ),
      position: "right",
      skippable: false,
    },
    {
      id: "ai-magic",
      title: "Watch the AI Magic! ✨",
      description:
        "Our AI is analyzing your description and configuring your agent automatically. No technical knowledge required!",
      target: "ai-assistant-panel",
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">AI is working its magic</p>
              <p className="text-xs text-muted-foreground">
                Analyzing your needs and setting optimal configurations
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Personality detected</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Optimal model selected</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Smart defaults applied</span>
            </div>
          </div>
        </div>
      ),
      position: "left",
      skippable: true,
    },
    {
      id: "test-agent",
      title: "Test Your Agent",
      description:
        "Your agent is ready! Click the test button to have a real conversation and see how it performs.",
      target: "test-button",
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Play className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Ready to test!</p>
              <p className="text-xs text-muted-foreground">
                Your agent is configured and ready for conversation
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              🚀 This is a real, working AI agent - not a demo!
            </p>
          </div>
        </div>
      ),
      position: "bottom",
      skippable: false,
    },
    {
      id: "congratulations",
      title: "Congratulations! 🎉",
      description:
        "You've successfully created your first AI agent! You can now deploy it, share it, or create more agents.",
      target: "main-container",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">
              Agent Created Successfully!
            </h3>
            <p className="text-sm text-muted-foreground">
              You're now ready to deploy and use your AI agent
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Next Steps</div>
              <div className="text-xs text-muted-foreground">
                Deploy & Share
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Learn More</div>
              <div className="text-xs text-muted-foreground">
                Advanced Features
              </div>
            </div>
          </div>
        </div>
      ),
      position: "bottom",
      skippable: true,
    },
  ];

  // Progressive feature discovery
  const discoverableFeatures = [
    {
      id: "visual-builder",
      name: "Visual Builder",
      description: "Drag and drop components to build complex workflows",
      icon: Bot,
      unlockCondition: () => onboardingState.userProgress.stepsCompleted >= 2,
      category: "advanced",
    },
    {
      id: "component-palette",
      name: "Component Palette",
      description: "Pre-built components for common use cases",
      icon: Settings,
      unlockCondition: () => onboardingState.userProgress.stepsCompleted >= 3,
      category: "intermediate",
    },
    {
      id: "ai-optimization",
      name: "AI Optimization",
      description: "Let AI continuously improve your agent's performance",
      icon: Sparkles,
      unlockCondition: () =>
        onboardingState.userProgress.featuresDiscovered.length >= 2,
      category: "advanced",
    },
  ];

  // Contextual help system
  const generateContextualHint = useCallback(
    (trigger: string, element?: HTMLElement) => {
      const hints: Record<string, ContextualHint> = {
        "temperature-slider": {
          id: "temperature-help",
          trigger: "temperature-slider",
          content:
            "Higher values make responses more creative but less predictable. For customer support, keep it low (0.2-0.4). For creative tasks, try higher values (0.7-0.9).",
          type: "tip",
          position: { x: 0, y: 0 },
          persistent: false,
        },
        "model-selection": {
          id: "model-help",
          trigger: "model-selection",
          content:
            "GPT-4 is more capable but slower and more expensive. GPT-3.5 Turbo is faster and cheaper but less sophisticated. Choose based on your needs and budget.",
          type: "info",
          position: { x: 0, y: 0 },
          persistent: false,
        },
        "memory-toggle": {
          id: "memory-help",
          trigger: "memory-toggle",
          content:
            "Memory allows your agent to remember previous conversations. Essential for customer support and ongoing relationships, but not needed for one-time queries.",
          type: "tip",
          position: { x: 0, y: 0 },
          persistent: false,
        },
      };

      const hint = hints[trigger];
      if (hint && element) {
        const rect = element.getBoundingClientRect();
        hint.position = { x: rect.left, y: rect.top - 10 };
        setCurrentHint(hint);

        // Auto-hide after 5 seconds unless persistent
        if (!hint.persistent) {
          setTimeout(() => setCurrentHint(null), 5000);
        }
      }
    },
    [],
  );

  // Achievement system
  const achievements = [
    {
      id: "first-agent",
      name: "First Agent",
      description: "Created your first AI agent",
      icon: Bot,
      unlocked: onboardingState.userProgress.stepsCompleted >= 4,
    },
    {
      id: "quick-learner",
      name: "Quick Learner",
      description: "Completed tutorial in under 5 minutes",
      icon: Clock,
      unlocked:
        onboardingState.userProgress.timeSpent < 300 &&
        onboardingState.userProgress.stepsCompleted >= 4,
    },
    {
      id: "explorer",
      name: "Explorer",
      description: "Discovered 3 or more features",
      icon: Star,
      unlocked: onboardingState.userProgress.featuresDiscovered.length >= 3,
    },
  ];

  // Timer for tracking time spent
  useEffect(() => {
    const timer = setInterval(() => {
      if (onboardingState.isActive) {
        setOnboardingState((prev) => ({
          ...prev,
          userProgress: {
            ...prev.userProgress,
            timeSpent: prev.userProgress.timeSpent + 1,
          },
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onboardingState.isActive]);

  // Check for first visit and start tutorial
  useEffect(() => {
    const hasVisited = localStorage.getItem("synapseai-visited");
    if (!hasVisited) {
      setIsFirstVisit(true);
      setShowTutorialOverlay(true);
      localStorage.setItem("synapseai-visited", "true");
    } else {
      setIsFirstVisit(false);
      setOnboardingState((prev) => ({ ...prev, isActive: false }));
    }
  }, []);

  // Tutorial navigation
  const nextTutorialStep = useCallback(() => {
    const currentStepIndex = onboardingState.currentTutorialStep;
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < tutorialSteps.length) {
      setOnboardingState((prev) => ({
        ...prev,
        currentTutorialStep: nextIndex,
        completedSteps: [
          ...prev.completedSteps,
          tutorialSteps[currentStepIndex].id,
        ],
        userProgress: {
          ...prev.userProgress,
          stepsCompleted: prev.userProgress.stepsCompleted + 1,
        },
      }));
      setTutorialProgress((nextIndex / tutorialSteps.length) * 100);
    } else {
      completeTutorial();
    }
  }, [onboardingState.currentTutorialStep, tutorialSteps]);

  const previousTutorialStep = useCallback(() => {
    const currentStepIndex = onboardingState.currentTutorialStep;
    if (currentStepIndex > 0) {
      setOnboardingState((prev) => ({
        ...prev,
        currentTutorialStep: currentStepIndex - 1,
      }));
      setTutorialProgress(
        ((currentStepIndex - 1) / tutorialSteps.length) * 100,
      );
    }
  }, [onboardingState.currentTutorialStep, tutorialSteps]);

  const skipTutorial = useCallback(() => {
    setOnboardingState((prev) => ({ ...prev, isActive: false }));
    setShowTutorialOverlay(false);
    toast({
      title: "Tutorial skipped",
      description: "You can restart the tutorial anytime from the help menu.",
    });
  }, [toast]);

  const completeTutorial = useCallback(() => {
    setOnboardingState((prev) => ({
      ...prev,
      isActive: false,
      userProgress: {
        ...prev.userProgress,
        achievements: [...prev.userProgress.achievements, "first-agent"],
      },
    }));
    setShowTutorialOverlay(false);

    // Show completion celebration
    toast({
      title: "🎉 Congratulations!",
      description:
        "You've successfully created your first AI agent! Ready to deploy it?",
    });

    // Unlock new features
    setTimeout(() => {
      setOnboardingState((prev) => ({
        ...prev,
        userProgress: {
          ...prev.userProgress,
          featuresDiscovered: [
            ...prev.userProgress.featuresDiscovered,
            "visual-builder",
            "component-palette",
          ],
        },
      }));
    }, 1000);
  }, [toast]);

  const restartTutorial = useCallback(() => {
    setOnboardingState((prev) => ({
      ...prev,
      isActive: true,
      currentTutorialStep: 0,
      completedSteps: [],
    }));
    setShowTutorialOverlay(true);
    setTutorialProgress(0);
  }, []);

  // Feature discovery
  const discoverFeature = useCallback(
    (featureId: string) => {
      setOnboardingState((prev) => {
        if (!prev.userProgress.featuresDiscovered.includes(featureId)) {
          const newFeatures = [
            ...prev.userProgress.featuresDiscovered,
            featureId,
          ];

          // Show discovery notification
          toast({
            title: "🎉 New feature unlocked!",
            description: `You've discovered: ${discoverableFeatures.find((f) => f.id === featureId)?.name}`,
          });

          return {
            ...prev,
            userProgress: {
              ...prev.userProgress,
              featuresDiscovered: newFeatures,
            },
          };
        }
        return prev;
      });
    },
    [toast, discoverableFeatures],
  );

  // Smart defaults based on user input
  const applySmartDefaults = useCallback((description: string) => {
    if (
      description.toLowerCase().includes("customer") ||
      description.toLowerCase().includes("support")
    ) {
      setAgentConfiguration((prev) => ({
        ...prev,
        category: "customer-support",
        personality: "helpful",
        temperature: 0.3,
        tone: "friendly",
        style: "conversational",
      }));
    } else if (
      description.toLowerCase().includes("sales") ||
      description.toLowerCase().includes("lead")
    ) {
      setAgentConfiguration((prev) => ({
        ...prev,
        category: "sales",
        personality: "professional",
        temperature: 0.5,
        tone: "confident",
        style: "persuasive",
      }));
    } else if (
      description.toLowerCase().includes("creative") ||
      description.toLowerCase().includes("content")
    ) {
      setAgentConfiguration((prev) => ({
        ...prev,
        category: "marketing",
        personality: "creative",
        temperature: 0.8,
        tone: "engaging",
        style: "creative",
      }));
    }
  }, []);

  // Auto-advance tutorial based on user actions
  useEffect(() => {
    if (!onboardingState.isActive || !onboardingState.preferences.autoAdvance)
      return;

    const currentStep = tutorialSteps[onboardingState.currentTutorialStep];
    if (!currentStep) return;

    // Auto-advance conditions
    if (
      currentStep.id === "name-agent" &&
      agentConfiguration.name &&
      agentConfiguration.name.length > 3
    ) {
      setTimeout(nextTutorialStep, 1500);
    } else if (
      currentStep.id === "describe-purpose" &&
      agentConfiguration.description &&
      agentConfiguration.description.length > 20
    ) {
      applySmartDefaults(agentConfiguration.description);
      setTimeout(nextTutorialStep, 2000);
    }
  }, [
    agentConfiguration.name,
    agentConfiguration.description,
    onboardingState,
    nextTutorialStep,
    applySmartDefaults,
  ]);

  // Accessibility: Keyboard navigation for tutorial
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!onboardingState.isActive) return;

      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        nextTutorialStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousTutorialStep();
      } else if (e.key === "Escape") {
        e.preventDefault();
        skipTutorial();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    onboardingState.isActive,
    nextTutorialStep,
    previousTutorialStep,
    skipTutorial,
  ]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfigurationUpdate = (
    newConfig: Partial<AgentConfiguration>,
  ) => {
    setAgentConfiguration((prev) => ({ ...prev, ...newConfig }));

    // Update legacy state for backward compatibility
    if (newConfig.name) setAgentName(newConfig.name);
    if (newConfig.description) setAgentDescription(newConfig.description);
    if (newConfig.personality) setSelectedPersonality(newConfig.personality);
    if (newConfig.model) setSelectedModel(newConfig.model);
    if (newConfig.temperature !== undefined)
      setTemperature([newConfig.temperature]);
    if (newConfig.memoryEnabled !== undefined)
      setMemoryEnabled(newConfig.memoryEnabled ?? true);
    if (newConfig.contextWindow !== undefined)
      setContextWindow([newConfig.contextWindow]);
  };

  const handleSave = () => {
    // In a real implementation, this would save the agent configuration
    console.log("Agent saved:", agentConfiguration);
  };

  const handleTest = () => {
    // In a real implementation, this would open a test conversation with the agent
    console.log("Testing agent...");
  };

  const handleAddComponent = (template: any) => {
    console.log("Adding component:", template);
    // In a real implementation, this would add the component to the visual builder
  };

  return (
    <TooltipProvider>
      <div
        id="main-container"
        className="container mx-auto py-8 bg-background relative"
      >
        {/* Tutorial Overlay */}
        {showTutorialOverlay && onboardingState.isActive && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Tutorial Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        Interactive Tutorial
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Step {onboardingState.currentTutorialStep + 1} of{" "}
                        {tutorialSteps.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setOnboardingState((prev) => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            soundEnabled: !prev.preferences.soundEnabled,
                          },
                        }))
                      }
                    >
                      {onboardingState.preferences.soundEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={skipTutorial}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{Math.round(tutorialProgress)}%</span>
                  </div>
                  <Progress value={tutorialProgress} className="h-2" />
                </div>

                {/* Tutorial Content */}
                {tutorialSteps[onboardingState.currentTutorialStep] && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {
                          tutorialSteps[onboardingState.currentTutorialStep]
                            .title
                        }
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {
                          tutorialSteps[onboardingState.currentTutorialStep]
                            .description
                        }
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      {
                        tutorialSteps[onboardingState.currentTutorialStep]
                          .content
                      }
                    </div>
                  </div>
                )}

                {/* Tutorial Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previousTutorialStep}
                      disabled={onboardingState.currentTutorialStep === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    {tutorialSteps[onboardingState.currentTutorialStep]
                      ?.skippable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextTutorialStep}
                      >
                        <SkipForward className="h-4 w-4 mr-1" />
                        Skip
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={skipTutorial}>
                      Skip Tutorial
                    </Button>
                    <Button onClick={nextTutorialStep}>
                      {onboardingState.currentTutorialStep ===
                      tutorialSteps.length - 1 ? (
                        <>
                          Finish <CheckCircle className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Next <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Use arrow keys to navigate • Press Escape to skip • Press
                    Enter to continue
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Hint */}
        {currentHint && (
          <div
            className="fixed z-40 bg-background border rounded-lg shadow-lg p-3 max-w-xs"
            style={{
              left: currentHint.position.x,
              top: currentHint.position.y,
              transform: "translateY(-100%)",
            }}
          >
            <div className="flex items-start gap-2">
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  currentHint.type === "tip"
                    ? "bg-blue-500"
                    : currentHint.type === "warning"
                      ? "bg-yellow-500"
                      : currentHint.type === "success"
                        ? "bg-green-500"
                        : "bg-gray-500"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm">{currentHint.content}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-1 text-xs"
                  onClick={() => setCurrentHint(null)}
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold">Create New Agent</h1>
            {onboardingState.isActive && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Tutorial active
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            {/* Help Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOnboardingState((prev) => ({
                      ...prev,
                      showContextualHelp: !prev.showContextualHelp,
                    }))
                  }
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle contextual help</p>
              </TooltipContent>
            </Tooltip>

            {/* Restart Tutorial */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={restartTutorial}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Restart tutorial</p>
              </TooltipContent>
            </Tooltip>

            {/* Feature Toggles */}
            <Button
              variant={showAIAssistant ? "default" : "outline"}
              onClick={() => {
                setShowAIAssistant(!showAIAssistant);
                if (!showAIAssistant) discoverFeature("ai-assistant");
              }}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              AI Assistant
            </Button>

            {/* Progressive Feature Discovery */}
            {discoverableFeatures.map((feature) => {
              const isUnlocked = feature.unlockCondition();
              const isDiscovered =
                onboardingState.userProgress.featuresDiscovered.includes(
                  feature.id,
                );

              if (!isUnlocked) return null;

              return (
                <Tooltip key={feature.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={
                        (feature.id === "visual-builder" &&
                          showVisualBuilder) ||
                        (feature.id === "component-palette" &&
                          showComponentPalette)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        if (feature.id === "visual-builder") {
                          setShowVisualBuilder(!showVisualBuilder);
                        } else if (feature.id === "component-palette") {
                          setShowComponentPalette(!showComponentPalette);
                        }
                        if (!isDiscovered) discoverFeature(feature.id);
                      }}
                      className={
                        !isDiscovered
                          ? "animate-pulse ring-2 ring-primary/20"
                          : ""
                      }
                    >
                      <feature.icon className="mr-2 h-4 w-4" />
                      {feature.name}
                      {!isDiscovered && (
                        <Star className="ml-1 h-3 w-3 text-yellow-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{feature.description}</p>
                    {!isDiscovered && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ✨ New feature!
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            <Select
              value={userExperience}
              onValueChange={(
                value: "beginner" | "intermediate" | "advanced",
              ) => setUserExperience(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>

            <Button id="test-button" onClick={handleTest}>
              <Play className="mr-2 h-4 w-4" />
              Test Agent
            </Button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <div
                    className={`w-12 h-1 ${currentStep > index ? "bg-primary" : "bg-muted"}`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${
                    currentStep > index + 1
                      ? "bg-primary text-primary-foreground"
                      : currentStep === index + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Progress Indicator */}
        {onboardingState.isActive && (
          <div className="mb-6">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Tutorial Progress:{" "}
                    {onboardingState.userProgress.stepsCompleted} of{" "}
                    {totalSteps} steps completed
                  </span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {Math.floor(onboardingState.userProgress.timeSpent / 60)}:
                      {String(
                        onboardingState.userProgress.timeSpent % 60,
                      ).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Achievement Notifications */}
        {achievements.filter(
          (a) =>
            a.unlocked &&
            !onboardingState.userProgress.achievements.includes(a.id),
        ).length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2">
              {achievements
                .filter(
                  (a) =>
                    a.unlocked &&
                    !onboardingState.userProgress.achievements.includes(a.id),
                )
                .map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <achievement.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AI Configuration Assistant */}
        {showAIAssistant && (
          <div id="ai-assistant-panel" className="mb-8">
            <AIConfigurationPanel
              onConfigurationUpdate={handleConfigurationUpdate}
              currentConfiguration={agentConfiguration}
              userExperience={userExperience}
              currentStep={currentStep}
            />
          </div>
        )}

        {/* Visual Agent Builder */}
        {showVisualBuilder && (
          <div className="mb-8">
            <VisualAgentBuilder
              onConfigurationUpdate={handleConfigurationUpdate}
              currentConfiguration={agentConfiguration}
            />
          </div>
        )}

        {/* Component Palette */}
        {showComponentPalette && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {showVisualBuilder ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Visual Builder is active. Components can be dragged directly
                    onto the canvas.
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Enable Visual Builder to see component interactions.
                  </div>
                )}
              </div>
              <div>
                <ComponentPalette
                  onAddComponent={handleAddComponent}
                  currentConfiguration={agentConfiguration}
                  userExperience={userExperience}
                  searchContext={agentConfiguration.description || ""}
                  canvasNodes={[]}
                  canvasEdges={[]}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define your agent's name and purpose
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <div className="relative">
                  <Input
                    id="agent-name-input"
                    placeholder="e.g., Customer Support Helper, Sales Assistant"
                    value={agentConfiguration.name || ""}
                    onChange={(e) => {
                      handleConfigurationUpdate({ name: e.target.value });
                      if (
                        onboardingState.isActive &&
                        e.target.value.length > 3
                      ) {
                        // Auto-advance tutorial if in name step
                        const currentStep =
                          tutorialSteps[onboardingState.currentTutorialStep];
                        if (
                          currentStep?.id === "name-agent" &&
                          onboardingState.preferences.autoAdvance
                        ) {
                          setTimeout(nextTutorialStep, 1000);
                        }
                      }
                    }}
                    onFocus={() => {
                      if (onboardingState.showContextualHelp) {
                        generateContextualHint(
                          "agent-name",
                          document.getElementById("agent-name-input"),
                        );
                      }
                    }}
                    className={
                      onboardingState.isActive &&
                      tutorialSteps[onboardingState.currentTutorialStep]?.id ===
                        "name-agent"
                        ? "ring-2 ring-primary/50"
                        : ""
                    }
                  />
                  {onboardingState.isActive &&
                    agentConfiguration.name &&
                    agentConfiguration.name.length > 3 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                </div>
                {onboardingState.showContextualHelp && (
                  <p className="text-xs text-muted-foreground">
                    💡 Choose a descriptive name that reflects your agent's
                    purpose
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-description">Description</Label>
                <div className="relative">
                  <Textarea
                    id="agent-description-input"
                    placeholder="e.g., Help customers with billing questions, troubleshoot account issues, and provide product information in a friendly, professional manner."
                    rows={4}
                    value={agentConfiguration.description || ""}
                    onChange={(e) => {
                      handleConfigurationUpdate({
                        description: e.target.value,
                      });
                      if (e.target.value.length > 20) {
                        applySmartDefaults(e.target.value);
                        // Auto-advance tutorial if in description step
                        const currentStep =
                          tutorialSteps[onboardingState.currentTutorialStep];
                        if (
                          currentStep?.id === "describe-purpose" &&
                          onboardingState.preferences.autoAdvance
                        ) {
                          setTimeout(nextTutorialStep, 1500);
                        }
                      }
                    }}
                    onFocus={() => {
                      if (onboardingState.showContextualHelp) {
                        generateContextualHint(
                          "agent-description",
                          document.getElementById("agent-description-input"),
                        );
                      }
                    }}
                    className={
                      onboardingState.isActive &&
                      tutorialSteps[onboardingState.currentTutorialStep]?.id ===
                        "describe-purpose"
                        ? "ring-2 ring-primary/50"
                        : ""
                    }
                  />
                  {onboardingState.isActive &&
                    agentConfiguration.description &&
                    agentConfiguration.description.length > 20 && (
                      <div className="absolute right-3 top-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                </div>
                {onboardingState.showContextualHelp && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      💡 Be specific about what your agent should do - this
                      helps our AI configure it perfectly
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Good examples:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>
                          "Answer customer questions about our SaaS product and
                          help with account issues"
                        </li>
                        <li>
                          "Qualify sales leads and schedule product
                          demonstrations"
                        </li>
                        <li>
                          "Create engaging social media content for our
                          marketing campaigns"
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-category">Category</Label>
                <Select
                  value={agentConfiguration.category || "customer-support"}
                  onValueChange={(value) =>
                    handleConfigurationUpdate({ category: value })
                  }
                >
                  <SelectTrigger id="agent-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer-support">
                      Customer Support
                    </SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="it">IT Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Smart Configuration Indicators */}
              {agentConfiguration.traits &&
                agentConfiguration.traits.length > 0 && (
                  <div className="space-y-2">
                    <Label>AI-Suggested Traits</Label>
                    <div className="flex flex-wrap gap-2">
                      {agentConfiguration.traits.map((trait, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          <Bot className="w-3 h-3 mr-1" />
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Personality & Behavior</CardTitle>
              <CardDescription>
                Define how your agent should interact with users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preset" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preset">Preset Personalities</TabsTrigger>
                  <TabsTrigger value="custom">Custom Personality</TabsTrigger>
                </TabsList>
                <TabsContent value="preset" className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: "helpful",
                        name: "Helpful Assistant",
                        description:
                          "Friendly and eager to assist with any request",
                      },
                      {
                        id: "professional",
                        name: "Professional Expert",
                        description:
                          "Formal, knowledgeable, and business-oriented",
                      },
                      {
                        id: "friendly",
                        name: "Friendly Guide",
                        description: "Casual, approachable, and conversational",
                      },
                      {
                        id: "technical",
                        name: "Technical Specialist",
                        description:
                          "Detailed, precise, and technically focused",
                      },
                      {
                        id: "creative",
                        name: "Creative Partner",
                        description: "Imaginative, inspiring, and idea-focused",
                      },
                      {
                        id: "concise",
                        name: "Concise Responder",
                        description: "Brief, to-the-point, and efficient",
                      },
                    ].map((personality) => {
                      const isSelected =
                        (agentConfiguration.personality ||
                          selectedPersonality) === personality.id;
                      const isAISuggested =
                        agentConfiguration.personality === personality.id &&
                        agentConfiguration.personality !== selectedPersonality;
                      return (
                        <Card
                          key={personality.id}
                          className={`cursor-pointer border-2 ${isSelected ? "border-primary" : "border-border"} ${isAISuggested ? "ring-2 ring-blue-200" : ""}`}
                          onClick={() =>
                            handleConfigurationUpdate({
                              personality: personality.id,
                            })
                          }
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {personality.name}
                              {isAISuggested && (
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI Pick
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {personality.description}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="custom" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tone">Tone of Voice</Label>
                      <Select
                        value={agentConfiguration.tone || "friendly"}
                        onValueChange={(value) =>
                          handleConfigurationUpdate({ tone: value })
                        }
                      >
                        <SelectTrigger id="tone">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="style">Communication Style</Label>
                      <Select
                        value={agentConfiguration.style || "conversational"}
                        onValueChange={(value) =>
                          handleConfigurationUpdate({ style: value })
                        }
                      >
                        <SelectTrigger id="style">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversational">
                            Conversational
                          </SelectItem>
                          <SelectItem value="instructional">
                            Instructional
                          </SelectItem>
                          <SelectItem value="analytical">Analytical</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="narrative">Narrative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personality-traits">
                        Personality Traits
                      </Label>
                      <Textarea
                        id="personality-traits"
                        placeholder="Describe your agent's personality traits (e.g., empathetic, detail-oriented, humorous)"
                        rows={3}
                        value={agentConfiguration.traits?.join(", ") || ""}
                        onChange={(e) =>
                          handleConfigurationUpdate({
                            traits: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t) => t.length > 0),
                          })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Back
              </Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>AI Model & Settings</CardTitle>
              <CardDescription>
                Configure the AI model and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <Select
                  value={agentConfiguration.model || selectedModel}
                  onValueChange={(value) =>
                    handleConfigurationUpdate({ model: value })
                  }
                >
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">
                      <div className="flex items-center gap-2">
                        GPT-4 (Most capable)
                        {agentConfiguration.model === "gpt-4" && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Pick
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-3.5-turbo">
                      GPT-3.5 Turbo (Fast & efficient)
                    </SelectItem>
                    <SelectItem value="claude-3-opus">
                      Claude 3 Opus (High performance)
                    </SelectItem>
                    <SelectItem value="claude-3-sonnet">
                      Claude 3 Sonnet (Balanced)
                    </SelectItem>
                    <SelectItem value="gemini-pro">
                      Gemini Pro (Google's model)
                    </SelectItem>
                    <SelectItem value="mistral-large">
                      Mistral Large (Open source)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Model costs vary. Higher capability models may incur higher
                  usage costs.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="temperature">Temperature (Creativity)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {(
                        agentConfiguration.temperature || temperature[0]
                      ).toFixed(1)}
                    </span>
                    {onboardingState.showContextualHelp && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) =>
                              generateContextualHint(
                                "temperature-slider",
                                e.currentTarget,
                              )
                            }
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click for detailed explanation</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {agentConfiguration.temperature !== undefined &&
                      agentConfiguration.temperature !== temperature[0] && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Optimized
                        </Badge>
                      )}
                  </div>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[agentConfiguration.temperature || temperature[0]]}
                  onValueChange={(value) =>
                    handleConfigurationUpdate({ temperature: value[0] })
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise & Deterministic</span>
                  <span>Creative & Variable</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-medium">Conversation Memory</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable agent to remember previous interactions
                      </p>
                    </div>
                    {onboardingState.showContextualHelp && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) =>
                              generateContextualHint(
                                "memory-toggle",
                                e.currentTarget,
                              )
                            }
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click for detailed explanation</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Switch
                    checked={agentConfiguration.memoryEnabled ?? memoryEnabled}
                    onCheckedChange={(checked) =>
                      handleConfigurationUpdate({ memoryEnabled: checked })
                    }
                  />
                </div>

                {(agentConfiguration.memoryEnabled ?? memoryEnabled) && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <div className="flex justify-between">
                      <Label htmlFor="context-window">
                        Context Window (Messages)
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {agentConfiguration.contextWindow || contextWindow[0]}
                        {agentConfiguration.contextWindow !== undefined &&
                          agentConfiguration.contextWindow !==
                            contextWindow[0] && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Optimized
                            </Badge>
                          )}
                      </span>
                    </div>
                    <Slider
                      id="context-window"
                      min={1}
                      max={50}
                      step={1}
                      value={[
                        agentConfiguration.contextWindow || contextWindow[0],
                      ]}
                      onValueChange={(value) =>
                        handleConfigurationUpdate({ contextWindow: value[0] })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of previous messages the agent will remember
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Back
              </Button>
              <Button onClick={handleNext}>Continue</Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Knowledge & Capabilities</CardTitle>
              <CardDescription>
                Add knowledge sources and define agent capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Knowledge Sources</Label>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Source
                  </Button>
                </div>
                <div className="bg-muted/50 border border-dashed border-muted rounded-lg p-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="rounded-full bg-background p-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">Add Knowledge Sources</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Upload documents, connect to websites, or link databases
                      to give your agent specific knowledge.
                    </p>
                    <Button variant="secondary" size="sm" className="mt-2">
                      Browse Knowledge Base
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Available Tools</Label>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Tool
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md flex items-center">
                          <Settings className="h-4 w-4 mr-2" /> Web Search
                        </CardTitle>
                        <Badge>Enabled</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Search the web for up-to-date information
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md flex items-center">
                          <Sparkles className="h-4 w-4 mr-2" /> Image Generation
                        </CardTitle>
                        <Badge variant="outline">Disabled</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Generate images based on text descriptions
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Back
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button onClick={handleSave}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Create Agent
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
