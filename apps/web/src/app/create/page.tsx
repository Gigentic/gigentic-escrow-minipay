import { CreateEscrowForm } from "@/components/escrow/create-escrow-form";

export default function CreatePage() {
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

