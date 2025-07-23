"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { AgentConfiguration } from "@/lib/ai-assistant";
import { Agent } from "@/hooks/useAgentBuilder";

export interface VisualNode {
  id: string;
  type: "agent" | "tool" | "knowledge" | "trigger" | "condition" | "action";
  position: { x: number; y: number };
  data: Record<string, any>;
  selected?: boolean;
  dragging?: boolean;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  completedSteps: string[];
  userExperience: "beginner" | "intermediate" | "advanced";
  showContextualHelp: boolean;
  tutorialProgress: number;
  achievements: string[];
  featuresDiscovered: string[];
  preferences: {
    showHints: boolean;
    autoAdvance: boolean;
    soundEnabled: boolean;
    animationsEnabled: boolean;
    theme: "light" | "dark" | "system";
  };
  analytics: {
    timeSpent: number;
    stepsCompleted: number;
    errorsEncountered: number;
    helpRequestsCount: number;
    lastActiveTimestamp: number;
  };
}

export interface AIAssistantState {
  isAnalyzing: boolean;
  lastAnalysis: any;
  suggestions: any[];
  appliedSuggestions: Set<string>;
  optimizationHistory: any[];
  userFeedback: {
    helpfulSuggestions: string[];
    dismissedSuggestions: string[];
    satisfactionRating?: number;
  };
}

export interface VisualBuilderState {
  nodes: VisualNode[];
  edges: VisualEdge[];
  selectedNodeId: string | null;
  viewport: { x: number; y: number; zoom: number };
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  showControls: boolean;
  isExecuting: boolean;
  executionResults: Record<string, any>;
  canvasSettings: {
    backgroundColor: string;
    gridColor: string;
    nodeSpacing: number;
    autoLayout: boolean;
  };
}

export interface ComponentPaletteState {
  searchTerm: string;
  expandedCategories: Set<string>;
  favoriteComponents: string[];
  recentlyUsed: string[];
  customComponents: any[];
  intelligentSuggestions: any[];
}

export interface AgentBuilderStore {
  // Current agent configuration
  currentAgent: Partial<AgentConfiguration>;
  savedAgents: Agent[];

  // UI State
  activeTab:
    | "basic"
    | "personality"
    | "model"
    | "capabilities"
    | "visual"
    | "testing";
  showAIAssistant: boolean;
  showVisualBuilder: boolean;
  showComponentPalette: boolean;

  // Onboarding
  onboarding: OnboardingState;

  // AI Assistant
  aiAssistant: AIAssistantState;

  // Visual Builder
  visualBuilder: VisualBuilderState;

  // Component Palette
  componentPalette: ComponentPaletteState;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeploying: boolean;

  // Error handling
  errors: Record<string, string>;
  warnings: Record<string, string>;

  // Actions
  updateCurrentAgent: (updates: Partial<AgentConfiguration>) => void;
  setActiveTab: (tab: AgentBuilderStore["activeTab"]) => void;
  toggleAIAssistant: () => void;
  toggleVisualBuilder: () => void;
  toggleComponentPalette: () => void;

  // Onboarding actions
  startOnboarding: () => void;
  completeOnboardingStep: (stepId: string) => void;
  skipOnboarding: () => void;
  updateOnboardingPreferences: (
    preferences: Partial<OnboardingState["preferences"]>,
  ) => void;
  discoverFeature: (featureId: string) => void;
  addAchievement: (achievementId: string) => void;
  updateAnalytics: (updates: Partial<OnboardingState["analytics"]>) => void;

  // AI Assistant actions
  setAnalyzing: (analyzing: boolean) => void;
  setLastAnalysis: (analysis: any) => void;
  addSuggestion: (suggestion: any) => void;
  applySuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  addOptimization: (optimization: any) => void;
  provideFeedback: (
    feedback: Partial<AIAssistantState["userFeedback"]>,
  ) => void;

  // Visual Builder actions
  addNode: (node: VisualNode) => void;
  updateNode: (nodeId: string, updates: Partial<VisualNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: VisualEdge) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateViewport: (viewport: Partial<VisualBuilderState["viewport"]>) => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  updateCanvasSettings: (
    settings: Partial<VisualBuilderState["canvasSettings"]>,
  ) => void;
  setExecuting: (executing: boolean) => void;
  setExecutionResults: (results: Record<string, any>) => void;

  // Component Palette actions
  setSearchTerm: (term: string) => void;
  toggleCategory: (categoryId: string) => void;
  addFavoriteComponent: (componentId: string) => void;
  removeFavoriteComponent: (componentId: string) => void;
  addRecentlyUsed: (componentId: string) => void;
  addCustomComponent: (component: any) => void;
  updateIntelligentSuggestions: (suggestions: any[]) => void;

  // Persistence actions
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  clearStore: () => void;
  exportConfiguration: () => string;
  importConfiguration: (config: string) => void;

  // Error handling
  setError: (key: string, message: string) => void;
  clearError: (key: string) => void;
  setWarning: (key: string, message: string) => void;
  clearWarning: (key: string) => void;
}

const initialState = {
  currentAgent: {
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
  } as Partial<AgentConfiguration>,
  savedAgents: [],
  activeTab: "basic" as const,
  showAIAssistant: true,
  showVisualBuilder: false,
  showComponentPalette: false,
  onboarding: {
    isActive: false,
    currentStep: 0,
    completedSteps: [],
    userExperience: "beginner" as const,
    showContextualHelp: true,
    tutorialProgress: 0,
    achievements: [],
    featuresDiscovered: [],
    preferences: {
      showHints: true,
      autoAdvance: false,
      soundEnabled: true,
      animationsEnabled: true,
      theme: "system" as const,
    },
    analytics: {
      timeSpent: 0,
      stepsCompleted: 0,
      errorsEncountered: 0,
      helpRequestsCount: 0,
      lastActiveTimestamp: Date.now(),
    },
  },
  aiAssistant: {
    isAnalyzing: false,
    lastAnalysis: null,
    suggestions: [],
    appliedSuggestions: new Set<string>(),
    optimizationHistory: [],
    userFeedback: {
      helpfulSuggestions: [],
      dismissedSuggestions: [],
    },
  },
  visualBuilder: {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    snapToGrid: true,
    gridSize: 20,
    showMinimap: true,
    showControls: true,
    isExecuting: false,
    executionResults: {},
    canvasSettings: {
      backgroundColor: "#ffffff",
      gridColor: "#e2e8f0",
      nodeSpacing: 100,
      autoLayout: false,
    },
  },
  componentPalette: {
    searchTerm: "",
    expandedCategories: new Set(["core", "tools", "knowledge"]),
    favoriteComponents: [],
    recentlyUsed: [],
    customComponents: [],
    intelligentSuggestions: [],
  },
  isLoading: false,
  isSaving: false,
  isDeploying: false,
  errors: {},
  warnings: {},
};

export const useAgentBuilderStore = create<AgentBuilderStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Basic actions
        updateCurrentAgent: (updates) =>
          set((state) => {
            Object.assign(state.currentAgent, updates);
          }),

        setActiveTab: (tab) =>
          set((state) => {
            state.activeTab = tab;
          }),

        toggleAIAssistant: () =>
          set((state) => {
            state.showAIAssistant = !state.showAIAssistant;
            if (
              state.showAIAssistant &&
              !state.onboarding.featuresDiscovered.includes("ai-assistant")
            ) {
              state.onboarding.featuresDiscovered.push("ai-assistant");
            }
          }),

        toggleVisualBuilder: () =>
          set((state) => {
            state.showVisualBuilder = !state.showVisualBuilder;
            if (
              state.showVisualBuilder &&
              !state.onboarding.featuresDiscovered.includes("visual-builder")
            ) {
              state.onboarding.featuresDiscovered.push("visual-builder");
            }
          }),

        toggleComponentPalette: () =>
          set((state) => {
            state.showComponentPalette = !state.showComponentPalette;
            if (
              state.showComponentPalette &&
              !state.onboarding.featuresDiscovered.includes("component-palette")
            ) {
              state.onboarding.featuresDiscovered.push("component-palette");
            }
          }),

        // Onboarding actions
        startOnboarding: () =>
          set((state) => {
            state.onboarding.isActive = true;
            state.onboarding.currentStep = 0;
            state.onboarding.tutorialProgress = 0;
            state.onboarding.analytics.lastActiveTimestamp = Date.now();
          }),

        completeOnboardingStep: (stepId) =>
          set((state) => {
            if (!state.onboarding.completedSteps.includes(stepId)) {
              state.onboarding.completedSteps.push(stepId);
              state.onboarding.analytics.stepsCompleted += 1;
            }
            state.onboarding.currentStep += 1;
            state.onboarding.tutorialProgress =
              (state.onboarding.currentStep / 6) * 100;
          }),

        skipOnboarding: () =>
          set((state) => {
            state.onboarding.isActive = false;
            state.onboarding.tutorialProgress = 100;
          }),

        updateOnboardingPreferences: (preferences) =>
          set((state) => {
            Object.assign(state.onboarding.preferences, preferences);
          }),

        discoverFeature: (featureId) =>
          set((state) => {
            if (!state.onboarding.featuresDiscovered.includes(featureId)) {
              state.onboarding.featuresDiscovered.push(featureId);
            }
          }),

        addAchievement: (achievementId) =>
          set((state) => {
            if (!state.onboarding.achievements.includes(achievementId)) {
              state.onboarding.achievements.push(achievementId);
            }
          }),

        updateAnalytics: (updates) =>
          set((state) => {
            Object.assign(state.onboarding.analytics, updates);
            state.onboarding.analytics.lastActiveTimestamp = Date.now();
          }),

        // AI Assistant actions
        setAnalyzing: (analyzing) =>
          set((state) => {
            state.aiAssistant.isAnalyzing = analyzing;
          }),

        setLastAnalysis: (analysis) =>
          set((state) => {
            state.aiAssistant.lastAnalysis = analysis;
          }),

        addSuggestion: (suggestion) =>
          set((state) => {
            state.aiAssistant.suggestions.push(suggestion);
          }),

        applySuggestion: (suggestionId) =>
          set((state) => {
            state.aiAssistant.appliedSuggestions.add(suggestionId);
            state.aiAssistant.userFeedback.helpfulSuggestions.push(
              suggestionId,
            );
          }),

        dismissSuggestion: (suggestionId) =>
          set((state) => {
            state.aiAssistant.userFeedback.dismissedSuggestions.push(
              suggestionId,
            );
          }),

        addOptimization: (optimization) =>
          set((state) => {
            state.aiAssistant.optimizationHistory.push({
              ...optimization,
              timestamp: Date.now(),
            });
          }),

        provideFeedback: (feedback) =>
          set((state) => {
            Object.assign(state.aiAssistant.userFeedback, feedback);
          }),

        // Visual Builder actions
        addNode: (node) =>
          set((state) => {
            state.visualBuilder.nodes.push(node);
            state.componentPalette.recentlyUsed.unshift(node.type);
            if (state.componentPalette.recentlyUsed.length > 10) {
              state.componentPalette.recentlyUsed.pop();
            }
          }),

        updateNode: (nodeId, updates) =>
          set((state) => {
            const nodeIndex = state.visualBuilder.nodes.findIndex(
              (n) => n.id === nodeId,
            );
            if (nodeIndex !== -1) {
              Object.assign(state.visualBuilder.nodes[nodeIndex], updates);
            }
          }),

        removeNode: (nodeId) =>
          set((state) => {
            state.visualBuilder.nodes = state.visualBuilder.nodes.filter(
              (n) => n.id !== nodeId,
            );
            state.visualBuilder.edges = state.visualBuilder.edges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId,
            );
            if (state.visualBuilder.selectedNodeId === nodeId) {
              state.visualBuilder.selectedNodeId = null;
            }
          }),

        addEdge: (edge) =>
          set((state) => {
            state.visualBuilder.edges.push(edge);
          }),

        removeEdge: (edgeId) =>
          set((state) => {
            state.visualBuilder.edges = state.visualBuilder.edges.filter(
              (e) => e.id !== edgeId,
            );
          }),

        selectNode: (nodeId) =>
          set((state) => {
            state.visualBuilder.selectedNodeId = nodeId;
          }),

        updateViewport: (viewport) =>
          set((state) => {
            Object.assign(state.visualBuilder.viewport, viewport);
          }),

        toggleSnapToGrid: () =>
          set((state) => {
            state.visualBuilder.snapToGrid = !state.visualBuilder.snapToGrid;
          }),

        setGridSize: (size) =>
          set((state) => {
            state.visualBuilder.gridSize = size;
          }),

        updateCanvasSettings: (settings) =>
          set((state) => {
            Object.assign(state.visualBuilder.canvasSettings, settings);
          }),

        setExecuting: (executing) =>
          set((state) => {
            state.visualBuilder.isExecuting = executing;
          }),

        setExecutionResults: (results) =>
          set((state) => {
            state.visualBuilder.executionResults = results;
          }),

        // Component Palette actions
        setSearchTerm: (term) =>
          set((state) => {
            state.componentPalette.searchTerm = term;
          }),

        toggleCategory: (categoryId) =>
          set((state) => {
            if (state.componentPalette.expandedCategories.has(categoryId)) {
              state.componentPalette.expandedCategories.delete(categoryId);
            } else {
              state.componentPalette.expandedCategories.add(categoryId);
            }
          }),

        addFavoriteComponent: (componentId) =>
          set((state) => {
            if (
              !state.componentPalette.favoriteComponents.includes(componentId)
            ) {
              state.componentPalette.favoriteComponents.push(componentId);
            }
          }),

        removeFavoriteComponent: (componentId) =>
          set((state) => {
            state.componentPalette.favoriteComponents =
              state.componentPalette.favoriteComponents.filter(
                (id) => id !== componentId,
              );
          }),

        addRecentlyUsed: (componentId) =>
          set((state) => {
            state.componentPalette.recentlyUsed = [
              componentId,
              ...state.componentPalette.recentlyUsed.filter(
                (id) => id !== componentId,
              ),
            ].slice(0, 10);
          }),

        addCustomComponent: (component) =>
          set((state) => {
            state.componentPalette.customComponents.push(component);
          }),

        updateIntelligentSuggestions: (suggestions) =>
          set((state) => {
            state.componentPalette.intelligentSuggestions = suggestions;
          }),

        // Persistence actions
        saveToLocalStorage: () => {
          const state = get();
          try {
            localStorage.setItem(
              "synapseai-agent-builder",
              JSON.stringify({
                currentAgent: state.currentAgent,
                onboarding: state.onboarding,
                visualBuilder: {
                  ...state.visualBuilder,
                  nodes: state.visualBuilder.nodes,
                  edges: state.visualBuilder.edges,
                },
                componentPalette: state.componentPalette,
                preferences: {
                  showAIAssistant: state.showAIAssistant,
                  showVisualBuilder: state.showVisualBuilder,
                  showComponentPalette: state.showComponentPalette,
                },
              }),
            );
          } catch (error) {
            console.error("Failed to save to localStorage:", error);
          }
        },

        loadFromLocalStorage: () => {
          try {
            const saved = localStorage.getItem("synapseai-agent-builder");
            if (saved) {
              const data = JSON.parse(saved);
              set((state) => {
                if (data.currentAgent)
                  Object.assign(state.currentAgent, data.currentAgent);
                if (data.onboarding)
                  Object.assign(state.onboarding, data.onboarding);
                if (data.visualBuilder)
                  Object.assign(state.visualBuilder, data.visualBuilder);
                if (data.componentPalette)
                  Object.assign(state.componentPalette, data.componentPalette);
                if (data.preferences) {
                  state.showAIAssistant =
                    data.preferences.showAIAssistant ?? true;
                  state.showVisualBuilder =
                    data.preferences.showVisualBuilder ?? false;
                  state.showComponentPalette =
                    data.preferences.showComponentPalette ?? false;
                }
              });
            }
          } catch (error) {
            console.error("Failed to load from localStorage:", error);
          }
        },

        clearStore: () => set(() => ({ ...initialState })),

        exportConfiguration: () => {
          const state = get();
          return JSON.stringify(
            {
              agent: state.currentAgent,
              visualWorkflow: {
                nodes: state.visualBuilder.nodes,
                edges: state.visualBuilder.edges,
              },
              metadata: {
                exportedAt: new Date().toISOString(),
                version: "1.0.0",
              },
            },
            null,
            2,
          );
        },

        importConfiguration: (config) => {
          try {
            const data = JSON.parse(config);
            set((state) => {
              if (data.agent) Object.assign(state.currentAgent, data.agent);
              if (data.visualWorkflow) {
                state.visualBuilder.nodes = data.visualWorkflow.nodes || [];
                state.visualBuilder.edges = data.visualWorkflow.edges || [];
              }
            });
          } catch (error) {
            console.error("Failed to import configuration:", error);
            throw new Error("Invalid configuration format");
          }
        },

        // Error handling
        setError: (key, message) =>
          set((state) => {
            state.errors[key] = message;
          }),

        clearError: (key) =>
          set((state) => {
            delete state.errors[key];
          }),

        setWarning: (key, message) =>
          set((state) => {
            state.warnings[key] = message;
          }),

        clearWarning: (key) =>
          set((state) => {
            delete state.warnings[key];
          }),
      })),
      {
        name: "synapseai-agent-builder",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          currentAgent: state.currentAgent,
          onboarding: state.onboarding,
          visualBuilder: {
            nodes: state.visualBuilder.nodes,
            edges: state.visualBuilder.edges,
            viewport: state.visualBuilder.viewport,
            snapToGrid: state.visualBuilder.snapToGrid,
            gridSize: state.visualBuilder.gridSize,
            canvasSettings: state.visualBuilder.canvasSettings,
          },
          componentPalette: state.componentPalette,
          preferences: {
            showAIAssistant: state.showAIAssistant,
            showVisualBuilder: state.showVisualBuilder,
            showComponentPalette: state.showComponentPalette,
          },
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // Migration logic for version 0 to 1
            return {
              ...persistedState,
              onboarding: {
                ...initialState.onboarding,
                ...persistedState.onboarding,
              },
            };
          }
          return persistedState;
        },
      },
    ),
  ),
);

// Selectors for optimized re-renders
export const useCurrentAgent = () =>
  useAgentBuilderStore((state) => state.currentAgent);
export const useOnboarding = () =>
  useAgentBuilderStore((state) => state.onboarding);
export const useAIAssistant = () =>
  useAgentBuilderStore((state) => state.aiAssistant);
export const useVisualBuilder = () =>
  useAgentBuilderStore((state) => state.visualBuilder);
export const useComponentPalette = () =>
  useAgentBuilderStore((state) => state.componentPalette);
export const useUIState = () =>
  useAgentBuilderStore((state) => ({
    activeTab: state.activeTab,
    showAIAssistant: state.showAIAssistant,
    showVisualBuilder: state.showVisualBuilder,
    showComponentPalette: state.showComponentPalette,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    isDeploying: state.isDeploying,
    errors: state.errors,
    warnings: state.warnings,
  }));

// Auto-save functionality
if (typeof window !== "undefined") {
  useAgentBuilderStore.subscribe(
    (state) => state.currentAgent,
    () => {
      const { saveToLocalStorage } = useAgentBuilderStore.getState();
      // Debounce auto-save
      clearTimeout((window as any).autoSaveTimeout);
      (window as any).autoSaveTimeout = setTimeout(saveToLocalStorage, 1000);
    },
  );

  // Analytics tracking
  useAgentBuilderStore.subscribe(
    (state) => state.onboarding.analytics,
    (analytics) => {
      // Track user engagement metrics
      if (analytics.lastActiveTimestamp) {
        const timeSpent = Date.now() - analytics.lastActiveTimestamp;
        if (timeSpent > 60000) {
          // More than 1 minute
          useAgentBuilderStore.getState().updateAnalytics({
            timeSpent: analytics.timeSpent + timeSpent,
          });
        }
      }
    },
  );
}
