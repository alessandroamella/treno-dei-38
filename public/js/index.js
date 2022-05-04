// const { default: axios } = require("axios");

// const a = document.getElementById("treno");

let socket;

const modal = new bootstrap.Modal(document.querySelector(".main-modal"));
const stazioneModal = new bootstrap.Modal(
    document.querySelector(".stazione-modal")
);
const gpsModal = new bootstrap.Modal(document.querySelector(".gps-modal"));
document.querySelector(".gps-modal").addEventListener("hidden.bs.modal", () => {
    disconnettiGps();
});

const loadingHTML = `
    <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
`;

async function treno(numTreno, idOrigine) {
    const numTrenoValue =
        numTreno || document.getElementById("numero-treno").value || "2463";

    document.getElementById("treno-info").style.display = "none";
    document.getElementById("treno-loading").style.display = "block";
    document.getElementById("fermate").style.display = "none";

    let data;
    try {
        data = (
            await axios.get("/treno", {
                params: {
                    treno: numTrenoValue,
                    idorigine: idOrigine || "S05037"
                }
            })
        ).data;
    } catch (err) {
        document.getElementById("treno-info").style.display = "block";
        document.getElementById("treno-loading").style.display = "none";
        document.getElementById("fermate").style.display = "block";
        if (err.response?.status === 400) {
            return alert(`Treno "${numTrenoValue}" non valido`);
        }
        return alert(err.response?.data || "Errore sconosciuto");
    }

    console.log(data);

    const {
        treno,
        fermate,
        ritardo,
        oraUltimoRilevamento,
        stazioneUltimoRilevamento
    } = data;

    document.getElementById("treno").textContent = treno;

    document.getElementById("ritardo").textContent = `${
        ritardo >= 0 ? "+" + ritardo : ritardo
    } minut${ritardo === 1 ? "o" : "i"}`;

    document.getElementById("ora-ultimo-rilevamento").textContent =
        oraUltimoRilevamento
            ? _formattaData(oraUltimoRilevamento)
            : "non so quando";

    document.getElementById("stazione-ultimo-rilevamento").textContent =
        stazioneUltimoRilevamento || "non so dove";

    document.getElementById("treno-info").style.display = "block";

    document.getElementById("fermate").innerHTML = "";
    for (const f of fermate) {
        const li = document.createElement("li");
        li.classList.add("list-group-item", "btn", "text-start");

        li.dataset.id = f.id;
        li.dataset.nome = f.stazione;
        li.addEventListener("click", () => {
            tabellone({ id: li.dataset.id, nome: li.dataset.nome });
        });

        const p = document.createElement("p");
        p.textContent = f.stazione;
        p.classList.add("m-0");

        const span = document.createElement("span");
        span.textContent = _formattaData(f.dataEffettiva || f.dataProgrammata);
        span.style.float = "right";
        p.appendChild(span);

        if (
            f.dataEffettiva &&
            _formattaData(f.dataProgrammata) !== _formattaData(f.dataEffettiva)
        ) {
            const span = document.createElement("span");
            span.textContent = _formattaData(f.dataProgrammata);
            span.style.float = "right";
            span.style.textDecoration = "line-through";
            span.style.fontWeight = 400;
            span.style.marginRight = "0.25rem";
            p.appendChild(span);
        }

        li.appendChild(p);

        if (f.transitato) {
            li.style.fontWeight = 600;
            li.style.backgroundColor = "#e9f5df";
        } else li.style.backgroundColor = "#f5dfdf";

        document.getElementById("fermate").appendChild(li);
    }

    document.getElementById("fermate").style.display = "block";
    document.getElementById("treno-loading").style.display = "none";
    document.getElementById("numero-treno").value = numTrenoValue;

    document.getElementById("treno-ultimo-aggiornamento").style.display =
        "block";
    document.getElementById("treno-update").textContent = _formattaData(
        new Date()
    );

    document.getElementById("treno-card").scrollIntoView();
    _refresh();
}

/**
 * @typedef {Object} Corsa
 * @property {string} id ID corsa
 * @property {string} linea Linea
 * @property {string} destinazione Capolinea
 * @property {string} arrivoProgrammato
 * @property {string | null} arrivoTempoReale
 * @property {string | null} busNum Codice bus
 * @property {number | null} postiTotali
 * @property {number | null} numPasseggeri
 * @property {string | null} prossimaFermata Nome prossima fermata
 */

const busInterval = {};

/**
 * @param {string} fermata
 */
async function bus(cardNum = 1, fermata) {
    document.getElementById(`bus-loading-${cardNum}`).style.display = "block";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display = "none";

    let fermataValue =
        fermata ||
        document.getElementById(`fermata-bus-${cardNum}`)?.value?.trim() ||
        "MO6133";

    /** @type {Corsa[]} */
    let data;
    try {
        data = (
            await axios.get("/bus", {
                params: {
                    fermata: fermataValue
                }
            })
        ).data;
        if (!data) throw new Error("non worka");
    } catch (err) {
        document.getElementById(`bus-loading-${cardNum}`).style.display =
            "none";
        document.getElementById(`bus-corse-card-${cardNum}`).style.display =
            "none";
        return alert(err.response?.data || "Errore sconosciuto");
    }

    console.log(data);

    const corseElem = document.getElementById(`bus-corse-${cardNum}`);
    corseElem.innerHTML = "";

    for (const c of data) {
        const dataArrivo = _parseHHMM(
            c.arrivoTempoReale || c.arrivoProgrammato
        );

        const card = document.querySelector(".bus-card").cloneNode(true);
        card.style.display = "block";
        card.querySelector(".bus-linea").textContent = c.linea;
        card.querySelector(".bus-destinazione").textContent = c.destinazione;
        card.querySelector(".bus-temporeale").style.display = c.arrivoTempoReale
            ? "block"
            : "none";
        card.querySelector(".bus-arrivo").textContent =
            dateFns.differenceInMinutes(
                dataArrivo,
                _parseHHMM(_formattaData(new Date(), false))
            ) +
            "m" +
            (!c.arrivoTempoReale ? "*" : "");

        card.dataset.bsToggle = "tooltip";
        card.dataset.bsTrigger = "hover";
        card.dataset.bsHtml = true;
        card.title = "";

        if (c.busNum) {
            card.title += "Bus " + c.busNum;
            card.title += "<br>Programmato: " + c.arrivoProgrammato;
            card.title += "<br>Tempo reale: " + c.arrivoTempoReale;
            if (c.numPasseggeri) {
                card.title += `<br>Passeggeri: ${c.numPasseggeri}/${c.postiTotali}`;
            } else if (c.postiTotali) {
                card.title += "<br>Posti totali: " + c.postiTotali;
            }

            // card.style.cursor = "pointer";
            card.classList.add("btn");
            card.style.textAlign = "left";

            card.addEventListener("click", () => {
                document.querySelector(
                    ".main-modal-title"
                ).textContent = `Bus ${c.busNum} - Linea ${c.linea} per ${c.destinazione}`;
                document.querySelector(
                    ".main-modal-body"
                ).innerHTML = `<iframe class="bus-iframe" src="https://wimb.setaweb.it/qm/index.html?id=${c.busNum}" title="Localizzazione bus ${c.busNum}"></iframe>`;
                modal.show();
            });
        } else {
            card.title += "Programmato: " + c.arrivoProgrammato;
            card.classList.remove("btn");
        }

        if (c.prossimaFermata) {
            card.title += "<br>Prossima fermata: " + c.prossimaFermata;
        }
        corseElem.appendChild(card);
    }

    if (data.length === 0) {
        const p = document.createElement("p");
        p.textContent = "Nessuna corsa nei prossimi 90 minuti";
        p.classList.add("py-2", "mb-0");
        p.style.textAlign = "center";
        corseElem.appendChild(p);
    }

    document.getElementById(`bus-loading-${cardNum}`).style.display = "none";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display =
        "block";
    document.getElementById(`fermata-bus-${cardNum}`).value = fermataValue;

    document.getElementById(`bus-update-${cardNum}`).textContent =
        _formattaData(new Date());

    document.getElementById(`bus-${cardNum}-card`).scrollIntoView();
    _refresh();

    await _infoFermata(fermata, cardNum);

    if (busInterval[cardNum]) {
        clearInterval(busInterval[cardNum]);
    }
    busInterval[cardNum] = setInterval(() => bus(cardNum, fermata), 30000);
}

/**
 * @typedef Fermata
 * @property {string} stopId
 * @property {string} stopName
 * @property {number} coordX
 * @property {number} coordY
 * @property {string} platform
 */

/**
 * @param {string} fermata
 * @param {number} cardNum
 */
async function _infoFermata(stopId, cardNum) {
    document.getElementById("nome-corsia-" + cardNum).innerHTML = loadingHTML;

    /** @type {Fermata} */
    let data;
    try {
        data = (await axios.get("/fermata/" + stopId)).data;
        if (!data) throw new Error("Stop is null");
    } catch (err) {
        console.log(err?.response?.data || err);
        document.getElementById("nome-corsia-" + cardNum).textContent = stopId;
        return;
    }

    document.getElementById("nome-corsia-" + cardNum).textContent =
        data.stopName;
}

function sanCesario() {
    bus(1, "MO2076");
    bus(2, "MO3600");
}

function resultHandlerBS(config, elem) {
    return tabellone(elem);
}

function _clockEmoji(a) {
    let d = ~~((a.getHours() % 12) * 2 + a.getMinutes() / 30 + 0.5);
    d += d < 2 ? 24 : 0;
    return String.fromCharCode(55357, 56655 + (d % 2 ? 23 + d : d) / 2);
}

/** @param {{id: string, nome: string}} stazione */
async function tabellone(stazione) {
    stazioneModal.hide();
    modal.show();

    document.querySelector(".nome-stazione").value = "";

    document.querySelector(".main-modal-title").textContent =
        "Caricamento stazione " + stazione.nome;

    document.querySelector(".main-modal-body").innerHTML = loadingHTML;
    modal.show();

    /**
     * @typedef TrenoTabellone
     * @property {string} treno
     * @property {string} destinazione
     * @property {number} ritardo
     */

    /** @type {TrenoTabellone[]} */
    let data;
    try {
        data = (await axios.get("/tabellone/" + stazione.id)).data;
    } catch (err) {
        alert(err?.response?.data || err);
        return modal.hide();
    }

    console.log(data);

    document.querySelector(".main-modal-title").textContent =
        "Treni da " + stazione.nome;
    document.querySelector(".main-modal-body").innerHTML = `
        <ul class="list-group">
            ${data
                .map(
                    e => `
                    <li class="list-group-item btn" style="text-align: left;" onclick="trenoModal(${
                        e.numero
                    }, '${e.idOrigine}');"><strong>${e.treno}</strong> ${
                        e.destinazione
                    } <span class="modal-ritardo">${
                        e.ritardo > 0
                            ? `+${e.ritardo}m`
                            : _clockEmoji(new Date(e.orarioArrivo)) + "👌"
                    }</span>
                    <span class="float-end">${_formattaData(
                        e.orarioArrivo
                    )}</span>
                    </li>
            `
                )
                .join("")}
        </ul>
    `;
    modal.show();

    _refresh();
}

function trenoModal(numTreno, idOrigine) {
    treno(numTreno, idOrigine);
    modal.hide();
}

function _formattaData(data, s) {
    return dateFns.format(new Date(data), s ? "HH:mm:ss" : "HH:mm");
}

function _parseHHMM(hhmmStr) {
    return dateFns.parse(
        dateFns.format(new Date(), "YYYY-MM-DD ") + hhmmStr,
        "YYYY-MM-DD HH:mm",
        new Date()
    );
}

function _dataBolide(date) {
    return `bolide alle ${date ? _formattaData(date, true) : "boh"}`;
}

const bolideIcon = L.icon({
    iconUrl: "/img/bolide.png",
    iconSize: [100, 40],
    iconAnchor: [50, 20],
    popupAnchor: [0, -18]
});

let map;

async function connettiGps() {
    if (socket) await disconnettiGps();
    console.log("connettiGps socket:", socket);

    if (!map) {
        map = L.map("map").setView([44.56384, 11.03409], 15);
        L.tileLayer(
            "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
            {
                attribution:
                    'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                maxZoom: 18,
                id: "mapbox/streets-v11",
                tileSize: 512,
                zoomOffset: -1,
                accessToken:
                    "pk.eyJ1IjoiYml0cmV5IiwiYSI6ImNsMjZsMGZyejA2eXYza25xd3lvY3p2ZG0ifQ.G4c3HFBNVNPxAIbvaXQ2uQ"
            }
        ).addTo(map);
    }

    setTimeout(() => {
        map.invalidateSize(true);
    }, 100);

    let firstRender = true;
    let marker;

    socket = await io();
    socket.on("position", ({ lat, lon, date }) => {
        console.log({ lat, lon });

        if (firstRender) {
            map.panTo(new L.LatLng(lat, lon));

            marker = L.marker([lat, lon], { icon: bolideIcon }).addTo(map);
            marker.bindPopup(_dataBolide(date));
            marker.openPopup();

            document.getElementById("c3-update-div").style.display = "block";
            document.getElementById("c3-update").textContent = _formattaData(
                date,
                true
            );

            firstRender = false;
        } else {
            marker.setPopupContent(_dataBolide(date));

            const newLatLng = new L.LatLng(lat, lon);
            marker.setLatLng(newLatLng);
        }

        document.getElementById("gps-loading").style.display = "none";
    });
    socket.on("error", err => alert(err));

    gpsModal.show();
}

async function disconnettiGps() {
    console.log("disconnettiGps socket:", socket);
    if (socket) {
        if (socket.connected) await socket.disconnect();
        socket = null;
    }
}

document.getElementById;

let tArr = [];
function _refresh() {
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tArr.forEach(t => t.hide());
    tArr = tooltipTriggerList.map(
        tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl)
    );
}

document.getElementById("numero-treno").addEventListener("change", e => {
    treno();
});
document.getElementById("fermata-bus-1").addEventListener("change", e => {
    bus(1, e.target.value);
});
document.getElementById("fermata-bus-2").addEventListener("change", e => {
    bus(2, e.target.value);
});

if (dateFns.isBefore(new Date(), _parseHHMM("07:42"))) {
    treno(17408, "S05037");
    bus(1, "MO2076");
    bus(2, "MO3600");
} else {
    treno();
    bus(1, "MO6133");
    bus(2, "MO6134");
}

autocompleteBS([
    {
        name: "Seleziona stazione",
        // inputSource: node.querySelector(".nome-stazione"),
        inputSource: document.querySelector(".nome-stazione"),
        targetID: document.querySelector(".nome-stazione"),
        fetchURL: "/stazione/{term}",
        fetchMap: {
            id: "id",
            name: "nome"
        },

        minLength: 4,
        maxResults: 10
    }
]);
