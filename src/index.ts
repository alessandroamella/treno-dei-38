import express from "express";
import path from "path";
import dotenv from "dotenv";

import { logger } from "./logger";
import Trenitalia from "./Trenitalia";
import Seta from "./Seta";
import { Server } from "socket.io";
import Position from "./Position";

dotenv.config();

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

app.get("/stazione/:nome", async (req, res) => {
    const s = await Trenitalia.stazionePerNome(req.params.nome);
    return s ? res.json(s.slice(0, 10)) : res.sendStatus(500);
});

app.get("/tabellone/:id", async (req, res) => {
    const t = await Trenitalia.tabellone(req.params.id);
    return t ? res.json(t) : res.sendStatus(500);
});

app.get("/bus", async (req, res) => {
    const { fermata } = req.query;

    if (typeof fermata !== "string") {
        return res.sendStatus(400);
    }

    const s = new Seta();
    const c = await s.caricaCorse(fermata);
    return c ? res.json(c) : res.sendStatus(500);
});

app.get("/fermata/:fermata", async (req, res) => {
    const { fermata } = req.params;

    if (typeof fermata !== "string") {
        return res.sendStatus(400);
    }

    const s = new Seta();
    const f = await s.cercaFermata(fermata);
    return f ? res.json(f) : res.sendStatus(404);
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
