import winston from "winston";
import path from "path";
import fs from "fs";

/*
 * ===========================================
 * CUSTOM LOG LEVELS
 * ===========================================
 *
 * Winston uses numeric priority (lower = higher priority).
 * We define semantic levels that map to distinct colors
 * in the console output.
 */

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    debug: 4,
  },

  colors: {
    error: "red",
    warn: "yellow",
    success: "green",
    info: "blue",
    debug: "grey",
  },
};

/*
 * Register our custom colors with Winston
 * so that colorize() knows how to render them.
 */
winston.addColors(customLevels.colors);

/*
 * ===========================================
 * TYPE AUGMENTATION
 * ===========================================
 *
 * Winston's built-in Logger type does not
 * include our custom 'success' level.
 * We extend it so TypeScript recognizes
 * log.success() calls.
 */

interface AppLogger extends winston.Logger {
  success: winston.LeveledLogMethod;
}

/*
 * ===========================================
 * LOG DIRECTORY
 * ===========================================
 */

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/*
 * ===========================================
 * FILE FORMAT (JSON, no ANSI codes)
 * ===========================================
 */

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

/*
 * ===========================================
 * CONSOLE FORMAT (Full-line colorization)
 * ===========================================
 *
 * { all: true } colors the ENTIRE line,
 * not just the level tag.
 */

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  }),
  winston.format.colorize({ all: true }),
);

/*
 * ===========================================
 * SINGLETON LOGGER INSTANCE
 * ===========================================
 */

const log = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || "debug",
  format: fileFormat,
  transports: [
    /*
     * Error-only log file.
     */
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5_242_880, // 5 MB
      maxFiles: 5,
    }),

    /*
     * Combined log file (all levels).
     */
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5_242_880,
      maxFiles: 5,
    }),
  ],
}) as AppLogger;

/*
 * Console transport is always added so workers
 * (child processes) also get colored output.
 */
log.add(
  new winston.transports.Console({
    format: consoleFormat,
  }),
);

export default log;
