const SERVER_URL = "http://localhost:3000/collect";


// Send data to the server
function sendDataToServer(data){
    fetch(SERVER_URL, {
        method: "POST",
        headers: {
            "Content-Type" : "application/json",
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(result => {
            console.error("Server response: ", result);
        })
        .catch(error => {
            console.error("Error sending data: ", error);
        });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "DATA_LOG"){
        console.log("Data received from content script: ", message.payload);
        sendDataToServer(message.payload);
        sendResponse({ status: "success" });
    }
});