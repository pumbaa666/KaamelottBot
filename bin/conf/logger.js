"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var winston = require('winston');
var env = process.env.NODE_ENV;
var now = new Date().toISOString();
var datePattern = "DD-MM-yyyy";
var logFormat = winston.format.printf(function (info) {
    return "".concat(now, "-").concat(info.level, ": ").concat(JSON.stringify(info.message, null, 4), "\n");
});
exports.logger = winston.createLogger({
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
        new (winston.transports.Console)({
            name: "info-console",
            level: "debug",
            format: winston.format.combine(winston.format.colorize(), logFormat),
        })
    ],
    exitOnError: false,
});
