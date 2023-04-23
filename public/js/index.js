// const { default: axios } = require("axios");

// const a = document.getElementById("treno");

let socket;

const modal = new bootstrap.Modal(document.querySelector(".main-modal"));
const cercaFermataModal = new bootstrap.Modal(
    document.querySelector(".cerca-fermata-modal")
);
document
    .querySelector(".cerca-fermata-modal")
    .addEventListener("hidden.bs.modal", function (event) {
        // document.getElementById("gps-status").innerHTML = "";
        document.getElementById("nome-fermata-input").value = "";
    });
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
 * @property {boolean} tempoReale Se in tempo reale
 */

const busInterval = {};

/**
 * @param {string | string[]} fermata
 */
async function fetchStop(fermata, agency = "seta" | "tper") {
    const { data } = await axios.get(agency === "seta" ? "bus" : "bustper", {
        params: {
            fermata
        }
    });
    // if (!data) throw new Error("non worka");
    return data;
}

function setBusCardLoading(cardNum = 1) {
    document.getElementById(`bus-loading-${cardNum}`).style.display = "block";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display = "none";
}
function setBusCardLoaded(cardNum = 1) {
    document.getElementById(`bus-loading-${cardNum}`).style.display = "none";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display =
        "block";
}
function hideBusCard(cardNum = 1) {
    document.getElementById(`bus-loading-${cardNum}`).style.display = "none";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display = "none";
}

function setSetaBus(c, card) {
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
}

function setTperBus(c, card) {
    if (c.tempoReale) {
        card.title += "Bus " + c.busNum;
        card.title += "<br>Tempo reale: " + c.arrivoTempoReale;
        // if (c.numPasseggeri) {
        //     card.title += `<br>Passeggeri: ${c.numPasseggeri}/${c.postiTotali}`;
        // } else if (c.postiTotali) {
        //     card.title += "<br>Posti totali: " + c.postiTotali;
        // }

        // card.style.cursor = "pointer";
        // card.classList.add("btn");
        // card.style.textAlign = "left";

        // card.addEventListener("click", () => {
        //     document.querySelector(
        //         ".main-modal-title"
        //     ).textContent = `Bus ${c.busNum} - Linea ${c.linea} per ${c.destinazione}`;
        //     document.querySelector(
        //         ".main-modal-body"
        //     ).innerHTML = `<iframe class="bus-iframe" src="https://wimb.setaweb.it/qm/index.html?id=${c.busNum}" title="Localizzazione bus ${c.busNum}"></iframe>`;
        //     modal.show();
        // });
    } else {
        card.title += "Programmato: " + c.arrivoProgrammato;
        card.classList.remove("btn");
    }
}

/**
 *
 * @param {any} data
 * @param {number} cardNum
 * @param {'seta' | 'tper'} agency
 */
function addCorseToBusCard(data, cardNum = 1, agency = "seta") {
    const corseElem = document.getElementById(`bus-corse-${cardNum}`);
    corseElem.innerHTML = "";

    for (const c of data) {
        const dataArrivo = _parseHHMM(
            c.arrivoTempoReale || c.arrivoProgrammato
        );

        const card = document.querySelector(".bus-card").cloneNode(true);
        card.style.display = "block";
        card.querySelector(".bus-linea").textContent = c.linea;
        card.querySelector(".bus-logo").src =
            "/img/" + (data.agency || agency) + ".png";
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

        if (agency === "seta") setSetaBus(c, card);
        else if (agency === "tper") setTperBus(c, card);

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
}

/**
 * @param {number} cardNum
 * @param {string | string[]} fermata
 * @param {Corsa[]} [data]
 * @param {string} [nomeFermata]
 * @param {'seta' | 'tper'} [agency]
 */
async function bus(
    cardNum,
    fermata,
    data = null,
    nomeFermata = null,
    agency = "seta"
) {
    if (!nomeFermata) await _infoFermata(fermata, cardNum);

    if (busInterval[cardNum]) {
        clearInterval(busInterval[cardNum]);
    }

    setBusCardLoading(cardNum);

    let fermataValue =
        fermata ||
        document.getElementById(`fermata-bus-${cardNum}`)?.value?.trim() ||
        "MO6133";

    if (!data) {
        try {
            data = await fetchStop(fermataValue);
        } catch (err) {
            hideBusCard();

            if (busInterval[cardNum]) {
                clearInterval(busInterval[cardNum]);
            }
            return alert(err.response?.data || "Errore sconosciuto");
        }
    }

    console.log("bus", data);

    addCorseToBusCard(data, cardNum, agency);

    setBusCardLoaded(cardNum);

    document.getElementById(`fermata-bus-${cardNum}`).value = fermataValue;
    document.getElementById(`bus-update-${cardNum}`).textContent =
        _formattaData(new Date());
    document.getElementById(`bus-${cardNum}-card`).scrollIntoView();
    _refresh();

    if (busInterval[cardNum]) {
        clearInterval(busInterval[cardNum]);
    }

    if (nomeFermata) {
        document.getElementById(`nome-corsia-${cardNum}`).textContent =
            nomeFermata;
    }

    busInterval[cardNum] = setInterval(
        () =>
            data && nomeFermata
                ? fermata(nomeFermata)
                : bus(cardNum, fermata, data, nomeFermata, agency, agency),
        30000
    );
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
        data = (
            await axios.get(
                (stopId.startsWith("MO") ? "/fermata/" : "/fermatatper/") +
                    stopId
            )
        ).data;
        if (!data) throw new Error("Stop is null");
    } catch (err) {
        console.log(err?.response?.data || err);
        document.getElementById("nome-corsia-" + cardNum).textContent = stopId;
        return;
    }

    // console.log(data);

    document.getElementById("nome-corsia-" + cardNum).textContent =
        data.stopName;
}

function sanCesario() {
    bus(1, "MO2076", undefined, undefined, "seta");
    bus(2, "MO3600", undefined, undefined, "seta");
}

const autoCompleteConfig = [
    {
        name: "Seleziona stazione",
        // inputSource: node.querySelector(".nome-stazione"),
        inputSource: document.querySelector(".nome-stazione"),
        targetID: document.querySelector(".nome-stazione"),
        fetchURL: "/codicestazione/{term}",
        fetchMap: {
            id: "id",
            name: "nome"
        },

        minLength: 4,
        maxResults: 10
    },
    {
        name: "Cerca fermata",
        inputSource: document.querySelector(".nome-fermata"),
        targetID: document.querySelector(".nome-fermata"),
        fetchURL: "/fermatadanome?q={term}",
        fetchMap: {
            id: "id",
            name: "nome"
        },

        minLength: 4,
        maxResults: 10
    }
];

function resultHandlerBS(config, elem) {
    if (config === "Seleziona stazione") {
        return tabellone(elem);
    } else if (config === "Cerca fermata") {
        return fermata(elem);
    }
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

/** @param {{id: string, nome: string}} stazione */
async function fermata(fermata) {
    cercaFermataModal.hide();

    setBusCardLoading(1);
    document.getElementById(`bus-${1}-card`).scrollIntoView();

    console.log({ fermata });

    try {
        data = (
            await axios.get("/busdanome", {
                params: {
                    q: fermata.nome
                }
            })
        ).data;
        if (!data) throw new Error("non worka");

        bus(
            1,
            fermata.nome,
            data,
            fermata.nome,
            fermata.id.startsWith("MO") ? "seta" : "tper"
        );

        console.log("busdanome", data);
    } catch (err) {
        console.log(err?.response?.data || err);
    }
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
    e.target.value.startsWith("MO")
        ? bus(1, e.target.value, undefined, undefined, "seta")
        : bus(1, e.target.value, undefined, undefined, "tper");
});
document.getElementById("fermata-bus-2").addEventListener("change", e => {
    e.target.value.startsWith("MO")
        ? bus(2, e.target.value, undefined, undefined, "seta")
        : bus(2, e.target.value, undefined, undefined, "tper");
});

/**
 *
 * @returns {Promise<GeolocationCoordinates>}
 */
async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                return resolve(coords);
            },
            err => {
                return reject(err);
            },
            { enableHighAccuracy: true }
        );
    });
}

// document.getElementById("from-gps").addEventListener("click", async e => {
//     document.getElementById("from-gps").setAttribute("disabled", true);
//     document.getElementById("findgps-loading").style.display = "block";
//     document.getElementById("gps-status").textContent = "Ti cerco";
//     try {
//         if (!("geolocation" in navigator)) {
//             throw new Error("GPS non disponibile su questo browser");
//         }
//         document.getElementById("gps-status").textContent =
//             "Dimmi dove sei :))";

//         const coords = await getCurrentPosition();
//         console.log(coords);
//         const { latitude, longitude, accuracy } = coords;

//         document.getElementById(
//             "gps-status"
//         ).textContent = `👌 sei a ${latitude}, ${longitude} (± ${accuracy}m)`;
//     } catch (err) {
//         let html;
//         if (err instanceof GeolocationPositionError) {
//             if (err.code === 1) {
//                 html =
//                     '<p class="text-center mb-0">mi devi dare i permessi coglione!!</p>' +
//                     `<img
//                         src="https://puu.sh/JEXpr/bd48c4d977.png"
//                         loading="lazy"
//                         id="gps-howto"
//                         class="mt-1"
//                         style="width: 300px"
//                     />`;
//             } else if (err.code === 2) {
//                 html = "hai il dispositivo brocco, non mi da un cazzo";
//             } else if (err.code === 3) {
//                 html = "hai il dispositivo ritardato (timeout), mi spiace";
//             }
//         } else {
//             html = "errore ambiguo: " + (err.message || err.toString());
//         }
//         document.getElementById("gps-status").innerHTML = html || err;
//     } finally {
//         document.getElementById("from-gps").removeAttribute("disabled");
//         document.getElementById("findgps-loading").style.display = "none";
//     }
//     document.getElementById("from-gps").removeAttribute("disabled");

//     e.target.value.startsWith("MO")
//         ? bus(2, e.target.value, undefined, undefined, "seta")
//         : bus(2, e.target.value, undefined, undefined, "tper");
// });

function isBefore(hhmmStr) {
    return dateFns.isBefore(new Date(), _parseHHMM(hhmmStr));
}

// Bus
// bolognaFs();
// if (isBefore("07:42")) {
//     sanCesario();
// } else if (isBefore("09:00")) {
//     bus(1, "MO6133");
//     bus(2, "MO6134");
// } else if (isBefore("16:30")) {
//     bus(1, "MO6733");
//     bus(2, "MO6720");
// } else {
//     sanCesario();
// }
sanCesario();

if (isBefore("08:05")) {
    treno(3907, "S05037");
} else if (isBefore("08:20")) {
    treno(17425, "S05037");
} else if (isBefore("08:42")) {
    treno(17407, "S05037");
} else if (isBefore("09:05")) {
    treno(2067, "S05037");
} else if (isBefore("12:05")) {
    treno(3917, "S05037");
} else if (isBefore("12:33")) {
    treno(3912, "S05043");
} else if (isBefore("12:50")) {
    treno(17414, "S05043");
} else if (isBefore("13:33")) {
    treno(3914, "S05043");
} else if (isBefore("13:50")) {
    treno(2474, "S05043");
} else if (isBefore("14:33")) {
    treno(3916, "S05043");
} else if (isBefore("14:50")) {
    treno(17416, "S05043");
} else if (isBefore("15:33")) {
    treno(3918, "S05043");
} else if (isBefore("15:50")) {
    treno(2478, "S05043");
} else if (isBefore("16:33")) {
    treno(3920, "S05043");
} else if (isBefore("16:54")) {
    treno(17418, "S05043");
} else if (isBefore("17:33")) {
    treno(3922, "S05043");
} else if (isBefore("17:50")) {
    treno(2482, "S05043");
} else if (isBefore("18:33")) {
    treno(3924, "S05043");
} else {
    treno(17400, "S05043");
}

autocompleteBS(autoCompleteConfig);
