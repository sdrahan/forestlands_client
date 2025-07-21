import BoardScene from './src/scenes/BoardScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    scene: [BoardScene],
    pixelArt: true
};

const game = new Phaser.Game(config);
