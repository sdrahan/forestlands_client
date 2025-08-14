import GameState from '../managers/GameStateManager.js';

export default class BoardScene extends Phaser.Scene {
    constructor() {
        super('BoardScene');
    }

    map;
    baseLayer;
    lastHoveredTile;
    selectedTree = null;
    previewSprite = null;
    cameraIsBeingScrolled = false;

    preload() {
        this.load.atlas(
            'spritesheet',
            './assets/spritesheet.png',
            './assets/spritesheet.json'
        );

        this.load.image('tiles', './assets/landscape_tilesheet.png')
    }

    create() {
        const mapData = new Phaser.Tilemaps.MapData({
            width: 10,
            height: 10,
            tileWidth: 100,
            tileHeight: 50,
            orientation: Phaser.Tilemaps.Orientation.ISOMETRIC,
            format: Phaser.Tilemaps.Formats.ARRAY_2D
        });

        this.map = new Phaser.Tilemaps.Tilemap(this, mapData);
        const tileset = this.map.addTilesetImage('iso-outside', 'tiles', 100, 65);
        this.baseLayer = this.map.createBlankLayer('layer', tileset, 350, 40);

        const data = [
            [ 2, 2, 2, 2, 2, 0, 3, 3, 3, 0 ],
            [ 2, 2, 2, 2, 2, 0, 0, 0, 0, 0 ],
            [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ],
            [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ],
            [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ],
            [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ],
            [ 2, 2, 2, 2, 2, 2, 3, 3, 3, 2 ],
            [ 2, 2, 2, 2, 2, 2, 3, 3, 3, 2 ],
            [ 2, 2, 2, 2, 2, 2, 3, 3, 3, 2 ],
            [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2 ]
        ];

        let y = 0;
        data.forEach(row => {
            row.forEach((tile, x) => {
                this.baseLayer.putTileAt(tile, x, y);
            });
            y++;
        });

        this.lastHoveredTile = null;
        this.input.on('pointermove', (pointer) => {
            const worldPoint = pointer.positionToCamera(this.cameras.main);
            const tile = this.baseLayer.getIsoTileAtWorldXY(worldPoint.x, worldPoint.y);

            if (tile !== this.lastHoveredTile) {
                if (this.lastHoveredTile) {
                    // this.lastHoveredTile.setAlpha(1);
                }
                if (tile) {
                    // tile.setAlpha(0.7);
                }
                this.lastHoveredTile = tile;
            }
        });

        this.selectedTree = GameState.getTreeInventory()[0];

        if (this.selectedTree) {
            this.previewSprite = this.add.image(0, 0, 'spritesheet', this.selectedTree.specie + '_4.png');
            this.previewSprite.setAlpha(0.5);
            this.previewSprite.setDepth(999); // always on top
            this.previewSprite.setVisible(false);
        }

        const camera = this.cameras.main;
        let cameraDragStartX;
        let cameraDragStartY;

        this.input.on('pointerdown', () => {
            cameraDragStartX = camera.scrollX;
            cameraDragStartY = camera.scrollY;
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                let scrollX = cameraDragStartX + (pointer.downX - pointer.x) / camera.zoom;
                let scrollY = cameraDragStartY + (pointer.downY - pointer.y) / camera.zoom;
                camera.scrollX = scrollX;
                camera.scrollY = scrollY;

                if (scrollX !== 0 || scrollY !== 0) {
                    this.cameraIsBeingScrolled = true;
                }
            }

            const worldPoint = pointer.positionToCamera(this.cameras.main);
            const tile = this.baseLayer.getIsoTileAtWorldXY(worldPoint.x, worldPoint.y);

            if (!tile || !this.selectedTree || GameState.getTreeAt(tile.x, tile.y)) {
                if (this.previewSprite) this.previewSprite.setVisible(false);
                return;
            }

            const coords = this.getTileCoordsForTree(tile.x, tile.y);
            this.previewSprite.setPosition(coords.x, coords.y);
            this.previewSprite.setVisible(true);
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Get the current world point under pointer.
            const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
            const newZoom = camera.zoom - camera.zoom * 0.001 * deltaY;
            camera.zoom = Phaser.Math.Clamp(newZoom, 0.25, 2);

            // Update camera matrix, so `getWorldPoint` returns zoom-adjusted coordinates.
            camera.preRender();
            const newWorldPoint = camera.getWorldPoint(pointer.x, pointer.y);
            // Scroll the camera to keep the pointer under the same world point.
            camera.scrollX -= newWorldPoint.x - worldPoint.x;
            camera.scrollY -= newWorldPoint.y - worldPoint.y;
        });

        this.input.on('pointerup', (pointer) => {
            if (this.cameraIsBeingScrolled) {
                this.cameraIsBeingScrolled = false;
                return;
            }

            const worldPoint = pointer.positionToCamera(this.cameras.main);
            const tile = this.baseLayer.getIsoTileAtWorldXY(worldPoint.x, worldPoint.y);
            if (!tile) return;

            const x = tile.x;
            const y = tile.y;

            if (GameState.getTreeAt(x, y)) {
                console.log(`Tile (${x}, ${y}) is already occupied.`);
                return;
            }

            const tree = GameState.getTreeInventory()[0];
            if (!tree) {
                console.log('No trees in inventory to plant.');
                return;
            }

            // Fake server call
            this.mockServerPlantTree(tree.id, x, y)
                .then((responseTree) => {
                    if (!responseTree) {
                        console.log('Server rejected tree planting.');
                        return;
                    }

                    const planted = GameState.plantTree(tree.id, x, y);
                    if (!planted) return;

                    const treeCoords = this.getTileCoordsForTree(x, y);
                    this.add.image(treeCoords.x, treeCoords.y, 'spritesheet', responseTree.specie + '_4.png');

                    this.selectedTree = GameState.getTreeInventory()[0]; // get next one if any

                    if (this.selectedTree) {
                        this.previewSprite.setTexture('spritesheet', this.selectedTree.specie + '_4.png');
                        this.previewSprite.setVisible(false);
                    } else if (this.previewSprite) {
                        this.previewSprite?.destroy();
                        this.previewSprite = null;
                    }
                });
        });

        GameState.getPlantedTrees().forEach(tree => {
            const treeCoords = this.getTileCoordsForTree(tree.x, tree.y);
            this.add.image(treeCoords.x, treeCoords.y, 'spritesheet', tree.specie + '_4.png');
        });
    }

    update (time, delta)
    {

    }

    getTileCoordsForTree (tileX, tileY)
    {
        const treeOffsetX = 50;
        const treeOffsetY = -10;
        let tileWorldCoordsXY = this.baseLayer.tileToWorldXY(tileX, tileY);
        // console.log("Planting tree at coords: " + tileWorldCoordsXY.x + ", " + tileWorldCoordsXY.y);
        return { x: tileWorldCoordsXY.x + treeOffsetX, y: tileWorldCoordsXY.y + treeOffsetY };
    }

    mockServerPlantTree(treeId, x, y) {
        // This fakes a server response after a delay or validation.
        return new Promise((resolve) => {
            const tree = GameState.getTreeInventory().find(t => t.id === treeId);
            if (!tree) {
                resolve(null);
                return;
            }

            // Simulate server-side logic: validate and respond with the updated object
            const plantedTree = {
                ...tree,
                x: x,
                y: y,
                plantedAt: Date.now(),
                lastCollectedAt: Date.now(),
                yieldRate: GameState.getYieldForLevel(tree.level || 1)
            };

            // Fake instant server approval
            resolve(plantedTree);
        });
    }

}
