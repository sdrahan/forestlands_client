export default class BoardScene extends Phaser.Scene {
    constructor() {
        super('BoardScene');
    }

    preload() {
        this.load.spritesheet('tiles', './assets/tiles.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    create() {
        const tileWidth = 64;
        const tileHeight = 32;

        const boardWidth = 10;
        const boardHeight = 10;

        // Center the board
        const offsetX = this.cameras.main.centerX;
        const offsetY = 100;

        for (let row = 0; row < boardHeight; row++) {
            for (let col = 0; col < boardWidth; col++) {
                // Isometric projection
                const x = (col - row) * tileWidth / 2 + offsetX;
                const y = (col + row) * tileHeight / 2 + offsetY;

                this.add.image(x, y, 'tiles', 0);
            }
        }
    }
}
