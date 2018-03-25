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
            
        if (container != undefined) {
            if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                this.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
 
        if (container == undefined && useSource) {
            var source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            
            if (this.harvest(source) == ERR_NOT_IN_RANGE) {
                this.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        
        if (container == undefined) {
            let containers = this.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            });
            
            if (!containers.length) {
                container = this.pos.findClosestByPath(FIND_MY_SPAWNS, (s) => s.energy > 0);
                if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    this.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
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

Creep.prototype.setTask = function(task) {
    if (!task.targetId) {
        console.log('wrong task');
        return;
    }
    
    this.memory.task = task;
    Memory.tasks[task.targetId] = Memory.tasks[task.targetId] || task;
    Memory.tasks[task.targetId].creeps = Memory.tasks[task.targetId].creeps;
    Memory.tasks[task.targetId].creeps.push(this.name);
};

Creep.prototype.removeTask = function() {
    if (!this.memory.task || !this.memory.task.targetId) {
        return;
    }
    
    let task = Memory.tasks[this.memory.task.targetId];
    if (task && task.creeps) {
        let index = task.creeps.indexOf(this.name);
        if (index != -1) {
            task.creeps.splice(index, 1);
        }
        if (!task.creeps.length) {
            delete Memory.tasks[task.targetId];
        }
    }
    delete this.memory['task'];
};
