import cliProgress from "cli-progress";

const sessionMap = new Map<string, Float32Array>();

function getSessionThresholdMap(
  sessionKey: string,
  totalX: number,
  totalY: number,
): Float32Array {
  const existing = sessionMap.get(sessionKey);
  if (existing && existing.length === totalX * totalY) {
    return existing;
  }

  const totalDots = totalX * totalY;
  const numSeeds = Math.max(14, Math.floor(totalX / 2.5));
  const seeds: { x: number; y: number; t: number }[] = [];

  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: Math.floor(Math.random() * totalX),
      y: Math.floor(Math.random() * totalY),
      t: (i / numSeeds) * 0.1,
    });
  }

  const map = new Float32Array(totalDots);
  const nonSeedDots: { gx: number; gy: number; score: number }[] = [];

  for (let gx = 0; gx < totalX; gx++) {
    for (let gy = 0; gy < totalY; gy++) {
      const seedIndex = seeds.findIndex((s) => s.x === gx && s.y === gy);
      if (seedIndex !== -1) {
        map[gx * totalY + gy] = seeds[seedIndex].t;
      } else {
        let minD = 999;
        for (const s of seeds) {
          const d = Math.hypot(gx - s.x, (gy - s.y) * 2.5);
          if (d < minD) {
            minD = d;
          }
        }
        const jitter = Math.random() * 0.25;
        nonSeedDots.push({ gx, gy, score: minD + jitter });
      }
    }
  }

  nonSeedDots.sort((a, b) => a.score - b.score);
  for (let rank = 0; rank < nonSeedDots.length; rank++) {
    const { gx, gy } = nonSeedDots[rank];
    map[gx * totalY + gy] = 0.1 + (rank / nonSeedDots.length) * 0.899;
  }

  sessionMap.set(sessionKey, map);
  return map;
}

export function resetBrailleBarSession(sessionId: string | number = "default"): void {
  sessionMap.delete(String(sessionId));
}

export function CustomBrailleDotBar(
  current: number,
  total: number,
  label = "",
  barWidth = 24,
  tick?: number,
  sessionId?: string | number,
): void {
  const currentTick = tick ?? Math.floor(Date.now() / 50);
  const progressRatio = Math.min(Math.max(current / (total || 1), 0), 1);
  const totalX = barWidth * 2;
  const totalY = 4;
  const sessionKey = String(sessionId ?? label ?? "default");
  const thresholdMap = getSessionThresholdMap(sessionKey, totalX, totalY);

  let bar = "";
  for (let c = 0; c < barWidth; c++) {
    let mask = 0;
    let activeBits = 0;

    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const gx = c * 2 + dx;
        const th = thresholdMap[gx * totalY + dy];

        if (progressRatio >= 1 || (progressRatio > 0 && progressRatio >= th)) {
          const bit =
            dx === 0 ? (dy === 3 ? 6 : dy) : dy === 3 ? 7 : dy + 3;
          mask |= 1 << bit;
          activeBits++;
        }
      }
    }

    if (mask > 0) {
      const wave = Math.sin(c * 0.45 - currentTick * 0.35);
      const waveFactor = (wave + 1) / 2;
      const density = activeBits / 8;
      const blend = Math.min(
        Math.max(waveFactor * 0.5 + (1 - density) * 0.4, 0),
        1,
      );

      const r = 255;
      const g = Math.round(110 + blend * 145);
      const b = Math.round(20 + blend * 235);

      bar += `\x1b[38;2;${r};${g};${b}m${String.fromCharCode(0x2800 + mask)}\x1b[0m`;
    } else {
      bar += "\u2800";
    }
  }

  const percent = (progressRatio * 100).toFixed(0);
  process.stdout.write(
    `\r\x1b[2K\x1b[1m${label}\x1b[0m  \x1b[90m[\x1b[0m${bar}\x1b[90m]\x1b[0m  \x1b[38;2;255;180;60m${percent}%\x1b[0m \x1b[90m(${current}/${total})\x1b[0m`,
  );

  if (current >= total) {
    sessionMap.delete(sessionKey);
    process.stdout.write("\n");
  }
}

export interface SingleBarOptions {
  label?: string;
  total?: number;
  barCompleteChar?: string;
  barIncompleteChar?: string;
}

export function PackageSingleProgressBar(
  options: SingleBarOptions = {},
): cliProgress.SingleBar {
  const label = options.label ?? "Progress";
  const bar = new cliProgress.SingleBar(
    {
      format: `${label} |\x1b[38;2;245;158;11m{bar}\x1b[0m| {percentage}% | ETA: {eta}s | {value}/{total}`,
      barCompleteChar: options.barCompleteChar ?? "⣿",
      barIncompleteChar: options.barIncompleteChar ?? "⣀",
      hideCursor: true,
      clearOnComplete: false,
    },
    cliProgress.Presets.rect,
  );

  if (options.total) {
    bar.start(options.total, 0);
  }

  return bar;
}

export function PackageMultiProgressBar(): cliProgress.MultiBar {
  return new cliProgress.MultiBar(
    {
      format:
        "{worker} [{platform}] |\x1b[38;2;245;158;11m{bar}\x1b[0m| {percentage}% | ETA: {eta}s | {value}/{total}",
      barCompleteChar: "⣿",
      barIncompleteChar: "⣀",
      hideCursor: true,
      clearOnComplete: false,
    },
    cliProgress.Presets.rect,
  );
}

export const TerminalProgress = {
  custom: {
    renderBrailleBar: CustomBrailleDotBar,
    resetSession: resetBrailleBarSession,
  },
  package: {
    createSingleBar: PackageSingleProgressBar,
    createMultiBar: PackageMultiProgressBar,
  },
};

export default TerminalProgress;
