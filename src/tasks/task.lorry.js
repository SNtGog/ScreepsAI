/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var lorry = function(creep, target) {
    let container = target.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
    });

    if (creep.carry.energy == creep.carryCapacity || (creep.carry.energy != 0 && !creep.pos.isNearTo(target))) {

        if (container == undefined) {
            container = creep.room.storage;
        }

        // if one was found
        if (container != undefined) {
            // try to withdraw energy, if the container is not in range
            let code = creep.withdraw(container, RESOURCE_ENERGY);
            if (code == ERR_NOT_IN_RANGE) {
                // move towards it
                creep.moveTo(container);
            }
            if (code === ERR_FULL || code === ERR_NOT_ENOUGH_RESOURCES) {
                creep.memory.working = true;
            }
        }
        
        return true;
    } else {
        let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            // the second argument for findClosestByPath is an object which takes
            // a property called filter which can be a function
            // we use the arrow operator to define it
            filter: (s) => (s.structureType == STRUCTURE_SPAWN
                         || s.structureType == STRUCTURE_EXTENSION
                         || s.structureType == STRUCTURE_TOWER)
                         && s.energy < s.energyCapacity
        });

        if (structure == undefined) {
            structure = creep.room.storage;
        }

        // if we found one
        if (structure != undefined) {
            // try to transfer energy, if it is not in range
            if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                // move towards it
                creep.moveTo(structure);
            }
        }
        return true;
    }
};

module.exports = lorry;

