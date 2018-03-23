
var CoreRole = require('core.role');

var RoleHarvester = CoreRole.extend({
    tasks: {
        'harvest': require('task.harvest'),
        'pickup': require('task.pickup')
    }
});

module.exports = RoleHarvester;
