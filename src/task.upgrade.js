/*
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

module.exports = upgrade;