/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utils');
 * mod.thing == 'a thing'; // true
 */

Memory.intervals = Memory.intervals || {};

module.exports = {
    setInterval:  function(name, ticks, callback) {
        let interval = Memory.intervals[name];
        
        if (interval && Game.time < interval + ticks) {
            return;
        }
        
        callback();
        
        Memory.intervals[name] = Game.time;
    }
};