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

let activeLoaderRenderer: (() => void) | null = null;
let currentLoaderOutput = "";
let latestLogMessage = "";
let isTwoLineAllocated = false;

function clampVisible(raw: string, maxLen: number): string {
  if (!raw) return "";
  const str = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, (match) => {
    return match.endsWith("m") ? match : "";
  });
  let visible = 0;
  let inEscape = false;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\x1b") {
      inEscape = true;
      result += str[i];
    } else if (inEscape) {
      result += str[i];
      if (/[a-zA-Z]/.test(str[i])) {
        inEscape = false;
      }
    } else {
      if (visible >= maxLen) break;
      visible++;
      result += str[i];
    }
  }
  return result + "\x1b[0m";
}

function draw(): void {
  if (typeof process.send === "function") {
    return;
  }
  if (!isTwoLineAllocated) {
    process.stdout.write("\n");
    isTwoLineAllocated = true;
  }
  const maxCols = Math.max((process.stdout.columns || 120) - 1, 20);
  const cleanLog = clampVisible(latestLogMessage.replace(/[\r\n]+/g, " ").trim(), maxCols);
  const cleanLoader = clampVisible(currentLoaderOutput.replace(/[\r\n]+/g, " ").trim(), maxCols);
  process.stdout.write(`\x1b[1A\r\x1b[2K${cleanLog}\n\r\x1b[2K${cleanLoader}`);
}

export function registerActiveLoader(renderer: () => void): () => void {
  activeLoaderRenderer = renderer;
  if (typeof process.send !== "function" && !isTwoLineAllocated) {
    process.stdout.write("\n");
    isTwoLineAllocated = true;
  }
  return () => {
    if (activeLoaderRenderer === renderer) {
      activeLoaderRenderer = null;
    }
  };
}

export function isLoaderActive(): boolean {
  return activeLoaderRenderer !== null;
}

export function handleLogWithActiveLoader(formattedMessage: string): boolean {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_LOG", message: formattedMessage });
    return true;
  }
  latestLogMessage = formattedMessage;
  draw();
  return true;
}

export function getLatestLogMessage(): string {
  return latestLogMessage;
}

export function renderTwoLineOutput(loaderOutput: string): void {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_LOADER", output: loaderOutput });
    return;
  }
  currentLoaderOutput = loaderOutput;
  draw();
}

export function handleLoaderStop(completedText?: string): void {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_STOP", completedText });
    return;
  }
  if (completedText) {
    latestLogMessage = `\x1b[32m✔\x1b[0m ${completedText}`;
  }
  currentLoaderOutput = "";
  draw();
}

export function handleLoaderFail(errorText?: string): void {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_FAIL", errorText });
    return;
  }
  currentLoaderOutput = "";
  draw();
  if (errorText) {
    process.stdout.write(`\n\x1b[31m✖ Error: ${errorText}\x1b[0m\n`);
    isTwoLineAllocated = false;
  }
}

export function handleTerminalIpcMessage(msg: any): void {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "TERMINAL_LOG" && typeof msg.message === "string") {
    handleLogWithActiveLoader(msg.message);
  } else if (msg.type === "TERMINAL_LOADER" && typeof msg.output === "string") {
    renderTwoLineOutput(msg.output);
  } else if (msg.type === "TERMINAL_STOP") {
    handleLoaderStop(msg.completedText);
  } else if (msg.type === "TERMINAL_FAIL") {
    handleLoaderFail(msg.errorText);
  }
}

export interface SpinnerHandle {
  updateLabel: (newLabel: string) => void;
  stop: (completedText?: string) => void;
  fail: (errorText?: string) => void;
}

export function startSpinningLoader(label: string): SpinnerHandle {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let currentLabel = label;
  let isStopped = false;

  const render = () => {
    if (isStopped) return;
    const frame = frames[frameIndex % frames.length];
    const loaderOutput = `\x1b[38;2;245;158;11m${frame}\x1b[0m ${currentLabel}`;
    renderTwoLineOutput(loaderOutput);
  };

  const unregister = registerActiveLoader(render);

  const timer = setInterval(() => {
    frameIndex++;
    render();
  }, 80);

  render();

  return {
    updateLabel(newLabel: string) {
      currentLabel = newLabel;
      render();
    },
    stop(completedText?: string) {
      if (isStopped) return;
      isStopped = true;
      clearInterval(timer);
      unregister();
      handleLoaderStop(completedText);
    },
    fail(errorText?: string) {
      if (isStopped) return;
      isStopped = true;
      clearInterval(timer);
      unregister();
      handleLoaderFail(errorText || currentLabel);
    },
  };
}

export function formatCustomBrailleBar(
  current: number,
  total: number,
  label = "",
  barWidth = 24,
  tick?: number,
  sessionId?: string | number,
  hasError = false,
): string {
  const currentTick = tick ?? Math.floor(Date.now() / 50);
  const progressRatio = Math.min(Math.max(current / (total || 1), 0), 1);
  const totalX = barWidth * 2;
  const totalY = 4;
  const sessionKey = String(sessionId ?? label ?? "default");
  const thresholdMap = getSessionThresholdMap(sessionKey, totalX, totalY);
  const errorCol = Math.min(Math.floor(progressRatio * barWidth), barWidth - 1);

  let bar = "";
  for (let c = 0; c < barWidth; c++) {
    if (hasError && c === errorCol) {
      bar += "\x1b[31;1m●\x1b[0m";
      continue;
    }

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
  return `\x1b[1m${label}\x1b[0m  \x1b[90m[\x1b[0m${bar}\x1b[90m]\x1b[0m  \x1b[38;2;255;180;60m${percent}%\x1b[0m \x1b[90m(${current}/${total})\x1b[0m`;
}

export function CustomBrailleDotBar(
  current: number,
  total: number,
  label = "",
  barWidth = 24,
  tick?: number,
  sessionId?: string | number,
  hasError = false,
  errorMessage?: string,
): void {
  const sessionKey = String(sessionId ?? label ?? "default");
  const output = formatCustomBrailleBar(current, total, label, barWidth, tick, sessionKey, hasError);

  if (hasError) {
    sessionMap.delete(sessionKey);
    renderTwoLineOutput(output);
    handleLoaderFail(errorMessage || "Scrape operation halted");
    return;
  }

  renderTwoLineOutput(output);

  if (current >= total && !isLoaderActive()) {
    sessionMap.delete(sessionKey);
    handleLoaderStop();
  }
}

export interface ActiveBrailleBar {
  update: (current: number, total?: number, label?: string) => void;
  stop: (completedText?: string) => void;
  fail: (errorText?: string) => void;
}

export function startCustomBrailleBar(
  initialCurrent: number,
  total: number,
  label = "",
  barWidth = 24,
  sessionId?: string | number,
): ActiveBrailleBar {
  let cur = initialCurrent;
  let tot = total;
  let curLabel = label;
  let isFinished = false;
  let tick = 0;
  const sessionKey = String(sessionId ?? label ?? "default");

  const render = () => {
    if (isFinished) return;
    tick++;
    const output = formatCustomBrailleBar(cur, tot, curLabel, barWidth, tick, sessionKey, false);
    renderTwoLineOutput(output);
  };

  const unregister = registerActiveLoader(render);

  const timer = setInterval(() => {
    render();
  }, 80);

  render();

  return {
    update(newCurrent: number, newTotal?: number, newLabel?: string) {
      if (isFinished) return;
      cur = newCurrent;
      if (typeof newTotal === "number") tot = newTotal;
      if (newLabel) curLabel = newLabel;
      render();
    },
    stop(completedText?: string) {
      if (isFinished) return;
      isFinished = true;
      clearInterval(timer);
      unregister();
      sessionMap.delete(sessionKey);
      handleLoaderStop(completedText);
    },
    fail(errorText?: string) {
      if (isFinished) return;
      isFinished = true;
      clearInterval(timer);
      unregister();
      const errorOutput = formatCustomBrailleBar(cur, tot, curLabel, barWidth, tick, sessionKey, true);
      renderTwoLineOutput(errorOutput);
      handleLoaderFail(errorText || "Scrape operation halted");
    },
  };
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
    startSpinner: startSpinningLoader,
    renderBrailleBar: CustomBrailleDotBar,
    resetSession: resetBrailleBarSession,
  },
  package: {
    createSingleBar: PackageSingleProgressBar,
    createMultiBar: PackageMultiProgressBar,
  },
};

export default TerminalProgress;
