/*
* Multiplayer Tic-Tac-Toe Game using Angular, Nodejs
* https://www.youtube.com/watch?v=nEC4iYRD5n0
* https://www.youtube.com/watch?v=dJQWUubvpIc
* https://www.codershood.info/2018/01/07/building-dead-simple-multiplayer-tic-tac-toe-game-using-angular-nodejs-socket-io-rooms-part-1/
* https://www.codershood.info/2018/01/11/building-dead-simple-multiplayer-tic-tac-toe-game-using-angular-nodejs-socket-io-rooms-part-2/
* https://gist.github.com/tomysmile/1b8a321e7c58499ef9f9441b2faa0aa8
*/
'use strict';

const express = require("express");
const http = require('http');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const socketEvents = require('./utils/socket');
const routes = require('./utils/routes');
const redisDB = require("./utils/db").connectDB();

/*
    ERROR: zone-evergreen.js:2845 GET http://localhost:4000/socket.io/?EIO=3&transport=polling&t=NiRfTsU net::ERR_CONNECTION_REFUSED
    FIX: https://stackoverflow.com/questions/64725626/how-to-fix-400-error-bad-request-in-socket-io

    ERROR: CORS BLOCKED ERROR
    FIX: https://socket.io/docs/v3/handling-cors/
*/
class Server{

    constructor(){
        this.port =  4000;
        this.host = `localhost`;
        this.app = express();
        this.http = http.Server(this.app);
        this.socket = socketio(this.http, {
            cors: {
                origin: "http://localhost:4200",
                methods: ["GET", "POST"],
                credentials: true
            },
            allowEIO3: true
        });
    }

    appConfig(){
        this.app.use(
            bodyParser.json()
        );
        this.app.use(
            cors()
        );
    }

    includeRoutes(){
        new routes(this.app,redisDB).routesConfig();
        new socketEvents(this.socket,redisDB).socketConfig();
    }

    appExecute(){
        this.appConfig();
        this.includeRoutes();
        this.http.listen(this.port, this.host, () => {
            console.log(`Listening on http://${this.host}:${this.port}`);
        });
    }

}

const app = new Server();
app.appExecute();
