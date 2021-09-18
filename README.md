## Tutorials Followed:

- [Angular TicTacToe](https://www.youtube.com/watch?v=nEC4iYRD5n0)

- [Websocket Rxjs](https://www.youtube.com/watch?v=dJQWUubvpIc)

## Debugging Sockets:

- Each tab is one connection to the socket (you can try opening multiple taps and see the logs)

- There's some asynchronous issue when setting 2 values (happens when room is created). To solve, use mset()

- The moment you refresh/exit the tab you're on, 'disconnecting' is triggered

- Version for Redis, Socket, JavasScript has been updated accordingly from tutorial, do make sure you update the code base 

## Game Rules

- X will always start first

- Creator of the room will always start first

## Bugs + Possible features

- When player creates the room and leaves it, room will persist (should just delete room if person is waiting and disconnects)

- Allow reset/auto reset when player wins
