/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.harvest');
 * mod.thing == 'a thing'; // true
 */
 
var mine = function(creep, target) {
    let container = target.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType == STRUCTURE_CONTAINER
    })[0];

    if (creep.pos.isEqualTo(container.pos)) {
        creep.harvest(target);
    } else {
        creep.moveTo(container);
    }
    return true;
}

module.exports = mine;