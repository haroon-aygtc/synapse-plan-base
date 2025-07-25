import 'lucide-react';
import '@/components/ui/button';
import '@/components/ui/card';
import '@/components/ui/badge';
import '@/components/ui/textarea';

declare module 'lucide-react' {
  export interface LucideProps {
    className?: string;
    color?: string;
  }
}

declare module '@/components/ui/button' {
  export interface ButtonProps {
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    disabled?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }
}

declare module '@/components/ui/card' {
  export interface CardProps {
    className?: string;
  }
  
  export interface CardHeaderProps {
    className?: string;
  }
  
  export interface CardTitleProps {
    className?: string;
  }
  
  export interface CardDescriptionProps {
    className?: string;
  }
  
  export interface CardContentProps {
    className?: string;
  }
  
  export interface CardFooterProps {
    className?: string;
  }
}

declare module '@/components/ui/badge' {
  export interface BadgeProps {
    className?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }
}

declare module '@/components/ui/textarea' {
  export interface TextareaProps {
    className?: string;
    id?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
  }
} 