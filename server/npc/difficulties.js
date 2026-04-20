

const DIFFICULTIES = {
    easy: {
        name: 'Easy',
        tickRate: 1000,          
        bombChance: 0.30,
        randomMoveChance: 0.45,  
        fleeRadius: 1,           
        canCollectPowerups: false,
        stats: { speed: 3, aggression: 2, accuracy: 2 }
    },

    medium: {
        name: 'Medium',
        tickRate: 650,
        bombChance: 0.60,
        randomMoveChance: 0.15,
        fleeRadius: 2,
        canCollectPowerups: true,
        stats: { speed: 6, aggression: 6, accuracy: 5 }
    },

    hard: {
        name: 'Hard',
        tickRate: 350,           
        bombChance: 0.88,
        randomMoveChance: 0.05,  
        fleeRadius: 3,
        canCollectPowerups: true,
        stats: { speed: 9, aggression: 9, accuracy: 9 }
    }
};

module.exports = DIFFICULTIES;
