const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const GameLogic = require('./gameLogic.js');

class MicrobialGame {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.app.use(express.static(path.join(__dirname, 'client')));
        
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                players: this.gameState.players?.size || 0,
                population: this.gameState.cells?.length || 0
            });
        });
        
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'client', 'index.html'));
        });

        this.gameLogic = new GameLogic();
        this.gameState = {
            cells: [],
            dots: [],
            players: new Map(),
            phase: 'lag',
            populationHistory: [],
            gameStartTime: Date.now()
        };

        this.setupSocketIO();
        this.initGame();
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('Player connected:', socket.id);
            
            this.addPlayer(socket);
            
            socket.emit('gameState', this.getClientGameState());
            this.io.emit('playerCount', this.gameState.players.size);

            socket.on('move', (direction) => {
                this.handlePlayerMovement(socket.id, direction);
            });

            socket.on('restartGame', () => {
                console.log(`Game restart requested by player: ${socket.id}`);
                this.restartGame();
            });

            socket.on('disconnect', () => {
                console.log('Player disconnected:', socket.id);
                this.removePlayer(socket.id);
                this.io.emit('playerCount', this.gameState.players.size);
            });
        });
    }

    addPlayer(socket) {
        const initialCell = this.gameLogic.createInitialCell(socket.id);
        this.gameState.cells.push(initialCell);
        this.gameState.players.set(socket.id, socket);
    }

    removePlayer(playerId) {
        this.gameState.cells = this.gameState.cells.filter(cell => cell.playerId !== playerId);
        this.gameState.players.delete(playerId);
    }

    handlePlayerMovement(playerId, direction) {
        const cell = this.gameState.cells.find(c => c.playerId === playerId);
        if (cell) {
            cell.direction = direction;
        }
    }

    initGame() {
        this.gameLogic.initializeGame(this.gameState);

        setInterval(() => {
            this.gameLogic.updateGame(this.gameState);
            this.io.emit('gameUpdate', this.getClientGameState());
        }, 1000 / 60);

        setInterval(() => {
            this.trackPopulation();
        }, 1000);
    }

    restartGame() {
        this.gameState = {
            cells: [],
            dots: [],
            players: this.gameState.players,
            phase: 'lag',
            populationHistory: [],
            gameStartTime: Date.now()
        };
        
        this.gameLogic.initializeGame(this.gameState);
        
        this.gameState.players.forEach((socket, playerId) => {
            const initialCell = this.gameLogic.createInitialCell(playerId);
            this.gameState.cells.push(initialCell);
        });
        
        this.io.emit('gameRestarted');
        this.io.emit('gameState', this.getClientGameState());
    }

    trackPopulation() {
        this.gameState.populationHistory.push({
            time: Date.now(),
            population: this.gameState.cells.length,
            phase: this.gameState.phase
        });

        if (this.gameState.populationHistory.length > 300) {
            this.gameState.populationHistory.shift();
        }
    }

    getClientGameState() {
        return {
            cells: this.gameState.cells,
            dots: this.gameState.dots,
            phase: this.gameState.phase,
            populationHistory: this.gameState.populationHistory
        };
    }

    start(port = process.env.PORT || 3000) {
        this.server.listen(port, () => {
            console.log(`🧫 Server running on port ${port}`);
        });
    }
}

const game = new MicrobialGame();
game.start();
