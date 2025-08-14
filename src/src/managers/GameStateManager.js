class GameStateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.player = null;
        this.treeById = new Map();
        this.loadPlayer(this.getMockPlayerData());
    }

    loadPlayer(playerData) {
        this.player = playerData;

        this.treeById.clear();
        for (const tree of playerData.plantedTrees) {
            this.treeById.set(tree.id, tree);
        }
    }

    getPlayer() {
        return this.player;
    }

    getPlantedTrees() {
        return this.player?.plantedTrees || [];
    }

    getTreeInventory() {
        return this.player?.treeInventory || [];
    }

    getTreeById(id) {
        return this.treeById.get(id);
    }

    getTreeAt(x, y) {
        for (const tree of this.getPlantedTrees()) {
            if (tree.x === x && tree.y === y) return tree;
        }
        return null;
    }

    plantTree(treeId, x, y) {
        const tree = this.getTreeInventory().find(t => t.id === treeId);
        if (!tree) {
            console.warn(`Tree ${treeId} not found in inventory.`);
            return false;
        }

        tree.x = x;
        tree.y = y;
        tree.plantedAt = Date.now();
        tree.lastCollectedAt = Date.now();
        tree.level = tree.level || 1;
        tree.yieldRate = this.getYieldForLevel(tree.level);

        // Move from inventory → planted
        this.player.plantedTrees.push(tree);
        this.player.treeInventory = this.player.treeInventory.filter(t => t.id !== treeId);
        this.treeById.set(tree.id, tree);

        return true;
    }

    getYieldForLevel(level) {
        return 5 + level * 3;
    }

    collectFromTree(treeId) {
        const tree = this.getTreeById(treeId);
        if (!tree) return 0;

        const now = Date.now();
        const hoursSinceLastCollect = (now - tree.lastCollectedAt) / (1000 * 60 * 60);
        if (hoursSinceLastCollect < 8) return 0; // not ready yet

        const payout = tree.yieldRate;
        tree.lastCollectedAt = now;
        this.player.ecoins += payout;

        return payout;
    }

    getMockPlayerData() {
        return {
            id: 'player-001',
            apiKey: 'mock-key-xyz',
            ecoins: 250,
            energy: 40,
            nextEcoinPayoutAt: Date.now() + 1000 * 60 * 60 * 8, // 8 hours from now
            plantedTrees: [
                {
                    id: '1559341921',
                    specie: '75',
                    level: 2,
                    isPremium: false,
                    x: 4,
                    y: 5,
                    plantedAt: Date.now() - 1000 * 60 * 60 * 12, // 12h ago
                    lastCollectedAt: Date.now() - 1000 * 60 * 60 * 8,
                    yieldRate: 11
                },
                {
                    id: '1559461884',
                    specie: '106',
                    level: 1,
                    isPremium: true,
                    x: 6,
                    y: 3,
                    plantedAt: Date.now() - 1000 * 60 * 60 * 24,
                    lastCollectedAt: Date.now() - 1000 * 60 * 60 * 10,
                    yieldRate: 8
                }
            ],
            treeInventory: [
                {
                    id: '1559682618',
                    specie: '0',
                    level: 1,
                    isPremium: false
                },
                {
                    id: '1559682611',
                    specie: '100',
                    level: 2,
                    isPremium: true
                }
            ]
        };
    }
}

// Singleton export
const instance = new GameStateManager();
export default instance;
