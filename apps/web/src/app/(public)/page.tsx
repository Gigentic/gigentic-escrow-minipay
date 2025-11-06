import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeeCalculatorWidget } from "@/components/escrow/fee-calculator-widget";
import { Calculator } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Keep Your <span className="text-primary">Payments in Check</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            <span className="block md:inline">Escrowed transactions </span><span>with seamless dispute resolution</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                Send Escrowed Payment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Escrow</h3>
              <p className="text-muted-foreground">
                Depositor creates an escrow with cUSD, defines deliverables, and locks funds on-chain.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Deliver Work</h3>
              <p className="text-muted-foreground">
                Recipient completes the work according to the agreed-upon acceptance criteria.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Release Funds</h3>
              <p className="text-muted-foreground">
                Depositor confirms completion and releases funds. If there's a dispute, an arbiter resolves it.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Fee Calculator Section */}
      <section className="bg-muted mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Calculator className="text-primary w-8 h-8 md:w-10 md:h-10" />
            <h2 className="text-3xl md:text-4xl font-bold">
              Calculate Your Costs
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            See exactly what you'll pay. No hidden fees.
          </p>
          <div className="flex justify-center">
            <FeeCalculatorWidget />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Gigentic CheckPay?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">🔒 Trustless & Secure</h3>
              <p className="text-muted-foreground">
                Smart contracts ensure funds are locked until conditions are met.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">💰 Low Fees</h3>
              <p className="text-muted-foreground">
                Only 1% platform fee. No hidden costs. Low gas fees.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">🔑 Wallet-Only Auth</h3>
              <p className="text-muted-foreground">
                No sign-up, no passwords. Your wallet is your identity. Connect and start transacting.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">⚖️ Fair Dispute Resolution</h3>
              <p className="text-muted-foreground">
                If issues arise, disputes are resolved by trained arbiters. 4% dispute bond ensures good faith.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">🗃️ Off-Chain Personal Data</h3>
              <p className="text-muted-foreground">
                Your personal data is stored off-chain in a GDPR and SOC2-aligned way.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">🌍 Open For All</h3>
              <p className="text-muted-foreground">
                No bank account needed. Use stablecoins for predictable transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Connect your wallet and create your first escrow in minutes
          </p>
          <Link href="/create">
            <Button size="lg" variant="default" className="text-lg px-8">
              Create Your First Escrow
            </Button>
          </Link>
        </div>
      </section>

      {/* Learn More */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Want to Learn More?</h2>
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">
              Read the Guide
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
