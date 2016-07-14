var path = require('path');
var webpack = require('webpack');

module.exports = require('./webpack.config.js');
module.exports.entry = path.join(__dirname, 'Box2D', 'Testbed', 'Testbed.ts');
module.exports.output.filename = path.join(__dirname, 'dist', 'testbed.js');