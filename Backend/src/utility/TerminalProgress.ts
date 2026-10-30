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

export function resetBrailleBarSession(
  sessionId: string | number = "default",
): void {
  sessionMap.delete(String(sessionId));
}

let loaderSeq = 0;
const activeSpinners = new Map<string, string>();
const activeDotBars = new Map<string, string>();

let allocatedPinnedLines = 0;
let lastDrawnContent = "";
let lastDrawTime = 0;
let latestLogMessage = "";

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

function getCombinedPinnedLines(): string[] {
  const maxCols = Math.max((process.stdout.columns || 120) - 1, 20);
  const lines: string[] = [];

  if (latestLogMessage) {
    lines.push(clampVisible(latestLogMessage.replace(/[\r\n]+/g, " ").trim(), maxCols));
  }

  for (const s of activeSpinners.values()) {
    if (s) {
      lines.push(clampVisible(s.replace(/[\r\n]+/g, " ").trim(), maxCols));
    }
  }

  for (const d of activeDotBars.values()) {
    if (d) {
      lines.push(clampVisible(d.replace(/[\r\n]+/g, " ").trim(), maxCols));
    }
  }

  return lines;
}

let scheduledPinnedImmediate: NodeJS.Immediate | null = null;

function schedulePinnedRedraw(): void {
  if (scheduledPinnedImmediate) {
    return;
  }
  scheduledPinnedImmediate = setImmediate(() => {
    scheduledPinnedImmediate = null;
    redrawPinned(true);
  });
}

function clearCurrentPinned(): void {
  if (allocatedPinnedLines <= 0) {
    return;
  }
  if (!process.stdout.isTTY) {
    allocatedPinnedLines = 0;
    lastDrawnContent = "";
    return;
  }
  if (allocatedPinnedLines === 1) {
    process.stdout.write("\r\x1b[2K");
  } else {
    process.stdout.write(`\x1b[${allocatedPinnedLines - 1}A\r\x1b[J`);
  }
  allocatedPinnedLines = 0;
  lastDrawnContent = "";
}

function redrawPinned(force = false): void {
  if (typeof process.send === "function") {
    return;
  }
  if (!process.stdout.isTTY) {
    return;
  }

  const now = Date.now();
  if (!force && now - lastDrawTime < 40) {
    return;
  }

  const lines = getCombinedPinnedLines();
  const content = lines.join("\n");

  if (!force && content === lastDrawnContent && lines.length === allocatedPinnedLines) {
    return;
  }

  clearCurrentPinned();

  if (lines.length > 0) {
    process.stdout.write(content);
    allocatedPinnedLines = lines.length;
    lastDrawnContent = content;
    lastDrawTime = now;
  }
}

export function registerActiveLoader(renderer: () => void): () => void {
  return () => {
    renderer();
  };
}

export function isLoaderActive(): boolean {
  return activeSpinners.size > 0 || activeDotBars.size > 0;
}

export function handleLogWithActiveLoader(formattedMessage: string): boolean {
  if (typeof process.send === "function") {
    process.send({
      type: "TERMINAL_LOG",
      message: formattedMessage,
    });
    return true;
  }

  if (!process.stdout.isTTY) {
    process.stdout.write(`${formattedMessage}\n`);
    return true;
  }

  latestLogMessage = formattedMessage;
  schedulePinnedRedraw();
  return true;
}

export function getLatestLogMessage(): string {
  return latestLogMessage;
}

export function renderTwoLineOutput(
  loaderOutput: string,
  id = "default",
  kind: "spinner" | "dotbar" = "spinner",
): void {
  if (typeof process.send === "function") {
    process.send({
      type: "TERMINAL_LOADER",
      id,
      output: loaderOutput,
      kind,
    });
    return;
  }

  if (kind === "dotbar") {
    activeDotBars.set(id, loaderOutput);
  } else {
    activeSpinners.set(id, loaderOutput);
  }

  redrawPinned();
}

export function handleLoaderStop(
  completedText?: string,
  id = "default",
  kind: "spinner" | "dotbar" = "spinner",
): void {
  if (typeof process.send === "function") {
    process.send({
      type: "TERMINAL_STOP",
      id,
      completedText,
      kind,
    });
    return;
  }

  if (kind === "dotbar") {
    activeDotBars.delete(id);
  } else {
    activeSpinners.delete(id);
  }

  if (completedText) {
    latestLogMessage = `\x1b[32m✔\x1b[0m ${completedText}`;
  }

  redrawPinned(true);
}

export function handleLoaderFail(
  errorText?: string,
  id = "default",
  kind: "spinner" | "dotbar" = "spinner",
): void {
  if (typeof process.send === "function") {
    process.send({
      type: "TERMINAL_FAIL",
      id,
      errorText,
      kind,
    });
    return;
  }

  if (kind === "dotbar") {
    activeDotBars.delete(id);
  } else {
    activeSpinners.delete(id);
  }

  if (errorText) {
    latestLogMessage = `\x1b[31m✖ Error: ${errorText}\x1b[0m`;
  }

  redrawPinned(true);
}

export function handleTerminalIpcMessage(msg: any): void {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "TERMINAL_LOG" && typeof msg.message === "string") {
    handleLogWithActiveLoader(msg.message);
  } else if (msg.type === "TERMINAL_LOADER" && typeof msg.output === "string") {
    const id = typeof msg.id === "string" ? msg.id : "worker-loader";
    const kind = msg.kind === "dotbar" ? "dotbar" : "spinner";
    renderTwoLineOutput(msg.output, id, kind);
  } else if (msg.type === "TERMINAL_STOP") {
    const id = typeof msg.id === "string" ? msg.id : "worker-loader";
    const kind = msg.kind === "dotbar" ? "dotbar" : "spinner";
    handleLoaderStop(msg.completedText, id, kind);
  } else if (msg.type === "TERMINAL_FAIL") {
    const id = typeof msg.id === "string" ? msg.id : "worker-loader";
    const kind = msg.kind === "dotbar" ? "dotbar" : "spinner";
    handleLoaderFail(msg.errorText, id, kind);
  }
}

export interface SpinnerHandle {
  updateLabel: (newLabel: string) => void;
  stop: (completedText?: string) => void;
  fail: (errorText?: string) => void;
}

export function startSpinningLoader(label: string, customId?: string): SpinnerHandle {
  const loaderId = customId || `spinner-${++loaderSeq}`;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let currentLabel = label;
  let isStopped = false;

  const render = () => {
    if (isStopped) return;
    const frame = frames[frameIndex % frames.length];
    const loaderOutput = `\x1b[38;2;245;158;11m${frame}\x1b[0m ${currentLabel}`;
    renderTwoLineOutput(loaderOutput, loaderId, "spinner");
  };

  const timer = setInterval(() => {
    frameIndex++;
    render();
  }, 160);

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
      handleLoaderStop(completedText, loaderId, "spinner");
    },
    fail(errorText?: string) {
      if (isStopped) return;
      isStopped = true;
      clearInterval(timer);
      handleLoaderFail(errorText || currentLabel, loaderId, "spinner");
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
  const progressRatio = Math.min(Math.max(current / (total || 1), 0), 1);
  const totalX = barWidth * 2;
  const totalY = 4;
  const sessionKey = String(sessionId ?? label ?? "default");
  const thresholdMap = getSessionThresholdMap(sessionKey, totalX, totalY);

  const dotOrder = [
    [0, 0, 0x01],
    [0, 1, 0x02],
    [0, 2, 0x04],
    [1, 0, 0x08],
    [1, 1, 0x10],
    [1, 2, 0x20],
    [0, 3, 0x40],
    [1, 3, 0x80],
  ];

  let bar = "";

  for (let cell = 0; cell < barWidth; cell++) {
    const col0 = cell * 2;
    const col1 = cell * 2 + 1;
    let mask = 0;

    for (const [dx, dy, bit] of dotOrder) {
      const gx = dx === 0 ? col0 : col1;
      const gy = dy;
      const threshold = thresholdMap[gx * totalY + gy];

      if (progressRatio >= threshold) {
        mask |= bit;
      }
    }

    if (mask > 0) {
      const r = hasError ? 239 : 245;
      const g = hasError ? 68 : 158;
      const b = hasError ? 68 : 11;
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
  const output = formatCustomBrailleBar(
    current,
    total,
    label,
    barWidth,
    tick,
    sessionKey,
    hasError,
  );

  if (hasError) {
    sessionMap.delete(sessionKey);
    renderTwoLineOutput(output, sessionKey, "dotbar");
    handleLoaderFail(errorMessage || "Scrape operation halted", sessionKey, "dotbar");
    return;
  }

  renderTwoLineOutput(output, sessionKey, "dotbar");

  if (current >= total) {
    sessionMap.delete(sessionKey);
    handleLoaderStop(undefined, sessionKey, "dotbar");
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
  const barId = String(sessionId ?? label ?? `dotbar-${++loaderSeq}`);

  const render = (hasErr = false) => {
    if (isFinished) return;
    const output = formatCustomBrailleBar(
      cur,
      tot,
      curLabel,
      barWidth,
      0,
      barId,
      hasErr,
    );
    renderTwoLineOutput(output, barId, "dotbar");
  };

  render(false);

  return {
    update(newCurrent: number, newTotal?: number, newLabel?: string) {
      if (isFinished) return;
      cur = newCurrent;
      if (typeof newTotal === "number") tot = newTotal;
      if (newLabel) curLabel = newLabel;
      render(false);
    },
    stop(completedText?: string) {
      if (isFinished) return;
      isFinished = true;
      sessionMap.delete(barId);
      handleLoaderStop(completedText, barId, "dotbar");
    },
    fail(errorText?: string) {
      if (isFinished) return;
      isFinished = true;
      render(true);
      sessionMap.delete(barId);
      handleLoaderFail(errorText || "Scrape operation halted", barId, "dotbar");
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
  return bar;
}

export function PackageMultiProgressBar(
  options: cliProgress.Options = {},
): cliProgress.MultiBar {
  return new cliProgress.MultiBar(
    {
      ...options,
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
