"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerStream = exports.logger = void 0;
var path_1 = __importDefault(require("path"));
var winston_1 = require("winston");
var combine = winston_1.format.combine, timestamp = winston_1.format.timestamp, colorize = winston_1.format.colorize, errors = winston_1.format.errors, label = winston_1.format.label, printf = winston_1.format.printf, splat = winston_1.format.splat, json = winston_1.format.json, metadata = winston_1.format.metadata;
var combinedLogsFile = path_1.default.join("./logs/combined.log");
var errorsLogsFile = path_1.default.join("./logs/error.log");
var errorStackFormat = (0, winston_1.format)(function (info) {
    if (info instanceof Error) {
        return __assign(__assign({}, info), {
            stack: info.stack,
            message: info.message
        });
    }
    return info;
});
var prettyJson = printf(function (info) {
    if (info.message.constructor === Object) {
        info.message = JSON.stringify(info.message, null, 4);
    }
    return "".concat(info.level, ": ").concat(info.message);
});
exports.logger = (0, winston_1.createLogger)({
    // change level if in dev environment versus production
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(label({ label: path_1.default.basename(((_a = require.main) === null || _a === void 0 ? void 0 : _a.filename) || "") }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errorStackFormat(), metadata({ fillExcept: ["message", "level", "timestamp", "label"] })),
    transports: [
        new winston_1.transports.Console({
            format: combine(colorize(), printf(function (info) {
                return "".concat(info.timestamp, " ").concat(info.level, " [").concat(info.label, "]: ").concat(info.message);
            }), errorStackFormat(), splat(), prettyJson)
        }),
        new winston_1.transports.File({
            filename: combinedLogsFile,
            format: combine(json(), errors(), errorStackFormat(), json(), timestamp()),
            maxsize: 10000000
        }),
        new winston_1.transports.File({
            filename: errorsLogsFile,
            level: "error",
            format: combine(json(), errors(), errorStackFormat(), json(), timestamp()),
            maxsize: 20000000
        })
    ]
});
var LoggerStream = /** @class */ (function () {
    function LoggerStream() {
    }
    LoggerStream.prototype.write = function (message, encoding) {
        exports.logger.info(message);
    };
    return LoggerStream;
}());
exports.LoggerStream = LoggerStream;
