import { z } from "zod";

// Newsletter subscription schema
export const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Contact form schema
export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const widgetConfigurationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  logo: z.string().url("Please enter a valid logo URL"),
  website: z.string().url("Please enter a valid website URL"), 
  security: z.object({
    allowedDomains: z.array(z.string()).min(1, "At least one allowed domain is required"),
    requireAuth: z.boolean(),
    rateLimiting: z.object({
      enabled: z.boolean(),
      requestsPerMinute: z.number().min(1, "Requests per minute must be at least 1"),
    }),
  }),
  appearance: z.object({
    theme: z.string().min(2, "Theme must be at least 2 characters"),
    colorScheme: z.string().min(2, "Color scheme must be at least 2 characters"),
  }),
  analytics: z.object({
    enabled: z.boolean(),
    trackingId: z.string().min(2, "Tracking ID must be at least 2 characters"),
  }),
  integrations: z.object({
    googleAnalytics: z.boolean(),
    googleTagManager: z.boolean(),
  }),
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const organizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  logo: z.string().url("Please enter a valid logo URL"),
  website: z.string().url("Please enter a valid website URL"),
  industry: z.string().min(2, "Industry must be at least 2 characters")
});

export const userProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  zip: z.string().min(5, "Zip must be at least 5 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  website: z.string().url("Please enter a valid website URL"),
  industry: z.string().min(2, "Industry must be at least 2 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  avatar: z.string().url("Please enter a valid avatar URL"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  status: z.string().min(2, "Status must be at least 2 characters"),
  lastLogin: z.date(),
  createdAt: z.date(),
});

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
});
export type UserProfileFormData = z.infer<typeof userProfileSchema>;




export type NewsletterFormData = z.infer<typeof newsletterSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type WidgetConfigurationFormData = z.infer<typeof widgetConfigurationSchema>;
