"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FREE_SAVED_SONGS_LIMIT } from "@/lib/subscription";

export type SavedSong = {
  id: string;
  name: string;
  music_key: string;
  mode: string;
  degrees: number[];
  created_at: string;
};

type CurrentSong = {
  name: string;
  musicKey: string;
  mode: string;
  degrees: number[];
};

type Props = {
  userId: string | null;
  currentSong: CurrentSong | null;
  onLoad: (song: SavedSong) => void;
  isSubscriber: boolean;
};

export default function SavedSongs({ userId, currentSong, onLoad, isSubscriber }: Props) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSongs([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("saved_progressions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setSongs((data as SavedSong[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const atFreeLimit = !isSubscriber && songs.length >= FREE_SAVED_SONGS_LIMIT;

  async function handleSave() {
    if (!userId || !currentSong) return;
    if (atFreeLimit) {
      setError(
        `Free accounts can save up to ${FREE_SAVED_SONGS_LIMIT} songs — upgrade to Premium for unlimited saves.`
      );
      return;
    }
    setIsSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("saved_progressions")
      .insert({
        user_id: userId,
        name: currentSong.name,
        music_key: currentSong.musicKey,
        mode: currentSong.mode,
        degrees: currentSong.degrees,
      })
      .select()
      .single();

    setIsSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) {
      setSongs((prev) => [data as SavedSong, ...prev]);
    }
  }

  async function handleDelete(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    setError(null);
    const { error: deleteError } = await supabase
      .from("saved_progressions")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
  }

  if (!userId) return null;

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs text-ash">
          Your saved songs
          {!isSubscriber && (
            <span className="ml-1 text-ash/70">
              ({songs.length}/{FREE_SAVED_SONGS_LIMIT})
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!currentSong || isSaving || atFreeLimit}
          className="rounded-md bg-slate/60 px-3 py-1.5 text-xs text-parchment transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Save this song"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-rust">{error}</p>}

      {songs.length === 0 ? (
        <p className="text-xs text-ash">
          Nothing saved yet — generate a progression and hit "Save this
          song."
        </p>
      ) : (
        <ul className="space-y-1.5">
          {songs.map((song) => (
            <li
              key={song.id}
              className="flex items-center justify-between rounded-md bg-rosewood/60 px-3 py-2"
            >
              <span className="font-mono text-xs text-parchment">
                {song.name}{" "}
                <span className="text-ash">
                  ({song.music_key} {song.mode})
                </span>
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onLoad(song)}
                  className="font-mono text-xs text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(song.id)}
                  className="font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-rust"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}