// https://stackoverflow.com/questions/20899129/data-lost-after-redis-server-restart (NOTE)

class Socket{

    constructor(socket, redisDB){
        this.io = socket;
        this.redisDB = redisDB;

        this.winCombinationForPlayer1 = [
            ["X", "X", "X", "-", "-", "-", "-", "-", "-"],
            ["-", "-", "-", "X", "X", "X", "-", "-", "-"],
            ["-", "-", "-", "-", "-", "-", "X", "X", "X"],
            ["X", "-", "-", "X", "-", "-", "X", "-", "-"],
            ["-", "X", "-", "-", "X", "-", "-", "X", "-"],
            ["-", "-", "X", "-", "-", "X", "-", "-", "X"],
            ["X", "-", "-", "-", "X", "-", "-", "-", "X"],
            ["-", "-", "X", "-", "X", "-", "X", "-", "-"]
        ];

        this.winCombinationForPlayer2 = [
            ["O", "O", "O", "-", "-", "-", "-", "-", "-"],
            ["-", "-", "-", "O", "O", "O", "-", "-", "-"],
            ["-", "-", "-", "-", "-", "-", "O", "O", "O"],
            ["O", "-", "-", "O", "-", "-", "O", "-", "-"],
            ["-", "O", "-", "-", "O", "-", "-", "O", "-"],
            ["-", "-", "O", "-", "-", "O", "-", "-", "O"],
            ["O", "-", "-", "-", "O", "-", "-", "-", "O"],
            ["-", "-", "O", "-", "O", "-", "O", "-", "-"]
        ];

        this.redisDB.set("totalRoomCount", 0);
        this.redisDB.set("allRooms", JSON.stringify({
            emptyRooms: [],
            fullRooms : []
        }));
    }

    socketEvents(){
        const IO = this.io;
        const redisDB = this.redisDB;

        IO.on('connection', (socket) => {

            // Maximum number of people in the socket
            socket.setMaxListeners(20);

            // When socket received "create-room"
            socket.on('create-room', (data) => {

                // .getAsync() returns a promise itself
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
                // basically gets the values of totalRoomCount and allRooms
                Promise.all(['totalRoomCount','allRooms'].map(key => this.redisDB.getAsync(key))).then(values => {
                    let totalRoomCount = values[0];
                    const allRooms = JSON.parse(values[1]);
                    let fullRooms = allRooms['fullRooms'];
                    let emptyRooms = allRooms['emptyRooms'];

                    let highest_num = 0
                    let max_fullRooms = 0
                    let max_emptyRooms = 0

                    if (fullRooms.length > 0) {
                        max_fullRooms = Math.max(...fullRooms);
                    }

                    if (emptyRooms.length > 0) {
                        max_emptyRooms = Math.max(...emptyRooms);
                    }

                    highest_num = Math.max(max_fullRooms, max_emptyRooms) + 1; 
                    totalRoomCount++;
                    emptyRooms.push(highest_num);

                    // socket joins the room here

                    socket.join("room-"+highest_num);
                    this.redisDB.set("totalRoomCount", totalRoomCount, function (err, res) {
                        console.log("set: ", res)
                    });
                    this.redisDB.set("allRooms", JSON.stringify({
                        emptyRooms: emptyRooms,
                        fullRooms : fullRooms
                    }));
                    IO.emit('rooms-available', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms
                    });

                    // emit new-room for frontend to respond
                    IO.sockets.in("room-"+highest_num).emit('new-room', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms,
                        'roomNumber' : highest_num
                    });

                    /* Checking the if the room is empty. */
                    // let isIncludes = emptyRooms.includes(totalRoomCount);

                    // if(!isIncludes){
                    //     totalRoomCount++;
                    //     emptyRooms.push(totalRoomCount);
                    //     socket.join("room-"+totalRoomCount);
                    //     this.redisDB.set("totalRoomCount", totalRoomCount, function (err, res) {
                    //         console.log("set: ", res)
                    //     });
                    //     this.redisDB.set("allRooms", JSON.stringify({
                    //         emptyRooms: emptyRooms,
                    //         fullRooms : fullRooms
                    //     }));
                    //     IO.emit('rooms-available', {
                    //         'totalRoomCount' : totalRoomCount,
                    //         'fullRooms' : fullRooms,
                    //         'emptyRooms': emptyRooms
                    //     });
                    //     IO.sockets.in("room-"+totalRoomCount).emit('new-room', {
                    //         'totalRoomCount' : totalRoomCount,
                    //         'fullRooms' : fullRooms,
                    //         'emptyRooms': emptyRooms,
                    //         'roomNumber' : totalRoomCount
                    //     });
                    // }
                });
            });

            /*
            * In this event will user can join the selected room
            * Empty room is actually at least one person inside one
            * Full room is got 2 people inside
            */
            socket.on('join-room', (data) => {
                const roomNumber = data.roomNumber;
                Promise.all(['totalRoomCount','allRooms'].map(key => this.redisDB.getAsync(key))).then(values => {
                    const allRooms = JSON.parse(values[1]);
                    let totalRoomCount = values[0];
                    let fullRooms = allRooms['fullRooms'];
                    let emptyRooms = allRooms['emptyRooms'];
                    let indexPos = emptyRooms.indexOf(roomNumber);
                    if(indexPos > -1){
                        emptyRooms.splice(indexPos,1);
                        fullRooms.push(roomNumber);
                    }
                    /* User Joining socket room */
                    socket.join("room-"+roomNumber);
                    redisDB.set("allRooms", JSON.stringify({
                        emptyRooms: emptyRooms,
                        fullRooms : fullRooms
                    }));
                    /* Getting the room number from socket */
                    if (IO.sockets.adapter.sids) {
                        const iter = IO.sockets.adapter.sids.keys()
                        for (let i of iter) {
                            const setOfRooms = Array.from(IO.sockets.adapter.sids.get(i))
                            if (setOfRooms[0] === socket.id) {
                                let currentRoom = setOfRooms[1]
                                IO.emit('rooms-available', {
                                    'totalRoomCount' : totalRoomCount,
                                    'fullRooms' : fullRooms,
                                    'emptyRooms': emptyRooms
                                });
                                IO.sockets.in("room-"+roomNumber).emit('start-game', {
                                    'totalRoomCount' : totalRoomCount,
                                    'fullRooms' : fullRooms,
                                    'emptyRooms': emptyRooms,
                                    'roomNumber' : currentRoom.substring(5)
                                });
                            }
                        }
                    }
                    utils.printLog("Joined a room!", IO.sockets.adapter.sids)
                });
            });

            /*
            * This event will send played moves between the users
            * Also Here we will calaculate the winner.
            */
            socket.on('send-move', (data) => {
                console.log(data)
                const currentPlayer = data.currentPlayer === "X" ? "X" : "O";
                console.log("Current player: " + currentPlayer)
                const playedGameGrid = data.playedGameGrid;
                const movesPlayed = data.movesPlayed;
                const roomNumber = data.roomNumber;
                let winner = null;
                let winCombinationToLookAt = this.winCombinationForPlayer2

                if (currentPlayer === "X") {
                    winCombinationToLookAt = this.winCombinationForPlayer1
                }

                let tempPlayedGrid = []

                console.log(winCombinationToLookAt);
                console.log(currentPlayer)
                console.log(playedGameGrid)

                for (let o = 0; o < playedGameGrid.length; o++) {
                    console.log(playedGameGrid[o])
                    console.log(currentPlayer.toString())
                    if (playedGameGrid[o].toString() !== currentPlayer.toString()) {
                        tempPlayedGrid.push("-")
                    } else {
                        tempPlayedGrid.push(currentPlayer)
                    }
                }

                console.log("temp player grid: " + tempPlayedGrid)

                /* checking the winner */

                function arrayEquals(firstArray, secondArray) {
                    if (
                        !Array.isArray(firstArray)
                        || !Array.isArray(secondArray)
                        || firstArray.length !== secondArray.length
                    ) {
                        return false;
                    }
                    for (let i = 0; i < firstArray.length; i++) {
                        if (firstArray[i] === "-") {
                            console.log('this is the checkarray, we can ignore all 0s and focus on the ones that matter');
                        }
                        else if (firstArray[i] !== secondArray[i]) {
                            return false;
                        }}

                    return true;
                }

                winCombinationToLookAt.forEach((checkField, checkIndex) => {
                    if (arrayEquals(checkField, tempPlayedGrid)) {
                        winner = "Player " + currentPlayer + " has won!";
                    } else if (movesPlayed === 9) {
                        winner = 'Game Draw';
                    }
                    return false
                });
                console.log(winner)
                if (winner === null){
                    console.log(playedGameGrid);
                    socket.broadcast.to("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : null,
                        'board' : playedGameGrid
                    });
                } else{
                    IO.sockets.in("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : winner,
                        'board' : ["O", "O", "O", "O", "O", "O", "O", "O", "O"]
                    });
                }
            });

            /*
            * Here we will remove the room number from fullrooms array
            * And we will update teh Redis DB keys.
            */
            socket.on('disconnecting',()=>{
                // the guy who left the room
                console.log("I am disconnecting")
                const rooms = Array.from(socket.rooms);
                console.log(rooms)

                if (rooms.length > 1) {
                    let roomNumber = parseInt(rooms[1].substring(5,))

                }

                const roomNumber = ( rooms[1] !== undefined && rooms[1] !== null) ? (rooms[1]).split('-')[1] : null;

                console.log(roomNumber)

                if (rooms !== null) {
                    Promise.all(['totalRoomCount','allRooms'].map(key => redisDB.getAsync(key))).then(values => {
                        let totalRoomCount = values[0];

                        const allRooms = JSON.parse(values[1]);
                        let fullRooms = allRooms['fullRooms'];
                        let emptyRooms = allRooms['emptyRooms'];

                        let fullRoomsPos = fullRooms.indexOf(parseInt(roomNumber));
                        let emptyRoomsPos = emptyRooms.indexOf(parseInt(roomNumber));

                        if( fullRoomsPos > -1 ){
                            fullRooms.splice(fullRoomsPos,1);
                        }
                        if( emptyRoomsPos > -1 ){
                            emptyRooms.splice(emptyRoomsPos,1);
                        }
                        if (totalRoomCount > 0) {
                            totalRoomCount--;
                        }else{
                            totalRoomCount = 0;
                        }
                        redisDB.set("totalRoomCount", totalRoomCount);
                        redisDB.set("allRooms", JSON.stringify({
                            emptyRooms: emptyRooms,
                            fullRooms : fullRooms
                        }));
                        IO.sockets.in("room-"+roomNumber).emit('room-disconnect', {id: socket.id});

                        IO.emit('rooms-available', {
                            'totalRoomCount' : totalRoomCount,
                            'fullRooms' : fullRooms,
                            'emptyRooms': emptyRooms
                        });

                        utils.printLog("User disconnected", IO.sockets.adapter.sids)
                        utils.printLog("++++++++", "+++++++")
                    });
                }
            });

        });
    }

    socketConfig(){
        this.socketEvents();
    }
}

module.exports = Socket;
