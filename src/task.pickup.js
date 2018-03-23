/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.pickup');
 * mod.thing == 'a thing'; // true
 */

var pickup = function(creep, target) {
    if (creep.carry.energy < creep.carryCapacity) {
        if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
        }
        return true;
    }
    return false;
};

module.exports = pickup;