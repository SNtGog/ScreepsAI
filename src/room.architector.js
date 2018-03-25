/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var CoreObject = require('core.object');
var _ = require('lodash');

var RoomArchitector = CoreObject.extend({
    initialize: function(roomManager) {
        this.roomManager = roomManager;
        this.room = this.roomManager.room;
        
        if (this.room.controller.level > 1) {
            this.buildContainers();
        }
        
        if (1 < this.room.controller.level < 6) {
            this.buildRoads();
        }
        
    },
    
    buildContainers: function() {
        let _this = this;
        
        this.roomManager.sources.forEach(function(source) {
            let containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            });

            if (containers.length > 2) {
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
                if (!terrain || terrain.terrain === 'wall') {
                    return false;
                }
                
                let structure = _.find(arr, 'structure');
                
                if (!structure || !structure.structure) {
                    _this.room.createConstructionSite(x, y, STRUCTURE_STORAGE);
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
    },
    
    buildRoadBetween: function(src, dst) {
        let _this = this;
        let path = src.pos.findPathTo(dst, {
            ignoreCreeps: true
        });
        if (!path) {
            return;
        }
        
        path.forEach(function(pos) {
            let arr = _this.room.lookAt(pos.x, pos.y);
            let structure = _.find(arr, 'structure');

            if (!structure || !structure.structure) {
                _this.room.createConstructionSite(x, y, STRUCTURE_ROAD);
            }
        });
    },
    
    forPosAround: function(pos, range, func) {
        for (let r = 1; r <= range; r++) {
            for(let y = pos.y - r; y <= pos.y + r; y += r) {
                for (let x = pos.x - r; x < pos.x + r; x += r) {
                    let result = func(x,y);
                    if (result == true) {
                        return;
                    }
                }
            }
        }
    }
    
    
});

module.exports = RoomArchitector;