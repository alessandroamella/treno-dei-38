"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRawError = void 0;
var isRawError = function (obj) {
    var _a;
    if (!obj || typeof obj !== "object") {
        return false;
    }
    var _obj = obj;
    return typeof ((_a = _obj === null || _obj === void 0 ? void 0 : _obj.arrival) === null || _a === void 0 ? void 0 : _a.error) === "string";
};
exports.isRawError = isRawError;
