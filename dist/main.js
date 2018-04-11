/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('core.empire');
 * mod.thing == 'a thing'; // true
 */

 
var RoomManager = require('room.manager');
var RoomArchitector = require('room.architector');
var utils = require('utils');

Memory.tasks = Memory.tasks || {};
Memory.timers = Memory.timers || {};

var empire = {
    run: function() {
        Game.cache = {
            roomManagers: {}
        };

        this.cleanMemory();
        
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
                        
            if (room.controller.my) {
                let manager = new RoomManager(room);
                Game.cache.roomManagers[room.id] = manager;
                manager.makeActions();
                
                Memory.timers['architect'] = Memory.timers['architect'] || Game.time;
                let archTime = Memory.timers['architect'];
                if (manager && archTime + 10 < Game.time) {
                    let architector = new RoomArchitector(manager);
                }
            }
        }
        
        for (let creepName in Game.creeps) {
            Game.creeps[creepName].runRole();
        }
        
        if (Memory.timers['architect'] + 10 < Game.time) {
            Memory.timers['architect'] = Game.time;
        }
    },
    
    cleanMemory: function() {
        this.updateCreeps();
        this.updateTasks();
    },
    
    updateCreeps: function() {
        for(let creepName in Memory.creeps) {
            let creep = Game.creeps[creepName];
            if (!creep) {
                delete Memory.creeps[creepName];
            }
        }
    },
    
    updateTasks: function() {
        for (let t in Memory.tasks) {
            let task = Memory.tasks[t];
            
            for (let i in task.creeps) {
                let creepName = task.creeps[i];
                let creep = Game.creeps[creepName];
                if (!creep || !creep.memory.task || (creep.memory.task.targetId != task.targetId)) {
                    task.creeps.splice(i,1);
                }
            }
            
            if (!task.creeps || !task.creeps.length) {
                delete Memory.tasks[t];
            }
        }
    }
} 

module.exports = empire;;/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var _ = require('lodash');

var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function and add the prototype properties.
    child.prototype = _.create(parent.prototype, protoProps);
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};
  
var CoreObject = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    attrs = _.extend({}, attrs);
    this.initialize.apply(this, arguments);
};

CoreObject.prototype.initialize = function() {};

CoreObject.extend = extend;

module.exports = CoreObject;
;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('core.role');
 * mod.thing == 'a thing'; // true
 */
 
var CoreObject = require('core.object');
var _ = require('lodash');

var CoreRole = CoreObject.extend({
    tasks: {},
    
    initialize: function(creep) {
        this.creep = creep;
        let task = this.creep.memory.task;
        
        if(task && task.action) {
            let target = Game.getObjectById(task.targetId);
            if (target) {
                this.beforeTask(task);
                let result = this.doTask(task.action, target);
                this.afterTask(task, result);
            } else {
                creep.removeTask();
            }
        }
    },
    
    beforeTask: function(task) {
        
    },
    
    doTask: function(action, target) {
        let task = this.tasks[action];
        
        if (task) {
            let result = task(this.creep, target);
            if (result == false) {
                this.creep.removeTask();
            }
            return result;
        }
        
    },
    
    afterTask: function(task, result) {

    },
});

module.exports = CoreRole;;require('prototype.creep');
var empire = require('core.empire');

module.exports.loop = function () {
    if (Game.cpu.bucket < 2 * Game.cpu.tickLimit && Game.cpu.bucket < Game.cpu.limit * 10) {
        console.log('Skipping tick ' + Game.time + ' due to lack of CPU.');
        return;
    }
    empire.run(); 
};var utils = require('utils');

var roles = {
    harvester: require('role.harvester'),
    worker: require('role.worker'),
    // claimer: require('role.claimer'),
     miner: require('role.miner'),
     lorry: require('role.lorry')
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
                filter: s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] >= this.energyCapacity
            });
            
        if (container == undefined) {
            container = this.room.storage;
        }    
            
        if (container != undefined) {
            if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                this.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                return;
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
    
Creep.prototype.putEnergy = function(structure) {
    var creep = this;

    if (structure == undefined && creep.memory.energyContainer) {
        structure = Game.getObjectById(creep.memory.energyContainer);
    }

    if (structure == undefined) {
        structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                // the second argument for findClosestByPath is an object which takes
                // a property called filter which can be a function
                // we use the arrow operator to define it
                filter: (s) => (s.structureType == STRUCTURE_SPAWN
                             || s.structureType == STRUCTURE_EXTENSION
                             || s.structureType == STRUCTURE_TOWER)
                             && s.energy < s.energyCapacity 
            
        });
    }
    
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
        let code = creep.transfer(structure, RESOURCE_ENERGY);
        if (code == ERR_NOT_IN_RANGE) {
            // move towards it
            if (creep.moveTo(structure, {visualizePathStyle: {stroke: '#ffaa00'}}) === ERR_NO_PATH) {
                return false;
            } else {
                creep.memory.energyContainer = structure.id;
            }
        }
        if (code === -8) {
            delete creep.memory['energyContainer'];
        }
    } else {
        delete creep.memory['energyContainer'];
        return false;
    }
    
    return structure;
};

Creep.prototype.setTask = function(task) {
    if (!task.targetId) {
        console.log('wrong task');
        return;
    }
    
    this.memory.task = task;
    if (!Memory.tasks[task.targetId] && task) {
        Memory.tasks[task.targetId] = task;
        Memory.tasks[task.targetId].creeps = [];
    }
    
    if (task && Memory.tasks[task.targetId].creeps.indexOf(this.name) < 0) {
        Memory.tasks[task.targetId].creeps.push(this.name);
    }
};

Creep.prototype.removeTask = function() {
    if (!this.memory.task || !this.memory.task.targetId) {
        return;
    }
    
    let task = Memory.tasks[this.memory.task.targetId];
    if (task && task.creeps) {
        let index = task.creeps.indexOf(this.name);
        if (index < 0) {
            task.creeps.splice(index, 1);
        }
        if (!task.creeps.length) {
            delete Memory.tasks[task.targetId];
        }
    }
    delete this.memory['task'];
};

var _harvest = Creep.prototype.harvest;
Creep.prototype.harvest = function() {
    let _this = this;
    let result = _harvest.apply(this, arguments);
    if (result === OK) {
        this.room.memory.energyHarvested += this.getActiveBodyparts(WORK) * 2;
    }

    return result;
}
;
var CoreRole = require('core.role');

var RoleHarvester = CoreRole.extend({
    tasks: {
        'harvest': require('task.harvest'),
        'pickup': require('task.pickup')
    }
});

module.exports = RoleHarvester;
;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.lorry');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleHarvester = CoreRole.extend({
    tasks: {
        'lorry': require('task.lorry'),
        'pickup': require('task.pickup')
    }
});

module.exports = RoleHarvester;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.miner');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleMiner = CoreRole.extend({
    tasks: {
        'mine': require('task.mine')
    }
});

module.exports = RoleMiner;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.builder');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleWorker = CoreRole.extend({
    tasks: {
        'harvest': require('task.harvest'),
        'repair': require('task.repair'),
        'build': require('task.build'),
        'upgrade': require('task.upgrade')
    }
}); 

module.exports = RoleWorker;
;/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var CoreObject = require('core.object');
var _ = require('lodash');

var ROOM_WIDTH = 50;
var ROOM_HEIGHT = 50;

var RoomArchitector = CoreObject.extend({
    initialize: function(roomManager) {
        this.roomManager = roomManager;
        this.room = this.roomManager.room;
        this.containers = this.roomManager.containers;
        
        if (this.room.controller.level > 1) {
            this.buildContainers();
        }
        
        if (1 < this.room.controller.level < 6) {
            this.buildRoads();
        }
        
        if (this.room.controller.level > 3) {
            this.buildStorage();
            this.buildExtensions();
        }
        
    },
    
    buildExtensions: function() {
        if (!this.room.storage) {
          return;
        }  
        let pos = this.room.storage.pos;
        let _this = this;
        
        this.forPosAround(pos, 8 , 2, function(x,y) {
            // _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
            if(_this.room.createConstructionSite(x, y, STRUCTURE_EXTENSION) === 0) {
                _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                return true;
            }
        }, true);
    },
    
    buildStorage: function() {
        if (this.room.storage) {
            return;
        }
        
        let _this = this;

        this.forPosAround({
            x: ROOM_WIDTH/2,
            y: ROOM_HEIGHT/2
        }, 20, 1, function(x,y) {
            let arr = _this.room.lookAt(x,y);
            let terrain = _.find(arr, 'terrain');
            if (!terrain || terrain.terrain === 'wall') {
                return false;
            }

            let structure = _.find(arr, 'structure');
            
            if(_this.room.createConstructionSite(x, y, STRUCTURE_STORAGE) === 0) {
                _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                return true;
            }

//            if (!structure) {
//                _this.room.createConstructionSite(x, y, STRUCTURE_STORAGE);
//                return true;
//            }
        });
  },
    
    buildContainers: function() {
        let _this = this;
        
        this.roomManager.sources.forEach(function(source) {
            let containers = source.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            });

            if (containers.length >= 2) {
                return;
            }

            let constructionSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
               filter: c => c.structureType == STRUCTURE_CONTAINER
            });
            
            if (constructionSites.length) {
                return;
            }
            
            _this.forPosAround(source.pos, 1, 1, function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');

                if (!structure || structure.structure.structureType != STRUCTURE_CONTAINER) {
                    if(_this.room.createConstructionSite(x, y, STRUCTURE_CONTAINER) === 0) {
                        _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                        return true;
                    }
                }
            });
        });
    },
    
    buildRoads: function() {
        let _this = this;
        this.roomManager.sources.forEach(function(source) {
            _this.buildRoadBetween(source, _this.room.controller);
        });
        
        this.roomManager.spawns.forEach(function(spawn) {
            _this.roomManager.sources.forEach(function(source) {
                _this.buildRoadBetween(spawn, source);
            });
            
            _this.forPosAround(spawn.pos, 1, 1, function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return;
                }
                
                let structure = _.find(arr, 'structure');
               
                if (!structure) {
                    if(_this.room.createConstructionSite(x, y, STRUCTURE_ROAD) === 0) {
                        _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                        return true;
                    }
                }
            });
        });
        
        if (this.room.storage) {
            _this.roomManager.sources.forEach(function(source) {
                _this.buildRoadBetween(_this.room.storage, source);
            });
            
            _this.buildRoadBetween(_this.room.storage, _this.room.controller);
            
            this.roomManager.spawns.forEach(function(spawn) {
                _this.buildRoadBetween(_this.room.storage, spawn);
            });
            
            _this.forPosAround(this.room.storage.pos, 1, 1, function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');
                
                if (!structure) {
                    if(_this.room.createConstructionSite(x, y, STRUCTURE_ROAD) === 0) {
                        _this.room.visual.circle(x,y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                        return true;
                    }
                }
            });
        }
        
        let extensions = this.room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION
        });
        
        if (extensions.length) {
            if (this.room.storage) {
                extensions.forEach(function(extension) {
                    _this.buildRoadBetween(_this.room.storage, extension);
                });
            }
        }

    },
    
    buildRoadBetween: function(src, dst) {
        let _this = this;
        let path = src.pos.findPathTo(dst, {
            ignoreCreeps: true,
            costCallback: function(roomName, costMatrix) {
                _this.containers.forEach(function(container) {
                    costMatrix.set(container.pos.x, container.pos.y, 255);
                });
            }
        });
        if (!path) {
            return;
        }
        
        let count = 0;
        
        for (let i in path) {
            if (count > 4) {
                break;
            }
            
            let pos = path[i];
            // this.room.visual.circle(pos.x, pos.y, {fill: 'transparent', radius: 0.5, stroke: 'red'});
            let arr = _this.room.lookAt(pos.x, pos.y);
            let structure = _.find(arr, 'structure');

            if((!structure || !structure.structure) && _this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD) === 0) {
                _this.room.visual.circle(pos.x,pos.y, {fill: 'transparent', radius: 0.55, stroke: 'red'});
                count++;
            }

            // if (!structure || !structure.structure) {
            //     _this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
            //     count++;
            // }
        }
    },
    
    forPosAround: function(pos, range, step, func, emptyCenter) {
        step = step || 1;
        for (let r = 1; r <= range; r++) {
            for(let y = pos.y - r; y <= pos.y + r; y += step) {
                for (let x = pos.x - r; x <= pos.x + r; x += step) {
                    
                    if (emptyCenter) {
                        if (x > pos.x - step && x < pos.x + step) {
                            if (y > pos.y - step && y < pos.y + step) {
                                continue;
                            }
                        }
                    }
                    
                    let result = func(x,y);
                    // this.room.visual.circle(Math.floor(x), Math.floor(y), {fill: 'transparent', radius: 0.5, stroke: 'blue'});
                    
                    if (result == true) {
                        return;
                    }
                }
            }
        }
    }
    
    
});

module.exports = RoomArchitector;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('spawn.manager');
 * mod.thing == 'a thing'; // true
 */

var CoreObject = require('core.object');
var utils = require('utils');
var roleHarvester = require('role.harvester');
var roleWorker = require('role.worker');
var _ = require('lodash');

var HARV_SOURCE = 8;
var BUILDERS = 6;

var MIN_MINERS = 1;
var MIN_LORRY = 2;
var MIN_WORKERS = 1;

var WORKER_PER_TASK = {'harvest': 0 , 'repair': 1, 'build': 4, 'upgrade': 9000};
var BUILD_WORKERS_PER_TASK = {'harvest': 0 , 'repair': 1, 'build': 2, 'upgrade': 3};

var RoomManager = CoreObject.extend({
    
    initialize: function(room) {
        let _this = this;
        
        this.room = room;
        this.spawns = room.find(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_SPAWN
        });
        
        this.creeps = _.filter(Game.creeps, (c) => c.memory.home == room.name);
        this.workers = _.filter(this.creeps, (w) => w.memory.role == 'worker');
        this.harvesters = _.filter(this.creeps, (w) => w.memory.role === 'harvester');
        this.miners = _.filter(this.creeps, (w) => w.memory.role === 'miner');
        this.lorry = _.filter(this.creeps, (w) => w.memory.role === 'lorry');
        
        this.sources = room.find(FIND_SOURCES);
        this.droppedResources = room.find(FIND_DROPPED_RESOURCES)
        this.tombstones = room.find(FIND_TOMBSTONES, {
            filter: (t) => _.sum(t.carry) > 0 
        });
        this.containers = this.room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER
        });
        this.constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        this.hostiles = room.find(FIND_HOSTILE_CREEPS);
        this.towers = room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
        
        this.shouldWorkersUseSource = this.containers.length < 2 && (!!this.harvesters.length || (!!this.miners.length  && !!this.lorry.length));
        
        this.workerTasks = [];
        this.spawnQueue = [];
        this.neighbourRooms = Game.map.describeExits(this.room.name);
        
        if (this.room.memory.harvestersCount == null) {
            this.room.memory.harvestersCount = this.harvesters.length;
        }

        utils.setInterval(this.room.name + '_energy', 300, function() {
            let sources = _this.room.find(FIND_SOURCES);
            _this.room.memory.maxEnergyIncome = 0;
            sources.forEach((s) => _this.room.memory.maxEnergyIncome += s.energyCapacity);
            let count = _this.room.memory.harvestersCount;

            if (_this.room.memory.energyHarvested < _this.room.memory.maxEnergyIncome) {
                count = count > 11 ? count : count + 1;
                _this.room.memory.needHarvesters = true;
                console.log('++');
            }  else {
                let delta = _this.room.memory.noEnergyTime - Game.time - 330;
                if (delta > 0) {
                    count = Math.max(Math.floor(count/300*delta), 2);
                }
                _this.room.memory.needHarvesters = false;    
                console.log(count, _this.room.memory.energyHarvested, count < 2 ? count : count - 1, delta);
            }
            
            _this.room.memory.energyHarvested = 0;
        });

        this.searchWorkerTasks();

    },
    
    makeActions: function() {
        if (this.hostiles && this.hostiles.length > 0) {
            this.defend();
        } else if (_.filter(this.creeps, (c) => c.hits < c.hitsMax).length)
            this.heal();
        else {
            this.repair();
        }
        
        this.updateWorkerTasks();
        this.updateHarvesterTasks();
        this.updateLorryTasks();
        
        this.buildMinersIfNeeded();
        this.buildLorryIfNeeded();
        
        this.buildHarvestersIfNeeded();
        this.buildLongDistanceHarvestersIfNeeded();
        this.buildWorkersIfNeeded();
        
        this.spawnCreeps();
    },
    
    defend: function() {
        let _this = this;
        
        var username = this.hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${this.room.name}`);

        this.towers.forEach(function(tower) {
            let hostile = tower.pos.findClosestByRange(_this.hostiles);    
            tower.attack(hostile);
        });

        if (!this.towers.length) {
            this.room.controller.activateSafeMode(); //TODO
        }
    },
    
    repair: function() {
        const targets = this.room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax/2 
                    && [STRUCTURE_WALL,STRUCTURE_RAMPART].indexOf(object.structureType) === -1
        });
        
        targets.sort((a,b) => a.hits - b.hits);
        
        if (targets.length) {
            this.towers.forEach(function(tower) {   
                if (tower.energy > tower.energyCapacity/2) {
                    tower.repair(targets.shift());
                }
            });
        }
    },
    
    heal: function() {
        const targets = _.filter(this.creeps, (c) => c.hits < c.hitsMax);  
        targets.sort((a,b) => a.hits - b.hits);
        
        if (targets.length) {
            this.towers.forEach(function(tower) {   
                if (tower.energy > tower.energyCapacity/2) {
                    tower.heal(targets.shift());
                }
            });
        }
    },
    
    addToSpawQueue: function(opt, num) {
        num = num || 1;
        for (let i = 0; i < num; i++) {
            this.spawnQueue.push(opt);
        }
    },
    
    spawnCreeps: function() {
        this.spawnQueue = this.spawnQueue.sort((a,b) => a.priority - b.priority);
        for(let i in this.spawns) {
            let spawn = this.spawns[i];
            let options = this.spawnQueue[i];
            if (options) {
                this.spawnCreep(spawn, options);
            } 
        }  
    },
    
    buildWorkersIfNeeded: function() {
        let neededWorkers = 0;
        let workersCount = this.workers.length;
        let options = {
            memory: {
                role: 'worker'
            },
            energy: null,
            priority: 10
        };
        
        for (let i in this.workerTasks) {
            let task = this.workerTasks[i];
            neededWorkers = BUILD_WORKERS_PER_TASK[task.action] ? neededWorkers + BUILD_WORKERS_PER_TASK[task.action] : neededWorkers;
        }
        
        if (neededWorkers) {
            neededWorkers = Math.max(Math.floor(neededWorkers/(this.getMaxBodySize()/4)), 4);
        }
        
        let workersToBuild = (neededWorkers > 8) ? 8 - workersCount : neededWorkers - workersCount;
        
        if (this.workers.length < neededWorkers - 2) {
            options.energy = this.room.energyAvailable;
        }
        
        if (this.shouldWorkersUseSource) {
            options.energy = this.room.energyAvailable;
            this.addToSpawQueue(options, 8 - workersCount);
            return;
        }

        if (workersToBuild < 1) {
            return;
        }
        
        this.addToSpawQueue(options, workersToBuild);
    },
    
    buildHarvestersIfNeeded: function() {
         if (this.room.energyCapacityAvailable < 600 || !this.containers.length || (!this.miners.length && !this.lorry.length)) {
            let harvestersCount = this.harvesters.length;
            let options = {
                memory: {
                    role: 'harvester',
                },
                energy: null,
                priority: 6
            };
            
            if (this.harvesters.length < this.room.memory.harvestersCount - 3) {
                options.energy = this.room.energyAvailable;
            }

            if (this.room.memory.harvestersCount > this.harvesters.length) {
                this.addToSpawQueue(options, 1);
            }
        }
    },
    
    buildLongDistanceHarvestersIfNeeded: function() {
        if (!this.containers.length && !this.room.storage) {
            return;
        }  
        
        for (let i in this.neighbourRooms) {
            let name = this.neighbourRooms[i];
            let room = Game.rooms[name];
            // console.log(name);
            if (!room) {
                continue;
            }
            console.log(room.controller.owner);
            if (room.controller.owner) {
                continue;
            } 
        }
        
    },
    
    buildMinersIfNeeded: function() {
        let _this = this;
        let minersCount = this.miners.length;
        let neededMiners = MIN_MINERS * this.sources.length;   
        let options = {
            memory: {
                role: 'miner',
            },
            energy: null,
            priority: 4
        };
        
        if (minersCount < neededMiners) {
            
            let sources = [];
            this.sources.forEach(function(source) {
                let minersOnSource = _.filter(_this.miners, (m) => m.memory.task && m.memory.task.targetId == source.id).length;
                sources.push({source: source, miners: minersOnSource});
            });

            sources = sources.sort((s1,s2) => s1.miners - s2.miners);
            let source = _.first(sources).source;
            
            options.memory.task = {
                action: 'mine',
                targetId: source.id
            };
            
            options.body = [WORK, WORK, WORK, WORK, WORK, MOVE,MOVE];
          
            this.addToSpawQueue(options, neededMiners - minersCount);
        }
    },
    
    buildLorryIfNeeded: function() {
        let lorryCount = this.lorry.length;
        let neededLorry = MIN_LORRY * this.sources.length;   
        let options = {
            memory: {
                role: 'lorry',
            },
            energy: null,
            priority: 5
        };
        
        if (lorryCount < neededLorry) {
            let energy = this.room.energyCapacityAvailable;
            var numberOfParts = Math.floor(energy / 150);
            numberOfParts = Math.min(numberOfParts, Math.floor(30 / 3));
            
            options.body = [];
            for (let i = 0; i < numberOfParts * 2; i++) {
                options.body.push(CARRY);
            }
            for (let i = 0; i < numberOfParts; i++) {
                options.body.push(MOVE);
            }
        
            this.addToSpawQueue(options, neededLorry - lorryCount);
        }
    },
    
    getMaxBodySize: function() {
        let energy = this.room.energyCapacityAvailable;
        return Math.min(Math.floor(energy/200) * 3, 30);
    },
    
    getCustomBody: function(energy) {

        if (!energy) {
            energy = this.room.energyCapacityAvailable;
        }
        
        var partsCount = Math.floor(energy/200);
        var body = [];
        var parts = [WORK, CARRY, MOVE];
        
        partsCount = Math.min(partsCount, 10);
        
        for (var p = 0; p < parts.length; p++) {
            for (let i = 0; i < partsCount; i++) {
                body.push(parts[p]);
            }
        }

        return body;
    },
    
    spawnCreep: function(spawn, options) {
        options = options || {};
                
        if (!options.memory || !options.memory.role) {
            return;
        }
        
        var defaults = {
            name: this.getName(options.memory.role + '_'),
            body: this.getCustomBody(options.energy),
            memory: {
                home: this.room.name,
            },
            dryRun: true
        };
        
        options = _.assign(defaults, options);
        options.memory = _.assign(defaults.memory, options.memory);
        options.memory.home = this.room.name;
        
        if (options.memory.role == 'worker' && this.workers.length < MIN_WORKERS) {
            options.energy = this.room.energyAvailable;
        }
        
        var args = [options.body, options.name, options];
        
        let test = spawn.spawnCreep.apply(spawn, args);
        // console.log(test, this.room.energyAvailable, this.room.energyCapacityAvailable, options.memory.role, this.harvesters.length < HARV_SOURCE);
        if(test === 0) {
            delete options.dryRun;
            if (spawn.spawnCreep.apply(spawn, args) === OK) {
                console.log('New creep ', options.name);
                return true;
            }
        }
        
        // if (test === ERR_NOT_ENOUGH_ENERGY && !this.room.memory.spawnWait) {
        //     this.room.memory.spawnWait = Game.time;
        // }
        
        return false;
    },
    
    getName: function(prefix) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
      for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    
      return prefix+text;
    },
    
    getSpawn: function() {
        return _.first(this.spawns);
    },
    
    addWorkerTask: function(task) {
        if (_.isArray(task)) {
            for (let i in task) {
                this.addWorkerTask(task[i]);
            }
            return;
        }
        if (task && _.isObject(task)) {
            this.workerTasks.push(task);
        }
    },
    
    searchWorkerTasks: function() {
        this.addWorkerTask(this.getUpgradeTask());
        if (!this.towers.length) {
            this.addWorkerTask(this.getRepairTasks());
        }
        this.addWorkerTask(this.getBuildTasks());
    },
    
    updatePickupTasks: function(harvesters) {
        if (this.droppedResources.length) {
            this.droppedResources.forEach(function(res) {
                for (let i in harvesters) {
                    let harvester = harvesters[i];
                    if (harvester.memory.task && harvester.memory.task.action === 'pickup') {
                        break;
                    }
                    
                    if (_.sum(harvester.carry) < harvester.carryCapacity) {
                        harvester.setTask({
                            action: 'pickup',
                            targetId: res.id
                        });
                    }   
                }
            });
        }
        
        if (this.tombstones.length) {
            this.tombstones.forEach(function(res) {
                for (let i in harvesters) {
                    let harvester = harvesters[i];
                    if (harvester.memory.task && harvester.memory.task.action === 'pickup') {
                        break;
                    }
                    
                    if (_.sum(harvester.carry) < harvester.carryCapacity) {
                        harvester.setTask({
                            action: 'pickup',
                            targetId: res.id
                        });
                    }   
                }
            });
        }
    },
    
    updateSourceTasks: function(harvesters, action) {
        let _this = this;
        let availableSources = _.filter(this.sources, (s) => s.energy > 0);
        action = action || 'harvest';
        harvesters.forEach(function(harvester) {
            if (!harvester.memory.task) {
                
                let sources = [];
                availableSources.forEach(function(source) {
                    let harvestersOnSource = _.filter(harvesters, (h) => h.memory.task && h.memory.task.targetId == source.id).length;
                    sources.push({source: source, harvesters: harvestersOnSource});
                });
                
                sources = sources.sort((s1,s2) => s1.harvesters - s2.harvesters);
                
                if (!sources.length) {
                    _this.room.memory.noEnergyTime = Game.time;
                    return;
                }
                
                let source = _.first(sources).source;
                harvester.setTask({
                    action: action,
                    targetId: source.id
                });
            }
        });  
    },
    
    updateHarvesterTasks: function() {
        let _this = this;
        
        let harvesters = this.harvesters;
        if (this.shouldWorkersUseSource) {
            harvesters = _.filter(this.creeps, (w) => w.memory.role === 'harvester' || w.memory.role === 'worker');
        }
        
        this.updatePickupTasks(harvesters);
        this.updateSourceTasks(harvesters, 'harvest');
    },
    
    updateLorryTasks: function(lorry) {
        let _this = this;
        this.updatePickupTasks(this.lorry);
        
        this.lorry.forEach(function(lorry) {
            if (!lorry.memory.task) {
                let sources = [];
                _this.sources.forEach(function(source) {
                    let lorryOnSource = _.filter(_this.lorry, (l) => l.memory.task && l.memory.task.targetId == source.id).length;
                    sources.push({source: source, lorry: lorryOnSource});
                });
                
                sources = sources.sort((s1,s2) => s1.lorry - s2.lorry);
                
                let source = _.first(sources).source;
                lorry.setTask({
                    action: 'lorry',
                    targetId: source.id
                });
            }
        });  
    },
    
    updateWorkerTasks: function() {
        let _this = this;
        let workers = _.filter(this.creeps, (w) => w.memory.role === 'worker');
        
        let workerTasks = this.workerTasks.sort((t1, t2) => t1.priority - t2.priority);
        
        for (let i = 0; i < workers.length; i++) {
            
            let worker = workers[i];
            
            if (this.shouldWorkersUseSource) {
                if (worker.memory.task) {
                    if (worker.carry.energy == worker.carryCapacity && worker.memory.task.action == 'harvest') {
                        worker.removeTask();
                    }

                    if (worker.carry.energy < worker.carryCapacity && worker.memory.task.action == 'harvest') {
                        continue;
                    }
                    
                    if (worker.carry.energy == 0 && worker.memory.task.action != 'harvest') {
                        worker.removeTask();
                        continue;
                    }
                }
            } else {
                if (worker.memory.task && worker.memory.task.action === 'harvest') {
                    worker.removeTask();
                }
            }
            
            if (worker.memory.task && worker.memory.task.action != 'upgrade') {
                continue;
            }
                       
            for (let t in workerTasks) {
                let task = workerTasks[t];
                let mem = Memory.tasks[task.targetId];
                
                let needed = WORKER_PER_TASK[task.action];
                if (task.action === 'build' && this.shouldWorkersUseSource) {
                    needed = 9999;
                }
                
                if (!mem || mem.creeps.length < needed) {
                    worker.setTask({
                        action: task.action,
                        targetId: task.targetId
                    });
                    
                    workers.splice(i,1);
                    i--;
                    break;
                }
            }
        }
    },
    
    getUpgradeTask: function() {
        var controller = this.room.controller;
        
        var task = {
            action: 'upgrade',
            targetId: controller.id,
            priority: 1000
        };

        if (controller.ticksToDowngrade < 4000) {
            task.priority = 10;
        }
        
        return task;
    },
    
    getRepairTasks: function() {
        var tasks = [];
        const targets = this.room.find(FIND_STRUCTURES, {
            filter: object => object.hits < (object.hitsMax - object.hitsMax * 0.05) 
        });
        
        targets.sort((a,b) => a.hits - b.hits);
        
        for (let i in targets) {
            let target = targets[i];
            let task = {
                action: 'repair',
                targetId: target.id,
                priority: this.getStructurePriority(target.structureType) / 2
            };
            
            // if (target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_RAMPART) {
            //     task.priority = 100;
            // }
            
           tasks.push(task);
        }
        
        if (tasks.length > 6) {
            tasks = tasks.slice(0,5);
        }
        
        return tasks;
    },
    
    getBuildTasks: function() {
        var tasks = [];
        const targets = this.constructionSites;
        
        for (let i in targets) {
            let target = targets[i];
            let task = {
                action: 'build',
                targetId: target.id,
                priority: this.getStructurePriority(target.structureType)
            };

            // if (target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_RAMPART) {
            //     task.priority = 100;
            // }
            
            tasks.push(task);
           
            if (tasks.length > 5) {
                break;
            }
        }

        return tasks;
    },
    
    getStructurePriority: function(structureType) {
        var structures = {
            "spawn": 20,
            "extension": 40,
            "road": 50,
            "rampart": 85,
            "link": 60,
            "storage": 80,
            "tower": 10,
            "observer": 100,
            "powerSpawn": 120,
            "extractor": 140,
            "lab": 160,
            "terminal": 180,
            "container": 200,
            "nuker": 220,
            "constructedWall": 90
        };
        
        return structures[structureType] || 200;
    },

});

module.exports = RoomManager;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.build');
 * mod.thing == 'a thing'; // true
 */

var build = function(creep, target) {
    if(creep.carry.energy === 0) {
        creep.getEnergy();
        return true;
    } else if (creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target,  {visualizePathStyle: {stroke: '#0066ff'}})
        return true;
    }
    return false;
};

module.exports = build;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.harvest');
 * mod.thing == 'a thing'; // true
 */
 
var harvest = function(creep, target) {
    if (creep.carry.energy == creep.carryCapacity || (creep.carry.energy != 0 && !creep.pos.isNearTo(target))) {
        creep.putEnergy();
        return true;
    } else {
        let result = creep.harvest(target);
        if(result == ERR_NOT_IN_RANGE) {
            if (creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}}) === -2) {
                return false;
            }
        } 
        if (result == ERR_NOT_ENOUGH_ENERGY) {
            return false;
        }
        return true;
    }
}

module.exports = harvest;;/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var lorry = function(creep, target) {
    let container = target.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
    });

    if (creep.carry.energy == creep.carryCapacity || (creep.carry.energy != 0 && !creep.pos.isNearTo(target))) {

        if (container == undefined) {
            container = creep.room.storage;
        }

        // if one was found
        if (container != undefined) {
            // try to withdraw energy, if the container is not in range
            let code = creep.withdraw(container, RESOURCE_ENERGY);
            if (code == ERR_NOT_IN_RANGE) {
                // move towards it
                creep.moveTo(container);
            }
            if (code === ERR_FULL || code === ERR_NOT_ENOUGH_RESOURCES) {
                creep.memory.working = true;
            }
        }
        
        return true;
    } else {
        let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
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

        // if we found one
        if (structure != undefined) {
            // try to transfer energy, if it is not in range
            if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                // move towards it
                creep.moveTo(structure);
            }
        }
        return true;
    }
};

module.exports = lorry;

;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.harvest');
 * mod.thing == 'a thing'; // true
 */
 
var mine = function(creep, target) {
    let container = target.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType == STRUCTURE_CONTAINER
    })[0];

    if (creep.pos.isEqualTo(container.pos)) {
        creep.harvest(target);
    } else {
        creep.moveTo(container);
    }
    return true;
}

module.exports = mine;;/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var _ = require('lodash');

var pickup = function(creep, target) {
    var carry = Object.keys(creep.carry);
    if (creep.carry.energy > 0) {
        creep.putEnergy();
        return true;
        
        // const containers = creep.room.find(FIND_STRUCTURES, {
        //     filter: (i) => i.structureType == STRUCTURE_CONTAINER
        // });
    
        // var structure = null;
        // for (var containerName in containers) {
        //     let container = containers[containerName];
        //     const total = _.sum(container.store);
        //     if (total < container.storeCapacity) {
        //         structure = container;
        //     }
        // }
    
        // if (structure) {
        //     for(const resourceType in creep.carry) {
        //         if (creep.transfer(storage, resourceType) == ERR_NOT_IN_RANGE) {
        //             creep.move(structure, {visualizePathStyle: {stroke: '#0066ff'}});
        //             return true;
        //         }
        //     }
        // } 
    }
    
    if (target.store) {
        for(const resourceType in creep.carry) {
                if (creep.withdraw(target, resourceType) == ERR_NOT_IN_RANGE) {
                    creep.move(target, {visualizePathStyle: {stroke: '#0066ff'}});
                    return true;
                }
            }
        return true;
    }
    
    if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#0066ff'}});
        return true;
    }
    return false;
};

module.exports = pickup;
;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.repair');
 * mod.thing == 'a thing'; // true
 */

var repair = function(creep, target) {
    if(creep.carry.energy === 0) {
        creep.getEnergy();
        return true;
    } else if (creep.repair(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target,  {visualizePathStyle: {stroke: '#ff8c1a'}})
        return true;
    }
    return false;
};

module.exports = repair;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.upgrade');
 * mod.thing == 'a thing'; // true
 */

var upgrade = function(creep, target) {
    if(creep.carry.energy === 0) {
        creep.getEnergy();
        return true;
    } else if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target,  {visualizePathStyle: {stroke: '#99ff66'}})
        return true;
    }
    return false;
};

module.exports = upgrade;;/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utils');
 * mod.thing == 'a thing'; // true
 */

Memory.intervals = Memory.intervals || {};

module.exports = {
    setInterval:  function(name, ticks, callback) {
        let interval = Memory.intervals[name];
        
        if (interval && Game.time < interval + ticks) {
            return;
        }
        
        callback();
        
        Memory.intervals[name] = Game.time;
    }
};