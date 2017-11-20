function getData(flights) {
    const res = flights.map((flight) => ({
        id: flight.id,
        miles: "7,192",
    }));
    return Promise.resolve(res);
}

chrome.runtime.onMessage.addListener(
    function(flights, sender, sendResponse) {
        console.log("data", flights);

        getData(flights).then((response) => {
            sendResponse(response);
        });
        return true;

    });
