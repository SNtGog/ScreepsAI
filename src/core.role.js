/*
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
            }
        }
    },
    
    beforeTask: function(task) {
        
    },
    
    doTask: function(action, target) {
        let task = this.tasks[action];
        
        if (task) {
            task(this.creep, target);
        }
    },
    
    afterTask: function(task, result) {
        if (result === false) {
            delete Memory.tasks[task.targetId];
            this.creep.memory.task = null;
        }
    },
});

// CoreRole.inst = function(creep) {
//     return new CoreRole(creep);
// };

module.exports = CoreRole;