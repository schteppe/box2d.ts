var path = require('path');
var webpack = require('webpack');

module.exports = require('./webpack.config.js');
module.exports.entry = path.join(__dirname, 'Box2D', 'HelloWorld', 'HelloWorld.ts');
module.exports.output.filename = path.join(__dirname, 'dist', 'helloworld.js');