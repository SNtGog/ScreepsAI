/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var _ = require('lodash');

var pickup = function(creep, target) {
    var carry = Object.keys(creep.carry);
    if (creep.carry.energy > 0) {
        creep.putEnergy();
        return true;
        
        // const containers = creep.room.find(FIND_STRUCTURES, {
        //     filter: (i) => i.structureType == STRUCTURE_CONTAINER
        // });
    
        // var structure = null;
        // for (var containerName in containers) {
        //     let container = containers[containerName];
        //     const total = _.sum(container.store);
        //     if (total < container.storeCapacity) {
        //         structure = container;
        //     }
        // }
    
        // if (structure) {
        //     for(const resourceType in creep.carry) {
        //         if (creep.transfer(storage, resourceType) == ERR_NOT_IN_RANGE) {
        //             creep.move(structure, {visualizePathStyle: {stroke: '#0066ff'}});
        //             return true;
        //         }
        //     }
        // } 
    }
    
    if (target.store) {
        for(const resourceType in creep.carry) {
                if (creep.withdraw(target, resourceType) == ERR_NOT_IN_RANGE) {
                    creep.move(target, {visualizePathStyle: {stroke: '#0066ff'}});
                    return true;
                }
            }
        return true;
    }
    
    if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#0066ff'}});
        return true;
    }
    return false;
};

module.exports = pickup;
