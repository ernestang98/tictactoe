'use strict';

const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');

const socketEvents = require('./utils/socket');
const routes = require('./utils/routes');

const redisDB = require("./utils/db").connectRedis();
const mongoDB = require("./utils/db").connectMongoDB();   

class Server{

    constructor(){
        this.port =  process.env.PORT;
        this.host = process.env.HOSTNAME;
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
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }))
        this.app.use(cors());
        this.app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());
    }

    async appBackend(){
        new routes(this.app,redisDB).routesConfig();
        new socketEvents(this.socket,redisDB).socketConfig();
    }

    async appExecute(){
        await this.appConfig();
        await this.appBackend();
        await this.http.listen(this.port, this.host, () => {
            console.log(`Listening on http://${this.host}:${this.port}`);
        });
    }

}

const app = new Server();
app.appExecute();