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

module.exports = empire;