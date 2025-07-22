"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsletterSchema, type NewsletterFormData } from "@/lib/validations";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

declare module "lucide-react";

const NewsletterSection = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  });

  const onSubmit = async (data: NewsletterFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSubmitted(true);
      reset();

      toast({
        title: "Successfully subscribed!",
        description:
          "Welcome to our newsletter. You'll receive updates about new features and tips.",
      });
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">
                  <Mail className="w-4 h-4 mr-2" />
                  Stay Updated
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Get the Latest
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent block">
                    AI Automation Insights
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join 10,000+ professionals who receive our weekly newsletter
                  with AI automation tips, platform updates, and exclusive
                  content.
                </p>
              </div>

              {!isSubmitted ? (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="max-w-md mx-auto"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        {...register("email")}
                        type="email"
                        placeholder="Enter your email address"
                        className="h-12 text-base"
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="h-12 px-8"
                    >
                      {isSubmitting ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    No spam, unsubscribe at any time. We respect your privacy.
                  </p>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    You're all set!
                  </h3>
                  <p className="text-muted-foreground">
                    Thank you for subscribing. Check your email for a
                    confirmation message.
                  </p>
                </motion.div>
              )}

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 pt-8 border-t border-border/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    Weekly
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expert Tips
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    Early
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Feature Access
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    Exclusive
                  </div>
                  <div className="text-sm text-muted-foreground">Content</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
