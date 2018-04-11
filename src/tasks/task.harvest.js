/*
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

module.exports = harvest;