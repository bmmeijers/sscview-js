"use strict";

import Rectangle from '../src/rect.js';

import test from 'tape';

test('#constructor', function(t) {
    var r = new Rectangle(0, 1, 2, 3);
    t.assert(r.xmin == 0);
    t.assert(r.ymin == 1);
    t.assert(r.xmax == 2);
    t.assert(r.ymax == 3);
    t.end();
});

test('#width', function(t) {
    var r = new Rectangle(0, 1, 2, 3);
    t.assert(r.width() == 2);
    t.end();
});

test('#height', function(t) {
    var r = new Rectangle(0, 1, 2, 4);
    t.assert(r.height() == 3);
    t.end();
});

test('#area', function(t) {
    var r = new Rectangle(0, 1, 2, 4);
    t.assert(r.area() == 6);
    t.end();
});

test('#center', function(t) {
    var r = new Rectangle(0, 1, 2, 4);
    var result = r.center();
    t.assert(result[0] = 1);
    t.assert(result[1] = 2.5);
    t.end();
});

test('#toString', function(t) {
    var r = new Rectangle(0, 1, 2, 3);
    console.log(r.toString());
    t.assert(r.toString() == "new Rectangle(0, 1, 2, 3)");
    t.end();
});
