const elements = {};                 // Map from id to DOM elements
const START_WAIT_TIME_MS = 200;      // When to start checking if page is ready, exp backoff
const PAGE_CHECK_INTERVAL_MS = 500;  // How often to check if the page has changed

// Keeps trying the function until it returns true
function waitUntil(fn, timeout) {
    setTimeout(function () {
        const succeeded = fn();
        if (!succeeded) {
            waitUntil(fn, timeout * 2);
        }
    }, timeout);
}

function getFlightInfo(flights) {
    console.log('calling get flight info..');
    // Make request to background page, to make HTTP request to backend
    chrome.runtime.sendMessage(flights, function(flights) {
        for (let flight of flights) {
            if (!flight.id) continue;
            const row = elements[flight.id];
            appendInfo(row, flight.miles);
        }
    });
}

function appendInfo(row, miles) {
    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.marginTop = "10px";
    div.style.textDecoration = "none !important";
    div.style.color = "#444444";
    div.innerHTML = `SkyMiles: ${miles}`;
    row.appendChild(div);
}

function parseLocation() {
    const regex = /.*f=(.*);t=(.*);d=.*/;
    const matches = window.location.href.match(regex);
    if (matches.length < 2) return null;     // Invalid airport codes
    if (matches[1].length > 3) return null;  // Too many source airports
    if (matches[2].length > 3) return null;  // Too many destination airports
    return [matches[1], matches[2]];
}

function parseLinkRow(row, outboundAirports) {
    // Parse the ID of the row
    const id = row.href.split("sel=")[1].split(";")[0];

    // Add to global list
    elements[id] = row;

    // Calculate the price and round trip status
    let price, roundTrip;
    if (row.children[0].children[0].children[0]) {
        price = row.children[0].children[0].children[0].innerHTML;
        roundTrip = row.children[0].children[0].children[1].innerHTML === "round trip";
    } else {
        price = 'undefined';
        roundTrip = false;
    }

    const timeDivs = row.children[1].children;
    let outboundLeaveTime, outboundArriveTime, outboundAirlines;
    if (timeDivs.length === 4) {
        outboundLeaveTime = timeDivs[2].children[0].getAttribute("tooltip");
        outboundArriveTime = timeDivs[2].children[1].getAttribute("tooltip");
        outboundAirlines = timeDivs[3].children[0].innerHTML.split(',');
    } else if (timeDivs.length === 3) {
        outboundLeaveTime = timeDivs[1].children[0].getAttribute("tooltip");
        outboundArriveTime = timeDivs[1].children[1].getAttribute("tooltip");
        outboundAirlines = timeDivs[2].children[0].innerHTML.split(',');
    }

    if (outboundAirports === null) {
        outboundAirports = row.children[2].children[1].innerHTML.split("-");
    }

    outboundAirlines = outboundAirlines.map((s) => s.trim());

    const outboundFlightTime = row.children[2].children[0].innerHTML;

    return [{
        id,
        price,
        roundTrip,
        outboundLeaveTime,
        outboundArriveTime,
        outboundAirlines,
        outboundFlightTime,
        outboundAirports,
    }];
}

function parseSpanRow(row, outboundAirports) {
    return [];
}

function parseTables() {
    console.log('calling parseTables');
    const rows = document.getElementsByClassName("LJV2HGB-d-X");

    // Return if there are no loaded rows yet
    if (rows.length < 1) return false;
    const flights = [];

    let outboundAirports = parseLocation();

    for (let row of rows) {
        // Exit if row does not have all info. This is the end of the table
        if (row.children.length < 4) break;

        if (row.tagName.toLowerCase() === "span") {
            const parsedRows = parseSpanRow(row, outboundAirports);
            Array.prototype.push.apply(flights, parsedRows);
        } else if (row.tagName.toLowerCase() === "a") {
            const parsedRows = parseLinkRow(row, outboundAirports);
            Array.prototype.push.apply(flights, parsedRows);
        }

        // const info = getFlightInfo(parsedData);
        // appendInfo(row, info);
    }
    console.log(flights);
    getFlightInfo(flights);
    return true;
}

waitUntil(parseTables, START_WAIT_TIME_MS);

let href = window.location.href;
setInterval(() => {
    const newHref = window.location.href;
    if (newHref !== href) {
        href = newHref;
        waitUntil(parseTables, START_WAIT_TIME_MS);
    }
}, PAGE_CHECK_INTERVAL_MS);

