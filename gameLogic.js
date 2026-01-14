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

    // ... rest of gameLogic.js remains the same as my previous version
    // (all the methods like updateCellPosition, handleCellCollisions, etc.)
}

module.exports = GameLogic;
