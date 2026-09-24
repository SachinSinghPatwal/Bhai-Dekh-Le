import winston from "winston";

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
 *
 * Console-only — no files are written to disk.
 */

const log = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || "debug",
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
}) as AppLogger;

export default log;
