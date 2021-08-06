import {Status} from './game-status';

export class GameLogic {
  gameField: Array<number> = [];
  currentTurn: number;
  gameStatus: Status;
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

  public constructor() {
    this.gameStatus = Status.STOP;
    this.gameField = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  gameStart(): void {
    this.gameField = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.currentTurn = this.randomPlayerStart();
    this.gameStatus = Status.START;
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

  arrayEquals(firstArray: Array<any>, secondArray: Array<any>): boolean {
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
      }
    }

    return true;
  }

  async checkIfGameWon(): Promise<boolean> {

    let isWinner = false;

    const checkArray = (this.currentTurn === 2) ? this.playerOneWins : this.playerTwoWins;

    const correctTurn = (this.currentTurn === 2) ? 1 : 2;

    const currentArray = [];

    this.gameField.forEach((subfield, index) => {
      if (subfield !== this.currentTurn) {
        currentArray[index] = 0;
      } else {
        currentArray[index] = correctTurn;
      }
    });

    checkArray.forEach((checkField, checkIndex) => {
      if (this.arrayEquals(checkField, currentArray)) {
        isWinner = true;
      }
    });

    return isWinner;
  }

  async checkIfGameEnded(): Promise<boolean> {
    let isFull = true;
    if (this.gameField.includes(0)) {
      isFull = false;
    }

    if (isFull) {
      await setTimeout(() => {
        this.gameStop();
      }, 500);
      return isFull;
    } else {
      return isFull;
    }
  }


}
