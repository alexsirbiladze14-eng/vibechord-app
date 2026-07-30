"use client";

import { motion } from "framer-motion";

type Props = {
  note: string;
  isActive: boolean;
  isInTune: boolean;
};

/**
 * TunerStringBadge — one target-string pill in the guided tuner.
 * Extracted from app/tuner/page.tsx so the tuning-palette fix (brass,
 * not raw amber hex) lives in one place instead of being repeated
 * inline for every string.
 */
export default function TunerStringBadge({ note, isActive, isInTune }: Props) {
  return (
    <motion.div
      animate={{ scale: isActive ? 1.12 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold border-2 transition-colors duration-300 ${
        isActive
          ? isInTune
            ? "bg-brass border-brass text-rosewood shadow-[0_0_25px_rgba(201,138,75,0.45)]"
            : "bg-slate border-slate text-parchment shadow-lg"
          : "bg-rosewood border-slate text-ash"
      }`}
    >
      {note}
    </motion.div>
  );
}
