import Link from "next/link";
import { Logo } from "./Logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">
            Point<span className="text-brand-400">fare</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#how" className="transition hover:text-white">
            How it works
          </a>
          <a href="#programs" className="transition hover:text-white">
            Programs
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block">
            Sign in
          </button>
          <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-lg shadow-brand-500/10 transition hover:bg-slate-100">
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}
