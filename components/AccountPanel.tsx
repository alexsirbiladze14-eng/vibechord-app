"use client";

import { ArrowLeft, User, KeyRound, Music4, CreditCard, Sparkles } from "lucide-react";
import AuthPanel from "./AuthPanel";
import ByokSettings from "./ByokSettings";
import SavedSongs, { type SavedSong } from "./SavedSongs";
import PricingPanel from "./PricingPanel";

type CurrentSong = {
  name: string;
  musicKey: string;
  mode: string;
  degrees: number[];
};

type Props = {
  user: { id: string; email: string } | null;
  credits: number | null;
  isSubscriber: boolean;
  onByokKeyChange: (key: string) => void;
  currentSong: CurrentSong | null;
  onLoadSavedSong: (song: SavedSong) => void;
  onClose: () => void;
};

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate bg-slate/20 text-brass">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="font-display text-base text-parchment">{title}</h2>
        <p className="text-xs text-ash">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AccountPanel({
  user,
  credits,
  isSubscriber,
  onByokKeyChange,
  currentSong,
  onLoadSavedSong,
  onClose,
}: Props) {
  return (
    <div className="relative min-h-screen bg-rosewood px-4 py-16 sm:px-6">
      {/* Decorative glow, matching /premium's treatment */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-brass/10 blur-3xl" />

      <div className="absolute left-6 top-6">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-ash transition-colors hover:text-parchment"
        >
          <ArrowLeft size={16} />
          Back to Vibechord
        </button>
      </div>

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brass/40 bg-slate/20">
            <User size={24} className="text-brass" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-parchment">
            Account
            {isSubscriber && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brass px-2.5 py-1 align-middle text-xs font-mono font-bold text-rosewood">
                <Sparkles size={11} /> PRO
              </span>
            )}
          </h1>
          <p className="mt-2 text-sm text-ash">
            {user ? user.email : "Manage your profile, key, songs, and billing."}
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeading
              icon={User}
              title="Profile"
              subtitle="Your login and credit balance"
            />
            <AuthPanel user={user} credits={credits} />
          </section>

          <section>
            <SectionHeading
              icon={KeyRound}
              title="Your API Key"
              subtitle="Bring your own Anthropic key to skip credits entirely"
            />
            <ByokSettings onKeyChange={onByokKeyChange} />
          </section>

          <section>
            <SectionHeading
              icon={Music4}
              title="Saved Songs"
              subtitle="Progressions you've kept for later"
            />
            <SavedSongs
              userId={user?.id ?? null}
              currentSong={currentSong}
              isSubscriber={isSubscriber}
              onLoad={(song) => {
                onLoadSavedSong(song);
                onClose();
              }}
            />
          </section>

          {user && (
            <section>
              <SectionHeading
                icon={CreditCard}
                title="Billing"
                subtitle="Subscriptions and one-time credit packs"
              />
              <PricingPanel userId={user.id} userEmail={user.email} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}