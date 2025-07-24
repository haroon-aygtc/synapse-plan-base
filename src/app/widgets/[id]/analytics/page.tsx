"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWidgets } from "@/hooks/useWidgets";
import { useAuth } from "@/hooks/useAuth";
import { WidgetAnalytics } from "@/components/widgets/WidgetAnalytics";
import { Widget } from "@/lib/sdk/types";

export default function WidgetAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const { getWidget } = useWidgets();

  const [widget, setWidget] = useState<Widget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const widgetId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    loadWidget();
  }, [isAuthenticated, widgetId]);

  const loadWidget = async () => {
    try {
      setLoading(true);
      setError(null);
      const widgetData = await getWidget(widgetId);
      setWidget(widgetData);
    } catch (err: any) {
      setError(err.message || "Failed to load widget");
      console.error("Error loading widget:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 space-x-2">
              <Button onClick={loadWidget}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push("/widgets")}>
                Back to Widgets
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Widget Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The requested widget could not be found.
            </p>
            <Button onClick={() => router.push("/widgets")}>
              Back to Widgets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/widgets")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Analytics - {widget.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Comprehensive analytics and insights for your widget
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WidgetAnalytics widget={widget} />
      </div>
    </div>
  );
}
