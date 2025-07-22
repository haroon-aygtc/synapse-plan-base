"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO",
      company: "TechFlow Inc",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      content:
        "SynapseAI transformed how we handle customer support. We built an AI agent that resolves 80% of tickets automatically. The ROI was immediate.",
      rating: 5,
    },
    {
      name: "Marcus Rodriguez",
      role: "Operations Director",
      company: "Global Logistics",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
      content:
        "The visual workflow builder is incredible. We automated our entire order processing pipeline in just 2 hours. No coding required!",
      rating: 5,
    },
    {
      name: "Emily Watson",
      role: "Marketing Manager",
      company: "Creative Agency",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
      content:
        "From lead generation to client onboarding, everything is automated. Our team can now focus on strategy instead of repetitive tasks.",
      rating: 5,
    },
    {
      name: "David Kim",
      role: "Founder",
      company: "StartupXYZ",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
      content:
        "As a non-technical founder, I was amazed at how quickly I could build complex AI workflows. The platform is truly revolutionary.",
      rating: 5,
    },
    {
      name: "Lisa Thompson",
      role: "HR Director",
      company: "Enterprise Corp",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
      content:
        "Our recruitment process is now 10x faster. The AI screens candidates and schedules interviews automatically. Game-changer!",
      rating: 5,
    },
    {
      name: "Alex Johnson",
      role: "Product Manager",
      company: "InnovateLab",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      content:
        "The knowledge base integration is phenomenal. Our AI agent can answer complex product questions by searching through our documentation.",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4">
              Customer Success Stories
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Trusted by
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent block">
                Industry Leaders
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how businesses across industries are transforming their
              operations with our AI automation platform.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
                <CardContent className="p-6">
                  {/* Rating */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.name}
                      />
                      <AvatarFallback>
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by companies of all sizes, from startups to Fortune 500
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {/* Placeholder for company logos */}
            <div className="h-8 w-24 bg-muted rounded"></div>
            <div className="h-8 w-20 bg-muted rounded"></div>
            <div className="h-8 w-28 bg-muted rounded"></div>
            <div className="h-8 w-22 bg-muted rounded"></div>
            <div className="h-8 w-26 bg-muted rounded"></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
