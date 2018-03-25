/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('spawn.manager');
 * mod.thing == 'a thing'; // true
 */

var CoreObject = require('core.object');
var RoomArchitector = require('room.architector');
var roleHarvester = require('role.harvester');
var roleWorker = require('role.worker');
var _ = require('lodash');

var HARV_SOURCE = 6;
var BUILDERS = 6;

var MIN_MINERS = 1;
var MIN_LORRY = 2;
var MIN_BUILDERS = 1;

var WORKER_PER_TASK = {'repair': 1, 'build': 2, 'upgrade': 3};

var RoomManager = CoreObject.extend({
    
    initialize: function(room) {
        this.room = room;
        this.spawns = room.find(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_SPAWN
        });
        
        this.creeps = _.filter(Game.creeps, (c) => c.memory.home == room.name);
        this.workers = _.filter(this.creeps, (w) => w.memory.role == 'worker');
        this.harvesters = _.filter(this.creeps, (w) => w.memory.role === 'harvester');
        this.sources = room.find(FIND_SOURCES);
        this.droppedResources = room.find(FIND_DROPPED_RESOURCES)
        this.constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        this.hostiles = room.find(FIND_HOSTILE_CREEPS);
        this.towers = room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
        
        this.workerTasks = {};
        
        this.searchWorkerTasks();
    },
    
    makeActions: function() {
        if (this.hostiles && this.hostiles.length > 0) {
            this.defend();
        } else {
            this.repair();
        }
        
        this.cleanTasks();
        this.updateWorkerTasks();
        this.updateHarvesterTasks();
        
        this.buildHarvestersIfNeeded();
    
        // this.buildMinersIfNeeded();
        // this.buildLorryIfNeeded();
        
        this.buildWorkersIfNeeded();
        
        let tasks = Object.keys(this.workerTasks);
        if (tasks && tasks.length < 3) {
            let architector = new RoomArchitector(this);
        }
    },
    
    defend: function() {
        let _this = this;
        
        var username = hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${room.name}`);

        this.towers.forEach(function(tower) {
            let hostile = tower.pos.findClosestByRange(_this.hostiles);    
            tower.attack(hostile);
        });

        this.room.controller.activateSafeMode(); //TODO
    },
    
    repair: function() {
        const targets = this.room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax - 200
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
    
    spawnCreeps: function(role, count, options) {
        let num = count;
        for(let i in this.spawns) {
            let spawn = this.spawns[i];
            
            if (num > 0) {
                if (this.spawnWorker(spawn, role, options)) {
                    num--;
                }
            } else {
                break;
            }
        }  
    },
    
    buildWorkersIfNeeded: function() {
        let neededWorkers = 0;
        let workersCount = _.sum(this.workers, (w) => w.memory.role == 'worker');
        
        for (let i in this.workerTasks) {
            let task = this.workerTasks[i];
            neededWorkers = WORKER_PER_TASK[task.action] ? neededWorkers + WORKER_PER_TASK[task.action] : neededWorkers;
        }
        
        let workersToBuild = (neededWorkers > 10) ? 10 - workersCount : neededWorkers - workersCount;

        if (workersToBuild < 1) {
            return;
        }
        
        this.spawnCreeps('worker', workersToBuild);
    },
    
    buildHarvestersIfNeeded: function() {
        // if (this.room.energyCapacityAvailable < 600) {
        if (true) {
            let harvestersCount = this.harvesters.length;
            let neededHarvesters = HARV_SOURCE * this.sources.length;
            let numToBuild = neededHarvesters - harvestersCount;

            if (!harvestersCount || harvestersCount < neededHarvesters) {
                this.spawnCreeps('harvester', numToBuild);
            }
        }
    },
    
    getCustomBody: function(energy) {

        if (!energy) {
            energy = this.room.energyCapacityAvailable;
        }
        
        var partsCount = Math.floor(energy/200);
        var body = [];
        var parts = [WORK, CARRY, MOVE];
        
        partsCount = Math.min(partsCount, Math.floor(30 / 3));
        
        for (var p = 0; p < parts.length; p++) {
            for (let i = 0; i < partsCount; i++) {
                body.push(parts[p]);
            }
        }

        return body;
    },
    
    spawnWorker: function(spawn, role, memory) {
        var name = this.getName(role + '_');
        var _memory = {role: role, home: this.room.name};
        
        if (memory) {
            _.assign(_memory, memory);
        }
        
        var options = {
            memory: _memory,
            dryRun: true
        };
        
        let energy = null;
        if (role == 'harvester' && this.harvesters.length < HARV_SOURCE) {
            energy = this.room.energyAvailable;
        }
        
        if (role == 'worker' && this.workers.length < this.harvesters.length / 2) {
            energy = this.room.energyAvailable;
        }
        
        var body = this.getCustomBody(energy);
        var args = [body, name, options];
        
        let test = spawn.spawnCreep.apply(spawn, args);
       
        if(test === 0) {
            delete options.dryRun;
            if (spawn.spawnCreep.apply(spawn, args) === 0) {
                console.log('New creep ', name);
                return true;
            }
        }
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
                this.workerTasks[task[i].action+'_'+task[i].targetId] = task[i];
            }
        }
        if (_.isObject(task)) {
            this.workerTasks[task.action+'_'+task.targetId] = task;
        }
    },
    
    searchWorkerTasks: function() {
        this.addWorkerTask(this.getUpdateTask());
        if (!this.towers.length) {
            this.addWorkerTask(this.getRepairTasks());
        }
        this.addWorkerTask(this.getBuildTasks());
    },
    
    cleanTasks: function() {
        for (let m in Memory.tasks) {
            let tasks = _.filter(this.workerTasks, (t) => t.targetId === m);
            if (tasks.length < 1) {
                let task = Memory.tasks[m];
                this.workers.forEach(function(worker) {
                    if(worker.memory.task && worker.memory.task.targetId === m) {
                        delete worker.memory['task'];
                    }
                });
                delete Memory.tasks[m];
            } 
        }
    },
    
    updateHarvesterTasks: function() {
        var _this = this;
        
        if (this.droppedResources.length) {
            this.droppedResources.forEach(function(res) {
                _this.harvesters.forEach(function(harvester) {
                    if ((!harvester.memory.task || harvester.memory.task.action !== 'pickup') && _.sum(harvester.carry) === 0) {
                        harvester.memory.task = {
                            action: 'pickup',
                            targetId: res.id
                        }
                    }   
                });
            });
        }
        
        this.harvesters.forEach(function(harvester) {

            if (!harvester.memory.task) {
                
                let sources = [];
                _this.sources.forEach(function(source) {
                    let harvestersOnSource = _.filter(_this.harvesters, (h) => h.memory.task && h.memory.task.targetId == source.id).length;
                    sources.push({source: source, harvesters: harvestersOnSource});
                });
                
                sources = sources.sort((s1,s2) => s1.harvesters - s2.harvesters);
                
                let source = _.first(sources).source;
                harvester.memory.task = {
                    action: 'harvest',
                    targetId: source.id
                }
            }
        });

    },
    
    updateWorkerTasks: function() {
        let _this = this;
        let workers = _.filter(this.creeps, (w) => w.memory.role === 'worker');
        
        workers = _.filter(workers, (w) => !w.memory.task);
        let count = workers.length;
        
        for (let t in this.workerTasks) {
            if (count < 1) {
                break;
            }
            
            let task = this.workerTasks[t];
            Memory.tasks[task.targetId] = task;
            Memory.tasks[task.targetId].creeps = [];
        }
        
        for (let i = 0; i < workers.length; i++) {
            let worker = workers[i];
            for (let m in Memory.tasks) {
                let task = Memory.tasks[m];
                let needed = WORKER_PER_TASK[task.action];
                if (task.creeps && (task.creeps.length < needed) || task.action == 'upgrade') {
                    worker.setTask({
                        action: task.action,
                        targetId: task.targetId
                    });
                    count--;
                    workers.splice(i,1);
                    i--;
                } else {
                    continue;
                }
            }
            if (count < 1) {
                break;
            }
        }
    },
    
    getUpdateTask: function() {
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
        }
        
        if (tasks.length > 6) {
            tasks = tasks.slice(0,5);
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