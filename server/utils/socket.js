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

                    // get new room number based on the highest room number so far
                    let [totalRoomCount, fullRooms, emptyRooms] = this.redisDBParseTotalRoomsEmptyRoomsFilledRooms(values);
                    let highest_num = 0
                    let max_fullRooms = 0
                    let max_emptyRooms = 0
                    if (fullRooms.length > 0) { max_fullRooms = Math.max(...fullRooms); }
                    if (emptyRooms.length > 0) { max_emptyRooms = Math.max(...emptyRooms); }
                    highest_num = Math.max(max_fullRooms, max_emptyRooms) + 1; 
                    totalRoomCount++;
                    emptyRooms.push(highest_num);

                    // socket joins the new room
                    socket.join("room-"+highest_num);

                    // Update redis
                    this.updateRedisDBTotalRoomsEmptyRoomsFilledRooms(redisDB, totalRoomCount, emptyRooms, fullRooms)

                    // Socket emit to everyone in the socket to update rooms available
                    IO.emit('rooms-available', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms
                    });

                    // Socket emit to only the person who created the room "new-room" to trigger changes in frontend
                    IO.sockets.in("room-"+highest_num).emit('new-room', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms,
                        'roomNumber' : highest_num
                    });

                });

            });

            // When player 2 joins the room
            socket.on('join-room', (data) => {

                // Frontend passes room number to join
                const roomNumber = data.roomNumber;
                
                // update total room count, empty room and full room
                Promise.all(['totalRoomCount','allRooms'].map(key => this.redisDB.getAsync(key))).then(values => {
                    let [totalRoomCount, fullRooms, emptyRooms] = this.redisDBParseTotalRoomsEmptyRoomsFilledRooms(values);
                    let indexPos = emptyRooms.indexOf(roomNumber);
                    if(indexPos > -1){
                        emptyRooms.splice(indexPos,1);
                        fullRooms.push(roomNumber);
                    }
                    socket.join("room-"+roomNumber);
                    redisDB.set("allRooms", JSON.stringify({
                        emptyRooms: emptyRooms,
                        fullRooms : fullRooms
                    }));
                    IO.emit('rooms-available', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms
                    });

                    // Start the game
                    IO.sockets.in("room-"+roomNumber).emit('start-game', {
                        'totalRoomCount' : totalRoomCount,
                        'fullRooms' : fullRooms,
                        'emptyRooms': emptyRooms,
                        'roomNumber' : roomNumber
                    });

                });
            });

            // Whenever a player sends a move!
            socket.on('send-move', (data) => {

                // Grab the player who made the move, the grid, moves played by player and room number
                const currentPlayer = data.currentPlayer === "X" ? "X" : "O";
                const playedGameGrid = data.playedGameGrid;
                const movesPlayed = data.movesPlayed;
                const roomNumber = data.roomNumber;
                let winner = null;
                let winCombinationToLookAt = this.winCombinationForPlayer2
                if (currentPlayer === "X") {
                    winCombinationToLookAt = this.winCombinationForPlayer1
                }

                // Create a temporary player grid from the playedGameGrid to check if its a winning combination
                let tempPlayedGrid = []
                for (let o = 0; o < playedGameGrid.length; o++) {
                    if (playedGameGrid[o].toString() !== currentPlayer.toString()) {
                        tempPlayedGrid.push("-")
                    } else {
                        tempPlayedGrid.push(currentPlayer)
                    }
                }

                // check if particular player won or if it is a draw
                winCombinationToLookAt.forEach((checkField, checkIndex) => {
                    if (this.checkForWins(checkField, tempPlayedGrid)) {
                        winner = "Player " + currentPlayer + " has won!";
                    } else if (movesPlayed === 9) {
                        winner = 'Game Draw';
                    }
                    return false
                });

                // if there is no winner or if it is not a draw, then continue to play the game
                if (winner === null){
                    socket.broadcast.to("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : null,
                        'board' : playedGameGrid
                    });
                } else{
                    // TODO: Fix this such that when there is a draw, then 
                    IO.sockets.in("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : winner,
                        'board' : ["O", "O", "O", "O", "O", "O", "O", "O", "O"]
                    });
                }
            });

            // When socket disconnects (either via refreshing/closing the browser)
            socket.on('disconnecting',()=>{

                // get the socket that is disconnected and the rooms that they are in!
                const rooms = Array.from(socket.rooms);
                if (rooms.length > 1) {
                    let roomNumber = parseInt(rooms[1].substring(5,))
                }
                const roomNumber = ( rooms[1] !== undefined && rooms[1] !== null) ? (rooms[1]).split('-')[1] : null;
                if (rooms !== null) {
                    Promise.all(['totalRoomCount','allRooms'].map(key => redisDB.getAsync(key))).then(values => {

                        // update total room count, empty room and full room
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

                        // let the other player win by default
                        IO.sockets.in("room-"+roomNumber).emit('room-disconnect', {id: socket.id});

                        // update total rooms available
                        IO.emit('rooms-available', {
                            'totalRoomCount' : totalRoomCount,
                            'fullRooms' : fullRooms,
                            'emptyRooms': emptyRooms
                        });
                    });
                }
            });

        });
    }

    socketConfig(){
        this.socketEvents();
    }

    checkForWins(firstArray, secondArray) {
        if (
            !Array.isArray(firstArray)
            || !Array.isArray(secondArray)
            || firstArray.length !== secondArray.length
        ) {
            return false;
        }
        for (let i = 0; i < firstArray.length; i++) {
            if (firstArray[i] === "-") {
                continue;
            }
            else if (firstArray[i] !== secondArray[i]) {
                return false;
            }
        }
        return true;
    }

    redisDBParseTotalRoomsEmptyRoomsFilledRooms(values){
        const allRooms = JSON.parse(values[1]);
        let totalRoomCount = values[0];
        let fullRooms = allRooms['fullRooms'];
        let emptyRooms = allRooms['emptyRooms'];
        return [totalRoomCount, fullRooms, emptyRooms]
    }

    updateRedisDBTotalRoomsEmptyRoomsFilledRooms(redisDB, totalRoomCount, emptyRooms, fullRooms){
        redisDB.set("totalRoomCount", totalRoomCount, function (err, res) {});
        redisDB.set("allRooms", JSON.stringify({
            emptyRooms: emptyRooms,
            fullRooms : fullRooms
        }));
    }

    logAllSocketSids(){
        console.log(IO.sockets.adapter.sids)
    }

}

module.exports = Socket;
