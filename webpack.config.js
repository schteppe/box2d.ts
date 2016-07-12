var path = require('path');
var webpack = require('webpack');

module.exports = {
	entry: path.join(__dirname, 'index.ts'),
	output: {
		filename: path.join(__dirname, 'dist', 'box2d.js')
	},
	resolve: {
		extensions: ['', '.webpack.js', '.ts']
	},
    externals: {},
	module: {
		loaders: [{
			test: /\.tsx?$/,
			loader: 'ts-loader'
		}]
	},
	plugins: []
};