const RANDOM_BUFFER_RATIO = 0.2; // 20% random constellation dots buffer

interface BrailleSession {
  ranks: Int32Array;
  barWidth: number;
}

const brailleSessions = new Map<string, BrailleSession>();

function generateSessionDotRanks(
  totalX: number,
  totalY: number,
): Int32Array {
  const totalDots = totalX * totalY;
  const numSeeds = Math.max(1, Math.floor(totalDots * RANDOM_BUFFER_RATIO));

  // Distinct indices for all dot positions
  const allIndices = Array.from({ length: totalDots }, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }

  const seedIndices = allIndices.slice(0, numSeeds);
  const nonSeedIndices = allIndices.slice(numSeeds);

  const seeds = seedIndices.map((idx) => ({
    gx: Math.floor(idx / totalY),
    gy: idx % totalY,
  }));

  const nonSeeds = nonSeedIndices.map((idx) => {
    const gx = Math.floor(idx / totalY);
    const gy = idx % totalY;
    let minD = 999;
    for (const s of seeds) {
      const d = Math.hypot(gx - s.gx, (gy - s.gy) * 2.5);
      if (d < minD) minD = d;
    }
    return { idx, score: minD + Math.random() * 0.25 };
  });

  nonSeeds.sort((a, b) => a.score - b.score);

  const ranks = new Int32Array(totalDots);
  seedIndices.forEach((idx, r) => {
    ranks[idx] = r;
  });
  nonSeeds.forEach((item, r) => {
    ranks[item.idx] = numSeeds + r;
  });

  return ranks;
}

function getOrCreateBrailleSession(
  sessionKey: string,
  barWidth: number,
): BrailleSession {
  const existing = brailleSessions.get(sessionKey);
  if (existing && existing.barWidth === barWidth) {
    return existing;
  }

  const totalX = barWidth * 2;
  const totalY = 4;
  const ranks = generateSessionDotRanks(totalX, totalY);

  const session: BrailleSession = {
    ranks,
    barWidth,
  };

  brailleSessions.set(sessionKey, session);
  return session;
}

export function resetBrailleBarSession(
  sessionId: string | number = "default",
): void {
  const key = String(sessionId);
  brailleSessions.delete(key);
}

let loaderSeq = 0;
const activeSpinners = new Map<string, string>();
const activeDotBars = new Map<string, string>();

let allocatedPinnedLines = 0;
let lastDrawnContent = "";
let lastDrawTime = 0;
let latestLogMessage = "";
let scheduledImmediate: NodeJS.Immediate | null = null;

function clampVisible(raw: string, maxLen: number): string {
  if (!raw) return "";
  const str = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, (match) =>
    match.endsWith("m") ? match : "",
  );
  let visible = 0;
  let inEscape = false;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\x1b") {
      inEscape = true;
      result += str[i];
    } else if (inEscape) {
      result += str[i];
      if (/[a-zA-Z]/.test(str[i])) inEscape = false;
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
    lines.push(
      clampVisible(latestLogMessage.replace(/[\r\n]+/g, " ").trim(), maxCols),
    );
  }

  for (const s of activeSpinners.values()) {
    if (s) lines.push(clampVisible(s.replace(/[\r\n]+/g, " ").trim(), maxCols));
  }

  for (const d of activeDotBars.values()) {
    if (d) lines.push(clampVisible(d.replace(/[\r\n]+/g, " ").trim(), maxCols));
  }

  return lines;
}

function clearCurrentPinned(): void {
  if (allocatedPinnedLines <= 0) return;
  if (allocatedPinnedLines === 1) {
    process.stdout.write("\r\x1b[2K");
  } else {
    process.stdout.write(`\x1b[${allocatedPinnedLines - 1}A\r\x1b[J`);
  }
  allocatedPinnedLines = 0;
  lastDrawnContent = "";
}

function redrawPinned(force = false): void {
  if (typeof process.send === "function") return;

  const now = Date.now();
  if (!force && now - lastDrawTime < 30) return;

  const lines = getCombinedPinnedLines();
  const content = lines.join("\n");

  if (
    !force &&
    content === lastDrawnContent &&
    lines.length === allocatedPinnedLines
  ) {
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

function schedulePinnedRedraw(): void {
  if (scheduledImmediate) return;
  scheduledImmediate = setImmediate(() => {
    scheduledImmediate = null;
    redrawPinned(true);
  });
}

export type RunType = "default" | "debug";

/**
 * Resolves the terminal output mode from `RUN_TYPE` (defaulting to `"default"`).
 * `"debug"` disables single-line log overwriting and animated/fancy loaders.
 */
export function getRunType(): RunType {
  const raw = (process.env.RUN_TYPE ?? process.env.run_type ?? "default")
    .trim()
    .toLowerCase();
  return raw === "debug" ? "debug" : "default";
}

export function isDebugRunMode(): boolean {
  return getRunType() === "debug";
}

function writeDebugLine(line: string): void {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_LOG", message: line });
    return;
  }
  process.stdout.write(`${line}\n`);
}

function formatPlainProgress(current: number, total: number, label: string): string {
  const validTotal = Math.max(1, total || 1);
  const percent = Math.min(100, Math.max(0, (current / validTotal) * 100)).toFixed(0);
  return `[progress] ${label}: ${current}/${total} (${percent}%)`;
}

export function handleLogWithActiveLoader(formattedMessage: string): boolean {
  if (typeof process.send === "function") {
    process.send({ type: "TERMINAL_LOG", message: formattedMessage });
    return true;
  }

    if (isDebugRunMode() || !process.stdout.isTTY) {
      process.stdout.write(`${formattedMessage}\n`);
      return true;
    }

    latestLogMessage = formattedMessage;
    schedulePinnedRedraw();
    return true;
  }

  export function renderTwoLineOutput(
    loaderOutput: string,
    id = "default",
    kind: "spinner" | "dotbar" = "spinner",
    forceRedraw = false,
  ): void {
    if (isDebugRunMode()) {
      return;
    }

    if (typeof process.send === "function") {
      process.send({ type: "TERMINAL_LOADER", id, output: loaderOutput, kind });
      return;
    }

    if (kind === "dotbar") {
      activeDotBars.set(id, loaderOutput);
    } else {
      activeSpinners.set(id, loaderOutput);
    }

    redrawPinned(forceRedraw);
  }

  export function handleLoaderStop(
    completedText?: string,
    id = "default",
    kind: "spinner" | "dotbar" = "spinner",
  ): void {
    if (isDebugRunMode()) {
      if (completedText) {
        writeDebugLine(`\x1b[32m✔\x1b[0m ${completedText}`);
      }
      return;
    }

    if (typeof process.send === "function") {
      process.send({ type: "TERMINAL_STOP", id, completedText, kind });
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
    if (isDebugRunMode()) {
      if (errorText) {
        writeDebugLine(`\x1b[31m✖ Error: ${errorText}\x1b[0m`);
      }
      return;
    }

    if (typeof process.send === "function") {
      process.send({ type: "TERMINAL_FAIL", id, errorText, kind });
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
    const id = typeof msg.id === "string" ? msg.id : "worker-loader";
    const kind = msg.kind === "dotbar" ? "dotbar" : "spinner";

    if (msg.type === "TERMINAL_LOG" && typeof msg.message === "string") {
      handleLogWithActiveLoader(msg.message);
    } else if (msg.type === "TERMINAL_LOADER" && typeof msg.output === "string") {
      renderTwoLineOutput(msg.output, id, kind, true);
    } else if (msg.type === "TERMINAL_STOP") {
      handleLoaderStop(msg.completedText, id, kind);
    } else if (msg.type === "TERMINAL_FAIL") {
      handleLoaderFail(msg.errorText, id, kind);
    }
  }

  export interface SpinnerHandle {
    updateLabel: (newLabel: string) => void;
    stop: (completedText?: string) => void;
    fail: (errorText?: string) => void;
  }

  export function startSpinningLoader(
    label: string,
    customId?: string,
  ): SpinnerHandle {
    const loaderId = customId || `spinner-${++loaderSeq}`;
    let currentLabel = label;
    let isStopped = false;

    if (isDebugRunMode()) {
      writeDebugLine(`[loader] ${currentLabel}`);
      return {
        updateLabel(newLabel: string) {
          if (isStopped || newLabel === currentLabel) return;
          currentLabel = newLabel;
          writeDebugLine(`[loader] ${currentLabel}`);
        },
        stop(completedText?: string) {
          if (isStopped) return;
          isStopped = true;
          handleLoaderStop(completedText, loaderId, "spinner");
        },
        fail(errorText?: string) {
          if (isStopped) return;
          isStopped = true;
          handleLoaderFail(errorText || currentLabel, loaderId, "spinner");
        },
      };
    }

    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frameIndex = 0;

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

  const DOT_ORDER = [
    [0, 0, 0x01],
    [0, 1, 0x02],
    [0, 2, 0x04],
    [1, 0, 0x08],
    [1, 1, 0x10],
    [1, 2, 0x20],
    [0, 3, 0x40],
    [1, 3, 0x80],
  ] as const;

  export function formatCustomBrailleBar(
    current: number,
    total: number,
    label = "",
    barWidth = 24,
    sessionId?: string | number,
    hasError = false,
    activeDotOverride?: number,
    tick?: number,
  ): string {
    const validTotal = Math.max(1, total || 1);
    const clampedCurrent = Math.min(Math.max(current, 0), validTotal);
    const totalDots = barWidth * 8;
    const maxAllowedDots = Math.min(totalDots, validTotal);

    const activeDots =
      typeof activeDotOverride === "number"
        ? Math.min(totalDots, Math.max(0, activeDotOverride))
        : clampedCurrent >= validTotal
          ? maxAllowedDots
          : Math.min(
            maxAllowedDots,
            Math.floor((clampedCurrent * maxAllowedDots) / validTotal),
          );

    const sessionKey = String(sessionId ?? label ?? "default");
    const session = getOrCreateBrailleSession(sessionKey, barWidth);
    const dotRanks = session.ranks;

    const currentTick = typeof tick === "number" ? tick : Math.floor(Date.now() / 60);

    let bar = "";
    for (let cell = 0; cell < barWidth; cell++) {
      const col0 = cell * 2;
      const col1 = cell * 2 + 1;
      let mask = 0;
      let activeBits = 0;

      for (const [dx, dy, bit] of DOT_ORDER) {
        const gx = dx === 0 ? col0 : col1;
        const gy = dy;
        if (dotRanks[gx * 4 + gy] < activeDots) {
          mask |= bit;
          activeBits++;
        }
      }

      if (mask > 0) {
        if (hasError) {
          bar += `\x1b[38;2;239;68;68m${String.fromCharCode(0x2800 + mask)}\x1b[0m`;
        } else {
          const wave = Math.sin(cell * 0.45 - currentTick * 0.35);
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
        }
      } else {
        bar += "\u2800";
      }
    }

    const percent = Math.min(
      100,
      Math.max(0, (clampedCurrent / validTotal) * 100),
    ).toFixed(0);

    return `\x1b[1m${label}\x1b[0m  \x1b[90m[\x1b[0m${bar}\x1b[90m]\x1b[0m  \x1b[38;2;255;180;60m${percent}%\x1b[0m \x1b[90m(${current}/${total})\x1b[0m`;
  }

  export function CustomBrailleDotBar(
    current: number,
    total: number,
    label = "",
    barWidth = 24,
    arg5?: number | string,
    arg6?: string | number | boolean,
    arg7?: boolean | string,
    arg8?: string,
  ): void {
    let tick: number | undefined;
    let sessionId: string | number | undefined;
    let hasError = false;
    let errorMessage: string | undefined;

    // Flexible argument handling supporting both (current, total, label, barWidth, sessionId, hasError, errorMessage)
    // and legacy (current, total, label, barWidth, tick, sessionId, hasError, errorMessage)
    if (typeof arg5 === "number") {
      tick = arg5;
      sessionId = typeof arg6 === "string" || typeof arg6 === "number" ? arg6 : undefined;
      hasError = Boolean(arg7);
      errorMessage = arg8;
    } else if (arg5 === undefined && typeof arg6 === "string") {
      sessionId = arg6;
      hasError = Boolean(arg7);
      errorMessage = arg8;
    } else {
      sessionId = typeof arg5 === "string" ? arg5 : undefined;
      hasError = Boolean(arg6);
      errorMessage = typeof arg7 === "string" ? arg7 : undefined;
    }

    const sessionKey = String(sessionId ?? label ?? "default");

    if (isDebugRunMode()) {
      writeDebugLine(formatPlainProgress(current, total, label));
      if (hasError) {
        handleLoaderFail(errorMessage || "Scrape operation halted", sessionKey, "dotbar");
      } else if (current >= total) {
        handleLoaderStop(undefined, sessionKey, "dotbar");
      }
      return;
    }

    const output = formatCustomBrailleBar(
      current,
      total,
      label,
      barWidth,
      sessionKey,
      hasError,
      undefined,
      tick,
    );

    if (hasError) {
      resetBrailleBarSession(sessionKey);
      renderTwoLineOutput(output, sessionKey, "dotbar", true);
      handleLoaderFail(
        errorMessage || "Scrape operation halted",
        sessionKey,
        "dotbar",
      );
      return;
    }

    renderTwoLineOutput(output, sessionKey, "dotbar", true);

    if (current >= total) {
      resetBrailleBarSession(sessionKey);
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
    let tick = 0;
    const barId = String(sessionId ?? label ?? `dotbar-${++loaderSeq}`);

    if (isDebugRunMode()) {
      writeDebugLine(formatPlainProgress(cur, tot, curLabel));

      return {
        update(newCurrent: number, newTotal?: number, newLabel?: string) {
          if (isFinished) return;
          cur = newCurrent;
          if (typeof newTotal === "number") tot = newTotal;
          if (newLabel) curLabel = newLabel;
          writeDebugLine(formatPlainProgress(cur, tot, curLabel));
        },
        stop(completedText?: string) {
          if (isFinished) return;
          isFinished = true;
          handleLoaderStop(completedText, barId, "dotbar");
        },
        fail(errorText?: string) {
          if (isFinished) return;
          isFinished = true;
          handleLoaderFail(errorText || "Scrape operation halted", barId, "dotbar");
        },
      };
    }

    const render = (hasErr = false, errMsg?: string) => {
      if (isFinished) return;
      tick++;
      const output = formatCustomBrailleBar(
        cur,
        tot,
        curLabel,
        barWidth,
        barId,
        hasErr,
        undefined,
        tick,
      );
      renderTwoLineOutput(output, barId, "dotbar", true);
      if (hasErr) {
        handleLoaderFail(errMsg || "Scrape operation halted", barId, "dotbar");
      }
    };

    const animTimer = setInterval(() => {
      render(false);
    }, 80);

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
        clearInterval(animTimer);
        resetBrailleBarSession(barId);
        handleLoaderStop(completedText, barId, "dotbar");
      },
      fail(errorText?: string) {
        if (isFinished) return;
        isFinished = true;
        clearInterval(animTimer);
        render(true, errorText);
        resetBrailleBarSession(barId);
      },
    };
  }

  export const TerminalProgress = {
    custom: {
      startSpinner: startSpinningLoader,
      renderBrailleBar: CustomBrailleDotBar,
      resetSession: resetBrailleBarSession,
    },
  };

  export default TerminalProgress;
