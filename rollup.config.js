const buble = require('rollup-plugin-buble');               // https://buble.surge.sh/guide/
const commonjs = require('rollup-plugin-commonjs');         // https://github.com/rollup/rollup-plugin-commonjs
const eslint = require('rollup-plugin-eslint');             // https://github.com/TrySound/rollup-plugin-eslint
const nodeResolve = require('rollup-plugin-node-resolve');  // https://github.com/rollup/rollup-plugin-node-resolve
const uglify = require('rollup-plugin-uglify');             // https://github.com/TrySound/rollup-plugin-uglify

//import { inherits } from 'util';
//import builtins from 'rollup-plugin-node-builtins';
//const builtins = require('rollup-plugin-node-builtins');
//const globals = require('rollup-plugin-node-globals');


const isProduction = (process.env.NODE_ENV === 'production');

const plugins = [
    nodeResolve({ jsnext: true, main: true }),
    commonjs({ include: 'node_modules/**' }),
    eslint(),
    buble(),
    //builtins(),
    //globals(),
];

if (isProduction) {
    plugins.push(uglify());
}


//const set = fromArray(['X', 'Y']); // => SortedSet<[X, Y]>
//console.log("rollup.config.js test")
//console.log("rollup.config.js set['X']:", set['X'])




//var dist_folder = 'dist_test'; 
// var dist_folder = 'dist_buchholz_astar';
// var dist_folder = 'dist_buchholz_greedy';
// var dist_folder = 'dist_buchholz_greedy_parallel_2';
// var dist_folder = 'dist_buchholz_greedy_parallel_10';
// var dist_folder = 'dist_buchholz_greedy_parallel_50';
//var dist_folder = 'dist_buchholz_greedy_parallel_250';
//var dist_folder = 'dist_buchholz_greedy_parallel_81';


var dist_folder = 'dist_top10nl_9x9/';

// dist_folder += '0.1';
// dist_folder += '0.01';
// dist_folder += '0.001';
// dist_folder += 'single-event';
dist_folder += '7';
// dist_folder += 'one-triangle';
// dist_folder += 'one-polygon';



// var dist_folder = 'dist_top10nl_9x9_0.1';
// var dist_folder = 'dist_top10nl_9x9_0.01';
// var dist_folder = 'dist_top10nl_9x9_0.001';
// var dist_folder = 'dist_top10nl_9x9_single_event';
//var dist_folder = 'dist_top10nl_9x9_two_rectangles';
//var dist_folder = 'dist_top10nl_9x9_paper_six';
//var dist_folder = 'dist_top10nl_9x9_seven';
//var dist_folder = 'dist_top10nl_9x9_strong_nbr_4';
// var dist_folder = 'dist_top10nl_9x9_strong_weak_nbr';
// var dist_folder = 'dist_top10nl_9x9_5';
// var dist_folder = 'dist_top10nl_9x9_7';

export default [
    {
        input: 'src/index.js',
        output: {
            file: dist_folder + '/index.js',
            name: 'varioscale',
            format: 'umd'
        },
        treeshake: true,
        sourcemap: dist_folder + '/index.js.map',
        plugins,
    },
    {
        input: 'src/worker.js',
        output: {
            file: dist_folder + '/worker.js',
            name: 'varioscale',
            format: 'iife'
        },
        sourcemap: dist_folder + '/worker.js.map',
        plugins,
    }
]
