# Building CheckPay: Vibecoding to Production

**A technical deep-dive into building a mobile-first blockchain escrow platform with AI assistance, and the hard lessons learned in the last mile to production.**

---

## Table of Contents

1. [The Vibecoding Experiment](#opening-the-vibecoding-experiment)
2. [Topic 1: The One-Click Dream—Why I Settled for Two Steps](#topic-1-the-one-click-dreamwhy-i-settled-for-two-steps)
3. [Topic 2: React Query—When AI Gives You Code That "Works"](#topic-2-react-querywhen-ai-gives-you-code-that-works)
4. [Topic 3: Mobile First Comes Last (But Not Least)](#topic-3-mobile-first-comes-last-but-not-least)
5. [Topic 4: Gas Optimization—Beyond Hashes to Encryption Tradeoffs](#topic-4-gas-optimizationbeyond-hashes-to-encryption-tradeoffs)
6. [Topic 5: Ecosystem Timing—When Your Testnet Disappears](#topic-5-ecosystem-timingwhen-your-testnet-disappears)
7. [Topic 6: The Bundle Size Paradox](#topic-6-the-bundle-size-paradox)
8. [Closing: Vibecoding to Production—The Real Rules](#conclusion-vibecoding-to-productionthe-real-rules)
9. [About CheckPay](#about-checkpay)

---

## The Vibecoding Experiment

200 network requests to load a single dashboard. 10 iterations to get wallet authentication working. A deployment script that just... hangs... for reasons you'll never guess. This is the story of building [**CheckPay**](https://checkpay.gigentic.ai) with AI: vibecoding my way through a mobile-first escrow platform, then rolling up my sleeves to fix what Claude couldn't.

I've shipped production code on Polkadot, Solana, and Bitcoin. But this was my first big EVM project, and I wanted to see how far AI-assisted development could take me.

**Spoiler:** Pretty far. But the last mile? That's all you.

### The Vibecoding Pattern

Before diving into the technical stories, let me set the stage: I vibecoded most of CheckPay. For the uninitiated, "vibecoding" means describing what you want at a high level and letting AI generate the scaffolding. It's incredibly powerful for velocity, until it's not.

**The pattern that I see from other builders which I can also confirm:**

- ✅ **AI excels at:** Boilerplate, standard patterns, "happy path" implementations
- ⚠️ **AI struggles with:** Edge cases, production optimization, ecosystem-specific quirks
- 🎯 **The gap:** Architecture requires human insight and judgment

This isn't a critique of AI, but a map of where developer expertise still matters. Let's walk through six areas where I learned this lesson a hard but fun way.

---

## Topic 1: The One-Click Dream—Why I Settled for Two Steps

> *"I wanted the smoothest possible flow: user clicks 'Connect,' signs the message, done. What I got was a debugging rabbit hole."*

### The Vision

My initial goal was simple: **one-click wallet connection with automatic sign-in**. User taps button, wallet opens, they sign, they're authenticated. Smooth as butter.

This felt like table stakes for good UX. Why make users take two separate actions when modern wallets can handle it all in one flow?

### The Reality

**10+ iterations on auth alone.**

The bugs came from everywhere:

- **WalletConnect** behaving differently on mobile vs desktop browsers, wallets don't show up for testnets
- **MetaMask mobile** buggy, having its own special signature request flow
- **Auto-sign loops** that I only caught after deploying to Vercel (worked fine locally!)
- **IndexDB conflicts** wallets store state differently in desktop vs mobile browsers, leading to annoying console errors and warnings

### The Pivot

After 10 iterations and countless edge cases, I eventually reverted to a **two-step process**:

1. User connects wallet (RainbowKit handles this)
2. User explicitly clicks "Sign In" button to authenticate

It felt like defeat at first—wasn't this less elegant? But it was (mostly) _stable_. And more importantly, it gave users **clarity** about what they were doing at each step.


### The Lesson

**For next iteration:** Start with a wallet service that includes **social login** (like [thirdweb](https://thirdweb.com)) from day one.

---

## Topic 2: React Query—When AI Gives You Code That "Works"

> *"The AI wrote a complete React Query setup. It compiled. It ran. It was fine. You just always had to hit refresh to get the latest data."*

### The Problem

My dashboard loaded fine at start but if felt laggy and buggy.

**The behind the curtain the implementation was brutal:**

- 🔴 **0%** effective caching implementation
- 🔴 **100%** data refetch rate on navigation
- 🔴 **O(n)** API calls per dashboard load (where n = number of escrows)
- 🔴 **200+ network requests** for a dashboard with 100 escrows

Lighthouse performance score: **12/100**. Ouch.

### The Hacks I Was Offered

Before I delving deeper Claude suggested interesting solutions:

```typescript
// Hack #1: URL parameters with timestamps
router.push(`/dashboard?refresh=${Date.now()}`);

// Hack #2: Mount triggers
const [mountTrigger, setMountTrigger] = useState(0);
useEffect(() => {
  // Force re-render by changing state
  setMountTrigger(prev => prev + 1);
}, [someEvent]);

// Hack #3: Manual refetch calls everywhere
const handleCreateEscrow = async () => {
  await createEscrow(...);
  refetchUserEscrows(); // Manual invalidation
  refetchEscrowList();  // More manual invalidation
  refetchStats();       // Getting out of hand...
};
```

I mean, these are pretty horrible "solutions". All trying to address the symptoms, not the root cause.

### The Real Fix

I had to **actually get into the weeds of React Query**: understand and configure`staleTime`, `cacheTime`, and event-driven invalidation correctly.

**Step 1: Configure proper defaults globally**

```typescript
// apps/web/src/app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // Data stays fresh for 1 minute
      cacheTime: 300_000,       // Keep in cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false,    // Don't refetch on component mount if cached
    },
  },
});
```

**Step 2: Event-driven cache invalidation**

Instead of polling or manual refetches, listen to blockchain events:

```typescript
// Invalidate cache when blockchain state actually changes
useWatchContractEvent({
  address: MASTER_FACTORY_ADDRESS,
  abi: MasterFactoryABI,
  eventName: 'EscrowCreated',
  onLogs: (logs) => {
    // Only invalidate if event affects current user
    const isRelevant = logs.some(log =>
      log.args.depositor === address || log.args.recipient === address
    );

    if (isRelevant) {
      queryClient.invalidateQueries({ queryKey: ['userEscrows', address] });
    }
  },
});
```

**The results:**

- ✅ **200+ requests → 1 request** on initial load
- ✅ **Real-time updates** across devices (events propagate everywhere)
- ✅ **Instant navigation** (data already cached)
- ✅ **Lower RPC costs** (fewer blockchain reads)

### The Lesson

**React Query is fundamental** to frontend blockchain development. It's in every framework (wagmi, viem, RainbowKit uses it internally).

**Resources that actually helped:**
- [TkDodo's React Query blog series](https://tkdodo.eu/blog/practical-react-query)
- wagmi's [query key documentation](https://wagmi.sh/react/guides/tanstack-query)

---

## Topic 3: Mobile First Comes Last (But Not Least)

> *"I built everything on desktop Chrome. Then I opened it on my phone. Welcome to a different world."*

### The Philosophy

CheckPay targets emerging markets—people using MiniPay on budget Android phones over 3G/4G networks. **"Mobile-first" wasn't a nice-to-have; it was the whole point.**

The platform needed to work flawlessly on:
- MiniPay (Opera's successor for mobile crypto)
- Valora wallet browser
- MetaMask mobile
- Budget Android devices
- Inconsistent network conditions

### The Reality Check

Desktop testing had me convinced everything worked. Beautiful responsive CSS, components looked great when I resized my browser window. Then I opened Safari on iOS:

**The mobile horror show:**

- ❌ Touch targets too small (44px minimum on iOS, I had 32px buttons)
- ❌ Wallet modals rendering off-screen or behind the keyboard
- ❌ Font sizes illegible without pinch-zoom
- ❌ Fixed positioning breaking on mobile Safari's address bar collapse
- ❌ That iOS deep link bug (more on this in Topic 4)
- ❌ Form inputs triggering zoom on focus (UX nightmare)

### The Surprise

Getting mobile working wasn't _too complicated_ once I focused on it. But it is **definitely a different world** than desktop:

- Different UX patterns (thumb zones, swipe gestures)
- Different testing requirements (debugging iOS through Safari Developer Tools was suprisingly easy and straightforward)

### The Lesson

**Mobile testing can't be an afterthought.** Even if you're vibecoding the desktop version first, plan for a dedicated mobile QA phase.

**My workflow:**
1. Vibe the desktop implementation with Claude
2. Manually test on actual devices (iPhone)
3. Fix mobile-specific issues (often simple CSS tweaks)
4. Test wallet flows in MiniPay, Valora, MetaMask mobile
5. Test on slow 3G/4G (Chrome DevTools network throttling)

The AI will get you **80% there** with responsive design. But that last **20%** requires actual devices, real wallet apps, and real network conditions.

---

## Topic 4: Gas Optimization—Beyond Hashes to Encryption Tradeoffs

> *"Don't store cleartext on-chain. But hashes aren't perfect either. Welcome to the tradeoff game."*

### The Constraint

My target users are in emerging markets. **Gas costs matter.** 

On Celo, gas is cheap compared to Ethereum mainnet, but when you're creating an escrow for a \$20 transaction, even $0.50 in gas feels like a lot.

The vibecoded initial implementation was storing full-text dispute reasons on-chain as `string` values, which is a big no-no for me. It's horrible from a privacy perspective and also a big gas waste.

```solidity
struct Escrow {
    address depositor;
    address recipient;
    uint256 amount;
    string disputeReason;  // ❌ "Goods not delivered as described, item was damaged"
    // ...
}
```


### Solution: Migrate to Bytes32 Hashes

When nudged the right direction, Claude suggested migrating from `string` to `bytes32` hashes:

```solidity
struct Escrow {
    address depositor;
    address recipient;
    uint256 amount;
    bytes32 disputeReasonHash;  // ✅ keccak256 hash
    // ...
}
```

**The pattern:**

```typescript
// Frontend: Store full document off-chain (Upstash Redis KV)
const fullDisputeReason = "Goods not delivered as described...";
const hash = keccak256(toBytes(fullDisputeReason));

await kv.set(`dispute:${hash}`, {
  reason: fullDisputeReason,
  timestamp: Date.now(),
  submitter: address,
});

// Smart contract: Store only hash (32 bytes)
await escrowContract.write.raiseDispute([hash]);

// Later: Retrieve full text using hash
const document = await kv.get(`dispute:${hash}`);
```

**Benefits:**

- ✅ **~60% gas reduction** (32 bytes vs variable-length string)
- ✅ **Privacy improvement** (hashes not cleartext on-chain)

### The Deeper Issue: Preimage Attacks

But there is still a catch: **hashes are vulnerable to preimage attacks** if the input space is small or predictable.

**The threat model:**

```typescript
// Common dispute reasons (easily guessable)
const commonReasons = [
  "Item not received",
  "Item damaged",
  "Wrong item delivered",
  "Refund requested",
  // ... maybe 100 common phrases
];

// Attacker can pre-compute hashes
const knownHashes = commonReasons.map(r => keccak256(r));

// When they see a hash on-chain, they can check if it matches
if (knownHashes.includes(onChainHash)) {
  console.log("I know what the dispute is about!");
}
```

This isn't theoretical—it's how [rainbow tables](https://en.wikipedia.org/wiki/Rainbow_table) work for password cracking.

### The Ideal Solution: Encrypt Then Hash

**The more secure approach:**

```typescript
// Encrypt the document first (only parties with keys can read)
const encrypted = await encrypt(fullDisputeReason, sharedKey);

// Hash the encrypted version (no preimage attacks)
const hash = keccak256(encrypted);

// Store encrypted version off-chain
await kv.set(`dispute:${hash}`, encrypted);

// On-chain: just the hash
await escrowContract.write.raiseDispute([hash]);
```

**But now you're dealing with:**

- **Key management complexity** (where do keys live? how are they generated?)
- **Multi-party access control** (depositor, recipient, arbiter need different access levels)
- **Recovery scenarios** (what if user loses their keys? is escrow locked forever?)
- **UX friction** (users now need to manage encryption keys, not just wallets)


For **v1 of CheckPay**, I went with **hashes** as the pragmatic choice:

- Dispute reasons are free-text (harder to rainbow table)
- Users add timestamps, unique details (increases entropy)
- The privacy gain from "pretty good" is still valuable
- Simplicity helps me ship

But I document it as a **known tradeoff**, not a perfect solution. Future versions might add encryption for sensitive disputes (high-value transactions, business use cases).

### The Lesson

**Don't write cleartext on-chain.** I think that is a good rule of thumb. But understand that hashes, encryption, and access control each add complexity.

The AI can implement any of these patterns, but it without explicitly asking for it **won't tell you about the security tradeoffs** or when to prioritize simplicity over perfect security in an MVP.

**Further reading:**
- [Lit Protocol](https://litprotocol.com/) for decentralized access control
- [Ceramic Network](https://ceramic.network/) for encrypted off-chain data

---

## Topic 5: Ecosystem Timing—When Your Testnet Disappears

> *"Is it the RPC? Is it my code? Is the testnet down? No, it's just Hardhat's interactive deployment waiting for input I can't see."*

### The Problem

Started building the contract. Did a first version deployment to Alfajores with Remix. Cool.

Then, ok let's set up the dev environment. Hardhat by default. And it doesn't work.

- Alfajores RPC starts timing out. Is it down? Is it deprecated? Unclear.
- Hardhat deployment just **hangs**. No error. No progress. Just... waiting.

The Hardhat hanging was particularly maddening. I'd run:

```bash
pnpm exec hardhat ignition deploy ./ignition/modules/MasterFactory.ts --network alfajores
```

And it would just... sit there. Terminal output:

```
Deploying MasterFactory...
[Cursor blinking indefinitely]
```

**The mystery:** Is it waiting for something? Did it fail silently?

**What I tried:**
- ✅ Switching RPC endpoints (Celo's public Forno, Ankr, QuickNode)
- ✅ Increasing gas limit in hardhat.config.ts
- ✅ Checking if contract size exceeded limit
- ✅ Verifying account had enough testnet CELO
- ✅ Re-compiling contracts with `pnpm clean && pnpm compile`
- ✅ Praying to the blockchain gods

**None of it worked.**

### The Solution

From checking the logs in the AI tab I see some weird message about some interactive deployment option.

And then the AI suggests this command which I found funny, but it worked:

```bash
echo y | pnpm exec hardhat ignition deploy ./ignition/modules/MasterFactory.ts --network alfajores
```

That's it.

Hardhat's interactive deployment was waiting for a confirmation prompt that wasn't rendering in my terminal. `echo y |` pipes "yes" into the command.


### The Lifeline: Community

**The Celo builder Telegram group and office hours** were crucial:

- Pretty clear communication about the status of the testnet (move to Sepolia!)
- Best practices from other builders (RPCs might be flaky, try multiple providers)
- Direct access to Celo DevRel team

The AI could help me write deployment scripts, but it **didn't know that Alfajores was deprecated**. That intel came from the documentation and the community.

### The Lesson

**Blockchain ecosystems move fast.** Testnets change, wallets get deprecated, RPC endpoints have bad days. You need to stay **plugged into the community** to make informed decisions.

Celo Builder Telegram Group: https://t.me/proofofship

---

## Topic 6: The Bundle Size Paradox

> *"I could have spent hours optimizing fonts, lazy loading components, refactoring providers. But I just deleted one wallet package and saved 2MB."*

### The Problem

Fast loading on **3G/4G in emerging markets** wasn't optional—it was the whole point. But my initial build was brutal:

- ❌ **3G: 40-50 seconds to load**

Target users don't have fast internet everywhere. I wanted this to work on 3G and slow 4G networks as well.

### The Optimization Rabbit Hole

I asked the AI to optimize the bundle size:
- ✅ Lazy loading components with `next/dynamic`
- ✅ Font optimization with `display: swap`
- ✅ Image compression and modern formats (AVIF, WebP)
- ✅ Code splitting by route
- ✅ Refactored providers to reduce re-renders
- ✅ Added preconnect hints for external resources

### The Simple Fix

Then I looked at the bundle analysis and saw this:

```
Wallet libraries:
- MetaMask SDK: ~1.9MB
- WalletConnect SDK: ~1.8MB
- Valora connector: ~500KB
```

I removed the MetaMask SDK and walletconnect package. **That's it.**

**What happened:**
1. ✅ **Bundle size: -4MB instantly**
4. ✅ **MiniPay** works through the injected wallet
3. ✅ **Valora** works through the connector
2. ✅ **MetaMask** still works in the built in browser (RainbowKit's `injectedWallet` auto-detects it)

### The Lesson

When the AI suggests crazy optimizations, it's worth checking if it's really necessary. I find that most of the time fixing vibecode is simply pruning it as much as possible.

---

## Conclusion: Vibecoding to Production—The Real Rules

Building CheckPay with AI assistance showed me once again that **vibecoding gets you far, but production requires getting into the weeds.**

### What AI Does Brilliantly

- ✅ **Scaffolding and boilerplate** (saved me weeks on RainbowKit setup, contract ABIs, API routes)
- ✅ **Standard patterns** (React hooks, Solidity patterns, TypeScript types)
- ✅ **Rapid prototyping** (vibe your way to a working v0.1 in days, not weeks)
- ✅ **Documentation synthesis** (Claude read docs faster than I ever could)

### Where You Still Need to Step In

- 🎯 **Performan Architecture** (React Query needs tuning, not just setup)
- 🎯 **Mobile edge cases** (iOS deep links, touch targets, wallet browser quirks)
- 🎯 **Security tradeoffs** (hashes vs encryption vs complexity)
- 🎯 **Ecosystem monitoring** (testnet deprecations, community intel, RPC reliability)
- 🎯 **Performance analysis** (bundle size, dependency costs, real device testing)
- 🎯 **Cutting the bloat** (I removed hundreds of lines of AI-generated code to ship)

### The Meta-Lesson

**The better you know what you want to build, the better you can guide the AI to build the right thing.**

Configuring Claude with:
- Custom prompts ([CLAUDE.md](https://github.com/Gigentic/gigentic-escrow-minipay/blob/main/CLAUDE.md) files with project context)
- Right tools (MCP servers, linters, formatters)
- Architecture docs (so it understands your patterns)
- Clear constraints (mobile-first, gas-conscious, emerging markets)

...made a **night-and-day difference** in output quality.

But at the end of the day: **vibecoding is a tool, not a replacement for understanding your domain.**

---

## About CheckPay

**CheckPay** is a decentralized escrow protocol built on Celo blockchain, designed for secure peer-to-peer transactions in emerging markets.

**Key Features:**
- 🔒 Smart contract-based escrow (trustless, transparent)
- 📱 Mobile-first design (optimized for MiniPay, Valora)
- 💰 Low fees (1% platform fee, 4% refundable dispute bond)
- ⚖️ AI-powered dispute resolution (coming soon)
- 🆔 Humanity verification (Self Protocol)
- 🌍 Built for emerging markets (gas-optimized, 4G-optimized)

**Links:**
- [Live Platform](https://checkpay.gigentic.ai)
- [Demo](https://youtu.be/cvQuKUiRBT4)
- [Pitch Video](https://youtu.be/uXtg6q4724Q)
- [GitHub Repository](https://github.com/Gigentic/gigentic-escrow-minipay)


- **Mainnet Contract:** https://celo.blockscout.com/address/0x5549E67B9EEf5963c84BafEA64DD81bd5C72947c
- **Testnet Contract:** https://celo-sepolia.blockscout.com/address/0x02Dc42666AECB9b780177d45591c2093e409e750
- **Karma Project Page:** https://gap.karmahq.xyz/project/gigentic-checkpay


---

**Author:** Marci ([@martoncsernai](https://x.com/martoncsernai))


---

*If this post helped you understand the realities of AI-assisted blockchain development, or if you're building something similar, I'd love to hear from you. Reach out on [Twitter](https://x.com/martoncsernai) or open an issue on [GitHub](https://github.com/Gigentic/gigentic-escrow-minipay/issues).*

*Building in public, learning in public, shipping in public. 🚀*
