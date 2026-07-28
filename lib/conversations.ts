/**
 * conversations.ts
 *
 * Persistence for Toney chat history. Each conversation stores its full
 * message log and artifact history as JSONB — read/written as one unit,
 * since a conversation is always loaded or saved whole, never queried
 * piecemeal by individual message.
 *
 * Guests (not logged in) never call any of this — conversations simply
 * live in React state for the session and vanish on refresh, consistent
 * with how every other "logged-in-only" feature in this app degrades.
 */

import { supabase } from "./supabaseClient";
import type { ToneyMessage } from "@/components/ToneyChat";
import type { Artifact } from "./artifacts";

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type ConversationFull = ConversationSummary & {
  messages: ToneyMessage[];
  artifacts: Artifact[];
  active_artifact_index: number | null;
};

export async function listConversations(
  userId: string
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listConversations failed:", error);
    return [];
  }
  return data as ConversationSummary[];
}

export async function loadConversation(
  id: string
): Promise<ConversationFull | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("loadConversation failed:", error);
    return null;
  }
  return data as ConversationFull;
}

/** First-turn title: just the first user message, trimmed to a length
 * that reads well as a single-line sidebar entry. */
export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed || "New chat";
}

export async function createConversation(
  userId: string,
  title: string,
  messages: ToneyMessage[],
  artifacts: Artifact[],
  activeArtifactIndex: number | null
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title,
      messages,
      artifacts,
      active_artifact_index: activeArtifactIndex,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createConversation failed:", error);
    return null;
  }
  return data.id as string;
}

export async function updateConversation(
  id: string,
  updates: {
    messages: ToneyMessage[];
    artifacts: Artifact[];
    activeArtifactIndex: number | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({
      messages: updates.messages,
      artifacts: updates.artifacts,
      active_artifact_index: updates.activeArtifactIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) console.error("updateConversation failed:", error);
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) console.error("deleteConversation failed:", error);
}
