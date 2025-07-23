"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import ConnectionStatus from "@/components/connection-status";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  X,
  Home,
  Bot,
  Wrench,
  GitBranch,
  FileText,
  BarChart3,
  Palette,
  Settings,
  Users,
  CreditCard,
  Shield,
  HelpCircle,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
  Database,
  Bell,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-4 w-4" />,
  },
  {
    id: "agents",
    label: "AI Agents",
    href: "/agents",
    icon: <Bot className="h-4 w-4" />,
    children: [
      {
        id: "agents-list",
        label: "All Agents",
        href: "/agents",
        icon: <Bot className="h-3 w-3" />,
      },
      {
        id: "agents-create",
        label: "Create Agent",
        href: "/agents/create",
        icon: <Bot className="h-3 w-3" />,
      },
      {
        id: "agents-templates",
        label: "Templates",
        href: "/agents/templates",
        icon: <Bot className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    href: "/tools",
    icon: <Wrench className="h-4 w-4" />,
    children: [
      {
        id: "tools-list",
        label: "All Tools",
        href: "/tools",
        icon: <Wrench className="h-3 w-3" />,
      },
      {
        id: "tools-create",
        label: "Create Tool",
        href: "/tools/create",
        icon: <Wrench className="h-3 w-3" />,
      },
      {
        id: "tools-marketplace",
        label: "Marketplace",
        href: "/tools/marketplace",
        icon: <Wrench className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "workflows",
    label: "Workflows",
    href: "/workflows",
    icon: <GitBranch className="h-4 w-4" />,
    children: [
      {
        id: "workflows-list",
        label: "All Workflows",
        href: "/workflows",
        icon: <GitBranch className="h-3 w-3" />,
      },
      {
        id: "workflows-create",
        label: "Create Workflow",
        href: "/workflows/create",
        icon: <GitBranch className="h-3 w-3" />,
      },
      {
        id: "workflows-templates",
        label: "Templates",
        href: "/workflows/templates",
        icon: <GitBranch className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge Base",
    href: "/knowledge",
    icon: <FileText className="h-4 w-4" />,
    children: [
      {
        id: "knowledge-documents",
        label: "Documents",
        href: "/knowledge/documents",
        icon: <FileText className="h-3 w-3" />,
      },
      {
        id: "knowledge-upload",
        label: "Upload",
        href: "/knowledge/upload",
        icon: <FileText className="h-3 w-3" />,
      },
      {
        id: "knowledge-search",
        label: "Search",
        href: "/knowledge/search",
        icon: <FileText className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    children: [
      {
        id: "analytics-overview",
        label: "Overview",
        href: "/analytics",
        icon: <BarChart3 className="h-3 w-3" />,
      },
      {
        id: "analytics-performance",
        label: "Performance",
        href: "/analytics/performance",
        icon: <Activity className="h-3 w-3" />,
      },
      {
        id: "analytics-usage",
        label: "Usage",
        href: "/analytics/usage",
        icon: <BarChart3 className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "widgets",
    label: "Widgets",
    href: "/widgets",
    icon: <Palette className="h-4 w-4" />,
    children: [
      {
        id: "widgets-list",
        label: "All Widgets",
        href: "/widgets",
        icon: <Palette className="h-3 w-3" />,
      },
      {
        id: "widgets-create",
        label: "Create Widget",
        href: "/widgets/create",
        icon: <Palette className="h-3 w-3" />,
      },
      {
        id: "widgets-marketplace",
        label: "Marketplace",
        href: "/widgets/marketplace",
        icon: <Palette className="h-3 w-3" />,
      },
    ],
  },
  {
    id: "providers",
    label: "AI Providers",
    href: "/providers",
    icon: <Zap className="h-4 w-4" />,
  },
];

const adminItems: NavigationItem[] = [
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "billing",
    label: "Billing",
    href: "/admin/billing",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "security",
    label: "Security",
    href: "/admin/security",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    id: "system",
    label: "System",
    href: "/admin/system",
    icon: <Database className="h-4 w-4" />,
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const getUserInitials = () => {
    if (!user) return "U";
    return (
      `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U"
    );
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email ||
      "User"
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = isActiveRoute(item.href);
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
            isActive && "bg-accent text-accent-foreground",
            level > 0 && "ml-4 text-xs",
            sidebarCollapsed && level === 0 && "justify-center px-2",
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              router.push(item.href);
            }
          }}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            {(!sidebarCollapsed || level > 0) && (
              <span className="truncate">{item.label}</span>
            )}
            {item.badge && !sidebarCollapsed && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && !sidebarCollapsed && (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          )}
        </div>
        {hasChildren && isExpanded && !sidebarCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) =>
              renderNavigationItem(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold">SynapseAI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-2">
            {/* Main Navigation */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Main
                </div>
              )}
              {navigationItems.map((item) => renderNavigationItem(item))}
            </div>

            {/* Admin Section */}
            {user?.role === "SUPER_ADMIN" && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  {!sidebarCollapsed && (
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Admin
                    </div>
                  )}
                  {adminItems.map((item) => renderNavigationItem(item))}
                </div>
              </>
            )}

            {/* Help Section */}
            <Separator className="my-4" />
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Support
                </div>
              )}
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  sidebarCollapsed && "justify-center px-2",
                )}
                onClick={() => router.push("/help")}
              >
                <HelpCircle className="h-4 w-4" />
                {!sidebarCollapsed && <span>Help & Support</span>}
              </div>
            </div>
          </nav>
        </div>

        {/* User Section */}
        {!sidebarCollapsed && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3 text-sm">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} alt={getUserDisplayName()} />
                <AvatarFallback className="text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="font-medium truncate">
                  {getUserDisplayName()}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname
                    .split("/")
                    .pop()
                    ?.replace(/[-_]/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase()) || "SynapseAI"}
            </h1>
            <ConnectionStatus />
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatar}
                      alt={getUserDisplayName()}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/40">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
