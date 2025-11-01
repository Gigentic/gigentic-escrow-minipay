"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { useAccount } from "wagmi"

import { ConnectButton } from "@/components/wallet/connect-button"
import { ThemeToggle } from "@/components/theme-toggle"

const navLinks = [
  { name: "Dashboard", href: "/dashboard", external: false },
]

const isDev = process.env.NODE_ENV === "development"

export function Navbar() {
  const pathname = usePathname()
  const { chain } = useAccount()

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo and Navigation links */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/gigentic-logo-hex.png"
              alt="Gigentic Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
          </Link>

          <nav className="flex items-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === link.href
                    ? "border-2 border-primary"
                    : "hover:underline"
                  }`}
              >
                {link.name}
                {link.external && <ExternalLink className="h-4 w-4" />}
              </Link>
            ))}
          </nav>
        </div>

        {/* Wallet controls */}
        <div className="flex items-center gap-1">
          {isDev && chain && (
            <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
              {chain.name}
            </div>
          )}
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
