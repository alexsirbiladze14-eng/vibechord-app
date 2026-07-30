"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, History, Crown, LogIn, Settings, Radio, MessageSquare } from "lucide-react";
import type { AuthUser } from "@/hooks/useToneyConversation";
import type { ConversationSummary } from "@/lib/conversations";

type Props = {
  authUser: AuthUser | null;
  onOpenAccount: () => void;
  isOpen: boolean;
  onClose: () => void;
  conversationList: ConversationSummary[];
  currentConversationId: string | null;
  onNewSession: () => void;
  onOpenConversation: (id: string) => void;
};

export default function Sidebar({
  authUser,
  onOpenAccount,
  isOpen,
  onClose,
  conversationList,
  currentConversationId,
  onNewSession,
  onOpenConversation,
}: Props) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate bg-rosewood shadow-xl shrink-0 transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/*
          FIX #7/#9: logo was small and did nothing when tapped. It's now
          bigger and is a real "go home" shortcut — every app worth its
          salt lets you tap the logo to bail out to the start screen.
        */}
        <Link
          href="/chat"
          onClick={() => {
            onClose();
            onNewSession();
          }}
          className="flex items-center justify-center overflow-hidden border-b border-slate h-32 w-full px-4 shrink-0 transition-opacity hover:opacity-80 active:opacity-60"
          aria-label="Vibechord — start a new session"
        >
          <div className="relative h-16 w-52">
            <Image
              src="/logo.png"
              alt="Vibechord"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <div className="p-4 border-b border-slate/50 space-y-2">
          <Link
            href="/chat"
            onClick={onClose}
            className="flex w-full items-center gap-2 rounded-md bg-brass px-4 py-2.5 text-sm font-medium text-rosewood transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <MessageSquare size={16} />
            AI Chat Workspace
          </Link>
          <button
            onClick={() => {
              onClose();
              onNewSession();
            }}
            className="flex w-full items-center gap-2 rounded-md border border-slate bg-slate/20 px-4 py-2 text-xs font-medium text-ash transition-all hover:text-parchment hover:bg-slate/40 active:scale-95"
          >
            <Plus size={14} />
            New Chat Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="px-2 pb-2 pt-2 text-xs font-semibold text-ash">History</p>
          {!authUser && (
            <p className="px-2 text-xs leading-relaxed text-ash/70">
              Log in to save and revisit past conversations.
            </p>
          )}
          {authUser && conversationList.length === 0 && (
            <p className="px-2 text-xs leading-relaxed text-ash/70">
              Nothing yet — your first chat will show up here.
            </p>
          )}
          {authUser &&
            conversationList.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onClose();
                  onOpenConversation(c.id);
                }}
                className={`flex w-full items-center gap-2 truncate rounded-md p-2 text-sm transition-colors ${
                  c.id === currentConversationId
                    ? "bg-slate/40 text-parchment"
                    : "text-ash hover:bg-slate/30 hover:text-parchment"
                }`}
              >
                <History size={16} className="shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
        </div>

        <div className="border-t border-slate p-4 space-y-3">
          <Link
            href="/tuner"
            onClick={onClose}
            className="group flex w-full items-center justify-between rounded-xl border border-slate bg-rosewood p-3 transition-all hover:border-brass/50 hover:shadow-[0_0_15px_rgba(201,138,75,0.15)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate/20 border border-slate group-hover:bg-brass/10 group-hover:text-brass transition-colors text-ash">
                <Radio size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-parchment">Pro Tuner</span>
                <span className="text-[10px] font-mono text-ash tracking-widest">WEB AUDIO</span>
              </div>
            </div>
            <span className="text-ash group-hover:text-brass group-hover:translate-x-0.5 transition-all">→</span>
          </Link>

          <div className="h-px w-full bg-slate/50 my-1"></div>

          <Link
            href="/premium"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-brass transition-colors hover:bg-slate/30"
          >
            <Crown size={18} />
            Upgrade to Premium
          </Link>

          {authUser ? (
            <button
              onClick={() => {
                onClose();
                onOpenAccount();
              }}
              className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-ash transition-colors hover:bg-slate/30 hover:text-parchment"
            >
              <Settings size={18} />
              Account
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-ash transition-colors hover:bg-slate/30 hover:text-parchment"
            >
              <LogIn size={18} />
              Log In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
