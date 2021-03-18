'use strict';

import test from 'tape';
import { createvec3, vec3transform } from '../src/mat4';
import Transform from '../src/transform';
import Rectangle from '../src/rect';

test('Transform 1 ends up at center after initializing', function(t) {
    let center = [96300, 440000]
    let viewport_size = [512, 512] // width x height
    var trans = new Transform(viewport_size, center, 10000);
    let result = createvec3()
    let input = createvec3()
    input[0] = center[0]
    input[1] = center[1]
    input[2] = 0

    console.log('-- input')
    console.log(input)

    console.log('-- world_viewport matrix')
    console.log( trans.world_viewport)

    vec3transform(result, input, trans.world_viewport)
    console.log("backward -> " + result);
    // we should end up at the center
    t.assert(parseInt(result[0]) == 256);
    t.assert(parseInt(result[1]) == 256);
    t.end();
});

//test('Transform 2 ends up at center after initializing', function(t) {
//    let width = 1024
//    let height = 1022
//    let cx = Math.round(width * 0.5)
//    let cy = Math.round(height * 0.5)
//    console.log(cx);
//    console.log(cy)
//    var trans = new Transform([width, height], [cx,cy], 25000);
//    let result = createvec3()
//    let input = createvec3()
//    input[0] = 1250
//    input[1] = 4500
//    input[2] = 0
//    console.log('-- input')
//    console.log(input)

//    console.log('-- world_viewport matrix')
//    console.log( trans.world_viewport)

//    vec3transform(result, input, trans.world_viewport)
//    console.log("backward -> " + result);
//    console.log(Math.round(result[0]));
//    console.log(Math.round(result[1]));

//    // we should end up at the center
//    t.assert(Math.round(result[0]) == cx);
//    t.assert(Math.round(result[1]) == cy);
//    t.end();
//});

