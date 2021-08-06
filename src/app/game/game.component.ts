import { Component, OnInit } from '@angular/core';
import { GameLogic } from '../game-logic'

@Component({
  selector: '.app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  providers: [GameLogic]
})
export class GameComponent implements OnInit {

  constructor(public game : GameLogic) { }

  ngOnInit(): void {

  }

  startGame(): void {
    this.game.gameStart()
    const currentPlayer = 'Current turn: Player ' + this.game.currentTurn
    const information = document.querySelector('.current-status')
    information.innerHTML = currentPlayer
  }

  stopGame(): void {
    this.game.gameStop()
    const currentPlayer = 'Start the game'
    const information = document.querySelector('.current-status')
    information.innerHTML = currentPlayer
  }

  async clickSquare( subfield: any ) : Promise<void>{
    if (this.game.gameStatus) {
      const position = subfield.currentTarget.getAttribute('position')
      if (this.game.gameField[position] === 1 || this.game.gameField[position] === 2) {
      }
      else {
        const color = this.game.getPlayerColor()
        if (!(subfield.currentTarget.classList.contains("player-one") || 
              subfield.currentTarget.classList.contains("player-two"))) {
                subfield.currentTarget.classList.add(color)
                this.game.nextPlayer();
              }
        const currentPlayer = 'Current turn: Player ' + this.game.currentTurn
        const information = document.querySelector('.current-status')
        information.innerHTML = currentPlayer
        this.game.setSquare(position, this.game.currentTurn)
    
        const win = await this.game.checkIfGameWon()

        if (win) {
          this.game.currentTurn = this.game.currentTurn === 2 ? 1 : 2
          const currentPlayer = 'Game Ended! Winner is player ' + this.game.currentTurn
          const information = document.querySelector('.current-status')
          information.innerHTML = currentPlayer

          setTimeout(() => {
            this.game.gameStop()
          }, 500)
        }
        else {
          const ended = await this.game.checkIfGameEnded()

          if (ended) {
            const currentPlayer = 'Game Ended! No Winner!'
            const information = document.querySelector('.current-status')
            information.innerHTML = currentPlayer
          }
        }

      }

    }
  }

}
