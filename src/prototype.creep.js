var roles = {
    harvester: require('role.harvester'),
    worker: require('role.worker'),
    // claimer: require('role.claimer'),
    // miner: require('role.miner'),
    // lorry: require('role.lorry')
};

Creep.prototype.runRole =
    function () {
        let clazz = roles[this.memory.role];
        if (clazz) {
            new clazz(this);
        }
    };

/** @function 
    @param {bool} useContainer
    @param {bool} useSource */
Creep.prototype.getEnergy =
    function (useSource) {

        /** @type {StructureContainer} */
        let container = this.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) &&
                             s.store[RESOURCE_ENERGY] > 0
            });
            
            // if one was found
        if (container != undefined) {
            // try to withdraw energy, if the container is not in range
            if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                // move towards it
                this.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
 
        // if no container was found and the Creep should look for Sources
        if (container == undefined && useSource) {
            // find closest source
            var source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            

            // try to harvest energy, if the source is not in range
            if (this.harvest(source) == ERR_NOT_IN_RANGE) {
                // move towards it
                this.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    };
    
Creep.prototype.putEnergy = function () {
    var creep = this;
    
    var structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            // the second argument for findClosestByPath is an object which takes
            // a property called filter which can be a function
            // we use the arrow operator to define it
            filter: (s) => (s.structureType == STRUCTURE_SPAWN
                         || s.structureType == STRUCTURE_EXTENSION
                         || s.structureType == STRUCTURE_TOWER)
                         && s.energy < s.energyCapacity 
        
    });

    if (structure == undefined) {
        structure = creep.room.storage;
    }
   
    if (structure == undefined) {
        structure = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_CONTAINER && _.sum(i.store) < i.storeCapacity
        });
    }

    // if we found one
    if (structure != undefined) {
        // try to transfer energy, if it is not in range
        if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            // move towards it
            creep.moveTo(structure, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};

