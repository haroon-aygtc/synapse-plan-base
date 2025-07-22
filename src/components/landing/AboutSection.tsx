"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
// import { motion } from "framer-motion";
import Link from "next/link";

const AboutSection = () => {
  const benefits = [
    "Zero-learning curve with AI-powered assistance",
    "5-minute idea-to-deployment experience",
    "Enterprise-grade security and compliance",
    "99.9% uptime with automatic scaling",
    "24/7 expert support and community",
    "Transparent pricing with no hidden fees",
  ];

  const stats = [
    { label: "Active Users", value: "10,000+" },
    { label: "Workflows Created", value: "50,000+" },
    { label: "API Integrations", value: "1,000+" },
    { label: "Uptime", value: "99.9%" },
  ];

  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            <Badge variant="secondary" className="mb-4">
              Why Choose SynapseAI
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              The Future of
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent block">
                AI Automation
              </span>
              is Here
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We're revolutionizing how businesses build and deploy AI
              solutions. Our platform combines the power of advanced AI with an
              intuitive no-code interface, making intelligent automation
              accessible to everyone.
            </p>

            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={benefit} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <Link href="/auth/register">
              <Button size="lg" className="group">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Right Column - Stats Cards */}
          <div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Main Stats Card */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-0">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mission Statement Card */}
            <Card className="p-6">
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To democratize AI automation by making it accessible,
                  intuitive, and powerful for businesses of all sizes. We
                  believe everyone should be able to harness the power of AI
                  without needing technical expertise.
                </p>
              </CardContent>
            </Card>

            {/* Values Card */}
            <Card className="p-6">
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-3">Our Values</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      Innovation First
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      User-Centric Design
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      Transparency & Trust
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
