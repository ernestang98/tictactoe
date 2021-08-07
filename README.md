## Debugging Sockets:

- Each tab is one connection to the socket (you can try opening multiple taps and see the logs)

- There's some asynchronous issue when setting 2 values (happens when room is created). To solve, use mset()

- The moment you refresh/exit the tab you're on, 'disconnecting' is triggered

- Version for Redis, Socket, JavasScript has been updated accordingly from tutorial, do make sure you update the code base 
