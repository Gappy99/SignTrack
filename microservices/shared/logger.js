/**
 * Logger Utility
 * Proporciona logging consistente en todos los microservicios
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'
};

class Logger {
  constructor(serviceName, logLevel = 'INFO') {
    this.serviceName = serviceName;
    this.logLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.INFO;
  }

  _formatTimestamp() {
    return new Date().toISOString();
  }

  _formatMessage(level, message, meta) {
    const timestamp = this._formatTimestamp();
    const color = COLORS[level] || '';
    const reset = COLORS.RESET;

    let output = `${color}[${timestamp}] [${this.serviceName}] [${level}] ${message}${reset}`;

    if (meta && Object.keys(meta).length > 0) {
      output += '\n' + JSON.stringify(meta, null, 2);
    }

    return output;
  }

  error(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      console.error(this._formatMessage('ERROR', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      console.warn(this._formatMessage('WARN', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      console.log(this._formatMessage('INFO', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      console.log(this._formatMessage('DEBUG', message, meta));
    }
  }

  /**
   * Log de solicitud HTTP
   */
  httpRequest(req, res, duration) {
    const status = res.statusCode;
    const color = status >= 500 ? COLORS.ERROR : status >= 400 ? COLORS.WARN : COLORS.INFO;

    const message = `${req.method} ${req.path} ${status} ${duration}ms`;
    const meta = {
      method: req.method,
      path: req.path,
      status,
      duration,
      userAgent: req.get('user-agent')
    };

    console.log(`${color}[${this._formatTimestamp()}] [${this.serviceName}] [HTTP] ${message}${COLORS.RESET}`);
  }

  /**
   * Log de error capturado
   */
  captureError(error, context = {}) {
    this.error(error.message, {
      code: error.code,
      stack: error.stack,
      context
    });
  }
}

export function createLogger(serviceName, logLevel = 'INFO') {
  return new Logger(serviceName, logLevel);
}

export { Logger };
