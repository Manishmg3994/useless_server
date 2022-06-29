const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const router = require('./routes');
const { initMeetingServer } = require('./lib/meeting-server');

initMeetingServer(server);
app.use(express.json()); //midleware
// app.use(express.urlencoded({ extended: false })); //Dont use this
app.use(cors()); //midw


app.get('/echo', (req, res) => {
    res.send('Echo From server');
});





app.use(router); //midleware for all routes

server.listen(process.env.port || 4000, function() {
    console.log("Ready to Go!");
});
// remaining isserverfile