export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "gamepool-api",
    ...context,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

export function logRequest(input: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId?: string;
  userId?: string;
}) {
  logger.info("http_request", {
    http: {
      method: input.method,
      path: input.path,
      status: input.status,
      durationMs: input.durationMs,
    },
    requestId: input.requestId,
    userId: input.userId,
  });
}

export function logError(input: {
  message: string;
  error: unknown;
  requestId?: string;
  path?: string;
}) {
  const err =
    input.error instanceof Error
      ? { name: input.error.name, message: input.error.message, stack: input.error.stack }
      : { message: String(input.error) };

  logger.error(input.message, {
    error: err,
    requestId: input.requestId,
    path: input.path,
  });
}
