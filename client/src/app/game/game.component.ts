import {Component, OnInit, ViewChild} from '@angular/core';
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
  public currentPlayerTurn = 1;
  private gameGrid = [];
  private playedGameGrid = ['-', '-', '-', '-', '-', '-', '-', '-', '-'];
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
  public player = null;
  public gameHas2Players = false;

  /*socket related Variable,ng-models and constant starts*/

  constructor(public game: GameLogic) {
  }

  updateBoard(arr, position): void {
    this.playedGameGrid = arr;
    // tslint:disable-next-line:prefer-for-of
    const color = this.currentPlayerTurn === 1 ? 'player-two' : 'player-one';
    if (!(document.getElementById(String(position)).classList.contains('player-one') ||
      document.getElementById(String(position)).classList.contains('player-two'))) {
      document.getElementById(String(position)).classList.add(color);
    }
  }

  ngOnInit(): void {
    // connect the player to the socket
    this.game.connectSocket();

    // HTTP call to get Empty rooms and total room numbers
    this.game.getRoomStats().then(response => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    // Socket event will total available rooms to play.
    this.game.getRoomsAvailable().subscribe(response => {
      this.totalRooms = response.totalRoomCount;
      this.emptyRooms = response.emptyRooms;
    });

    // Socket event to start a new Game
    this.game.startGame().subscribe((response) => {
      // tslint:disable-next-line:radix
      this.roomNumber = parseInt(response.roomNumber);
      this.gameHas2Players = true;
    });

    // Socket event will receive the Opponent player's Move
    this.game.receivePlayerMove().subscribe((response) => {
      console.log("RECEIVING PLAYER MOVE");
      this.currentPlayerTurn = response.playedText === 'X' ? 2 : 1;
      this.updateBoard(response.board, response.position);
      console.log(this.currentPlayerTurn);
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
    this.player = '2';
    this.game.joinNewRoom(roomNumber);
    console.log(this.myTurn);
    console.log(this.whoseTurn);
    console.log(this.whoWillStart);
  }

  createRoom(): void {
    this.player = '1';
    this.myTurn = true;
    this.whoseTurn = 'X';
    this.whoWillStart = true;
    this.game.createNewRoom().subscribe((response) => {
      this.roomNumber = response.roomNumber;
    });
  }

  opponentMove(params): void {
    console.log("OPPONENT MOVE!!!!");
    this.displayPlayerTurn = !this.displayPlayerTurn;
    if (params.winner === null) {
      // this.playedGameGrid[params.position] = {
      //   position: params.position,
      //   player: params.playedText
      // };
      this.myTurn = true;
      this.movesPlayed += 1;
    } else {
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
    this.playedGameGrid[number] = this.whoseTurn;
    console.log(this.playedGameGrid);
    this.game.sendPlayerMove({
      currentPlayer: this.whoseTurn,
      roomNumber: this.roomNumber,
      playedText: this.whoseTurn,
      position: number,
      playedGameGrid: this.playedGameGrid,
      movesPlayed: this.movesPlayed
    });
    this.myTurn = false;
    this.displayPlayerTurn = !this.displayPlayerTurn;
    this.currentPlayerTurn = this.currentPlayerTurn === 1 ? 2 : 1;
  }

  // tslint:disable-next-line:variable-name
  renderPlayedText(number: number): string {
    if (this.playedGameGrid[number] === undefined) {
      return '';
    } else {
      // this.playedText = this.playedGameGrid[number].player;
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
    } else {
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

  async clickSquare(subfield: any): Promise<void> {
    console.log(this.myTurn);
    console.log(this.whoseTurn);
    console.log(this.whoWillStart);
    if (this.myTurn) {
      const color = this.currentPlayerTurn === 1 ? 'player-one' : 'player-two';
      if (!(subfield.currentTarget.classList.contains('player-one') ||
        subfield.currentTarget.classList.contains('player-two'))) {
        const position = subfield.currentTarget.getAttribute('position');
        this.play(position);
        subfield.currentTarget.classList.add(color);
        this.game.nextPlayer();
      }
      else {
        console.log('TAKEN UP ALREADY');
      }
    } else {
      console.log('NOT MY TURN');
    }
  }
}
