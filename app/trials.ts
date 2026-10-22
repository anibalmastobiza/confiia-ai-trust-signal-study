export type Side = "left" | "right";

export type DotTrial = {
  id: string;
  leftCount: number;
  rightCount: number;
  correctChoice: Side;
  aiChoice: Side;
};

export const DOT_TRIALS: readonly DotTrial[] = [
  { id: "dots_01", leftCount: 47, rightCount: 54, correctChoice: "right", aiChoice: "right" },
  { id: "dots_02", leftCount: 58, rightCount: 51, correctChoice: "left", aiChoice: "left" },
  { id: "dots_03", leftCount: 46, rightCount: 52, correctChoice: "right", aiChoice: "left" },
  { id: "dots_04", leftCount: 55, rightCount: 49, correctChoice: "left", aiChoice: "left" },
  { id: "dots_05", leftCount: 50, rightCount: 57, correctChoice: "right", aiChoice: "right" },
  { id: "dots_06", leftCount: 53, rightCount: 59, correctChoice: "right", aiChoice: "left" },
];

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

const opposite = (side: Side): Side => side === "left" ? "right" : "left";

/** Preserve item difficulty and advice accuracy while balancing sides per session. */
export function generateBalancedTrials(random: () => number) {
  const correctSides = shuffle<Side>(["left", "left", "right", "right"], random);
  const errorSides = shuffle<Side>(["left", "right"], random);
  const balanced = DOT_TRIALS.map((trial) => {
    const aiCorrect = trial.aiChoice === trial.correctChoice;
    const correctChoice = (aiCorrect ? correctSides : errorSides).pop()!;
    const mirrored = trial.correctChoice !== correctChoice;
    return {
      ...trial,
      leftCount: mirrored ? trial.rightCount : trial.leftCount,
      rightCount: mirrored ? trial.leftCount : trial.rightCount,
      correctChoice,
      aiChoice: aiCorrect ? correctChoice : opposite(correctChoice),
      mirrored,
      leftCloudSeed: `${trial.id}-${mirrored ? "right" : "left"}`,
      rightCloudSeed: `${trial.id}-${mirrored ? "left" : "right"}`,
    };
  });
  return shuffle(balanced, random);
}

export function seededRandom(seedText: string) {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDotCloud(count: number, seed: string, mirrored: boolean) {
  const random = seededRandom(seed);
  const dots = Array.from({ length: count }, (_, index) => {
    const size = 4 + Math.round(random() * 3);
    const left = 4 + random() * 90;
    const top = 6 + random() * 86;
    const opacity = 0.72 + random() * 0.28;
    return `<span class="dot" aria-hidden="true" data-dot="${index}" style="${mirrored ? "right" : "left"}:${left.toFixed(
      2,
    )}%;top:${top.toFixed(2)}%;width:${size}px;height:${size}px;opacity:${opacity.toFixed(
      2,
    )}"></span>`;
  });

  return `<div class="dot-panel" aria-hidden="true">${dots.join("")}</div>`;
}

