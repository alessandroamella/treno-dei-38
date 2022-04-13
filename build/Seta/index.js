"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var moment_1 = __importDefault(require("moment"));
var logger_1 = require("../logger");
var RawError_1 = require("./RawError");
var Seta = /** @class */ (function () {
    function Seta() {
    }
    Seta.prototype.caricaCorse = function (stopId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data, err_1, corse, _loop_1, out_i_1, i;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("https://avm.setaweb.it/SETA_WS/services/arrival/" + stopId)];
                    case 1:
                        data = (_b.sent()).data;
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _b.sent();
                        if (axios_1.default.isAxiosError(err_1)) {
                            logger_1.logger.warn(((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) || err_1);
                        }
                        logger_1.logger.error(err_1);
                        return [2 /*return*/, null];
                    case 3:
                        if (!data) {
                            logger_1.logger.error("SETA no data for stop " + stopId);
                            return [2 /*return*/, null];
                        }
                        else if ((0, RawError_1.isRawError)(data)) {
                            logger_1.logger.info("SETA raw error for stop " + stopId);
                            return [2 /*return*/, null];
                        }
                        corse = data.arrival.services.map(function (s) { return ({
                            id: s.codice_corsa,
                            linea: s.service,
                            destinazione: s.destination,
                            arrivoProgrammato: s.arrival,
                            arrivoTempoReale: s.type === "realtime" ? s.arrival : null,
                            busNum: s.busnum || null,
                            postiTotali: s.posti_totali || null,
                            numPasseggeri: s.num_passeggeri || null,
                            prossimaFermata: s.next_stop || null
                        }); });
                        _loop_1 = function (i) {
                            if (corse[i].arrivoTempoReale) {
                                var j = corse.findIndex(function (c) { return c.id === corse[i].id && !c.arrivoTempoReale; });
                                if (j !== -1) {
                                    logger_1.logger.debug("Rimossa corsa j=".concat(j, " (").concat(corse[j].id, "; destinazione=").concat(corse[j].destinazione, ")"));
                                    corse[i].arrivoProgrammato = corse[j].arrivoProgrammato;
                                    corse.splice(j, 1);
                                    i--;
                                }
                            }
                            out_i_1 = i;
                        };
                        for (i = 0; i < corse.length; i++) {
                            _loop_1(i);
                            i = out_i_1;
                        }
                        corse.sort(function (a, b) {
                            return (0, moment_1.default)(a.arrivoTempoReale || a.arrivoProgrammato, "HH:mm").unix() -
                                (0, moment_1.default)(b.arrivoProgrammato || b.arrivoProgrammato, "HH:mm").unix();
                        });
                        return [2 /*return*/, corse];
                }
            });
        });
    };
    return Seta;
}());
exports.default = Seta;
