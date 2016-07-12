var path = require('path');
var webpack = require('webpack');

module.exports = {
	entry: path.join(__dirname, 'Box2D', 'Testbed', 'Testbed.ts'),
	output: {
		filename: path.join(__dirname, 'dist', 'box2d.js'),
        libraryTarget: 'umd'
	},
	resolve: {
		extensions: ['', '.webpack.js', '.ts']
	},
    externals: {
        box2d: "box2d"
    },
	module: {
		loaders: [{
			test: /\.tsx?$/,
			loader: 'ts-loader'
		}]
	},
	plugins: []
};