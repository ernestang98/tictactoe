class DatabaseManager{

    constructor(){
        this.redis = require("redis");
        this.mongo = require('mongoose');
    }

    connectRedis(){
        const client = this.redis.createClient({
            host : '127.0.0.1',
            post : 6379
        });

        client.on("error", (err) => {
            console.log("Redis: Error " + err);
        });

        client.on("ready", (err) => {
            console.log("Connected to Redis");
        });

        require('bluebird').promisifyAll(client);
        return client;
    }

    connectMongoDB(){
        this.mongo.connect(`${process.env.MONGODB_URI}`, () => {
            console.log('Connected to MongoDB');
        });
    }

}

module.exports = new DatabaseManager();
