const SERVER_URL = "http://localhost:3000/collect";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "DATA_LOG") {
        console.log("Received data from content script:", message.payload);

        // Make the fetch request to the server
        fetch(SERVER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message.payload),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((result) => {
                console.log("Data successfully sent to server:", result);
                sendResponse({ status: "success", result });
            })
            .catch((error) => {
                console.error("Error sending data to server:", error);
                sendResponse({ status: "error", error: error.message });
            });

        // Required to handle async responses properly
        return true;
    }
});