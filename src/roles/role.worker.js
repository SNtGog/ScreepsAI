/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.builder');
 * mod.thing == 'a thing'; // true
 */

var CoreRole = require('core.role');

var RoleWorker = CoreRole.extend({
    tasks: {
        'harvest': require('task.harvest'),
        'repair': require('task.repair'),
        'build': require('task.build'),
        'upgrade': require('task.upgrade')
    }
}); 

module.exports = RoleWorker;
