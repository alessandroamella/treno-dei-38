const socket = io();

function _pw() {
    const p = window.location.pathname.split("/");
    return p[p.length - 1];
}

const outputElem = document.getElementById("output");

function getLocation() {
    if (navigator.geolocation) {
        console.log("geolocation ok");
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        outputElem.textContent = "GPS non supportato";
    }
}

/** @type  {PositionCallback} */
function showPosition(position) {
    const pos = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };
    socket.emit("position", { password: _pw(), position: pos });
    console.log(pos);
}

function start() {
    getLocation();
    const interval = setInterval(getLocation, 5000);

    socket.on("error", err => {
        outputElem.textContent = err;
    });
    socket.on("ok-pos", date => {
        outputElem.textContent =
            "BROADCAST a " + new Date(date).toLocaleTimeString();
    });
}
start();
