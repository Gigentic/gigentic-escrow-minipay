<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Wallet Authentication in the Celo Ecosystem

The Celo ecosystem offers several wallet authentication options, each with different approaches to user onboarding and security. Based on your Gigentic Escrow project requirements, here's a comprehensive analysis of your authentication options.

## Celo Ecosystem Wallet Authentication

### **Valora Wallet Authentication**

Valora doesn't have a dedicated "Sign in with Valora" feature like OAuth providers, but it supports **wallet connection authentication** through standard Web3 protocols. The authentication flow works as follows:[^1_1]

- **Connection Method**: Uses standard wallet connection protocols (EIP-1193) compatible with libraries like ethers.js and web3.js[^1_1]
- **Recovery Options**: Supports 12 and 24-word seed phrases with Ethereum derivation path (m/44'/52752'/0'/0)[^1_1]
- **Security**: Self-custodial with PIN protection and biometric authentication[^1_2]
- **Cross-wallet Compatibility**: Valora addresses can be imported to other wallets using the recovery phrase[^1_1]


### **MiniPay Wallet Authentication**

MiniPay operates in a **pre-authenticated environment** when accessed through the Opera Mini browser or standalone app. Key authentication features include:[^1_3][^1_4]

- **Google Account Integration**: Requires Google Account for wallet activation and recovery[^1_5][^1_6]
- **Automatic Backup**: Wallet keys are automatically backed up to Google Drive[^1_6][^1_5]
- **Biometric Security**: Fingerprint/face/PIN authentication required for transactions[^1_5][^1_6]
- **Phone Number Linking**: Uses phone numbers as identifiers for transactions[^1_4]
- **Mini Apps Environment**: When users access your app through MiniPay's Mini Apps feature, they're already authenticated[^1_7]


## Wallet Infrastructure Solutions Comparison

### **Dynamic (dynamic.xyz) vs Para (getpara.com)**

Based on your requirements for protecting KV document store access, here's how these solutions compare:


| Feature | Dynamic | Para |
| :-- | :-- | :-- |
| **Wallet Creation** | Embedded wallets with social login | Universal embedded wallets with social login |
| **Authentication Methods** | Email, social, passkeys, external wallets | Email, social, passkeys, phone SMS |
| **Security Model** | TSS-MPC with TEE protection | Distributed MPC with passkeys in secure enclaves |
| **Wallet Per User** | App-specific wallets | Universal wallet across applications |
| **Celo Support** | Yes, multi-chain including Celo | Yes, EVM chains including Celo |
| **Document Access Control** | Via wallet address/auth tokens | Via wallet address/auth tokens |
| **Pricing** | Free up to 1,000 MAUs | Free up to 1,200 MAUs |

### **Recommended Solution for Gigentic Escrow**

For your specific use case with **KV document store protection** and **Celo Composer Kit integration**, I recommend **Dynamic** for the following reasons:

**1. Celo Composer Kit Compatibility**

- Dynamic integrates seamlessly with Celo Composer Kit's wallet infrastructure[^1_8]
- Supports the standard wallet connection patterns you're already using[^1_8]

**2. Document Access Control Implementation**

```javascript
// Example access control pattern with Dynamic
const { user, isAuthenticated } = useDynamicContext();

// Protect KV store operations
const accessDocument = async (documentId) => {
  if (!isAuthenticated || !user?.wallet?.address) {
    throw new Error('Authentication required');
  }
  
  // Use wallet address as access control key
  const accessKey = `${user.wallet.address}:${documentId}`;
  return await kvStore.get(accessKey);
};
```

**3. MiniPay Integration Strategy**

- When users access your app through MiniPay, detect the environment and use MiniPay's existing authentication
- For external access, fall back to Dynamic's authentication system
- Both approaches can share the same wallet address for document access control


## KV Store Access Control Implementation

### **Upstash KV Security Pattern**

For your document store protection, implement this access control pattern:[^1_9][^1_10]

```javascript
// Document access control using wallet addresses
const documentKey = (walletAddress, documentId) => 
  `escrow:${walletAddress}:${documentId}`;

const storeDocument = async (walletAddress, documentId, data) => {
  const key = documentKey(walletAddress, documentId);
  await kvStore.set(key, data);
};

const getDocument = async (walletAddress, documentId) => {
  const key = documentKey(walletAddress, documentId);
  return await kvStore.get(key);
};
```


### **Authentication Integration with KV Store**

```javascript
// Middleware for document access protection
const requireAuth = (handler) => async (req, res) => {
  const walletAddress = await validateWalletSignature(req);
  if (!walletAddress) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }
  
  req.walletAddress = walletAddress;
  return handler(req, res);
};

// Protected endpoint
export default requireAuth(async (req, res) => {
  const { documentId, data } = req.body;
  await storeDocument(req.walletAddress, documentId, data);
  res.json({ success: true });
});
```


## Implementation Recommendations

### **Phase 1: Core Authentication**

1. Integrate Dynamic SDK with your existing Celo Composer Kit setup
2. Implement wallet address-based document access control in your KV store
3. Create authentication middleware for API routes

### **Phase 2: MiniPay Optimization**

1. Detect MiniPay environment and use its native authentication
2. Implement fallback to Dynamic for external access
3. Ensure consistent wallet addressing across both flows

### **Phase 3: Enhanced Security**

1. Add signature-based request verification[^1_9]
2. Implement document-level permissions (read/write/admin)
3. Add audit logging for document access

This approach gives you the flexibility to work within MiniPay's authenticated environment while providing robust authentication for external users, all while maintaining secure document access control through wallet addresses in your KV store.[^1_11]
<span style="display:none">[^1_12][^1_13][^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_27][^1_28][^1_29][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_48][^1_49][^1_50][^1_51][^1_52][^1_53][^1_54][^1_55][^1_56][^1_57][^1_58][^1_59][^1_60][^1_61][^1_62][^1_63][^1_64][^1_65][^1_66][^1_67][^1_68][^1_69][^1_70][^1_71][^1_72][^1_73]</span>

```
<div style="text-align: center">⁂</div>
```

[^1_1]: https://support.valoraapp.com/hc/en-us/articles/4415773141773-How-do-I-access-my-Valora-Wallet-Address-on-another-wallet

[^1_2]: https://support.valoraapp.com/hc/en-us/articles/14628659038221-How-secure-is-Valora

[^1_3]: https://press.opera.com/2025/05/13/minipay-standalone-app-ios-android/

[^1_4]: https://www.minipay.to

[^1_5]: https://blogs.opera.com/africa/2023/09/minipay-frequently-asked-questions/

[^1_6]: https://www.minipay.to/faq

[^1_7]: https://www.minipay.to/mini-apps

[^1_8]: https://docs.celo.org/build/composer-kit

[^1_9]: https://upstash.com/docs/qstash/features/security

[^1_10]: https://upstash.com/docs/devops/developer-api/authentication

[^1_11]: gigentic-escrow-v1.6-prd.md

[^1_12]: https://www.dynamic.xyz

[^1_13]: https://bitcoinke.io/2022/03/how-to-set-up-your-valora-wallet-in-3-quick-steps/

[^1_14]: https://github.com/celo-org/composer-kit

[^1_15]: https://www.youtube.com/watch?v=HNMXOQAdi4o

[^1_16]: https://www.reddit.com/r/celo/comments/ti3rml/how_can_i_use_both_celo_wallet_and_valora_app/

[^1_17]: https://docs.celo.org/build/mcp/composer-mcp

[^1_18]: https://support.valoraapp.com/hc/en-us/articles/360061350131-How-to-set-up-Valora

[^1_19]: https://www.finextra.com/pressarticle/105566/minipay-stablecoin-wallet-now-available-as-a-standalone-app

[^1_20]: https://khadybola.hashnode.dev/getting-started-with-celo-composer-and-metamask-integration

[^1_21]: https://docs.celo.org/wallet

[^1_22]: https://docs.celo.org/build/build-on-minipay/quickstart

[^1_23]: https://github.com/celo-org/composer-kit-mcp

[^1_24]: https://docs.celo.org/learn/valora-summary

[^1_25]: https://forum.celo.org/t/how-to-integrate-celo-blockchain-into-a-mobile-app/8898

[^1_26]: https://www.valora.xyz

[^1_27]: https://docs.celo.org/build/build-on-minipay/overview

[^1_28]: https://blaize.tech/clients/python-and-java-sdks-development-for-celo-blockchain/

[^1_29]: https://docs.celo.org/developer/particle-network

[^1_30]: https://docs.mento.org/mento/use-mento/getting-mento-stables/on-mobile

[^1_31]: https://docs.metamask.io/embedded-wallets/connect-blockchain/evm/celo/

[^1_32]: https://github.com/firebase/firebase-android-sdk/issues/6293

[^1_33]: https://slashdot.org/software/layer-1-protocols/for-valora/

[^1_34]: https://docs.metamask.io/embedded-wallets/connect-blockchain/evm/celo/unity/

[^1_35]: https://www.rfc-editor.org/rfc/rfc1334.html

[^1_36]: https://play.google.com/store/apps/details?id=com.opera.minipay\&hl=en_GB

[^1_37]: https://valora.academy/ilp/pages/login.jsf?menuId=110337\&client=valora_extern

[^1_38]: https://github.com/celo-org/developer-tooling

[^1_39]: https://blogs.opera.com/crypto/2025/02/minipay-cash-links/

[^1_40]: https://app.valora.earth/login/

[^1_41]: https://docs.celo.org/developer/reown

[^1_42]: https://blog.getpara.com/compliant-wallet-onboarding/

[^1_43]: https://www.linkedin.com/pulse/dynamics-mpc-wallets-now-generally-available-itai-turbahn-vebrc

[^1_44]: https://help.getpara.com/Securing-Your-Para-Account-1b3b3bc281648166b5b6c5ad795c4a29

[^1_45]: https://www.lightspark.com/news/spark/dynamic-x-spark-connecting-wallets-and-apps-on-bitcoin

[^1_46]: https://docs.getpara.com/how-para-works/wallet-portability

[^1_47]: https://www.openfort.io/blog/dynamic-alternatives

[^1_48]: https://blog.getpara.com/how-embedded-wallets-work/

[^1_49]: https://www.getpara.com/blog-posts/embedded-crypto-wallet-infrastructure

[^1_50]: https://docs.getpara.com/swift/setup

[^1_51]: https://docs.celo.org/developer/sdks/celo-sdks

[^1_52]: https://stabledash.com/news/2025-09-19-superform-adopts-dynamics-wallet-infrastructure-for-onchain-wealth-management

[^1_53]: https://www.getpara.com

[^1_54]: https://docs.getpara.com/web/guides/custom-ui/social-logins

[^1_55]: https://www.alchemy.com/dapps/list-of/web3-wallets-on-celo

[^1_56]: https://arxiv.org/abs/2507.10730

[^1_57]: https://docs.oracle.com/database/121/DBIMI/walet.htm

[^1_58]: https://developer.hashicorp.com/consul/docs/automate/kv

[^1_59]: https://docs.world.org/mini-apps/commands/wallet-auth

[^1_60]: https://notes.kodekloud.com/docs/HashiCorp-Certified-Consul-Associate-Certification/Access-the-Consul-KeyValue-KV/Introduction-to-Consul-KV-Store

[^1_61]: https://www.dock.io/post/digital-id-wallet

[^1_62]: https://upstash.com/docs/workflow/howto/security

[^1_63]: https://github.com/nats-io/nats-server/issues/3548

[^1_64]: https://www.thalesgroup.com/en/markets/digital-identity-and-security/government/identity/digital-identity-services/digital-id-wallet

[^1_65]: https://upstash.com/docs/redis/features/security

[^1_66]: https://www.openzeppelin.com/news/security-hub/celo-contracts-audit

[^1_67]: https://digital-strategy.ec.europa.eu/en/policies/eudi-wallet-implementation

[^1_68]: https://upstash.com/docs/redis/howto/ipallowlist

[^1_69]: https://dev.to/siddheshk02/how-to-build-a-concurrent-key-value-store-in-go-3pep

[^1_70]: https://support.docusign.com/s/document-item?bundleId=ced1643229641057\&topicId=dam1701770990519.html

[^1_71]: https://developers.cloudflare.com/workers/platform/pricing/

[^1_72]: https://www.quicknode.com/guides/web3-fundamentals-security/security/an-introduction-to-crypto-wallets-and-how-to-keep-them-secure

[^1_73]: https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj


---

# Clerk Compatibility with Celo

**Yes, Clerk is compatible with Celo**, but with some important considerations for your Gigentic Escrow project.

## Clerk's Web3 Authentication Support

Clerk provides **Web3 wallet authentication** through its Web3Wallet object, which supports several wallet providers:[^2_1]

- MetaMask[^2_2]
- Coinbase Wallet[^2_3]
- Base[^2_4]
- OKX Wallet[^2_5]


### **Celo Compatibility via MetaMask Integration**

Since Celo is **EVM-compatible** and can be added to MetaMask as a custom network, Clerk's Web3 authentication works with Celo through:[^2_6][^2_7]

**1. MetaMask + Celo Network Configuration**
Users can add Celo to MetaMask using these network details:[^2_6]

- Network Name: Celo (Mainnet)
- RPC URL: https://forno.celo.org
- Chain ID: 42220
- Currency Symbol: CELO
- Block Explorer: https://explorer.celo.org

**2. Authentication Flow with Clerk**

```javascript
// Clerk Web3 authentication with MetaMask (Celo network)
import { useSignIn } from '@clerk/nextjs';

const { signIn, isLoaded } = useSignIn();

const authenticateWithCelo = async () => {
  // User needs to have Celo network added to MetaMask
  await signIn.authenticateWithMetamask();
};
```


## Advantages of Using Clerk for Your Project

### **1. Hybrid Authentication Strategy**

Clerk enables you to combine **traditional authentication** with **Web3 wallet authentication**:[^2_8]

```javascript
// Multiple authentication methods
const authOptions = [
  'email/password',
  'social login (Google, GitHub)',
  'Web3 wallet (MetaMask with Celo)',
  'passkeys'
];
```


### **2. Session Management \& Security**

Clerk provides robust session management that's crucial for your KV document store protection:[^2_9][^2_8]

```javascript
// Protected API route with Clerk
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  const { userId, user } = getAuth(req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Access user's wallet address for document access control
  const walletAddress = user.web3Wallets?.[^2_0]?.web3Wallet;
  const documentKey = `${walletAddress}:${req.body.documentId}`;
  
  // Secure KV store operation
  await kvStore.set(documentKey, req.body.data);
}
```


### **3. Multi-Factor Authentication**

Clerk supports combining Web3 authentication with additional factors:[^2_8]

- Web3 wallet signature + email verification
- Web3 wallet + SMS verification
- Web3 wallet + biometric authentication


## Comparison: Clerk vs Dynamic vs Para for Celo

| Feature | Clerk | Dynamic | Para |
| :-- | :-- | :-- | :-- |
| **Celo Support** | Via MetaMask integration | Direct Celo support | Direct Celo support |
| **Authentication Methods** | Web2 + Web3 hybrid | Primarily Web3-focused | Web3-focused |
| **Wallet Creation** | External wallet required | Embedded wallet creation | Embedded wallet creation |
| **Session Management** | Enterprise-grade | Good | Good |
| **Traditional Auth** | Excellent (email, social, etc.) | Limited | Limited |
| **Documentation** | Comprehensive | Good | Good |
| **KV Store Integration** | Easy with middleware | Moderate | Moderate |

## Recommended Implementation for Gigentic Escrow

### **Why Clerk Might Be Better for Your Use Case**

**1. Flexibility for Multiple User Types**

- **Crypto-native users**: Can authenticate with MetaMask + Celo
- **Traditional users**: Can use email/social login and optionally add wallet later
- **Progressive onboarding**: Start with email, upgrade to wallet authentication

**2. Document Access Control Pattern**

```javascript
// Clerk-based document access control
const getDocumentAccessKey = (user, documentId) => {
  // Prioritize wallet address if available
  if (user.web3Wallets?.[^2_0]?.web3Wallet) {
    return `wallet:${user.web3Wallets[^2_0].web3Wallet}:${documentId}`;
  }
  // Fallback to user ID for non-Web3 users
  return `user:${user.id}:${documentId}`;
};
```

**3. MiniPay Integration Strategy**

```javascript
// Detect MiniPay environment
const isMiniPayEnvironment = () => {
  return typeof window !== 'undefined' && 
         window.ethereum?.isMiniPay;
};

// Conditional authentication flow
if (isMiniPayEnvironment()) {
  // Use MiniPay's native authentication
  // Then sync with Clerk for session management
} else {
  // Use Clerk's full authentication suite
}
```


## Implementation Steps

### **Phase 1: Basic Clerk Integration**

1. Set up Clerk with Next.js in your Celo Composer Kit project[^2_9]
2. Enable MetaMask Web3 authentication[^2_2]
3. Configure middleware for API route protection[^2_9]

### **Phase 2: Celo-Specific Features**

1. Add network detection to ensure users are on Celo network
2. Implement wallet address-based document access control
3. Create hybrid authentication flows for different user types

### **Phase 3: MiniPay Optimization**

1. Add MiniPay environment detection
2. Implement direct wallet connection for MiniPay users
3. Sync MiniPay authentication state with Clerk sessions

**Conclusion**: Clerk offers the most comprehensive authentication solution for your Gigentic Escrow project, providing both the Web3 capabilities you need for Celo integration and the traditional authentication methods that can help broaden your user base. The session management and middleware capabilities make it particularly well-suited for protecting your KV document store.[^2_10]
<span style="display:none">[^2_11][^2_12][^2_13][^2_14][^2_15][^2_16][^2_17][^2_18][^2_19][^2_20][^2_21][^2_22][^2_23][^2_24][^2_25][^2_26][^2_27][^2_28][^2_29][^2_30][^2_31][^2_32][^2_33][^2_34][^2_35][^2_36][^2_37][^2_38][^2_39]</span>

```
<div style="text-align: center">⁂</div>
```

[^2_1]: https://clerk.com/docs/references/javascript/types/web3-wallet

[^2_2]: https://clerk.com/docs/authentication/web3/metamask

[^2_3]: https://clerk.com/docs/authentication/web3/coinbase-wallet

[^2_4]: https://clerk.com/docs/authentication/web3/base

[^2_5]: https://clerk.com/docs/references/javascript/sign-in

[^2_6]: https://support.polkastarter.com/article/28-how-to-add-celo-to-metamask

[^2_7]: https://bitcoinke.io/2022/03/how-to-add-the-celo-network-to-your-metamask-wallet/

[^2_8]: https://clerk.com/blog/introducing-web3-authentication

[^2_9]: https://spacejelly.dev/posts/how-to-add-passwords-authentication-and-login-in-next-js-with-clerk

[^2_10]: gigentic-escrow-v1.6-prd.md

[^2_11]: https://www.usdc.com/learn/how-to-get-usdc-on-celo

[^2_12]: https://www.youtube.com/watch?v=QdujzBGwakI

[^2_13]: https://trustwallet.com/blog/guides/celo-beginners-guide

[^2_14]: https://clerk.com/changelog/2024-10-01-coinbase-smart-wallet

[^2_15]: https://blockwallet.io/networks/celo-wallet

[^2_16]: https://clerk.com/docs/references/backend/types/backend-web3-wallet

[^2_17]: https://docs.celo.org/wallet

[^2_18]: https://clerk.com/nextjs-authentication

[^2_19]: https://support.blockchain.com/hc/en-us/sections/17113501377052-Wallet-Support

[^2_20]: https://www.youtube.com/watch?v=5-zn69gcrfE

[^2_21]: https://clerk.com/docs/authentication/overview

[^2_22]: https://celowallet.app

[^2_23]: https://dev.to/brianmmdev/adding-clerk-auth-to-a-nextjs-app-2n9c

[^2_24]: https://clerk.com/docs/custom-flows/overview

[^2_25]: https://forum.celo.org/t/celo-extension-wallet-not-supported/11708

[^2_26]: https://github.com/celo-org/web3-plugin-transaction-types

[^2_27]: https://web3auth.io/docs/connect-blockchain/evm/celo

[^2_28]: https://docs.celo.org/developer/sdks/celo-sdks

[^2_29]: https://web3auth.io/docs/connect-blockchain/evm/celo/react-native

[^2_30]: https://revoke.cash/learn/wallets/add-network/celo

[^2_31]: https://docs.metamask.io/embedded-wallets/connect-blockchain/evm/celo/unity/

[^2_32]: https://www.notboring.co/p/celo-building-a-regenerative-economy

[^2_33]: https://www.youtube.com/watch?v=2PoCdsKG8R8

[^2_34]: https://docs.metamask.io/embedded-wallets/connect-blockchain/evm/celo/android/

[^2_35]: https://docs.celo.org/wallet/metamask/use

[^2_36]: https://web3auth.io/docs/features/compatible-blockchains

[^2_37]: https://docs.metamask.io/embedded-wallets/connect-blockchain/evm/celo/

[^2_38]: https://www.alchemy.com/dapps/best/web3-authentication-tools

[^2_39]: https://docs.celo.org/integration/general


---

# MiniPay's Native Authentication Architecture

MiniPay's native authentication works through a **unique hybrid approach** that combines Google Account authentication, phone number verification, and automatic wallet key management. Here's how the system operates:

## Core Authentication Components

### **1. Google Account Integration**

MiniPay requires users to authenticate through their Google Account for wallet creation and recovery:[^3_1][^3_2]

- **Initial Setup**: Users must sign in with Google credentials to activate their MiniPay wallet[^3_2][^3_1]
- **Key Backup**: The wallet's Secret Recovery Phrase is automatically encrypted and stored in the user's Google Drive[^3_3][^3_1][^3_2]
- **Recovery Process**: If users lose their phone or delete the app, they can restore their wallet by logging back in with their Google Account[^3_2][^3_3]


### **2. Phone Number as Wallet Address**

MiniPay maps phone numbers to wallet addresses for simplified transactions:[^3_4][^3_5]

```javascript
// Phone number mapping allows users to send funds like:
// Send $10 to +1-234-567-8900 instead of 0x742d35Cc...
```


### **3. Biometric Security Layer**

All transaction authorizations require additional biometric authentication:[^3_1][^3_3]

- **Supported Methods**: Fingerprint, face recognition, or device PIN
- **Transaction Protection**: Required for every payment to prevent unauthorized access
- **Device Security**: Leverages the device's secure enclave for biometric verification


## Pre-Authenticated Environment Detection

### **MiniPay Environment Detection**

When your dApp runs inside MiniPay, the wallet connection is **implicit and automatic**:[^3_6][^3_7]

```javascript
// Detection pattern for MiniPay environment
const isMiniPayEnvironment = () => {
  return typeof window !== 'undefined' && 
         window.ethereum && 
         window.ethereum.isMiniPay === true;
};

// Usage in your dApp
if (isMiniPayEnvironment()) {
  // Hide connect wallet button - user is already authenticated
  // Access wallet directly through window.ethereum
  const accounts = await window.ethereum.request({
    method: 'eth_accounts'
  });
} else {
  // Show normal wallet connection flow for external browsers
}
```


### **Automatic Wallet Injection**

When users access your dApp through MiniPay's Mini Apps feature:[^3_7][^3_6]

1. **No Connection Required**: The wallet is automatically connected
2. **Hide Connect Buttons**: Your dApp should hide wallet connection UI[^3_6]
3. **Direct Access**: Use `window.ethereum` directly without connection prompts
4. **Viem/Wagmi Support**: MiniPay recommends using these libraries over web3.js or ethers.js[^3_8][^3_9]
```javascript
// Recommended implementation for MiniPay integration
import { createPublicClient } from 'viem';

const client = createPublicClient({
  transport: window.ethereum ? custom(window.ethereum) : http()
});

// Check if running in MiniPay and hide connect button
const connectButtonElement = document.getElementById('connect-wallet');
if (window.ethereum?.isMiniPay) {
  connectButtonElement.style.display = 'none';
}
```


## Authentication Flow Architecture

### **For New Users**

1. **Google Sign-In**: User authenticates with Google Account
2. **Phone Verification**: User provides phone number for wallet addressing
3. **Automatic Key Generation**: MiniPay generates wallet keys locally
4. **Encrypted Backup**: Keys are encrypted and backed up to Google Drive
5. **Biometric Setup**: Device biometric authentication is configured

### **For Returning Users**

1. **Google Authentication**: User signs in with existing Google Account
2. **Key Recovery**: Encrypted wallet keys are restored from Google Drive
3. **Biometric Verification**: Device biometrics are re-verified
4. **Instant Access**: Wallet is immediately available without additional setup

### **In Mini Apps Environment**

1. **Environment Detection**: Your dApp detects MiniPay environment
2. **Skip Connection**: Wallet connection is automatically available
3. **Direct Transactions**: Users can immediately interact with your dApp
4. **Biometric Confirmation**: Only transactions require biometric approval

## Security Model

### **Key Management**

- **Non-Custodial**: Users control their private keys[^3_10][^3_11]
- **No Seed Phrases**: Users don't need to remember or write down seed phrases[^3_12][^3_4]
- **Google Drive Encryption**: Keys are encrypted before storage in Google Drive[^3_3][^3_1]
- **Device-Level Security**: Biometric authentication uses device secure enclaves


### **Authentication Layers**

| Layer | Purpose | Implementation |
| :-- | :-- | :-- |
| **Google Account** | Primary authentication \& recovery | OAuth 2.0 integration |
| **Phone Number** | Wallet addressing \& verification | SMS verification + mapping |
| **Device Biometrics** | Transaction authorization | Platform native biometric APIs |
| **App Environment** | Context awareness | `window.ethereum.isMiniPay` detection |

## Implementation for Your Gigentic Escrow Project

### **MiniPay Integration Pattern**

```javascript
// Enhanced detection and authentication flow
const handleMiniPayAuth = async () => {
  // Check if in MiniPay environment
  if (window.ethereum?.isMiniPay) {
    // User is already authenticated - get wallet address
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });
    
    const walletAddress = accounts[^3_0];
    
    // Use wallet address for KV store access control
    const accessKey = `minipay:${walletAddress}:${documentId}`;
    
    // No additional authentication needed
    return walletAddress;
  } else {
    // Fall back to other authentication methods (Clerk, Dynamic)
    return await fallbackAuthentication();
  }
};
```


### **Document Access Control with MiniPay**

```javascript
// KV store protection leveraging MiniPay's authentication
const protectedDocumentAccess = async (documentId, operation) => {
  let userIdentifier;
  
  if (window.ethereum?.isMiniPay) {
    // MiniPay: Use wallet address directly
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });
    userIdentifier = `minipay:${accounts[^3_0]}`;
  } else {
    // Other environments: Use your chosen auth provider
    userIdentifier = await getAuthenticatedUser();
  }
  
  const documentKey = `${userIdentifier}:${documentId}`;
  return await kvStore[operation](documentKey);
};
```

MiniPay's native authentication provides a **seamless, secure, and user-friendly** approach that eliminates traditional Web3 authentication friction while maintaining non-custodial principles. For your Gigentic Escrow project, this means users accessing through MiniPay get instant, authenticated access without any connection prompts, while your document access control can leverage their wallet address directly.[^3_13]
<span style="display:none">[^3_14][^3_15][^3_16][^3_17][^3_18][^3_19][^3_20][^3_21][^3_22][^3_23][^3_24][^3_25][^3_26][^3_27][^3_28][^3_29][^3_30][^3_31][^3_32][^3_33][^3_34][^3_35]</span>

```
<div style="text-align: center">⁂</div>
```

[^3_1]: https://blogs.opera.com/africa/2023/09/minipay-frequently-asked-questions/

[^3_2]: https://www.minipay.to/terms-of-service

[^3_3]: https://www.minipay.to/faq

[^3_4]: https://www.alchemy.com/dapps/minipay

[^3_5]: https://docs.celo.org/build/build-on-minipay/overview

[^3_6]: https://github.com/celo-org/minipay-minidapps

[^3_7]: https://www.youtube.com/watch?v=l55SR8QG2O4

[^3_8]: https://www.youtube.com/watch?v=HNMXOQAdi4o

[^3_9]: https://docs.celo.org/build/build-on-minipay/quickstart

[^3_10]: https://press.opera.com/2025/07/17/minipay-surpasses-8-million-wallets/

[^3_11]: https://www.portalhq.io/post/how-opera-minipay-used-non-custodial-embedded-wallets

[^3_12]: https://www.stocktitan.net/news/OPRA/as-stablecoins-take-over-fintech-mini-pay-surpasses-8-million-1kcohv0kbnlc.html

[^3_13]: gigentic-escrow-v1.6-prd.md

[^3_14]: https://www.ambuehler.ethz.ch/CDstore/www6/Technical/Paper099/Paper99.html

[^3_15]: https://docs.hyperswitch.io/explore-hyperswitch/payment-orchestration/3ds-decision-manager/native-3ds-authentication-for-mobile-payments

[^3_16]: https://www.finextra.com/pressarticle/105566/minipay-stablecoin-wallet-now-available-as-a-standalone-app

[^3_17]: https://blogs.opera.com/africa/2025/05/minipay-now-available-standalone-app-ios-android/

[^3_18]: https://thepaypers.com/crypto-web3-and-cbdc/news/opera-launches-minipay-a-stablecoin-wallet-on-the-celo-blockchain

[^3_19]: https://press.opera.com/2025/07/02/minipay-noah-debut-global-local-stablecoin-payments-ethcc-cannes/

[^3_20]: https://blogs.opera.com/crypto/2025/02/minipay-cash-links/

[^3_21]: https://www.fstech.co.uk/fst/Minipay_and_noah_launch_global_to_local_stablecoin_payments.php

[^3_22]: https://ffnews.com/newsarticle/cryptocurrency/minipay-turns-two-with-10-million-wallets-and-270-million-transactions-pointing-to-stablecoins-leading-web3/

[^3_23]: https://press.opera.com/2023/09/13/opera-launches-minipay/

[^3_24]: https://docs.celo.org/build/build-on-minipay/code-library

[^3_25]: https://support.google.com/accounts/answer/185834?hl=en

[^3_26]: https://www.youtube.com/watch?v=vwjtBSF1UAI

[^3_27]: https://github.com/wevm/wagmi/discussions/3572

[^3_28]: https://stackoverflow.com/questions/71184100/how-to-check-if-metamask-is-connected-after-page-refreshing

[^3_29]: https://docs.metamask.io/wallet/how-to/manage-networks/detect-network/

[^3_30]: https://stackoverflow.com/questions/68058606/metamask-detect-provider-unable-to-detect-window-ethereum-error-even-though

[^3_31]: https://support.google.com/a/answer/9176734?hl=en

[^3_32]: https://www.reddit.com/r/ethdev/comments/wx90u3/mocking_windowethereum_in_the_frontend_for/

[^3_33]: https://marketchameleon.com/PressReleases/i/2169726/OPRA/minipay-turns-two-with-10-million-wallets

[^3_34]: https://docs.mento.org/mento/use-mento/getting-mento-stables/on-mobile

[^3_35]: https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/5187

