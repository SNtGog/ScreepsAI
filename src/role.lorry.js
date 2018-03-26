/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.lorry');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleHarvester = CoreRole.extend({
    tasks: {
        'lorry': require('task.lorry'),
        'pickup': require('task.pickup')
    }
});

module.exports = RoleHarvester;