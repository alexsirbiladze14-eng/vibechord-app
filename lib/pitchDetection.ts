/**
 * pitchDetection.ts
 *
 * Converts a buffer of raw microphone samples into a musical note, using
 * autocorrelation — a standard, well-understood pitch-detection technique
 * (not a black box, not AI): it finds the lag at which a waveform best
 * matches a delayed copy of itself, and that lag directly gives the
 * fundamental frequency.
 *
 * Deliberately built on nothing but the Web Audio API (already in every
 * browser) rather than an external pitch-detection package, so there's
 * no new dependency to install and nothing here that can't be read and
 * verified directly.
 */

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/**
 * Returns the fundamental frequency (Hz) of a buffer of audio samples, or
 * -1 if the signal is too quiet or too noisy to confidently detect a pitch.
 *
 * Two guards keep this honest rather than reporting a fake pitch on
 * silence or noise:
 *  - an RMS (volume) floor, so background noise doesn't get "detected"
 *  - a correlation-strength floor, so an unpitched/noisy signal (a pick
 *    scrape, a cough) doesn't get reported as a note
 */
export function autoCorrelate(buffer: Float32Array<ArrayBuffer>, sampleRate: number): number {
  const size = buffer.length;

  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return -1; // effectively silent

  const maxLag = Math.floor(size / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let lastCorrelation = 1;

  // Start at lag 8 to skip implausibly high "frequencies" that are really
  // just sample-level noise, not a playable pitch.
  for (let offset = 8; offset < maxLag; offset++) {
    let diffSum = 0;
    for (let i = 0; i < maxLag; i++) {
      diffSum += Math.abs(buffer[i] - buffer[i + offset]);
    }
    const correlation = 1 - diffSum / maxLag;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (bestOffset !== -1) {
      // Correlation peaked and is now falling — the peak we already found
      // is the answer, no need to keep scanning longer lags.
      break;
    }
    lastCorrelation = correlation;
  }

  if (bestOffset === -1) return -1;
  return sampleRate / bestOffset;
}

export type DetectedNote = {
  name: string; // "C", "F#", etc — pitch class, no octave
  octave: number;
  cents: number; // how far off from perfectly in-tune, -50 to +50
};

/**
 * Standard equal-temperament conversion: A4 = 440 Hz = MIDI note 69, and
 * every semitone is a fixed frequency ratio from there. This is exact
 * music-theory math, not an estimate.
 */
export function frequencyToNote(frequency: number): DetectedNote {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NOTE_NAMES[noteIndex], octave, cents };
}
