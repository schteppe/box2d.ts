var path = require('path');
var webpack = require('webpack');

module.exports = {
	entry: path.join(__dirname, 'Box2D', 'Testbed', 'Testbed.ts'),
	output: {
		filename: path.join(__dirname, 'dist', 'testbed.js'),
        libraryTarget: 'umd'
	},
	resolve: {
		extensions: ['', '.webpack.js', '.ts']
	},
	module: {
		loaders: [{
			test: /\.tsx?$/,
			loader: 'ts-loader'
		}]
	},
	plugins: []
};