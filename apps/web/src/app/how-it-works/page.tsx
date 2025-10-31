import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">How Gigentic CheckPay Works</h1>
          <p className="text-xl text-muted-foreground">
            A comprehensive guide to secure peer-to-peer escrowed payments
          </p>
        </div>

        {/* The Basics */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Gigentic CheckPay</h2>
          <p className="text-muted-foreground mb-4">
            is a secure platform for trust-minimized transactions between parties who don't
            necessarily trust each other. It locks funds in a smart contract
            until agreed-upon conditions are met.
          </p>
        </Card>

        {/* Step by Step */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Step by Step Process</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-2">Depositor Creates Escrow</h3>
                <p className="text-sm text-muted-foreground">
                  The depositor (buyer/employer) creates an escrow by specifying the recipient address,
                  amount in cUSD, and deliverable details including acceptance criteria.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-2">Funds Locked in Contract</h3>
                <p className="text-sm text-muted-foreground">
                  The depositor approves and transfers cUSD to the escrow contract. Total required is
                  105% of escrow amount.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-2">Recipient Delivers Work</h3>
                <p className="text-sm text-muted-foreground">
                  The recipient (seller/freelancer) completes the work according to the agreed-upon
                  acceptance criteria and notifies the depositor.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-2">Depositor Reviews & Completes</h3>
                <p className="text-sm text-muted-foreground">
                  If satisfied, the depositor completes the escrowed payment. Funds are released to the recipient,
                  and the dispute bond is returned to the depositor.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-primary-foreground font-bold">
                5
              </div>
              <div>
                <h3 className="font-semibold mb-2">Or Dispute if Needed</h3>
                <p className="text-sm text-muted-foreground">
                  If there's a problem, either party can raise a dispute. An arbiter reviews the case
                  and decides whether to complete or refund the payment.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Fees & Costs */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Fees & Costs</h2>
          <div className="space-y-4">
            <div className="border-l-4  border-yellow-500 pl-4">
              <h3 className="font-semibold mb-1">Platform Fee: 1%</h3>
              <p className="text-sm text-muted-foreground">
                Charged on every escrow. Goes to the platform to cover operational costs.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold mb-1">Dispute Bond: 4%</h3>
              <p className="text-sm text-muted-foreground">
                Refundable deposit to discourage frivolous disputes. Returned if no dispute is raised.
                If dispute occurs, the losing party forfeits their bond.
              </p>
            </div>

            <div className="border-l-4 border-gray-500 pl-4">
              <h3 className="font-semibold mb-1">Gas Fees: ~$0.01</h3>
              <p className="text-sm text-muted-foreground">
                Near-zero transaction fees make micro-transactions viable.
              </p>
            </div>
          </div>

          <div className="mt-6 bg-muted p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Example: 100 cUSD Payment</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow Amount:</span>
                <span>100 cUSD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (1%):</span>
                <span>1 cUSD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispute Bond (4%):</span>
                <span>4 cUSD</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Required:</span>
                <span>105 cUSD</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                <span>Returned on Completion:</span>
                <span className="font-semibold">4 cUSD</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Dispute Resolution */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Dispute Resolution</h2>
          <p className="text-muted-foreground mb-4">
            If a dispute is raised, here's what happens:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Dispute Raised</h3>
              <p className="text-sm text-muted-foreground">
                Either party can raise a dispute with a reason. The escrow enters DISPUTED state.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Arbiter Reviews</h3>
              <p className="text-sm text-muted-foreground">
                A designated arbiter reviews the deliverable, acceptance criteria, and dispute reason.
                They may consider additional evidence provided by both parties.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Decision Made</h3>
              <p className="text-sm text-muted-foreground">
                The arbiter decides to either complete the escrow (favoring recipient) or refund it
                (favoring depositor). The decision includes a detailed rationale.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Bond Distribution</h3>
              <p className="text-sm text-muted-foreground">
                The losing party forfeits their dispute bond to the arbiter. The winning party receives
                the escrow amount plus their bond back.
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Do I need a bank account?</h3>
              <p className="text-sm text-muted-foreground">
                No! You only need a Celo-compatible wallet (like MiniPay) and cUSD stablecoins. 
                We plan to support other stablecoins in the future.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What is cUSD?</h3>
              <p className="text-sm text-muted-foreground">
                cUSD is a stablecoin on Celo blockchain pegged 1:1 to the US Dollar. It provides price
                stability for transactions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">How long does it take?</h3>
              <p className="text-sm text-muted-foreground">
                Creating and completing an escrow takes seconds. Dispute resolution typically completes
                within 24-48 hours.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Can the arbiter steal my funds?</h3>
              <p className="text-sm text-muted-foreground">
                No. The arbiter can only decide who gets the funds (depositor or recipient), not take
                them. All decisions are recorded on-chain.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What if I change my mind?</h3>
              <p className="text-sm text-muted-foreground">
                Once created, an escrow can only be completed (by depositor) or disputed (by either
                party). There's no cancel function to prevent misuse.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Is my data private?</h3>
              <p className="text-sm text-muted-foreground">
                All transactions and dispute resolution outcomes are public on the blockchain, but the
                deliverable and dispute resolution details are private and stored off-chain. 
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Your profile attached to your wallet address is public but you get to choose what you want to 
                share about yourself and you can delete your off-chain data at any time.
              </p>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Create your first escrowed payment in minutes
          </p>
          <Link href="/create">
            <Button size="lg" className="text-lg px-8">
              Create Escrow
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

