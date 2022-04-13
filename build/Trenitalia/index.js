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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var logger_1 = require("../logger");
var Trenitalia = /** @class */ (function () {
    function Trenitalia(numeroTreno) {
        this.stazionePartenza = null;
        this.dataPartezaMs = null;
        this.numeroTreno = numeroTreno;
    }
    Trenitalia.prototype.caricaDatiTreno = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var data, err_1, _b, numeroTreno, stazionePartenza, dataPartenzaMs;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.stazionePartenza && this.dataPartezaMs) {
                            logger_1.logger.warn("caricaDatiTreno dati già caricati");
                            return [2 /*return*/, true];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axios_1.default.get("http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/" +
                                this.numeroTreno)];
                    case 2:
                        data = (_c.sent()).data;
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _c.sent();
                        if (axios_1.default.isAxiosError(err_1)) {
                            logger_1.logger.warn(((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _a === void 0 ? void 0 : _a.data) || err_1);
                        }
                        logger_1.logger.error(err_1);
                        return [2 /*return*/, false];
                    case 4:
                        if (!data) {
                            logger_1.logger.error("Errore nel caricamento dati treno " + this.numeroTreno);
                            return [2 /*return*/, false];
                        }
                        _b = data
                            .trim()
                            .split("|")[1]
                            .split("-"), numeroTreno = _b[0], stazionePartenza = _b[1], dataPartenzaMs = _b[2];
                        this.stazionePartenza = stazionePartenza;
                        this.dataPartezaMs = dataPartenzaMs;
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Bisogna avere prima chiamato e atteso caricaDatiTreno()
     */
    Trenitalia.prototype.caricaInfoViaggio = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.stazionePartenza || !this.dataPartezaMs) {
                            logger_1.logger.error("Bisogna chiamare caricaDatiTreno() prima di invocare caricaInfoViaggio()");
                        }
                        return [4 /*yield*/, axios_1.default.get("http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/andamentoTreno/".concat(this.stazionePartenza, "/").concat(this.numeroTreno, "/").concat(this.dataPartezaMs))];
                    case 1:
                        data = (_a.sent()).data;
                        if (!Trenitalia.isStatoTreno(data)) {
                            logger_1.logger.error("Errore nel caricamento info viaggio del treno " +
                                this.numeroTreno);
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    Trenitalia.tabellone = function (codiceStazione) {
        return __awaiter(this, void 0, void 0, function () {
            var data, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/partenze/".concat(codiceStazione, "/").concat(new Date()))];
                    case 1:
                        data = (_a.sent()).data;
                        return [2 /*return*/, data
                                .map(function (e) { return Trenitalia.formattaOutput(e); })
                                .map(function (_a) {
                                var origine = _a.origine, rest = __rest(_a, ["origine"]);
                                return rest;
                            })
                                .filter(function (e) { return e.treno.toLowerCase().includes("reg"); })];
                    case 2:
                        err_2 = _a.sent();
                        logger_1.logger.error("Errore nel caricamento tabellone");
                        logger_1.logger.error(err_2);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Trenitalia.formattaOutput = function (statoTreno) {
        var _a;
        return {
            treno: statoTreno.compNumeroTreno,
            origine: statoTreno.origine,
            destinazione: statoTreno.destinazione,
            fermate: (_a = statoTreno.fermate) === null || _a === void 0 ? void 0 : _a.map(function (f) { return ({
                stazione: f.stazione,
                id: f.id,
                dataProgrammata: f.partenza_teorica || f.programmata,
                dataEffettiva: f.partenzaReale || f.arrivoReale,
                transitato: f.actualFermataType.toString() === "1"
            }); }),
            ritardo: statoTreno.ritardo,
            oraUltimoRilevamento: statoTreno.oraUltimoRilevamento,
            stazioneUltimoRilevamento: statoTreno.stazioneUltimoRilevamento !== "--"
                ? statoTreno.stazioneUltimoRilevamento
                : null
        };
    };
    Trenitalia.stazionePerNome = function (nome) {
        return __awaiter(this, void 0, void 0, function () {
            var data, stazioni, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/autocompletaStazione/" +
                                nome)];
                    case 1:
                        data = (_a.sent()).data;
                        stazioni = data
                            .trim()
                            .split("\n")
                            .map(function (s) { return s.trim().split("|"); });
                        return [2 /*return*/, stazioni.map(function (s) { return ({ nome: s[0], id: s[1] }); })];
                    case 2:
                        err_3 = _a.sent();
                        logger_1.logger.error("Errore nella ricerca stazione");
                        logger_1.logger.error(err_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Trenitalia.isStatoTreno = function (v) {
        return (!!v && typeof v === "object" && Array.isArray(v.fermate));
    };
    return Trenitalia;
}());
exports.default = Trenitalia;
