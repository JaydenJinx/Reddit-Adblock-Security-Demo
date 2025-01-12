const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors"); // Import the CORS middleware

const app = express(); // Create express application
const PORT = 3000; // Set port number

// Enables CORS for our extension. This essentially allows us to recieve data from our extension to our server
// Chrome by default blocks this
app.use(cors({
    origin: 'chrome-extension://agknonoomgeliflckdiohplhmlndmffb'
}
));

app.use(bodyParser.json());    // parse incoming json requests

app.post('/collect', (req, res) => {
    console.log('Received data: ', req.body);
    res.status(200).json({ status: 'success', message: 'Data received' }); // send response back to sender on success
});

// Run the server
app.listen(PORT, () => {
    console.log(`Server  is running on http://localhost:${PORT}`);
});