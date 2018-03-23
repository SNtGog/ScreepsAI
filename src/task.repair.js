/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.repair');
 * mod.thing == 'a thing'; // true
 */

var repair = function(creep, target) {
    if (creep.repair(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target,  {visualizePathStyle: {stroke: '#ff8c1a'}})
        return true;
    }
    return false;
};

module.exports = repair;