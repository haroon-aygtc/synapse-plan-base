"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Workflow,
  Zap,
  Brain,
  Shield,
  BarChart3,
  Palette,
  Users,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

const FeaturesSection = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Agent Builder",
      description:
        "Create intelligent AI agents with natural language. No coding required.",
      badge: "Revolutionary",
      color: "text-blue-500",
    },
    {
      icon: Workflow,
      title: "Visual Workflow Designer",
      description:
        "Drag-and-drop workflow builder with real-time execution monitoring.",
      badge: "Intuitive",
      color: "text-green-500",
    },
    {
      icon: Zap,
      title: "Tool Integration Hub",
      description:
        "Connect to 1000+ tools and APIs with one-click integrations.",
      badge: "Powerful",
      color: "text-yellow-500",
    },
    {
      icon: Brain,
      title: "Knowledge Base RAG",
      description:
        "Upload documents and let AI search and cite information automatically.",
      badge: "Smart",
      color: "text-purple-500",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "SOC 2, GDPR, and HIPAA compliant with end-to-end encryption.",
      badge: "Secure",
      color: "text-red-500",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Real-time insights, performance metrics, and predictive analytics.",
      badge: "Insightful",
      color: "text-indigo-500",
    },
    {
      icon: Palette,
      title: "Widget Generator",
      description:
        "Convert any workflow into embeddable widgets for your website.",
      badge: "Flexible",
      color: "text-pink-500",
    },
    {
      icon: Users,
      title: "Human-in-the-Loop",
      description:
        "Seamless approval workflows with collaborative decision making.",
      badge: "Collaborative",
      color: "text-teal-500",
    },
    {
      icon: Clock,
      title: "Real-time Execution",
      description:
        "Live monitoring and instant updates across all your workflows.",
      badge: "Fast",
      color: "text-orange-500",
    },
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to Build
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent block">
                Intelligent Automation
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to
              create, deploy, and manage AI-powered workflows at scale.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-lg bg-muted group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
