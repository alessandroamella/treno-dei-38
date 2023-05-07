import express from "express";
import path, { join } from "path";
import dotenv from "dotenv";

import { logger } from "./utils/logger";
import Trenitalia from "./Trenitalia";
import Seta from "./Seta";
import { Server } from "socket.io";
import Position from "./Position";
import Tper, { TperStop } from "./Tper";
import StopSearcher from "./StopSearcher";
import Corsa from "./Seta/Corsa";
import { AgencyType, isAgencyType, isAgencyTypeCombined } from "./AgencyType";
import moment from "moment";

import "dotenv/config";
import News from "./interfaces/News";

dotenv.config();

const s = new Seta();
const t = new Tper();
const stopSearcher = new StopSearcher(s, t);

const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "./index.html"));
});

app.get("/treno", async (req, res) => {
    let treno = req.query.treno;
    if (typeof treno !== "string") treno = "2463";

    let idorigine = req.query.idorigine;
    if (typeof idorigine !== "string") idorigine = undefined;

    const t = new Trenitalia(treno, idorigine);
    const c = await t.caricaDatiTreno();
    if (!c) {
        logger.debug("c false");
        return res.sendStatus(400);
    }

    const d = await t.caricaInfoViaggio();
    if (!Trenitalia.isStatoTreno(d)) {
        logger.warn("d !isStatoTreno");
        return res.sendStatus(500);
    }
    return res.json(Trenitalia.formattaOutput(d));
});

app.get("/codicestazione/:nome", async (req, res) => {
    const s = await Trenitalia.stazionePerNome(req.params.nome);
    return s ? res.json(s.slice(0, 10)) : res.sendStatus(500);
});

app.get("/tabellone/:id", async (req, res) => {
    const t = await Trenitalia.tabellone(req.params.id);
    return t ? res.json(t) : res.sendStatus(500);
});

app.get("/fermata/:fermata", async (req, res) => {
    const { fermata } = req.params;
    const { agency } = req.query;

    if (typeof fermata !== "string") {
        return res.sendStatus(400);
    }

    const stopsStrArr = fermata.split(",").map(e => e.trim());
    const stops = await stopSearcher.findMultipleById({
        q: stopsStrArr,
        agency: isAgencyType(agency) ? agency : undefined
    });

    logger.debug("Cercato fermata " + stopsStrArr);
    logger.debug(JSON.stringify(stops));

    return res.json(stops[0] || null);
});

app.get("/fermatadanome", async (req, res) => {
    const { q } = req.query;

    if (typeof q !== "string") {
        return res.sendStatus(400);
    }

    const stops = await stopSearcher.findByName({
        q,
        limit: 20,
        sort: true,
        removeDuplicatesByName: true
    });

    logger.debug(`Ricerca fermata fuzzy ${stops.length} risultati con q=${q}`);

    return res.json(
        <{ nome: string; id: string }[]>stops.map(
            e =>
                <{ nome: string; id: string }>{
                    nome: e.stopName,
                    id: e.stops
                        .map(
                            f =>
                                `${f.agency},${f.stopId}${
                                    (f as Omit<TperStop, "stopName">).routes
                                        ? `,${(
                                              f as Omit<TperStop, "stopName">
                                          ).routes.join(",")}`
                                        : ""
                                }`
                        )
                        .join(";")
                }
        )
    );
});

app.get("/bus", async (req, res) => {
    const { q, agency } = req.query;

    if (typeof q !== "string") {
        return res.sendStatus(400);
    }

    const stopsStrArr = q.split(",").map(e => e.trim());

    logger.debug("Cerco fermate: " + stopsStrArr);

    const stops = await stopSearcher.findMultipleById({
        q: stopsStrArr,
        agency: isAgencyType(agency) ? agency : undefined
    });

    const corse: (Corsa & { agency: AgencyType })[] = [];

    try {
        for (const stop of stops) {
            const c =
                stop.agency === "seta"
                    ? await s.caricaCorse(stop.stopId)
                    : stop.agency === "tper"
                    ? await t.caricaCorse(stop.stopId)
                    : null;
            if (c) {
                corse.push(...c.map(e => ({ ...e, agency: stop.agency })));
            } else {
                logger.warn(
                    "c falsy in busdanome with stop " + JSON.stringify(stop)
                );
            }
        }
    } catch (err) {
        logger.error("/bus err");
        logger.error(err);
        return res.sendStatus(500);
    }

    corse.sort(
        (a, b) =>
            moment(a.arrivoTempoReale || a.arrivoProgrammato, "HH:mm").unix() -
            moment(b.arrivoTempoReale || b.arrivoProgrammato, "HH:mm").unix()
    );

    return res.json(corse.slice(0, 10));
});

app.get("/news", async (req, res) => {
    const { agency, limit } = req.query;

    const news: News[] = [];

    try {
        if (!agency || (isAgencyTypeCombined(agency) && agency === "seta")) {
            const _s = await s.getNews();
            if (_s) news.push(..._s);
            else throw new Error("SETA news null");
        }
        if (!agency || (isAgencyTypeCombined(agency) && agency === "tper")) {
            const _t = await t.getNews();
            if (_t) news.push(..._t);
        }
        if (
            !agency ||
            (isAgencyTypeCombined(agency) && agency === "trenitalia")
        ) {
            const _tt = await Trenitalia.getNews();
            if (_tt) news.push(..._tt);
        }

        news.sort((a, b) => b.date.valueOf() - a.date.valueOf());

        return res.json(
            news.slice(
                0,
                typeof limit === "string" && /^\+?\d+$/.test(limit)
                    ? Number(limit)
                    : 32
            )
        );
    } catch (err) {
        logger.error("/news err");
        logger.error(err);
        return res.sendStatus(500);
    }
});

app.get("/geolocation/:password", (req, res) => {
    const { PASSWORD } = process.env;
    if (!PASSWORD) {
        logger.error("Env PASSWORD non specificata");
        return res.sendStatus(500);
    }

    const { password } = req.params;
    if (password !== PASSWORD) {
        logger.debug("Password sbagliata");
        return res.sendStatus(401);
    }

    res.sendFile(path.join(process.cwd(), "./geolocation.html"));
});

app.all("*", (req, res) => {
    res.redirect("/");
});

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, () => {
    logger.info("Server started on port " + PORT);
});

let lastPosition: Position;

const io = new Server(server);

io.on("connection", socket => {
    logger.debug("Connesso al socket " + socket.id);

    if (lastPosition) socket.emit("position", lastPosition);

    socket.on("position", ({ password, position }) => {
        const { PASSWORD } = process.env;
        if (!PASSWORD) {
            logger.error("Env PASSWORD non specificata");
            return socket.emit("error", "Errore del server");
        } else if (password !== PASSWORD) {
            logger.debug("Socket password errata");
            return socket.emit("error", "Password errata");
        } else if (
            !position ||
            typeof position !== "object" ||
            typeof position.lat !== "number" ||
            typeof position.lon !== "number"
        ) {
            return socket.emit("error", "Posizione non valida");
        }

        lastPosition = {
            lat: position.lat,
            lon: position.lon,
            date: new Date().valueOf()
        };

        logger.debug(`Received lat: ${position.lat}, lon: ${position.lon}`);
        io.emit("position", lastPosition);
        socket.emit("ok-pos", new Date().valueOf());
    });
});
