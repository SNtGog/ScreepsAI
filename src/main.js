require('prototype.creep');
var empire = require('core.empire');

module.exports.loop = function () {
    if (Game.cpu.bucket < 2 * Game.cpu.tickLimit && Game.cpu.bucket < Game.cpu.limit * 10) {
        console.log('Skipping tick ' + Game.time + ' due to lack of CPU.');
        return;
    }
    empire.run(); 
}