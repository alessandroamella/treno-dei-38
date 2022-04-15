// const { default: axios } = require("axios");

// const a = document.getElementById("treno");

const modal = new bootstrap.Modal(document.querySelector(".main-modal"));
const stazioneModal = new bootstrap.Modal(
    document.querySelector(".stazione-modal")
);

async function treno(numTreno) {
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
                    treno: numTrenoValue
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
        li.classList.add("list-group-item");

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
        const dataArrivo = dateFns.parse(
            dateFns.format(new Date(), "YYYY-MM-DD ") +
                (c.arrivoTempoReale || c.arrivoProgrammato),
            "YYYY-MM-DD HH:mm",
            new Date()
        );

        const card = document.querySelector(".bus-card").cloneNode(true);
        card.style.display = "block";
        card.querySelector(".bus-linea").textContent = c.linea;
        card.querySelector(".bus-destinazione").textContent = c.destinazione;
        card.querySelector(".bus-temporeale").style.display = c.arrivoTempoReale
            ? "block"
            : "none";
        card.querySelector(".bus-arrivo").textContent =
            dateFns.differenceInMinutes(dataArrivo, new Date()) +
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
        p.classList.add("py-2");
        p.classList.add("mb-0");
        p.style.textAlign = "center";
        corseElem.appendChild(p);
    }

    document.getElementById(`bus-loading-${cardNum}`).style.display = "none";
    document.getElementById(`bus-corse-card-${cardNum}`).style.display =
        "block";
    document.getElementById(`fermata-bus-${cardNum}`).value = fermataValue;

    document.getElementById(`bus-update-${cardNum}`).textContent =
        _formattaData(new Date());

    _refresh();
}

function sanCesario() {
    bus(1, "MO2076");
    bus(2, "MO3600");
}

function resultHandlerBS(config, elem) {
    return tabellone(elem);
}

/** @param {{id: string, nome: string}} stazione */
async function tabellone(stazione) {
    stazioneModal.hide();
    modal.show();

    document.querySelector(".nome-stazione").value = "";

    document.querySelector(".main-modal-title").textContent =
        "Caricamento stazione " + stazione.nome;

    document.querySelector(".main-modal-body").innerHTML = `
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
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

    document.querySelector(".main-modal-title").textContent =
        "Treni da " + stazione.nome;
    document.querySelector(".main-modal-body").innerHTML = `
        <ul class="list-group">
            ${data
                .map(
                    e => `
                    <li class="list-group-item btn" style="text-align: left;" onClick="trenoModal(${
                        e.treno.split(" ")[1]
                    });"><strong>${e.treno}</strong> ${
                        e.destinazione
                    } <span class="modal-ritardo">${e.ritardo >= 0 ? "+" : ""}${
                        e.ritardo
                    }m</span>
                    <span class="float-end">${e.orarioArrivo}</span>
                    </li>
            `
                )
                .join("")}
        </ul>
    `;
    modal.show();

    _refresh();
}

function trenoModal(numTreno) {
    treno(numTreno);
    modal.hide();
    document.body.scrollTop = document.documentElement.scrollTop = 0;
}

function _formattaData(data) {
    return dateFns.format(new Date(data), "HH:mm");
}

function _refresh() {
    // Enable tooltips
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    const tooltipList = tooltipTriggerList.map(
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

treno();
bus(1, "MO6133");
bus(2, "MO6134");

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
