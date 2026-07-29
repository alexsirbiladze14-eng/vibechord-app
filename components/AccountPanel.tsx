"use client";

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
    <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-parchment">
          Account
          {isSubscriber && (
            <span className="ml-2 rounded-full bg-brass px-2 py-0.5 align-middle text-xs font-mono font-bold text-rosewood">
              PRO
            </span>
          )}
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-parchment"
        >
          ← Back to Toney
        </button>
      </div>

      <div className="space-y-4">
        <AuthPanel user={user} credits={credits} />
        <ByokSettings onKeyChange={onByokKeyChange} />
        <SavedSongs
          userId={user?.id ?? null}
          currentSong={currentSong}
          isSubscriber={isSubscriber}
          onLoad={(song) => {
            onLoadSavedSong(song);
            onClose();
          }}
        />
        {user && <PricingPanel userId={user.id} userEmail={user.email} />}
      </div>
    </div>
  );
}