import winston from "winston";
import { handleLogWithActiveLoader } from "./TerminalProgress.js";

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

winston.addColors(customLevels.colors);

interface AppLogger extends winston.Logger {
  success: winston.LeveledLogMethod;
}

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

class PinnedConsoleTransport extends winston.transports.Console {
  log(info: any, callback?: () => void) {
    const msg = String(info[Symbol.for("message")] ?? info.message ?? "");
    handleLogWithActiveLoader(msg);
    if (typeof callback === "function") {
      callback();
    }
  }
}

const log = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || "debug",
  transports: [
    new PinnedConsoleTransport({
      format: consoleFormat,
    }),
  ],
}) as AppLogger;

export default log;
