export default class BoardScene extends Phaser.Scene {
    constructor() {
        super('BoardScene');
    }

    preload() {
        this.load.atlas(
            'tileset',
            './assets/spritesheet.png',
            './assets/spritesheet.json'
        );
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
                const x = (col - row) * tileWidth / 2 + offsetX;
                const y = (col + row) * tileHeight / 2 + offsetY;

                this.add.image(x, y, 'tileset', 'landscapeTiles_067.png');
            }
        }
    }
}
