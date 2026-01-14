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
        
        // Serve static files from client directory (NOT public)
        this.app.use(express.static(path.join(__dirname, 'client')));
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                message: 'Microbial Growth Game Server',
                players: this.gameState.players?.size || 0,
                population: this.gameState.cells?.length || 0
            });
        });
        
        // Catch-all handler for SPA
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

        // Game loop
        setInterval(() => {
            this.gameLogic.updateGame(this.gameState);
            this.io.emit('gameUpdate', this.getClientGameState());
        }, 1000 / 60);

        // Population tracking
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
            console.log(`📁 Serving files from: ${path.join(__dirname, 'client')}`);
        });
    }
}

// Create and start the game
const game = new MicrobialGame();
game.start();
