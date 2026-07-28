"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex h-screen flex-col overflow-y-auto overflow-x-hidden bg-rosewood text-parchment font-sans selection:bg-brass selection:text-rosewood scroll-smooth">
      
      {/* Minimalist Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-between border-b border-slate px-8 py-4 relative z-20 bg-rosewood/80 backdrop-blur-sm sticky top-0"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-36 scale-[1.5] overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="Vibechord" 
              fill 
              className="object-contain" 
              priority 
            />
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/premium" className="text-ash hover:text-parchment transition-colors">Pricing</Link>
          <Link href="/login" className="text-ash hover:text-parchment transition-colors">Log In</Link>
          <Link href="/chat" className="rounded-md bg-brass px-5 py-2 font-medium text-rosewood hover:opacity-90 transition-opacity">
            Open App
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center shrink-0">
        
        {/* Strict minimalist grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, white, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, white, transparent 70%)' }}></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="relative z-10 max-w-4xl space-y-8"
        >
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-7xl leading-tight">
            The intelligent bridge <br />
            between <span className="text-brass">vibe and reality.</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-ash leading-relaxed">
            Stop fighting your DAW and start writing. Generate precise guitar tabs, analyze deep music theory, and lock in exact pedal chains and amp configurations before you even pick up your instrument.
          </p>

          <div className="flex items-center justify-center gap-4 pt-8">
            <Link href="/chat" className="rounded-md bg-brass px-8 py-3.5 text-sm font-medium text-rosewood transition-opacity hover:opacity-90 shadow-lg shadow-brass/10">
              Start a Session
            </Link>
            <Link href="/premium" className="rounded-md border border-slate px-8 py-3.5 text-sm font-medium text-parchment transition-colors hover:bg-slate/30">
              View Features
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Clean Feature Grid */}
      <section className="relative z-10 border-t border-slate bg-rosewood px-8 py-32 shrink-0">
        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-3">
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="border border-slate p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">01</div>
            <h3 className="font-display text-xl text-parchment mb-3">Theory & Tabs</h3>
            <p className="text-sm text-ash leading-relaxed">
              Instantly output complex chord progressions, scale analysis, and accurate guitar tabs directly into a sleek, side-by-side interface.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="border border-slate p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">02</div>
            <h3 className="font-display text-xl text-parchment mb-3">Genre Specific</h3>
            <p className="text-sm text-ash leading-relaxed">
              Whether you are tracking aggressive heavy metal riffs or dialing in chilled-out lo-fi beats, get the exact stylistic parameters you need.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
            className="border border-slate p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">03</div>
            <h3 className="font-display text-xl text-parchment mb-3">Hardware Mapping</h3>
            <p className="text-sm text-ash leading-relaxed">
              Get precision block configurations for your gear. Map out pedal setups for processors like the Line 6 HX Stomp XL and configure interface routing.
            </p>
          </motion.div>

        </div>
      </section>
      
    </div>
  );
}