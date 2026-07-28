type Props = {
  explanation: string | null;
  progressionName: string | null;
  source: "vibe" | "melody" | "refine" | "saved" | null;
  detail: string | null;
};

export default function TheoryPanel({
  explanation,
  progressionName,
  source,
  detail,
}: Props) {
  const hasResult = explanation !== null;

  const caption =
    source === "melody"
      ? `Built from the melody you hummed → ${progressionName}. This matching is rule-based (chord-tone overlap), not AI.`
      : source === "vibe" && detail
      ? `Matched to "${detail}" → ${progressionName}. This text comes from a human-curated database, not the AI — the AI's only job was classifying your vibe into a genre/mood/energy tag.`
      : source === "refine"
      ? `Refined via Toney → ${progressionName}. The refinement type is AI-classified; the actual music-theory change is deterministic code.`
      : source === "saved"
      ? `Loaded from your saved songs → ${progressionName}.`
      : null;

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6">
      <h2 className="font-display text-xl text-parchment mb-3">
        Why this works{" "}
        <span className="text-ash text-xs font-body">
          {hasResult ? "(curated, not AI-written)" : "(example)"}
        </span>
      </h2>

      {hasResult ? (
        <>
          <p className="font-body text-parchment/90 leading-relaxed">
            {explanation}
          </p>
          {caption && <p className="mt-3 text-xs text-ash">{caption}</p>}
        </>
      ) : (
        <p className="font-body text-parchment/90 leading-relaxed">
          This panel is a placeholder until you generate a progression
          above. For a taste: a progression like i–VI–III–VII (e.g.
          Em–C–G–D) gets its melancholy-but-hopeful pull from moving off
          the minor tonic into a major VI, then landing on VII instead of
          resolving home — which keeps it feeling unresolved rather than
          settled.
        </p>
      )}

      {hasResult && (
        <p className="mt-4 font-body text-sm text-brass">
          Ask Toney to &quot;quiz me on this&quot; in the chat →
        </p>
      )}
    </div>
  );
}