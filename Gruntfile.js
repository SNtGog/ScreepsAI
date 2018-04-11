/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
module.exports = function(grunt) {
 
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-contrib-concat');
 
    grunt.initConfig({
        watch: {
            options: { nospawn: true },
            scripts: {
                files: ['src/**/*.js'],
                tasks: ['concat']
            }
        },
        
        screeps: {
            options: grunt.file.readJSON('options.json'),
            dist: {
                src: ['src/**/*.js']
            }
        },
        
        concat: {
            options: {
              separator: ';'
            },
            dist: {
              src: ['src/**/*.js'],
              dest: 'dist/main.js'
            }
        },
        
        uglify: {
            options: {
                 mangle: false,
                 compress: false
            },
            my_target: {
                files: [{
                    expand: true,
                    cwd: 'src',
                    src: 'dist/main.js',
                    dest: 'dist/main.min.js'
                }]
            }
        }
    });
};
