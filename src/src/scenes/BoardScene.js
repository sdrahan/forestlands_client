export default class BoardScene extends Phaser.Scene {
    constructor() {
        super('BoardScene');
    }

    map;
    baseLayer;
    lastHoveredTile;

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
                    this.lastHoveredTile.setAlpha(1);
                }
                if (tile) {
                    tile.setAlpha(0.7);
                }
                this.lastHoveredTile = tile;
            }
        });

        const camera = this.cameras.main;
        let cameraDragStartX;
        let cameraDragStartY;

        this.input.on('pointerdown', () => {
            cameraDragStartX = camera.scrollX;
            cameraDragStartY = camera.scrollY;
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                camera.scrollX = cameraDragStartX + (pointer.downX - pointer.x) / camera.zoom;
                camera.scrollY = cameraDragStartY + (pointer.downY - pointer.y) / camera.zoom;
            }
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

        let treeCoords = this.getTileCoordsForTree(0, 0);
        let tree1 = this.add.image(treeCoords.x, treeCoords.y, 'spritesheet','75_4.png');
        treeCoords = this.getTileCoordsForTree(0, 2);
        let tree2 = this.add.image(treeCoords.x, treeCoords.y, 'spritesheet','106_4.png');
        // const graphics = this.add.graphics({ fillStyle: { color: 0xff0000 } });
        // graphics.fillCircle(treeCoords.x, treeCoords.y, 10);
        // graphics.fillCircle(0, 0, 10);
        treeCoords = this.getTileCoordsForTree(4, 4);
        let tree3 = this.add.image(treeCoords.x, treeCoords.y, 'spritesheet','0_7.png');
    }

    update (time, delta)
    {
        if (this.input.manager.activePointer.isDown)
        {
            const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
            const tile = this.baseLayer.getIsoTileAtWorldXY(worldPoint.x, worldPoint.y);
            console.log(worldPoint.x, worldPoint.y, tile);
        }
    }

    getTileCoordsForTree (tileX, tileY)
    {
        const treeOffsetX = 50;
        const treeOffsetY = -10;
        let tileWorldCoordsXY = this.baseLayer.tileToWorldXY(tileX, tileY);
        console.log("Planting tree at coords: " + tileWorldCoordsXY.x + ", " + tileWorldCoordsXY.y);
        return { x: tileWorldCoordsXY.x + treeOffsetX, y: tileWorldCoordsXY.y + treeOffsetY };
    }
}
