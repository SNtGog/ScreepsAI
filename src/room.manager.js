/*
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

module.exports = RoomManager;