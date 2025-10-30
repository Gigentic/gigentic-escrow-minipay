"use client";

import { CreateEscrowForm } from "@/components/escrow/create-escrow-form";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function CreatePage() {
  // Get URL query params
  const searchParams = useSearchParams();
  const amountParam = searchParams.get("amount");

  // Protect this route - requires authentication
  const { shouldRenderContent, isCheckingAuth } = useRequireAuth();

  // Show loading while checking auth (prevents flicker)
  if (isCheckingAuth) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // Don't render content until auth verified (prevents flicker)
  if (!shouldRenderContent) {
    return null;
  }

  // Auth guard ensures we only reach here when authenticated
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Escrow</h1>
        </div>

        <CreateEscrowForm initialAmount={amountParam || undefined} />
      </div>
    </main>
  );
}

