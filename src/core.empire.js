/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('core.empire');
 * mod.thing == 'a thing'; // true
 */

 
var RoomManager = require('room.manager');

Memory.tasks = Memory.tasks || {};

var empire = {
    run: function() {
        Game.cache = {
            roomManagers: {}
        };
        
        this.cleanMemory();
        
        
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            // for (let creep in Game.creeps) {
            //     Game.creeps[creep].memory.home = room.name;
            // }
            if (room.controller.my) {
                let manager = new RoomManager(room);
                Game.cache[room.id] = manager;
                manager.makeActions();
            }
        }
        
        for (let creepName in Game.creeps) {
            Game.creeps[creepName].runRole();
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
                if (!creep) {
                    task.creeps.splice(i,1);
                }
            }
        }
    }
} 

module.exports = empire;