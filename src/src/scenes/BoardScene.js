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
    inventoryPanel = null;
    inventoryItems = [];
    uiCamera = null;
    inventoryScrollOffset = 0;
    inventoryMaxScroll = 0;
    inventoryScrollZone = null;
    scrollbar = null;
    scrollThumb = null;

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
        this.baseLayer = this.map.createBlankLayer('layer', tileset, 590, 40);

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

        // Create inventory panel
        this.createInventoryPanel();

        // Create UI camera for inventory panel (separate from main camera)
        this.uiCamera = this.cameras.add(0, 0, 1280, 720);
        this.uiCamera.setName('ui');

        // Set UI camera to ignore main game objects
        this.uiCamera.ignore([this.map, this.baseLayer]);

        // Set main camera to ignore UI objects (we'll add this ignore list in createInventoryPanel)
        const mainCamera = this.cameras.main;

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
            const tileType = this.baseLayer.getTileAt(tile.x, tile.y).index;
            const isPlaceable = this.isTilePlaceable(tileType);
            
            this.previewSprite.setPosition(coords.x, coords.y);
            this.previewSprite.setVisible(true);
            
            // Set color based on whether tile is placeable
            if (isPlaceable) {
                this.previewSprite.setTint(0xffffff); // Normal color
            } else {
                this.previewSprite.setTint(0xff4444); // Red tint for non-placeable
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

            if (!this.selectedTree) {
                console.log('No tree selected to plant.');
                return;
            }

            // Check if tile is placeable
            const tileType = this.baseLayer.getTileAt(x, y).index;
            if (!this.isTilePlaceable(tileType)) {
                console.log(`Cannot place tree on tile type ${tileType} at (${x}, ${y}).`);
                return;
            }

            // Fake server call
            this.mockServerPlantTree(this.selectedTree.id, x, y)
                .then((responseTree) => {
                    if (!responseTree) {
                        console.log('Server rejected tree planting.');
                        return;
                    }

                    const planted = GameState.plantTree(this.selectedTree.id, x, y);
                    if (!planted) return;

                    const treeCoords = this.getTileCoordsForTree(x, y);
                    const newTreeSprite = this.add.image(treeCoords.x, treeCoords.y, 'spritesheet', responseTree.specie + '_4.png');
                    // Make sure new planted tree is ignored by UI camera
                    this.uiCamera.ignore(newTreeSprite);

                    // Update inventory display and selected tree
                    this.updateInventoryPanel();
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
            const treeSprite = this.add.image(treeCoords.x, treeCoords.y, 'spritesheet', tree.specie + '_4.png');
            // Make sure planted trees are ignored by UI camera
            this.uiCamera.ignore(treeSprite);
        });

        // Add keyboard input handling for Esc key
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.selectedTree) {
                this.deselectTree();
                console.log('Tree deselected');
            }
        });
    }

    createInventoryPanel() {
        // Create panel background
        const panelX = 10;
        const panelY = 10;
        const panelWidth = 120;
        const panelHeight = 300;

        this.inventoryPanel = this.add.graphics();
        this.inventoryPanel.fillStyle(0x333333, 0.8);
        this.inventoryPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        this.inventoryPanel.lineStyle(2, 0x666666);
        this.inventoryPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

        // Add title
        const title = this.add.text(panelX + panelWidth/2, panelY + 20, 'Tree Inventory', {
            fontSize: '12px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5, 0);

        // Create invisible scroll zone for mouse wheel events
        this.inventoryScrollZone = this.add.zone(panelX, panelY + 40, panelWidth, panelHeight - 40);
        this.inventoryScrollZone.setInteractive();

        // Create scrollbar background
        this.scrollbar = this.add.graphics();
        this.scrollbar.fillStyle(0x555555, 0.6);
        this.scrollbar.fillRoundedRect(panelX + panelWidth - 8, panelY + 40, 6, panelHeight - 40, 3);

        // Create scrollbar thumb
        this.scrollThumb = this.add.graphics();

        // Set up UI camera to only see UI elements
        const uiObjects = [this.inventoryPanel, title, this.inventoryScrollZone, this.scrollbar, this.scrollThumb];
        this.cameras.main.ignore(uiObjects);

        // Add global mouse wheel listener for inventory scrolling
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Check if mouse is over inventory panel area
            if (pointer.x >= panelX && pointer.x <= panelX + panelWidth &&
                pointer.y >= panelY + 40 && pointer.y <= panelY + panelHeight) {
                
                const scrollAmount = 60; // pixels per scroll step
                this.inventoryScrollOffset += deltaY > 0 ? scrollAmount : -scrollAmount;
                this.inventoryScrollOffset = Math.max(0, Math.min(this.inventoryScrollOffset, this.inventoryMaxScroll));
                this.updateInventoryPanel();
            }
        });

        this.updateInventoryPanel();
    }

    updateInventoryPanel() {
        // Clear existing inventory items
        this.inventoryItems.forEach(item => {
            if (item.sprite) item.sprite.destroy();
            if (item.text) item.text.destroy();
            if (item.bg) item.bg.destroy();
        });
        this.inventoryItems = [];

        const inventory = GameState.getTreeInventory();
        const panelX = 10;
        const panelY = 10;
        const panelHeight = 300;
        const visibleAreaHeight = panelHeight - 80; // Account for title and padding
        const startY = 50;
        const itemHeight = 60;
        const uiObjects = []; // Track UI objects to ignore in main camera

        // Calculate max scroll offset
        const totalContentHeight = inventory.length * itemHeight;
        this.inventoryMaxScroll = Math.max(0, totalContentHeight - visibleAreaHeight);

        // Clamp scroll offset
        this.inventoryScrollOffset = Math.max(0, Math.min(this.inventoryScrollOffset, this.inventoryMaxScroll));

        // Calculate which items are visible
        const firstVisibleIndex = Math.floor(this.inventoryScrollOffset / itemHeight);
        const lastVisibleIndex = Math.min(
            inventory.length - 1,
            firstVisibleIndex + Math.ceil(visibleAreaHeight / itemHeight)
        );

        // Create a clipping mask for the visible area
        const mask = this.make.graphics();
        mask.fillStyle(0xffffff);
        mask.fillRect(panelX + 5, panelY + 40, 110, visibleAreaHeight);

        for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
            const tree = inventory[i];
            const itemY = startY + (i * itemHeight) - this.inventoryScrollOffset;
            
            // Skip if item is outside visible area
            if (itemY + itemHeight < startY || itemY > startY + visibleAreaHeight) {
                continue;
            }

            const isSelected = this.selectedTree && this.selectedTree.id === tree.id;

            // Create item background
            const itemBg = this.add.graphics();
            itemBg.fillStyle(isSelected ? 0x4a4a4a : 0x2a2a2a, 0.8);
            itemBg.fillRoundedRect(panelX + 5, itemY, 110, 55, 4);
            if (isSelected) {
                itemBg.lineStyle(2, 0x66aa66);
                itemBg.strokeRoundedRect(panelX + 5, itemY, 110, 55, 4);
            }
            itemBg.setInteractive(new Phaser.Geom.Rectangle(panelX + 5, itemY, 110, 55), Phaser.Geom.Rectangle.Contains);

            // Add tree sprite
            const treeSprite = this.add.image(panelX + 30, itemY + 20, 'spritesheet', tree.specie + '_4.png');
            treeSprite.setScale(0.4);

            // Add tree info text
            const levelText = tree.level ? `Lv.${tree.level}` : 'Lv.1';
            const premiumText = tree.isPremium ? '★' : '';
            const infoText = this.add.text(panelX + 55, itemY + 10, `${levelText}\n${premiumText}`, {
                fontSize: '10px',
                fill: tree.isPremium ? '#ffdd44' : '#ffffff'
            });

            // Apply mask to clip items to visible area
            itemBg.setMask(mask.createGeometryMask());
            treeSprite.setMask(mask.createGeometryMask());
            infoText.setMask(mask.createGeometryMask());

            // Track UI objects
            uiObjects.push(itemBg, treeSprite, infoText);

            // Make item clickable
            itemBg.on('pointerdown', () => {
                this.selectTree(tree);
            });

            itemBg.on('pointerover', () => {
                if (!isSelected) {
                    itemBg.clear();
                    itemBg.fillStyle(0x3a3a3a, 0.8);
                    itemBg.fillRoundedRect(panelX + 5, itemY, 110, 55, 4);
                }
            });

            itemBg.on('pointerout', () => {
                if (!isSelected) {
                    itemBg.clear();
                    itemBg.fillStyle(0x2a2a2a, 0.8);
                    itemBg.fillRoundedRect(panelX + 5, itemY, 110, 55, 4);
                }
            });

            this.inventoryItems.push({
                bg: itemBg,
                sprite: treeSprite,
                text: infoText
            });
        }

        // Update scrollbar thumb
        this.updateScrollbar();

        // Add "No trees" message if inventory is empty
        if (inventory.length === 0) {
            const emptyText = this.add.text(panelX + 60, startY + 20, 'No trees\navailable', {
                fontSize: '11px',
                fill: '#888888',
                align: 'center'
            }).setOrigin(0.5, 0);

            uiObjects.push(emptyText);
            this.inventoryItems.push({
                text: emptyText
            });
        }

        // Make main camera ignore all UI objects
        this.cameras.main.ignore(uiObjects.concat([mask]));
    }

    updateScrollbar() {
        if (this.inventoryMaxScroll <= 0) {
            // Hide scrollbar if no scrolling needed
            this.scrollThumb.clear();
            return;
        }

        const panelX = 10;
        const panelY = 10;
        const panelWidth = 120;
        const panelHeight = 300;
        const scrollbarHeight = panelHeight - 40;
        const thumbHeight = Math.max(20, (scrollbarHeight * scrollbarHeight) / (scrollbarHeight + this.inventoryMaxScroll));
        const thumbY = panelY + 40 + (this.inventoryScrollOffset / this.inventoryMaxScroll) * (scrollbarHeight - thumbHeight);

        this.scrollThumb.clear();
        this.scrollThumb.fillStyle(0xaaaaaa, 0.8);
        this.scrollThumb.fillRoundedRect(panelX + panelWidth - 8, thumbY, 6, thumbHeight, 3);
    }

    selectTree(tree) {
        this.selectedTree = tree;
        this.updateInventoryPanel(); // Refresh to show selection

        // Update preview sprite
        if (this.previewSprite) {
            this.previewSprite.destroy();
        }

        this.previewSprite = this.add.image(0, 0, 'spritesheet', tree.specie + '_4.png');
        this.previewSprite.setAlpha(0.5);
        this.previewSprite.setDepth(999);
        this.previewSprite.setVisible(false);
        // Make sure preview sprite is ignored by UI camera
        this.uiCamera.ignore(this.previewSprite);

        console.log(`Selected tree: ${tree.specie}, Level: ${tree.level || 1}`);
    }

    deselectTree() {
        this.selectedTree = null;
        if (this.previewSprite) {
            this.previewSprite.destroy();
            this.previewSprite = null;
        }
        this.updateInventoryPanel();
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

    isTilePlaceable(tileType) {
        return tileType === 2 || tileType === 0;
    }

}