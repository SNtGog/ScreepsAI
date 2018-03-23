/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.build');
 * mod.thing == 'a thing'; // true
 */

var build = function(creep, target) {
    if (creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target,  {visualizePathStyle: {stroke: '#0066ff'}})
        return true;
    }
    return false;
};

module.exports = build;