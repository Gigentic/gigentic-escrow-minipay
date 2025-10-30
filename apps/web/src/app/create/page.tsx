"use client";

import { CreateEscrowForm } from "@/components/escrow/create-escrow-form";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Loader2 } from "lucide-react";

export default function CreatePage() {
  // Protect this route - requires authentication
  const { isLoading: isAuthLoading } = useRequireAuth();

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // Auth guard will redirect if not authenticated, so this code only runs when authenticated
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Escrow</h1>
          <p className="text-muted-foreground">
            Lock funds securely and define deliverables for trustless transactions
          </p>
        </div>

        <CreateEscrowForm />
      </div>
    </main>
  );
}

