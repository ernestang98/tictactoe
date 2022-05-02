import {Status} from './game-status';
import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

import * as io from 'socket.io-client';

@Injectable()
export class GameLogic {
  gameField: Array<number> = [];
  currentTurn: number;
  gameStatus: Status;
  private BASE_URL = 'http://localhost:5000';
  public socket;
  private headers = new HttpHeaders({'Content-Type': 'application/json;charset=UTF-8'});
  playerOneWins: Array<Array<number>> = [
    [1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 0, 1, 0, 1, 0, 1, 0, 0]
  ];
  playerTwoWins: Array<Array<number>> = [
    [2, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 2, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 2, 2, 2],
    [2, 0, 0, 2, 0, 0, 2, 0, 0],
    [0, 2, 0, 0, 2, 0, 0, 2, 0],
    [0, 0, 2, 0, 0, 2, 0, 0, 2],
    [2, 0, 0, 0, 2, 0, 0, 0, 2],
    [0, 0, 2, 0, 2, 0, 2, 0, 0]
  ];

  public constructor(private http: HttpClient) {
    this.gameStatus = Status.STOP;
    this.gameField = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  getRoomStats(): Promise<any> {
    return new Promise(resolve => {
      this.http.get(`http://localhost:5000/getRoomStats`).subscribe(data => {
        resolve(data);
      });
    });
  }

  connectSocket(): void {
    this.socket = io(this.BASE_URL, {
      withCredentials: true
    });
  }

  getRoomsAvailable(): any {
    return new Observable(observer => {
      this.socket.on('rooms-available', (data) => {
        observer.next(
          data
        );
      });
      return () => {
        this.socket.disconnect();
      };
    });
  }

  /* Method to create new room, create-room event. */
  createNewRoom(): any {
    this.socket.emit('create-room', {test: 9909});
    return new Observable(observer => {
      this.socket.on('new-room', (data) => {
        observer.next(
          data
        );
      });
      return () => {
        this.socket.disconnect();
      };
    });
  }

  joinNewRoom(roomNumber): any {
    this.socket.emit('join-room', {roomNumber});
  }

  startGame(): any {
    this.gameField = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.currentTurn = this.randomPlayerStart();
    this.gameStatus = Status.START;
    return new Observable(observer => {
      this.socket.on('start-game', (data) => {
        observer.next(
          data
        );
      });
      return () => {
        this.socket.disconnect();
      };
    });
  }

  sendPlayerMove(params): any {
    this.socket.emit('send-move', params);
  }

  receivePlayerMove(): any {
    return new Observable(observer => {
      this.socket.on('receive-move', (data) => {
        observer.next(
          data
        );
      });
      return () => {
        this.socket.disconnect();
      };
    });
  }

  playerLeft(): any {
    return new Observable(observer => {
      this.socket.on('room-disconnect', (data) => {
        observer.next(
          data
        );
      });
      return () => {
        this.socket.disconnect();
      };
    });
  }

  gameStop(): void {
    this.gameStatus = Status.STOP;
  }

  randomPlayerStart(): number {
    return Math.floor(Math.random() * 2) + 1;
  }

  getPlayerColor(): string {
    return (this.currentTurn === 2) ? 'player-two' : 'player-one';
  }

  setSquare(position: number, value: number): void {
    this.gameField[position] = value;
  }

  nextPlayer(): void {
    this.currentTurn = (this.currentTurn === 2) ? 1 : 2;
  }

}
