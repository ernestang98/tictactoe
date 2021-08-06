import { Component, OnInit, ViewChild} from '@angular/core';
import {GameLogic} from '../game-logic';
import {Renderer} from '@angular/compiler-cli/ngcc/src/rendering/renderer';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  providers: [GameLogic]
})
export class GameComponent implements OnInit {

  /*
  * Initial Game Variables and constants starts
  */
  private title = 'Realtime Tic Tac Toe Using Angular 5 & Socket.IO  —  Rooms and Namespaces';
  private gameGrid = [];
  private playedGameGrid = [];
  private movesPlayed = 0;
  private displayPlayerTurn = true;
  private myTurn = true;
  private whoWillStart = true;
  /*
  * Initial Game Variables and constants starts
  */
  /*Bootstrap modal Options starts*/
  @ViewChild('content') private content;
  /* Bootstrap modal Options ends */

  /*socket related Variable,ng-models and constant starts*/
  private totalRooms = 0;
  public emptyRooms = [];
  public roomNumber = 0;
  private playedText = '';
  private whoseTurn = 'X';
  /*socket related Variable,ng-models and constant starts*/

  constructor(public game: GameLogic) {
  }

  ngOnInit(): void {
    // connect the player to the socket
    this.game.connectSocket();

    // HTTP call to get Empty rooms and total room numbers
    this.game.getRoomStats().then(response => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    // Socket evenet will total available rooms to play.
    this.game.getRoomsAvailable().subscribe(response => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    // Socket evenet to start a new Game
    this.game.startGame().subscribe((response) => {
      this.roomNumber = response.roomNumber;
    });

    // Socket event will receive the Opponent player's Move
    this.game.receivePlayerMove().subscribe((response) => {
      this.opponentMove(response);
    });

    // Socket event to check if any player left the room, if yes then reload the page.
    this.game.playerLeft().subscribe((response) => {
      alert('Player Left');
      window.location.reload();
    });
  }
  joinRoom(roomNumber): void {
    this.myTurn = false;
    this.whoWillStart = false;
    this.whoseTurn = 'O';
    this.game.joinNewRoom(roomNumber);
  }
  createRoom(): void {
    this.myTurn = true;
    this.whoseTurn = 'X';
    this.whoWillStart = true;
    this.game.createNewRoom().subscribe( (response) => {
      this.roomNumber = response.roomNumber;
    });
  }
  opponentMove(params): void {
    this.displayPlayerTurn = !this.displayPlayerTurn;
    if (params.winner ===  null) {
      this.playedGameGrid[params.position] = {
        position: params.position,
        player: params.playedText
      };
      this.myTurn = true;
    }else {
      alert(params.winner);
      this.resetGame();
    }
  }
  // tslint:disable-next-line:variable-name
  play(number: string): void {
    if (!this.myTurn) {
      return;
    }
    this.movesPlayed += 1;
    this.playedGameGrid[number] = {
      position: number,
      player: this.whoseTurn
    };
    this.game.sendPlayerMove({
      roomNumber : this.roomNumber,
      playedText: this.whoseTurn,
      position : number,
      playedGameGrid: this.playedGameGrid,
      movesPlayed : this.movesPlayed
    });
    this.myTurn = false;
    this.displayPlayerTurn = !this.displayPlayerTurn;
  }
  // tslint:disable-next-line:variable-name
  renderPlayedText(number: number): string {
    if (this.playedGameGrid[number] === undefined) {
      return '';
    }else {
      this.playedText = this.playedGameGrid[number].player;
      return this.playedText;
    }
  }
  resetGame(): void {
    this.playedGameGrid = [];
    this.gameGrid = [];
    // this.gameGrid = this.game.gameGrid;
    this.movesPlayed = 0;
    if (this.whoWillStart) {
      this.myTurn = true;
      this.displayPlayerTurn = true;
      this.whoseTurn = 'X';
    }else {
      this.displayPlayerTurn = true;
      this.whoseTurn = 'O';
    }
  }
  startGame(): void {
    // this.game.gameStart();
    const currentPlayer = 'Current turn: Player ' + this.game.currentTurn;
    const information = document.querySelector('.current-status');
    information.innerHTML = currentPlayer;
  }

  stopGame(): void {
    // this.game.gameStop();
    const currentPlayer = 'Start the game';
    const information = document.querySelector('.current-status');
    information.innerHTML = currentPlayer;
  }

  // async clickSquare(subfield: any): Promise<void> {
  //   if (this.game.gameStatus) {
  //     const position = subfield.currentTarget.getAttribute('position');
  //     if (this.game.gameField[position] === 1 || this.game.gameField[position] === 2) {
  //     } else {
  //       const color = this.game.getPlayerColor();
  //       if (!(subfield.currentTarget.classList.contains('player-one') ||
  //         subfield.currentTarget.classList.contains('player-two'))) {
  //         subfield.currentTarget.classList.add(color);
  //         this.game.nextPlayer();
  //       }
  //       const currentPlayer = 'Current turn: Player ' + this.game.currentTurn;
  //       const information = document.querySelector('.current-status');
  //       information.innerHTML = currentPlayer;
  //       this.game.setSquare(position, this.game.currentTurn);
  //
  //       const win = await this.game.checkIfGameWon();
  //
  //       if (win) {
  //         this.game.currentTurn = this.game.currentTurn === 2 ? 1 : 2;
  //         const currentPlayer = 'Game Ended! Winner is player ' + this.game.currentTurn;
  //         const information = document.querySelector('.current-status');
  //         information.innerHTML = currentPlayer;
  //
  //         setTimeout(() => {
  //           this.game.gameStop();
  //         }, 500);
  //       } else {
  //         const ended = await this.game.checkIfGameEnded();
  //
  //         if (ended) {
  //           const currentPlayer = 'Game Ended! No Winner!';
  //           const information = document.querySelector('.current-status');
  //           information.innerHTML = currentPlayer;
  //         }
  //       }
  //
  //     }
  //
  //   }
  // }

}
