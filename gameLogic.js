class GameLogic {
    constructor() {
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            maxDots: 25,
            adaptationThreshold: 2,
            cellSizes: {
                lag: 15,
                adapted: 20
            },
            speeds: {
                base: 3
            },
            phaseThresholds: {
                lag: 5,
                exponential: 20,
                stationary: 40
            }
        };
        
        this.playerColors = new Map();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    createInitialCell(playerId) {
        if (!this.playerColors.has(playerId)) {
            this.playerColors.set(playerId, this.getUniquePlayerColor());
        }
        
        return {
            id: this.generateId(),
            playerId: playerId,
            x: Math.random() * (this.config.canvasWidth - 100) + 50,
            y: Math.random() * (this.config.canvasHeight - 100) + 50,
            size: this.config.cellSizes.lag,
            speed: this.config.speeds.base,
            direction: { x: 0, y: 0 },
            adaptationDots: 0,
            isAdapted: false,
            color: this.playerColors.get(playerId),
            isOriginal: true,
            lastDotCollectTime: Date.now()
        };
    }

    createDot() {
        return {
            id: this.generateId(),
            x: Math.random() * (this.config.canvasWidth - 40) + 20,
            y: Math.random() * (this.config.canvasHeight - 40) + 20,
            radius: 5,
            type: 'growth'
        };
    }

    updateCellPosition(cell) {
        if (cell.direction.x !== 0 || cell.direction.y !== 0) {
            const speed = this.config.speeds.base;
            cell.x += cell.direction.x * speed;
            cell.y += cell.direction.y * speed;
            this.handleBoundaryCollision(cell);
        }
    }

    handleBoundaryCollision(cell) {
        if (cell.x < cell.size) {
            cell.x = cell.size;
            cell.direction.x *= -1;
        } else if (cell.x > this.config.canvasWidth - cell.size) {
            cell.x = this.config.canvasWidth - cell.size;
            cell.direction.x *= -1;
        }
        
        if (cell.y < cell.size) {
            cell.y = cell.size;
            cell.direction.y *= -1;
        } else if (cell.y > this.config.canvasHeight - cell.size) {
            cell.y = this.config.canvasHeight - cell.size;
            cell.direction.y *= -1;
        }
    }

    handleCellCollisions(cells) {
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                const cellA = cells[i];
                const cellB = cells[j];
                
                const dx = cellB.x - cellA.x;
                const dy = cellB.y - cellA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = cellA.size + cellB.size;
                
                if (distance < minDistance && distance > 0) {
                    const collisionAngle = Math.atan2(dy, dx);
                    [cellA.direction.x, cellB.direction.x] = [cellB.direction.x, cellA.direction.x];
                    [cellA.direction.y, cellB.direction.y] = [cellB.direction.y, cellA.direction.y];
                    
                    const overlap = minDistance - distance;
                    const separateX = (overlap * Math.cos(collisionAngle)) / 2;
                    const separateY = (overlap * Math.sin(collisionAngle)) / 2;
                    
                    cellA.x -= separateX;
                    cellA.y -= separateY;
                    cellB.x += separateX;
                    cellB.y += separateY;
                }
            }
        }
    }

    checkDotCollisions(cell, dots, gameState) {
        for (let i = dots.length - 1; i >= 0; i--) {
            const dot = dots[i];
            const dx = dot.x - cell.x;
            const dy = dot.y - cell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < cell.size + dot.radius) {
                this.handleDotCollection(cell, gameState);
                dots.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    handleDotCollection(cell, gameState) {
        cell.lastDotCollectTime = Date.now();
        cell.adaptationDots++;
        
        if (cell.adaptationDots >= this.config.adaptationThreshold && !cell.isAdapted) {
            this.promoteCellToAdapted(cell);
        }
        
        if (cell.isAdapted) {
            this.spawnNewCell(cell, gameState);
        }
    }

    promoteCellToAdapted(cell) {
        cell.isAdapted = true;
        cell.size = this.config.cellSizes.adapted;
    }

    spawnNewCell(parentCell, gameState) {
        const angle = Math.random() * Math.PI * 2;
        const distance = parentCell.size * 2;
        
        const newCell = {
            id: this.generateId(),
            playerId: parentCell.playerId,
            x: parentCell.x + Math.cos(angle) * distance,
            y: parentCell.y + Math.sin(angle) * distance,
            size: this.config.cellSizes.adapted,
            speed: this.config.speeds.base,
            direction: {
                x: Math.cos(angle) + (Math.random() - 0.5) * 0.5,
                y: Math.sin(angle) + (Math.random() - 0.5) * 0.5
            },
            adaptationDots: 0,
            isAdapted: true,
            color: '#00ffff',
            isOriginal: false,
            lastDotCollectTime: Date.now()
        };

        const length = Math.sqrt(newCell.direction.x * newCell.direction.x + 
                                newCell.direction.y * newCell.direction.y);
        if (length > 0) {
            newCell.direction.x /= length;
            newCell.direction.y /= length;
        }

        gameState.cells.push(newCell);
        this.handleBoundaryCollision(newCell);
    }

    determineGamePhase(population) {
        if (population === 0) return 'lag';
        if (population < this.config.phaseThresholds.lag) return 'lag';
        if (population < this.config.phaseThresholds.exponential) return 'exponential';
        if (population < this.config.phaseThresholds.stationary) return 'stationary';
        return 'death';
    }

    handlePhaseLogic(gameState) {
        const population = gameState.cells.length;
        
        switch (gameState.phase) {
            case 'death':
                if (population > 1 && Math.random() < 0.02) {
                    const randomIndex = Math.floor(Math.random() * gameState.cells.length);
                    gameState.cells.splice(randomIndex, 1);
                }
                break;
                
            case 'stationary':
                if (Math.random() < 0.01 && population > 1) {
                    const randomIndex = Math.floor(Math.random() * gameState.cells.length);
                    gameState.cells.splice(randomIndex, 1);
                }
                break;
        }

        const currentTime = Date.now();
        for (let i = gameState.cells.length - 1; i >= 0; i--) {
            const cell = gameState.cells[i];
            if (currentTime - cell.lastDotCollectTime > 5000) {
                gameState.cells.splice(i, 1);
            }
        }
    }

    updateGame(gameState) {
        // Update cell positions
        gameState.cells.forEach(cell => {
            this.updateCellPosition(cell);
        });

        // Handle collisions
        this.handleCellCollisions(gameState.cells);

        // Check dot collisions for each cell
        gameState.cells.forEach(cell => {
            this.checkDotCollisions(cell, gameState.dots, gameState);
        });

        // Update game phase
        gameState.phase = this.determineGamePhase(gameState.cells.length);
        this.handlePhaseLogic(gameState);
    }

    getUniquePlayerColor() {
        const playerColors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
            '#9B5DE5', '#F15BB5', '#00BBF9', '#FB5607', '#8338EC'
        ];
        
        const usedColors = Array.from(this.playerColors.values());
        const availableColors = playerColors.filter(color => !usedColors.includes(color));
        
        if (availableColors.length > 0) {
            return availableColors[Math.floor(Math.random() * availableColors.length)];
        }
        
        return playerColors[Math.floor(Math.random() * playerColors.length)];
    }

    // FIXED METHOD: This was missing!
    initializeGame(gameState) {
        // Create initial dots
        for (let i = 0; i < this.config.maxDots; i++) {
            gameState.dots.push(this.createDot());
        }
        gameState.phase = 'lag';
    }

    // Add restart method to clear player colors
    restartGame(gameState) {
        this.playerColors.clear();
    }
}

module.exports = GameLogic;
