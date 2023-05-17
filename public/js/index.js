// const { default: axios } = require("axios");

// const a = document.getElementById("treno");

let socket;

const modal = new bootstrap.Modal(document.querySelector(".main-modal"));
const cercaFermataModal = new bootstrap.Modal(
    document.querySelector(".cerca-fermata-modal")
);
const tripModal = new bootstrap.Modal(document.querySelector(".trip-modal"));

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

    console.log("treno", data);

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
    const { data } = await axios.get("bus", {
        params: {
            q: fermata,
            agency
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
        if (c.arrivoProgrammato) {
            card.title += "<br>Programmato: " + c.arrivoProgrammato;
        }
        card.title += "<br>Tempo reale: " + c.arrivoTempoReale;
    } else {
        card.title += "Programmato: " + c.arrivoProgrammato;
        card.classList.remove("btn");
    }

    if (c.trip) {
        // card.style.cursor = "pointer";
        card.classList.add("btn");
        card.style.textAlign = "left";

        card.addEventListener("click", () => {
            loadTrips(
                c.linea,
                c.trip.trip_id,
                c.arrivoTempoReale && c.arrivoProgrammato
                    ? dateFns.differenceInMinutes(
                          _parseHHMM(c.arrivoTempoReale),
                          _parseHHMM(c.arrivoProgrammato)
                      )
                    : 0
            );
        });
    } else {
        // card.title += "Programmato: " + c.arrivoProgrammato;
        card.classList.remove("btn");
    }
}

function getAgencyFromParam(data, agency) {
    if (!data.agency && agency === "seta") return "seta";
    else if (!data.agency && agency === "tper") return "tper";
    else if (data.agency === "seta") return "seta";
    else if (data.agency === "tper") return "tper";
    else return null;
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

    console.log("corse", { data, agency });
    for (const c of data) {
        const dataArrivo = _parseHHMM(
            c.arrivoTempoReale || c.arrivoProgrammato
        );

        const card = document.querySelector(".bus-card").cloneNode(true);
        card.style.display = "block";
        card.querySelector(".bus-linea").textContent = c.linea;
        card.querySelector(".bus-logo").src =
            "/img/" + getAgencyFromParam(c, agency) + ".png";
        card.querySelector(".bus-destinazione").textContent = c.destinazione;
        card.querySelector(".bus-temporeale").style.display = c.arrivoTempoReale
            ? "block"
            : "none";

        const mins = dateFns.differenceInMinutes(
            dataArrivo,
            _parseHHMM(_formattaData(new Date(), false))
        );
        card.querySelector(".bus-arrivo").textContent =
            (Math.trunc(mins / 60) > 0 ? Math.trunc(mins / 60) + "h " : "") +
            (mins % 60) +
            "m" +
            (!c.arrivoTempoReale ? "*" : "");

        card.dataset.bsToggle = "tooltip";
        card.dataset.bsTrigger = "hover";
        card.dataset.bsHtml = true;
        card.title = "";

        if (getAgencyFromParam(c, agency) === "seta") setSetaBus(c, card);
        else setTperBus(c, card);

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

let isLoading = false;

/**
 * @param {number} cardNum
 * @param {string | string[]} fermata
 * @param {Corsa[]} [data]
 * @param {string} [nomeFermata]
 * @param {'seta' | 'tper'} [agency]
 */
async function bus(cardNum, fermata, data = null, nomeFermata = null) {
    // tripModal.hide();
    isLoading = true; // use this externally

    if (!nomeFermata) await _infoFermata(fermata, cardNum);

    if (busInterval[cardNum]) {
        clearInterval(busInterval[cardNum]);
    }

    setBusCardLoading(cardNum);

    let fermataValue =
        fermata ||
        document.getElementById(`fermata-bus-${cardNum}`)?.value?.trim() ||
        "MO2076";

    if (!data) {
        try {
            data = await fetchStop(fermataValue);
        } catch (err) {
            hideBusCard();

            if (busInterval[cardNum]) {
                clearInterval(busInterval[cardNum]);
            }
            isLoading = false;
            return alert(err.response?.data || "Errore sconosciuto");
        }
    }

    // console.log("bus", data);

    addCorseToBusCard(data, cardNum);

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

    busInterval[cardNum] = setInterval(() =>
        // data && nomeFermata
        //     ? fermata(nomeFermata)
        //     :
        {
            if (!isLoading && !isViewingTripModal)
                bus(cardNum, fermata, data, nomeFermata);
        }, 30000);

    isLoading = false;
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
        return fermate(elem);
    }
}

function _clockEmoji(a) {
    let d = ~~((a.getHours() % 12) * 2 + a.getMinutes() / 30 + 0.5);
    d += d < 2 ? 24 : 0;
    return String.fromCharCode(55357, 56655 + (d % 2 ? 23 + d : d) / 2);
}

/** @param {{id: string, nome: string}} fermata */
async function fermate(fermata) {
    cercaFermataModal.hide();
    modal.show();

    document.querySelector(".nome-stazione").value = "";

    document.querySelector(".main-modal-title").textContent =
        "Seleziona fermata " + fermata.nome;

    document.querySelector(".main-modal-body").innerHTML = loadingHTML;
    modal.show();

    console.log("fermata", fermata);

    document.querySelector(".main-modal-title").textContent =
        "Seleziona ID delle fermate di " + fermata.nome;
    document.querySelector(".main-modal-body").innerHTML = `
        <div class="seleziona-fermate">
            ${fermata.id
                .split(";")
                .map(
                    e => `
                    <div class="form-check" style="overflow: auto;">
                        <input class="form-check-input fermata-input" type="checkbox" value="${e.toString()}" id="fermata-${e.toString()}">
                        <label class="form-check-label fermata-input-label" for="fermata-${e.toString()}">
                            <img
                                src="/img/${e.split(",")[0]}.png"
                                alt="TPL agency logo"
                                class="bus-logo me-1"
                                style="object-fit: contain; max-width: 1rem"
                                loading="lazy"
                            />
                            <strong>${e.split(",")[1]}</strong>
                            ${
                                e.split(",").length > 1
                                    ? e
                                          .split(",")
                                          .slice(2)
                                          .map(
                                              f =>
                                                  `<span class="badge bg-secondary ms-1">${f}</span>`
                                          )
                                          .join("")
                                    : ""
                            }
                        </label>
                    </div>
                `
                )
                .join("")}

                <div class="d-flex mt-2" style="justify-content: center">
                <button
                    onclick="
                        document.getElementById('fermata-bus-1').value = [...document.querySelectorAll('.fermata-input:checked')].map(e => e.value.split(',')[1]).join(',');
                        bus(1, [...document.querySelectorAll('.fermata-input:checked')].map(e => e.value.split(',')[1]).join(','));
                        modal.hide();
                        document.getElementById('bus-1-card').scrollIntoView();
                    "
                    type="button"
                    class="btn btn-primary">
                        Conferma
                </button>
                </div>
        </div>
    `;
    modal.show();

    _refresh();
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

/**
 * Represents a stop in the General Transit Feed Specification (GTFS).
 *
 * @typedef {Object} GTFSStop
 * @property {string} stop_id - The ID of the stop.
 * @property {string|undefined} [stop_code] - The code of the stop, if available.
 * @property {string|undefined} [stop_name] - The name of the stop, if available.
 * @property {string|undefined} [stop_desc] - The description of the stop, if available.
 * @property {number|undefined} [stop_lat] - The latitude of the stop, if available.
 * @property {number|undefined} [stop_lon] - The longitude of the stop, if available.
 * @property {string|undefined} [zone_id] - The ID of the zone the stop is in, if available.
 * @property {string|undefined} [stop_url] - The URL of the stop, if available.
 * @property {LocationType|undefined} [location_type] - The type of the stop location, if available.
 * @property {string|undefined} [parent_station] - The ID of the parent station, if available.
 * @property {string|undefined} [stop_timezone] - The timezone of the stop, if available.
 * @property {WheelchairBoardingType|""|undefined} [wheelchair_boarding] - The wheelchair boarding type of the stop, if available.
 * @property {string|undefined} [level_id] - The ID of the level the stop is on, if available.
 * @property {string|undefined} [platform_code] - The platform code of the stop, if available.
 */

/**
 * Represents a stop on a trip.
 *
 * @typedef {Object} TripStop
 * @property {GTFSStop} stop - The GTFS stop associated with the trip stop.
 * @property {Moment} scheduledTime - The scheduled time of the stop as a Moment object.
 * @property {Moment|undefined} [realTime] - The real-time of the stop as a Moment object, if available.
 */

let isViewingTripModal = false;

/**
 * Returns an object representing a trip with the given ID.
 *
 * @async
 * @function
 * @param {string} tripId - The ID of the trip to retrieve.
 * @param {number} minutesDelay - The number of minutes of delay for the trip.
 * @param {Date} scheduledTime - The date representing the scheduled arrival time.
 * @returns {Promise<object>} An object representing the requested trip, containing trip details and delay information.
 */
async function loadTrips(line, tripId, minutesDelay) {
    tripModal.show();

    isViewingTripModal = true;

    document.querySelector(".trip-modal-title").textContent =
        "Caricamento fermate...";

    document.querySelector(".trip-modal-body").innerHTML = loadingHTML;
    // tripModal.show();

    /** @type {TripStop[]} */
    let data;
    try {
        data = (
            await axios.get("/fermatetrip", {
                params: {
                    trip: tripId,
                    minutesDelay
                }
            })
        ).data;
    } catch (err) {
        alert(err?.response?.data || err);
        isViewingTripModal = false;
        return tripModal.hide();
    }

    // this is terrible but we have to make it work
    data = data.map(e => ({
        ...e,
        realTime: _formattaData(
            dateFns.addMinutes(_parseHHMM(e.scheduledTime), minutesDelay),
            false
        )
    }));

    console.log("loadTrips", data);

    document.querySelector(".trip-modal-title").textContent =
        "Fermate di sto " + line;
    document.querySelector(".trip-modal-body").innerHTML = `
        <ul class="list-group">
            ${data
                .map(
                    e => `
                    <li class="list-group-item btn" style="text-align: left;${
                        !isBefore(e.realTime)
                            ? "   background-color: lightgray;"
                            : ""
                    }" onclick="tripModal.hide();bus(1, ${
                        e.stop.stop_id
                    }, undefined, '${e.stop.stop_name}');"><strong>${
                        e.stop.stop_name
                    }</strong> ${e.stop.stop_id}
                    <span class="float-end">${
                        e.realTime &&
                        e.realTime !== e.scheduledTime &&
                        isBefore(e.realTime)
                            ? `<span style="text-decoration: line-through;" class="me-1">${_formattaData(
                                  _parseHHMM(e.scheduledTime)
                              )}</span><span style="font-weight: 600;">${
                                  // _parseHHMM(
                                  e.realTime
                                  //   )
                              }</span>`
                            : `<span style="${
                                  e.realTime && e.realTime !== e.scheduledTime
                                      ? ""
                                      : "font-weight: 600;"
                              }">${
                                  // _formattaData(_parseHHMM(
                                  e.scheduledTime
                                  // ))
                              }</span>`
                    }</span>
                    </li>
            `
                )
                .join("")}
        </ul>
    `;
    // tripModal.show();

    isViewingTripModal = false;

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
    e.target.value.startsWith("MO");
    bus(2, e.target.value);
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

/**
 * @typedef {Object} News
 * @property {'seta' | 'tper'} agency - The agency of the news.
 * @property {string} title - The title of the news.
 * @property {Date} date - The date of the news.
 * @property {string} type - The type of the news.
 * @property {string=} url - The URL of the news article (optional).
 */

/**
 * @returns {Promise<News[]|null>} - A Promise that resolves to an object containing the news data or null in case of an error.
 */
async function _fetchNews() {
    try {
        const { data } = await axios.get("/news");
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function notizie() {
    const news = await _fetchNews();
    if (!news) {
        document.getElementById("ultime-notizie").innerHTML =
            "😔 Errore nel caricamento delle notizie";
        return;
    }

    document.getElementById("ultime-notizie").innerHTML = "";

    console.log("news", news);

    const itemsPerPage = 4;
    const newsList = document.getElementById("ultime-notizie");
    const newsCount = news.length;

    // create pagination element
    const pagination = document.createElement("nav");
    pagination.setAttribute("aria-label", "Page navigation");

    const paginationList = document.createElement("ul");
    paginationList.classList.add(
        "pagination",
        "news-pagination",
        "justify-content-center",
        "mt-1"
    );

    // calculate number of pages
    const pageCount = Math.ceil(newsCount / itemsPerPage);

    // create pagination items
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement("li");
        li.classList.add("page-item");

        const a = document.createElement("a");
        a.classList.add("page-link");
        a.href = "#";
        a.textContent = i;

        a.addEventListener("click", event => {
            event.preventDefault();
            showPage(i);
        });

        li.appendChild(a);
        paginationList.appendChild(li);
    }

    pagination.appendChild(paginationList);
    newsList.parentNode.insertBefore(pagination, newsList.nextSibling);

    // show initial page
    showPage(1);

    function showPage(page) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        const div = document.createElement("div");
        div.classList.add("card-group", "overflow-auto", "scrollbar-hidden");

        for (const [i, e] of document
            .querySelector(".news-pagination")
            .childNodes.entries()) {
            if (i === page - 1) e.classList.add("active");
            else e.classList.remove("active");
        }

        for (let i = startIndex; i < endIndex && i < newsCount; i++) {
            const n = news[i];

            const card = document.createElement("div");
            card.classList.add(
                "card",
                "border-0",
                "bg-light",
                "me-2",
                "mb-2",
                "pt-2",
                "flex-row",
                "flex-sm-column"
            );

            const imgContainer = document.createElement("div");
            imgContainer.classList.add(
                "d-flex",
                "justify-content-center",
                "align-items-center",
                "ms-2"
            );

            const img = document.createElement("img");
            img.src = "/img/" + n.agency.replace(/\W/g, "") + ".png";
            img.alt = n.agency + " agency logo";
            img.classList.add("bus-logo");
            img.style.width = "2rem";
            img.style.height = "2rem";
            img.style.objectFit = "contain";
            img.loading = "lazy";

            imgContainer.appendChild(img);
            card.appendChild(imgContainer);

            const cardBody = document.createElement("div");
            cardBody.classList.add("card-body", "p-2");

            // Tooltip
            // create the popover content
            const popoverContent = document.createElement("div");

            const popoverTitle = document.createElement("h5");
            popoverTitle.classList.add("card-title", "mb-0");
            popoverTitle.style.fontSize = "1rem";
            popoverTitle.textContent = n.type;

            // popoverContent.appendChild(popoverTitle);

            const popoverImg = document.createElement("img");
            popoverImg.src = n.image; // assume every news object has an "image" property
            popoverImg.alt = n.type + " image";
            popoverImg.classList.add("img-fluid", "my-3");
            popoverContent.appendChild(popoverImg);

            const popoverDesc = document.createElement("p");
            popoverDesc.classList.add("card-text");
            popoverDesc.textContent = n.title;
            popoverContent.appendChild(popoverDesc);

            const popoverBtn = document.createElement("a");
            popoverBtn.href = n.url;
            popoverBtn.classList.add("btn", "btn-primary", "mt-3");
            popoverBtn.textContent = "Read more";
            popoverContent.appendChild(popoverBtn);

            // const popover =
            refreshPopovers();

            // add the popover to the card body
            cardBody.setAttribute("data-bs-toggle", "popover");
            cardBody.setAttribute("data-bs-placement", "top");
            cardBody.setAttribute("data-bs-content", popoverContent.innerHTML);
            cardBody.setAttribute("title", n.type);

            // cardBody.appendChild(popoverTrigger);

            const cardTitle = document.createElement("h5");
            cardTitle.classList.add("card-title", "mb-0");
            cardTitle.style.fontSize = "1rem";
            cardTitle.textContent = n.type;
            cardBody.appendChild(cardTitle);

            const cardDesc = document.createElement("p");
            cardDesc.classList.add("card-title", "mb-0");
            cardDesc.style.fontSize = "1rem";

            cardDesc.style.display = "-webkit-box";
            cardDesc.style.webkitLineClamp = 3;
            cardDesc.style.webkitBoxOrient = "vertical";
            cardDesc.style.overflow = "hidden";
            // cardDesc.style.wordWrap = "normal";
            cardDesc.style.whiteSpace = "normal";
            cardDesc.style.overflowWrap = "break-word";
            // cardDesc.style.wordBreak = "break-all";

            cardDesc.textContent = n.title;
            cardBody.appendChild(cardDesc);

            const cardText = document.createElement("p");
            cardText.classList.add("card-text", "text-secondary", "mb-1");
            cardText.textContent =
                // dateFns.format(n.date, "DD/MM/YYYY") + " - " + n.agency;
                dateFns.format(n.date, "DD/MM/YYYY") +
                " - " +
                new URL(n.url).hostname.replace("www.", "");
            // cardText.style.textTransform = "uppercase";
            cardBody.appendChild(cardText);

            const cardLink = document.createElement("a");
            cardLink.href = n.url;
            cardLink.setAttribute("rel", "noopener noreferrer");
            cardLink.setAttribute("target", "_blank");
            cardLink.classList.add("stretched-link");
            cardBody.appendChild(cardLink);

            card.appendChild(cardBody);
            div.appendChild(card);
        }

        // remove existing list if any
        const existingList = newsList.querySelector("div");
        if (existingList) {
            newsList.removeChild(existingList);
        }

        newsList.appendChild(div);
    }
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
notizie();

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

function refreshPopovers() {
    const popoverTriggerList = document.querySelectorAll(
        '[data-bs-toggle="popover"]'
    );
    const popoverList = [...popoverTriggerList].map(
        popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl)
    );
}
