class Socket{

    constructor(socket, redisDB){
        this.io = socket;
        this.redisDB = redisDB;

        /* Win combination to check winner of the Game.*/
        this.winCombinationForPlayer1 = [
            [1, 1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 1, 1, 1],
            [1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0],
            [0, 0, 1, 0, 0, 1, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 1, 0, 1, 0, 1, 0, 0]
        ];

        this.winCombinationForPlayer2 = [
            [2, 2, 2, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 2, 2, 2],
            [2, 0, 0, 2, 0, 0, 2, 0, 0],
            [0, 2, 0, 0, 2, 0, 0, 2, 0],
            [0, 0, 2, 0, 0, 2, 0, 0, 2],
            [2, 0, 0, 0, 2, 0, 0, 0, 2],
            [0, 0, 2, 0, 2, 0, 2, 0, 0]
        ];

        this.redisDB.set("totalRoomCount", 1);
        this.redisDB.set("allRooms", JSON.stringify({
            emptyRooms: [1],
            fullRooms : []
        }));
    }

    socketEvents(){
        const IO = this.io;
        const redisDB = this.redisDB;
        console.log()

        IO.on('connection', (socket) => {
            socket.setMaxListeners(20); /* Setting Maximum listeners */

            /*
            * In this Event user will create a new Room and can ask someone to join. Rooms are joined in increasing
            * order, hence for line 60, you can just check if the totalroomcount is found in the emptyrooms.
            */
            socket.on('create-room', (data) => {
                // .getAsync() returns a promise itself
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
                // basically gets the values of totalRoomCount and allRooms
                Promise.all(['totalRoomCount','allRooms'].map(key => this.redisDB.getAsync(key))).then(values => {
                    console.log("THE VALUES ARE: " + values)
                    let totalRoomCount = values[0];
                    console.log(totalRoomCount)

                    const allRooms = JSON.parse(values[1]);
                    console.log(allRooms)
                    let fullRooms = allRooms['fullRooms'];
                    let emptyRooms = allRooms['emptyRooms'];

                    /* Checking the if the room is empty. */
                    let isIncludes = emptyRooms.includes(totalRoomCount);
                    console.log("IS INCLUDED: " + isIncludes)

                    if(!isIncludes){
                        console.log("TOTAL ROOM COUNT: " + totalRoomCount)
                        totalRoomCount++;
                        console.log("TOTAL ROOM COUNT AFTER ADDING: " + totalRoomCount)
                        emptyRooms.push(totalRoomCount);
                        console.log(emptyRooms)
                        socket.join("room-"+totalRoomCount);
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
                        //
                        // IO.sockets.in("room-"+totalRoomCount).emit('new-room', {
                        //     'totalRoomCount' : totalRoomCount,
                        //     'fullRooms' : fullRooms,
                        //     'emptyRooms': emptyRooms,
                        //     'roomNumber' : totalRoomCount
                        // });
                    }
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
                                const currentRoom = setOfRooms[1]
                                console.log(totalRoomCount)
                                console.log(fullRooms)
                                console.log(emptyRooms)
                                console.log(currentRoom)
                                IO.emit('rooms-available', {
                                    'totalRoomCount' : totalRoomCount,
                                    'fullRooms' : fullRooms,
                                    'emptyRooms': emptyRooms
                                });
                                // IO.sockets.in("room-"+roomNumber).emit('start-game', {
                                //     'totalRoomCount' : totalRoomCount,
                                //     'fullRooms' : fullRooms,
                                //     'emptyRooms': emptyRooms,
                                //     'roomNumber' : currentRoom
                                // });
                            }
                        }
                    }
                });
            });

            /*
            * This event will send played moves between the users
            * Also Here we will calaculate the winner.
            */
            socket.on('send-move', (data) => {
                const currentPlayer = data.currentPlayer === 2 ? 2 : 1;
                const playedGameGrid = data.playedGameGrid;
                const movesPlayed = data.movesPlayed;
                const roomNumber = data.roomNumber;
                let winner = null;
                let winCombinationToLookAt = this.winCombinationForPlayer2

                if (currentPlayer === 1) {
                    winCombinationToLookAt = this.winCombinationForPlayer1
                }

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
                        if (firstArray[i] === 0) {
                            console.log('this is the checkarray, we can ignore all 0s and focus on the ones that matter');
                        }
                        else if (firstArray[i] !== secondArray[i]) {
                            return false;
                        }}

                    return true;
                }

                winCombinationToLookAt.forEach((checkField, checkIndex) => {
                    if (arrayEquals(checkField, playedGameGrid)) {
                        winner = "Player " + currentPlayer + " has won!";
                    } else if (movesPlayed === 9) {
                        winner = 'Game Draw';
                    }
                    return false
                });

                if (winner === null){
                    socket.broadcast.to("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : null
                    });
                } else{
                    IO.sockets.in("room-"+roomNumber).emit('receive-move', {
                        'position' : data.position,
                        'playedText' : data.playedText,
                        'winner' : winner
                    });
                }
            });

            /*
            * Here we will remove the room number from fullrooms array
            * And we will update teh Redis DB keys.
            */
            socket.on('disconnecting',()=>{
                const rooms = Object.keys(socket.rooms);
                const roomNumber = ( rooms[1] !== undefined && rooms[1] !== null) ? (rooms[1]).split('-')[1] : null;
                if(rooms !== null){
                    Promise.all(['totalRoomCount','allRooms'].map(key => redisDB.getAsync(key))).then(values => {
                        let totalRoomCount = values[0];

                        const allRooms = JSON.parse(values[1]);
                        let fullRooms = allRooms['fullRooms'];
                        let emptyRooms = allRooms['emptyRooms'];

                        let fullRoomsPos = fullRooms.indexOf(parseInt(roomNumber));
                        if( fullRoomsPos > -1 ){
                            fullRooms.splice(fullRoomsPos,1);
                        }
                        if (totalRoomCount > 1) {
                            totalRoomCount--;
                        }else{
                            totalRoomCount = 1;
                        }
                        redisDB.set("totalRoomCount", totalRoomCount);
                        redisDB.set("allRooms", JSON.stringify({
                            emptyRooms: emptyRooms,
                            fullRooms : fullRooms
                        }));
                        IO.sockets.in("room-"+roomNumber).emit('room-disconnect', {id: socket.id});
                    });
                }//if ends
            });

        });
    }

    socketConfig(){
        this.socketEvents();
    }
}
module.exports = Socket;
