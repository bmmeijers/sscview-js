"use strict";

import parse_obj from '../src/parse.js';

import test from 'tape';


let obj = `
v 3555000.0 5904000.0 0
v 3555000.0 5908000.0 0
v 3554000.0 5904000.0 0
v 3554000.0 5909000.0 0
v 3550000.0 5904000.0 0
v 3559000.0 5908000.0 0
v 3555000.0 5908000.0 1
v 3554000.0 5904000.0 1
v 3555000.0 5904000.0 1
v 3554000.0 5909000.0 1
v 3550000.0 5904000.0 1
v 3555000.0 5904000.0 2
v 3559000.0 5908000.0 2
v 3555000.0 5908000.0 2
v 3554000.0 5904000.0 2
v 3554000.0 5909000.0 2
v 3550000.0 5904000.0 2
g 2114_poly1000008
f 14 13 12
f 12 15 14
f 14 15 16
f 15 17 16
g 2114_poly1
f 3 5 4
g 2301_poly2
f 3 2 1
f 2 3 4
g 4111_poly3
f 6 1 2
g 2114_poly1000007
f 9 8 7
f 10 7 8
f 8 11 10

# 1 2
l 3 4

# 1 1
l 4 5 3

# 1 5
l 2 4

# 1 3
l 3 1

# 2 4
l 2 1

# 2 1000008
l 9 8 11 10 7

# 2 6
l 1 6 2

# 3 1000010
l 12 15 17 16 14 13 12

`

test('#parsing leads to right number of vertices', function(t) {
    let parsed = parse_obj(obj);
    t.assert(parsed[0].length == 17 * 3)
    t.assert(parsed[1].length == 11 * 3 * 6, parsed[1].length)
    t.end();
});

test('#parsing leads to right number of triangles for polygons', function(t) {
    let parsed = parse_obj(obj);
    t.assert(parsed[1].length == 11 * 3 * 6, parsed[1].length)
    t.end();
});

test('#parsing leads to right number of triangles for lines', function(t) {
    let parsed = parse_obj(obj);
    // why 24???
    t.assert(parsed[2].length == 24 * 3 * 6, parsed[2].length)
    t.end();
});
