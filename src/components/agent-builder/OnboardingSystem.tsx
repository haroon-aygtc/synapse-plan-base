'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentBuilderStore } from '@/store/agentBuilderStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Lightbulb,
  Target,
  Zap,
  Bot,
  Settings,
  Play,
  Award,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Star,
  Trophy,
  Gift
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  completionCriteria: string[];
  tips: string[];
  estimatedTime: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export function OnboardingSystem() {
  const {
    onboarding,
    startOnboarding,
    completeOnboardingStep,
    skipOnboarding,
    updateOnboardingPreferences,
    discoverFeature,
    addAchievement,
    updateAnalytics
  } = useAgentBuilderStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showContextualHelp, setShowContextualHelp] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to SynapseAI',
      description: 'Let\'s create your first AI agent in just a few minutes',
      component: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Welcome to the Future of AI</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You're about to create your first AI agent. This interactive tutorial will guide you through every step.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <Bot className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Smart Agents</p>
            </div>
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm font-medium">Instant Deploy</p>
            </div>
            <div className="text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Real Results</p>
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['User clicks continue'],
      tips: ['This will only take 5 minutes', 'You\'ll create a real working agent'],
      estimatedTime: 1
    },
    {
      id: 'agent-basics',
      title: 'Agent Basics',
      description: 'Give your agent a name and purpose',
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name</label>
            <input
              type="text"
              placeholder="My Customer Support Agent"
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">What should your agent do?</label>
            <textarea
              placeholder="Help customers with product questions and support issues..."
              className="w-full p-2 border rounded-md h-20"
            />
          </div>
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Pro Tip</p>
                <p className="text-blue-700">Be specific about your agent's role. The more detail you provide, the better it will perform.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['Name provided', 'Description provided'],
      tips: ['Be specific about the agent\'s role', 'Think about your target audience'],
      estimatedTime: 2
    },
    {
      id: 'personality',
      title: 'Personality & Style',
      description: 'Define how your agent communicates',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <select className="w-full p-2 border rounded-md">
                <option>Friendly</option>
                <option>Professional</option>
                <option>Casual</option>
                <option>Formal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <select className="w-full p-2 border rounded-md">
                <option>Conversational</option>
                <option>Direct</option>
                <option>Detailed</option>
                <option>Concise</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Personality Traits</label>
            <div className="space-y-2">
              {['Empathetic', 'Patient', 'Knowledgeable', 'Helpful'].map((trait) => (
                <div key={trait} className="flex items-center justify-between">
                  <span className="text-sm">{trait}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div className="w-3/4 h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs text-muted-foreground">75%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['Tone selected', 'Style selected'],
      tips: ['Match personality to your use case', 'Consider your brand voice'],
      estimatedTime: 2
    },
    {
      id: 'capabilities',
      title: 'Add Capabilities',
      description: 'Choose what your agent can do',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Web Search', icon: '🔍', description: 'Search the internet for information' },
              { name: 'Email', icon: '📧', description: 'Send emails and notifications' },
              { name: 'Calendar', icon: '📅', description: 'Schedule and manage appointments' },
              { name: 'Knowledge Base', icon: '📚', description: 'Access your company knowledge' },
              { name: 'Data Analysis', icon: '📊', description: 'Analyze data and create reports' },
              { name: 'Image Generation', icon: '🎨', description: 'Create and edit images' }
            ].map((capability) => (
              <div key={capability.name} className="border rounded-lg p-3 cursor-pointer hover:bg-muted">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{capability.icon}</span>
                  <span className="font-medium text-sm">{capability.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{capability.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900">Smart Suggestion</p>
                <p className="text-green-700">Based on your description, we recommend Web Search and Knowledge Base capabilities.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['At least one capability selected'],
      tips: ['Start with basic capabilities', 'You can add more later'],
      estimatedTime: 2
    },
    {
      id: 'test-deploy',
      title: 'Test & Deploy',
      description: 'Test your agent and make it live',
      component: (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="font-medium text-sm">Your Agent</span>
            </div>
            <p className="text-sm mb-3">Hello! I'm your customer support agent. How can I help you today?</p>
            <div className="flex items-center space-x-2">
              <Button size="sm" className="h-7">
                <Play className="h-3 w-3 mr-1" />
                Test Agent
              </Button>
              <Button size="sm" variant="outline" className="h-7">
                <Settings className="h-3 w-3 mr-1" />
                Adjust
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Deployment Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-md p-2 text-center cursor-pointer hover:bg-muted">
                <div className="text-lg mb-1">🌐</div>
                <p className="text-xs font-medium">Web Widget</p>
              </div>
              <div className="border rounded-md p-2 text-center cursor-pointer hover:bg-muted">
                <div className="text-lg mb-1">💬</div>
                <p className="text-xs font-medium">Chat Interface</p>
              </div>
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['Agent tested', 'Deployment method selected'],
      tips: ['Test thoroughly before deploying', 'You can update anytime'],
      estimatedTime: 3
    },
    {
      id: 'congratulations',
      title: 'Congratulations!',
      description: 'Your agent is ready to help users',
      component: (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold">Agent Successfully Created!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your AI agent is now live and ready to help users. You can monitor its performance and make improvements anytime.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Gift className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">What's Next?</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center">
                <div className="text-lg mb-1">📊</div>
                <p>Monitor Performance</p>
              </div>
              <div className="text-center">
                <div className="text-lg mb-1">🔧</div>
                <p>Add More Tools</p>
              </div>
            </div>
          </div>
        </div>
      ),
      completionCriteria: ['Tutorial completed'],
      tips: ['Explore the dashboard', 'Check out advanced features'],
      estimatedTime: 1
    }
  ];

  const handleNextStep = useCallback(() => {
    const currentStep = onboardingSteps[currentStepIndex];
    completeOnboardingStep(currentStep.id);
    
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Tutorial completed
      addAchievement('first-agent-created');
      setShowAchievement({
        id: 'first-agent-created',
        title: 'Agent Creator',
        description: 'Created your first AI agent',
        icon: <Bot className="h-6 w-6" />,
        unlocked: true,
        progress: 1,
        maxProgress: 1
      });
      
      setTimeout(() => {
        skipOnboarding();
      }, 3000);
    }
    
    updateAnalytics({
      stepsCompleted: onboarding.analytics.stepsCompleted + 1,
      timeSpent: onboarding.analytics.timeSpent + currentStep.estimatedTime * 60000
    });
  }, [currentStepIndex, completeOnboardingStep, addAchievement, skipOnboarding, updateAnalytics, onboarding.analytics]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkipOnboarding = useCallback(() => {
    skipOnboarding();
    toast({
      title: 'Onboarding Skipped',
      description: 'You can restart the tutorial anytime from settings',
    });
  }, [skipOnboarding]);

  const currentStep = onboardingSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / onboardingSteps.length) * 100;

  if (!onboarding.isActive) {
    return null;
  }

  return (
    <>
      <Dialog open={onboarding.isActive} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl" >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>{currentStep.title}</span>
                </DialogTitle>
                <DialogDescription>{currentStep.description}</DialogDescription>
              </div>
              <Badge variant="outline">
                Step {currentStepIndex + 1} of {onboardingSteps.length}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Content */}
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep.component}
            </motion.div>

            {/* Tips */}
            {currentStep.tips.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Tips</p>
                    <ul className="text-sm text-amber-800 mt-1 space-y-1">
                      {currentStep.tips.map((tip, index) => (
                        <li key={index} className="flex items-start space-x-1">
                          <span>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipOnboarding}
                  className="text-muted-foreground"
                >
                  Skip Tutorial
                </Button>
                {onboarding.preferences.showHints && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContextualHelp(true)}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Help
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {currentStepIndex > 0 && (
                  <Button variant="outline" onClick={handlePreviousStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button onClick={handleNextStep}>
                  {currentStepIndex === onboardingSteps.length - 1 ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Achievement Notification */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className="w-80 border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    {showAchievement.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base text-yellow-900">Achievement Unlocked!</CardTitle>
                    <CardDescription className="text-yellow-700">{showAchievement.title}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-yellow-800">{showAchievement.description}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-yellow-700 hover:text-yellow-900"
                  onClick={() => setShowAchievement(null)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual Help */}
      <Dialog open={showContextualHelp} onOpenChange={setShowContextualHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Need Help?</DialogTitle>
            <DialogDescription>
              Here are some tips for the current step
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Completion Criteria</h4>
              <ul className="space-y-1">
                {currentStep.completionCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Estimated Time</h4>
              <p className="text-sm text-muted-foreground">
                This step typically takes {currentStep.estimatedTime} minute{currentStep.estimatedTime !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}