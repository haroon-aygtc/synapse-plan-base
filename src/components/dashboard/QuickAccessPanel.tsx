import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wrench, GitBranch, FileText } from "lucide-react";
import Link from "next/link";

interface QuickAccessPanelProps {
  className?: string;
}

const QuickAccessPanel = ({ className = "" }: QuickAccessPanelProps) => {
  const quickAccessItems = [
    {
      title: "Create Agent",
      description: "Build an AI agent with our visual builder",
      icon: <PlusCircle className="h-5 w-5" />,
      href: "/agents/create",
      color: "bg-blue-500",
    },
    {
      title: "Create Tool",
      description: "Connect APIs and create reusable tools",
      icon: <Wrench className="h-5 w-5" />,
      href: "/tools/create",
      color: "bg-green-500",
    },
    {
      title: "Build Workflow",
      description: "Combine agents and tools in workflows",
      icon: <GitBranch className="h-5 w-5" />,
      href: "/workflows/create",
      color: "bg-purple-500",
    },
    {
      title: "Upload Knowledge",
      description: "Add documents to your knowledge base",
      icon: <FileText className="h-5 w-5" />,
      href: "/knowledge/upload",
      color: "bg-amber-500",
    },
  ];

  return (
    <Card className={`bg-background ${className}`}>
      <CardContent className="p-5">
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-3">
          {quickAccessItems.map((item, index) => (
            <Link href={item.href} key={index} className="block">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-accent group"
              >
                <div className={`${item.color} p-2 rounded-md mr-3 text-white`}>
                  {item.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground group-hover:text-foreground/80">
                    {item.description}
                  </div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickAccessPanel;
