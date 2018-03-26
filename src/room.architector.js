/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var CoreObject = require('core.object');
var _ = require('lodash');

var ROOM_WIDTH = 50;
var ROOM_HEIGHT = 50;

var RoomArchitector = CoreObject.extend({
    initialize: function(roomManager) {
        this.roomManager = roomManager;
        this.room = this.roomManager.room;
        this.containers = this.roomManager.containers;
        
        if (this.room.controller.level > 1) {
            this.buildContainers();
        }
        
        if (1 < this.room.controller.level < 6) {
            this.buildRoads();
        }
        
        if (this.room.controller.level > 3) {
            this.buildStorage();
        }
        
    },
    
    buildStorage: function() {
        if (this.room.storage) {
            return;
        }
        
        let _this = this;

        this.forPosAround({
            x: ROOM_WIDTH/2,
            y: ROOM_HEIGHT/2
        }, 20, function(x,y) {
            let arr = _this.room.lookAt(x,y);
            let terrain = _.find(arr, 'terrain');
            if (!terrain || terrain.terrain === 'wall') {
                return false;
            }

            let structure = _.find(arr, 'structure');

            if (!structure) {
                _this.room.createConstructionSite(x, y, STRUCTURE_STORAGE);
                return true;
            }
        });
  },
    
    buildContainers: function() {
        let _this = this;
        
        this.roomManager.sources.forEach(function(source) {
            let containers = source.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            });

            if (containers.length >= 2) {
                return;
            }

            let constructionSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
               filter: c => c.structureType == STRUCTURE_CONTAINER
            });
            
            if (constructionSites.length) {
                return;
            }
            
            _this.forPosAround(source.pos, 1 , function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');
                console.log(structure.structure.structureType);
                if (!structure || structure.structure.structureType != STRUCTURE_CONTAINER) {
                    _this.room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                    return true;
                }
            });
        });
    },
    
    buildRoads: function() {
        let _this = this;
        this.roomManager.sources.forEach(function(source) {
            _this.buildRoadBetween(source, _this.room.controller);
        });
        
        this.roomManager.spawns.forEach(function(spawn) {
            _this.roomManager.sources.forEach(function(source) {
                _this.buildRoadBetween(spawn, source);
            });
            
            _this.forPosAround(spawn.pos, 1 , function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');
                
                if (!structure) {
                    _this.room.createConstructionSite(x, y, STRUCTURE_ROAD);
                    return true;
                }
            });
        });
        
        if (this.room.storage) {
            _this.roomManager.sources.forEach(function(source) {
                _this.buildRoadBetween(_this.room.storage, source);
            });
            
            _this.buildRoadBetween(_this.room.storage, _this.room.controller);
            
            this.roomManager.spawns.forEach(function(spawn) {
                _this.buildRoadBetween(_this.room.storage, spawn);
            });
            
            _this.forPosAround(this.room.storage.pos, 1 , function(x,y) {
                let arr = _this.room.lookAt(x,y);
                let terrain = _.find(arr, 'terrain');
                if (terrain && terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');
                
                if (!structure) {
                    _this.room.createConstructionSite(x, y, STRUCTURE_ROAD);
                    return true;
                }
            });
        }
        
        let extensions = this.room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION
        });
        
        if (extensions.length) {
            if (this.room.storage) {
                extensions.forEach(function(extension) {
                    _this.buildRoadBetween(_this.room.storage, extension);
                });
            }
        }

    },
    
    buildRoadBetween: function(src, dst) {
        let _this = this;
        let path = src.pos.findPathTo(dst, {
            ignoreCreeps: true,
            costCallback: function(roomName, costMatrix) {
                _this.containers.forEach(function(container) {
                    costMatrix.set(container.pos.x, container.pos.y, 255);
                });
            }
        });
        if (!path) {
            return;
        }
        
        let count = 0;
        
        for (let i in path) {
            if (count > 4) {
                break;
            }
            
            let pos = path[i];
            // this.room.visual.circle(pos.x, pos.y, {fill: 'transparent', radius: 0.5, stroke: 'red'});
            let arr = _this.room.lookAt(pos.x, pos.y);
            let structure = _.find(arr, 'structure');

            if (!structure || !structure.structure) {
                _this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                count++;
            }
        }
    },
    
    forPosAround: function(pos, range, func) {
        for (let r = 1; r <= range; r++) {
            for(let y = pos.y - r; y <= pos.y + r; y += r) {
                for (let x = pos.x - r; x <= pos.x + r; x += r) {
                    let result = func(x,y);
                    // this.room.visual.circle(x, y, {fill: 'transparent', radius: 1, stroke: 'red'});
                    
                    if (result == true) {
                        return;
                    }
                }
            }
        }
    }
    
    
});

module.exports = RoomArchitector;