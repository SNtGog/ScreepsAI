/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('task.harvest');
 * mod.thing == 'a thing'; // true
 */
 
var harvest = function(creep, target) {
    var carry = _.sum(creep.carry);
    console.log('task.harvest',444);
    var carry = Object.keys(creep.carry);
    if (carry.length > 1 || carry[0] != 'energy') {
        
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => i.structureType == STRUCTURE_CONTAINER
        });
    
        var structure = null;
        for (var containerName in containers) {
            let container = containers[containerName];
            const total = _.sum(container.store);
            if (total < container.storeCapacity) {
                structure = container;
            }
        }
    
        if (structure) {
            for(const resourceType in creep.carry) {
                if (creep.transfer(storage, resourceType) == ERR_NOT_IN_RANGE) {
                    creep.move(structure);
                    return true;
                }
            }
        } 
    }    
    
    if (carry == creep.carryCapacity) {
        creep.putEnergy();
        return true;
    } else {
        if(creep.harvest(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return true;
    }
}

module.exports = harvest;