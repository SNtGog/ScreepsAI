/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.harvest');
 * mod.thing == 'a thing'; // true
 */
 
var harvest = function(creep, target) {
    if (creep.carry.energy == creep.carryCapacity) {
        creep.putEnergy();
        return true;
    } else {
        if(creep.harvest(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return true;
    }
}

module.exports = harvest;