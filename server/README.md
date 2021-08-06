## Sockets:

- Each tab is one connection to the socket (you can try opening multiple taps and see the logs)

- There's some asynchronous issue when setting 2 values (happens when room is created). To solve, use mset()
