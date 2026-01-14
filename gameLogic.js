class GameLogic {
    constructor() {
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            maxDots: 25,
            adaptationThreshold: 2,  // Reduced from 3 to 2
            cellSizes: {
                lag: 15,
                adapted: 20
            },
            speeds: {
                base: 3              // Single speed for all phases
            },
            phaseThresholds: {
                lag: 5,              // Lower threshold for faster progression
                exponential: 20,     // Lower thresholds for faster game
                stationary: 40
            },
            dotSpawnRates: {
                lag: 0.08,           // Increased spawn rate
                exponential: 0.12,
                stationary: 0.04,
                death: 0.01
            }
        };
    }

    // Generate unique IDs
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Create initial cell for new player
    createInitialCell(playerId) {
        return {
            id: this.generateId(),
            playerId: playerId,
            x: Math.random() * (this.config.canvasWidth - 100) + 50,
            y: Math.random() * (this.config.canvasHeight - 100) + 50,
            size: this.config.cellSizes.lag,
            speed: this.config.speeds.base,  // Single speed
            direction: { x: 0, y: 0 },
            adaptationDots: 0,
            isAdapted: false,
            color: this.getRandomColor(),
            lastDotCollectTime: Date.now()
        };
    }

    // Create ONLY GREEN DOTS now
    createDot() {
        return {
            id: this.generateId(),
            x: Math.random() * (this.config.canvasWidth - 40) + 20,
            y: Math.random() * (this.config.canvasHeight - 40) + 20,
            radius: 5,
            type: 'growth'  // All dots are now green growth dots
        };
    }

    // Update cell position based on direction (simplified speed)
    updateCellPosition(cell) {
        if (cell.direction.x !== 0 || cell.direction.y !== 0) {
            const speed = this.config.speeds.base;  // Always same speed
            cell.x += cell.direction.x * speed;
            cell.y += cell.direction.y * speed;
            
            // Boundary checking with bouncing
            this.handleBoundaryCollision(cell);
        }
    }

    // Handle collisions with canvas boundaries
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

    // Check for collisions between cells
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
                    // Collision detected - simple elastic collision
                    const collisionAngle = Math.atan2(dy, dx);
                    
                    // Swap velocities (simplified bouncing)
                    [cellA.direction.x, cellB.direction.x] = [cellB.direction.x, cellA.direction.x];
                    [cellA.direction.y, cellB.direction.y] = [cellB.direction.y, cellA.direction.y];
                    
                    // Separate cells to prevent sticking
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

    // Check for dot collisions and handle collection
    checkDotCollisions(cell, dots, gameState) {
        for (let i = dots.length - 1; i >= 0; i--) {
            const dot = dots[i];
            const dx = dot.x - cell.x;
            const dy = dot.y - cell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < cell.size + dot.radius) {
                this.handleDotCollection(cell, dot, gameState);
                dots.splice(i, 1);
                return true; // Dot collected
            }
        }
        return false; // No dot collected
    }

    // Dot handling - All green dots help adaptation AND growth

    handleDotCollection(cell, dot, gameState) {
        cell.lastDotCollectTime = Date.now();
        
        // ALL DOTS NOW HELP BOTH ADAPTATION AND GROWTH
        cell.adaptationDots++;
        
        if (cell.adaptationDots >= this.config.adaptationThreshold && !cell.isAdapted) {
            this.promoteCellToAdapted(cell);
        }
        
        // If adapted, spawn new cell
        if (cell.isAdapted) {
            this.spawnNewCell(cell, gameState);
        }
    }


    // Promote cell from lag phase to adapted state
    promoteCellToAdapted(cell) {
        cell.isAdapted = true;
        cell.size = this.config.cellSizes.adapted;
        // Speed stays the same for all phases
        cell.color = '#00ffff'; // Cyan for adapted cells
    }

    // Spawn a new cell through binary fission
    spawnNewCell(parentCell, gameState) {
        const angle = Math.random() * Math.PI * 2;
        const distance = parentCell.size * 2;
        
        const newCell = {
            id: this.generateId(),
            playerId: parentCell.playerId,
            x: parentCell.x + Math.cos(angle) * distance,
            y: parentCell.y + Math.sin(angle) * distance,
            size: this.config.cellSizes.adapted,
            speed: this.config.speeds.base,  // Same speed
            direction: {
                x: Math.cos(angle) + (Math.random() - 0.5) * 0.5,
                y: Math.sin(angle) + (Math.random() - 0.5) * 0.5
            },
            adaptationDots: 0,
            isAdapted: true,  // New cells spawn already adapted
            color: parentCell.color,
            lastDotCollectTime: Date.now()
        };

        // Normalize direction
        const length = Math.sqrt(newCell.direction.x * newCell.direction.x + 
                                newCell.direction.y * newCell.direction.y);
        if (length > 0) {
            newCell.direction.x /= length;
            newCell.direction.y /= length;
        }

        gameState.cells.push(newCell);
        
        // Boundary check for new cell
        this.handleBoundaryCollision(newCell);
    }

    // Determine current game phase based on population
    determineGamePhase(population) {
        if (population === 0) return 'lag';
        if (population < this.config.phaseThresholds.lag) return 'lag';
        if (population < this.config.phaseThresholds.exponential) return 'exponential';
        if (population < this.config.phaseThresholds.stationary) return 'stationary';
        return 'death';
    }

    // Handle phase-specific logic
    handlePhaseLogic(gameState) {
        const phase = gameState.phase;
        const population = gameState.cells.length;
                
        // Phase-specific effects
        switch (phase) {
            case 'death':
                // Cells die randomly in death phase
                if (population > 1 && Math.random() < 0.02) {
                    const randomIndex = Math.floor(Math.random() * gameState.cells.length);
                    gameState.cells.splice(randomIndex, 1);
                }
                break;
                
            case 'stationary':
                // Slow metabolism in stationary phase
                if (Math.random() < 0.01 && population > 1) {
                    const randomIndex = Math.floor(Math.random() * gameState.cells.length);
                    gameState.cells.splice(randomIndex, 1);
                }
                break;
        }

        // Cells starve if they don't collect dots for too long
        const currentTime = Date.now();
        for (let i = gameState.cells.length - 1; i >= 0; i--) {
            const cell = gameState.cells[i];
            if (currentTime - cell.lastDotCollectTime > 5000) { 
                gameState.cells.splice(i, 1);
            }
        }
    }


    // Update all game physics and logic
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
        
        // Apply phase-specific logic
        this.handlePhaseLogic(gameState);
    }

    // Get random color for cells
    getRandomColor() {
        const colors = [
            '#00ffff', '#0099ff', '#00ff99', '#99ff00', 
            '#ff9900', '#ff0099', '#9900ff', '#ff00ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Initialize game with starting dots
    initializeGame(gameState) {
        // Start with more dots since they won't spawn automatically
        for (let i = 0; i < this.config.maxDots; i++) {
            gameState.dots.push(this.createDot());
        }
        gameState.phase = 'lag';
    }
}

module.exports = GameLogic;
