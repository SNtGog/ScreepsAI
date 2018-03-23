/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('spawn.manager');
 * mod.thing == 'a thing'; // true
 */

var CoreObject = require('core.object');
var roleHarvester = require('role.harvester');
var roleWorker = require('role.worker');
var _ = require('lodash');

var HARV_SOURCE = 6;
var BUILDERS = 12;

var MIN_MINERS = 1;
var MIN_LORRY = 2;
var MIN_BUILDERS = 1;

var TASKS_PRIORITY = {'repair': 1, 'build': 2, 'upgrade': 3};

var RoomManager = CoreObject.extend({
    
    initialize: function(room) {
        this.room = room;
        this.spawns = room.find(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_SPAWN
        });
        
        this.creeps = _.filter(Game.creeps, (c) => c.memory.home == room.name);
        this.creepsCount = _.sum(this.creeps, (w) => w.memory.role == 'worker');
        this.harvestersCount = _.sum(this.creeps, (w) => w.memory.role == 'harvester');
        
        this.sources = room.find(FIND_SOURCES);
        this.sourcesCount = _.sum(this.sources, (s) => true);

        this.workerTasks = {};
        
        this.searchWorkerTasks();
    },
    
    makeActions: function() {
        this.updateWorkerTasks();
        
        this.buildHarvestersIfNeeded();
    
        // this.buildMinersIfNeeded();
        // this.buildLorryIfNeeded();
        
        this.buildWorkersIfNeeded();
        this.defend();
    },
    
    defend: function() {
        if (this.hostiles && this.hostiles.length > 0) {
            var username = this.hostiles[0].owner.username;
            Game.notify(`User ${username} spotted in room ${roomName}`);
            var towers = this.room.find(
                FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
            towers.forEach(tower => tower.attack(this.hostiles[0]));
            
            this.room.controller.activateSafeMode()
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
            neededWorkers += TASKS_PRIORITY[task.action];
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
            for(let key in this.sources) {
                let source = this.sources[key];
                let harvestersCount = this.harvestersCount;
                let neededHarvesters = HARV_SOURCE;
                let workersToBuild = neededHarvesters - harvestersCount;

                if (harvestersCount < HARV_SOURCE) {
                    let options = { 'task' : {
                            action: 'harvest',
                            targetId: source.id,
                        }
                    };
                    
                    this.spawnCreeps('harvester', workersToBuild, options);
                }
            }
        }
    },

    
    getWorkerBody: function() {
        var energy = this.room.energyCapacityAvailable;
        
        if (this.harvestersCount < 2) {
            energy = this.room.energyAvailable;
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
        var name = this.makeName(role + '_');
        var _memory = {role: role, home: this.room.name};
        
        if (memory) {
            _.assign(_memory, memory);
        }
        
        var options = {
            memory: _memory,
            dryRun: true
        };
        
        var body = this.getWorkerBody();
        var args = [body, name, options];
        
        let test = spawn.spawnCreep.apply(spawn, args);
       
        if(test == 0) {
            delete options.dryRun;
            if (spawn.spawnCreep.apply(spawn, args) == 0) {
                console.log('New creep ', name);
                return true;
            }
        }
        return false;
    },
    
    makeName: function(prefix) {
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
        this.addWorkerTask(this.getRepairTasks());
        this.addWorkerTask(this.getBuildTasks());
    },
    
    updateWorkerTasks: function() {

        let workers = _.filter(this.creeps, (w) => w.memory.role == 'worker');
        
        //remove tasks
        for (let m in Memory.tasks) {
            let tasks = _.filter(this.workerTasks, (t) => t.targetId == m);
            if (tasks.length < 1) {
                let task = Memory.tasks[m];
                for (let w in workers) {
                    let worker = workers[w];
                    if(worker.memory.task && worker.memory.task.targetId == m) {
                        delete worker.memory['task'];
                    }
                }
                delete Memory.tasks[m];
            } 
        }
        
        workers = _.filter(workers, (w) => !w.memory.task);
        let count = _.sum(workers);
        
        
        for (let w in workers) {
            for (let m in Memory.tasks) {
                let task = Memory.tasks[m];
                let needed = TASKS_PRIORITY[mem.action];
                if (mem.creeps && mem.creeps.length >= needed) {
                    for (let i in mem.creeps) {
                        let creepName = mem.creeps[i];
                        let creep = Game.creeps[creepName];
                        
                    }
                    continue;
                }
            }
        }
        
        for (let t in this.workerTasks) {
            
        }
        
        // for (let t in this.workerTasks) {
        //     var task = this.workerTasks[t];
        //     var mem = Memory.tasks[task.targetId];
            
        //     if (mem) {
        //         let needed = TASKS_PRIORITY[mem.action];
        //         if (mem.creeps && mem.creeps.length >= needed) {
        //             for (let i in mem.creeps) {
        //                 let creepName = mem.creeps[i];
        //                 let creep = Game.creeps[creepName];
                        
        //             }
        //             continue;
        //         }
        //     } 
            
        //     for (let w in workers) {
        //         let worker = workers[w];
        //         if (worker.memory.task) {
                    
        //             if (!mem) {
        //                 delete worker.memory['task'];
        //                 delete Memory.tasks[task.targetId];
        //             } else {
        //                 // console.log(worker.name);
        //                 continue;
        //             }
        //         }
                
        //         console.log(worker.name);
        //         worker.memory.task = task;
                
        //         if (!mem) {
        //             mem = Memory.tasks[task.targetId] = task;
        //             Memory.tasks[task.targetId].creeps = [worker.name];
        //         }
                
        //         if (mem) {
        //             mem.creeps.push(worker);
        //         } 
        //     }
        // }
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
        const targets = this.room.find(FIND_MY_CONSTRUCTION_SITES);
        
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
    }


});

module.exports = RoomManager;