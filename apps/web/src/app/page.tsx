import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Secure Escrow for <span className="text-primary">Emerging Markets</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Trustless peer-to-peer transactions on Celo blockchain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                Create Escrow
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-16">
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

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Gigentic Escrow?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">🔒 Trustless & Secure</h3>
              <p className="text-muted-foreground">
                Smart contracts on Celo blockchain ensure funds are locked until conditions are met.
                No intermediaries needed.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">📱 Mobile-First</h3>
              <p className="text-muted-foreground">
                Optimized for MiniPay wallet. Create and manage escrows directly from your phone.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">💰 Low Fees</h3>
              <p className="text-muted-foreground">
                Only 1% platform fee. No hidden costs. Built on Celo for near-zero gas fees.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">⚖️ Fair Dispute Resolution</h3>
              <p className="text-muted-foreground">
                If issues arise, disputes are resolved by trained arbiters. 4% dispute bond ensures good faith.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">🌍 For Emerging Markets</h3>
              <p className="text-muted-foreground">
                No bank account needed. Use cUSD stable coin for predictable transactions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">🔑 Wallet-Only Auth</h3>
              <p className="text-muted-foreground">
                No sign-up, no passwords. Your wallet is your identity. Connect and start transacting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Connect your wallet and create your first escrow in minutes
          </p>
          <Link href="/create">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Create Your First Escrow
            </Button>
          </Link>
        </div>
      </section>

      {/* Learn More */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Want to Learn More?</h2>
          <p className="text-muted-foreground mb-6">
            Check out our detailed guide on how escrows work, fees, and dispute resolution.
          </p>
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
