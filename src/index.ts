import express from "express";
import path from "path";
import dotenv from "dotenv";
import { logger } from "./logger";
import Trenitalia from "./Trenitalia";
import Seta from "./Seta";

dotenv.config();

const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "./index.html"));
});

app.get("/treno", async (req, res) => {
    let treno = req.query.treno;
    if (typeof treno !== "string") treno = "2463";

    const t = new Trenitalia(treno);
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

app.all("*", (req, res) => {
    res.redirect("/");
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
    logger.info("Server started on port " + PORT);
});
