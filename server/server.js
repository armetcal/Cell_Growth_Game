const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
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

        this.gameLogic = new GameLogic();
        this.gameState = {
            cells: [],
            dots: [],
            players: new Map(),
            phase: 'lag',
            populationHistory: [],
            gameStartTime: Date.now()
        };

        this.setupExpress();
        this.setupSocketIO();
        this.initGame();
    }

    setupExpress() {
        this.app.use(cors());
        this.app.use(express.static(path.join(__dirname, '../client')));

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/index.html'));
        });

        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                players: this.gameState.players.size,
                population: this.gameState.cells.length,
                phase: this.gameState.phase
            });
        });
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

        // Game loop - 60 FPS
        setInterval(() => {
            this.gameLogic.updateGame(this.gameState);
            this.io.emit('gameUpdate', this.getClientGameState());
        }, 1000 / 60);

        // Population tracking - every second
        setInterval(() => {
            this.trackPopulation();
        }, 1000);
    }

    trackPopulation() {
        this.gameState.populationHistory.push({
            time: Date.now(),
            population: this.gameState.cells.length,
            phase: this.gameState.phase
        });

        // Keep only last 300 data points (5 minutes)
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
            console.log(`🧫 Microbial Growth Game server running on port ${port}`);
            console.log(`🎮 Game phases: Lag → Exponential → Stationary → Death`);
            console.log(`🌐 Socket.IO ready for real-time multiplayer`);
        });
    }
}

// Start the game
const game = new MicrobialGame();
game.start();
