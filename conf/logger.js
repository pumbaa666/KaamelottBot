// https://stackoverflow.com/questions/46658040/winston-is-not-writing-logs-to-files
const winston = require('winston');

const env = process.env.NODE_ENV;
const now = new Date().toISOString();
const datePattern = "DD-MM-yyyy";
const logFormat = winston.format.printf(function(info) {
    return `${now}-${info.level}: ${JSON.stringify(info.message, null, 4)}\n`;
});

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            name: 'error-file',
            filename: 'logs/kaamelott-bot.errors',
            level: 'error',
            json: false,
        }),

        new (require('winston-daily-rotate-file'))({
            filename: 'logs/kaamelott-bot.log',
            level: env === 'development' ? 'debug' : 'info',
            timestamp: now,
            datePattern: datePattern,
            prepend: true,
            format: logFormat,
        }),

        new (require('winston-daily-rotate-file'))({
            filename: 'logs/kaamelott-bot.json',
            level: env === 'development' ? 'debug' : 'info',
            timestamp: now,
            datePattern: datePattern,
            prepend: true,
            json: true,
        }),

        new (require('winston-daily-rotate-file'))({
            filename: 'logs/kaamelott-bot.pretty',
            level: env === 'development' ? 'debug' : 'info',
            timestamp: now,
            datePattern: datePattern,
            prepend: true,
            format: winston.format.combine(winston.format.colorize(), logFormat),
        }),

        // https://stackoverflow.com/questions/17963406/winston-doesnt-pretty-print-to-console
        new (winston.transports.Console)({
            name: "info-console",
            level: "debug",
            format: winston.format.combine(winston.format.colorize(), logFormat),
        })
    ],
    exitOnError: false,
  });

module.exports = logger;