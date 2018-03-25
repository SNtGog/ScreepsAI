/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.miner');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleMiner = CoreRole.extend({
    tasks: {
        'mine': require('task.mine')
    }
});

module.exports = RoleMiner;