class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.chartCanvas = document.getElementById('growthChart');
        this.chartCtx = this.chartCanvas.getContext('2d');
        
        this.socket = io('https://cellgrowthgame.up.railway.app');
        this.gameState = {
            cells: [],
            dots: [],
            phase: 'lag',
            populationHistory: []
        };
        
        this.playerId = null;
        this.keys = {};
        this.lastUpdate = Date.now();
        
        this.init();
    }

    init() {
        // Socket event handlers
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
        });

        this.socket.on('gameState', (state) => {
            this.gameState = state;
            this.updateUI();
        });

        this.socket.on('gameUpdate', (update) => {
            this.gameState.cells = update.cells;
            this.gameState.dots = update.dots;
            this.gameState.phase = update.phase;
            this.gameState.populationHistory = update.populationHistory;
        });

        this.socket.on('playerCount', (count) => {
            document.getElementById('playerCount').textContent = count;
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.sendMovement();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Start game loop
        this.gameLoop();
        this.chartLoop();
    }

    sendMovement() {
        let direction = {x: 0, y: 0};
        
        if (this.keys['ArrowUp']) direction.y = -1;
        if (this.keys['ArrowDown']) direction.y = 1;
        if (this.keys['ArrowLeft']) direction.x = -1;
        if (this.keys['ArrowRight']) direction.x = 1;

        // Normalize diagonal movement
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length > 0) {
            direction.x /= length;
            direction.y /= length;
        }

        this.socket.emit('move', direction);
    }

    updateUI() {
        document.getElementById('population').textContent = this.gameState.cells.length;
        document.getElementById('phase').textContent = this.gameState.phase.charAt(0).toUpperCase() + 
                                                   this.gameState.phase.slice(1) + ' Phase';
        
        const playerCell = this.gameState.cells.find(cell => cell.playerId === this.playerId);
        if (playerCell) {
            document.getElementById('dotsCollected').textContent = playerCell.adaptationDots;
        }
    }

    gameLoop() {
        const now = Date.now();
        const delta = now - this.lastUpdate;
        this.lastUpdate = now;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dots
        this.gameState.dots.forEach(dot => {
            this.ctx.fillStyle = dot.type === 'adaptation' ? '#ffff00' : '#00ff00';
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw cells
        this.gameState.cells.forEach(cell => {
            // Different colors based on phase and adaptation
            if (cell.playerId === this.playerId) {
                this.ctx.fillStyle = cell.isAdapted ? '#00ffff' : '#ff9900';
            } else {
                this.ctx.fillStyle = cell.isAdapted ? '#0099ff' : '#ff6600';
            }

            this.ctx.beginPath();
            this.ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw nucleus/detail
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(cell.x, cell.y, cell.size / 3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw phase indicator
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Phase: ${this.gameState.phase.toUpperCase()}`, 10, 30);
        this.ctx.fillText(`Population: ${this.gameState.cells.length}`, 10, 50);

        requestAnimationFrame(() => this.gameLoop());
    }

    chartLoop() {
        this.drawGrowthChart();
        setTimeout(() => this.chartLoop(), 1000);
    }

    drawGrowthChart() {
        const ctx = this.chartCtx;
        const canvas = this.chartCanvas;
        
        // Clear chart
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (this.gameState.populationHistory.length < 2) return;

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = canvas.height * i / 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw growth curve
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const maxPopulation = Math.max(...this.gameState.populationHistory.map(p => p.population));
        const timeRange = 300; // Show last 5 minutes

        this.gameState.populationHistory.forEach((point, index) => {
            const x = (index / this.gameState.populationHistory.length) * canvas.width;
            const y = canvas.height - (point.population / Math.max(maxPopulation, 1)) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Label phases if identifiable
        if (this.gameState.populationHistory.length > 10) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px Arial';
            ctx.fillText('Growth Curve', 10, 15);
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new GameClient();
});
