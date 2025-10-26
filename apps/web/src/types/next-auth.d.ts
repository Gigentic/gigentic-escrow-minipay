import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in session types to include the wallet address
   */
  interface Session {
    user: {
      address: string;
    } & DefaultSession["user"];
  }
}
