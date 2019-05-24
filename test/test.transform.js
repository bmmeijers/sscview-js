'use strict';

import test from 'tape';
import { createvec3, vec3transform } from '../src/mat4';
import Transform from '../src/transform';

test('Transform ends up at center after initializing', function(t) {
    var trans = new Transform([96300, 440000], [512, 512], 10000);
    let result = createvec3()
    let input = createvec3()
    input[0] = 96300
    input[1] = 440000
    input[2] = 0
    vec3transform(result, input, trans.world_viewport)
    console.log("backward -> " + result);
    // we should end up at the center
    t.assert(parseInt(result[0]) == 256);
    t.assert(parseInt(result[1]) == 256);
    t.end();
});

test('Transform ends up at center after initializing', function(t) {
    let width = 1024
    let height = 1022
    let cx = Math.round(width * 0.5)
    let cy = Math.round(height * 0.5)
    console.log(cx);
    console.log(cy)
    var trans = new Transform([1250, 4500], [width, height], 25000);
    let result = createvec3()
    let input = createvec3()
    input[0] = 1250
    input[1] = 4500
    input[2] = 0
    vec3transform(result, input, trans.world_viewport)
    console.log("backward -> " + result);
    console.log(Math.round(result[0]));
    console.log(Math.round(result[1]));

    // we should end up at the center
    t.assert(Math.round(result[0]) == cx);
    t.assert(Math.round(result[1]) == cy);
    t.end();
});

//class Transform(object):
//    def __init__(self,  center_world, viewport_size, denominator):
//        self.zoom_to(center_world, viewport_size, denominator)

//    def zoom_to(self, center_world, viewport_size, denominator):
//        # initialize transform with 
//        # take center of the world that we want to see
//        cx, cy = center_world
//        # take the width / height of the viewport and aspect ratio of it
//        width, height = viewport_size 
//        halfw, halfh = 0.5 * width, 0.5 * height
//        aspect = float(width) / float(height)
//        # size in real world of viewport
//        dpi = 144.
//        inch = 1.0 / 39.37 # 0.0254 # in meter
//        px_world = inch / dpi
//        # get half visible screen size in world units,
//        # when we look at it at this map scale (1:denominator)
//        half_visible_screen = px_world * halfw * denominator, px_world * halfh * denominator
//        xmin = cx - half_visible_screen[0]
//        xmax = cx + half_visible_screen[0]
//        ymin = cy - half_visible_screen[1]
//        ymax = cy + half_visible_screen[1]
//        # we arrive at what part of the world then is visible
//        self.visible_world = Box(xmin, ymin, xmax, ymax)
//        # scaling/translating is then as follows:
//        scale = 2. / self.visible_world.width(), 2. / self.visible_world.height()
//        translate = -scale[0] * cx, -scale[1] * cy
//        # by means of which we can calculate a world -> ndc square matrix
//        world_square = Matrix44()
//        world_square[0, 0] = scale[0]
//        world_square[1, 1] = scale[1]
//        world_square[3, 0] = translate[0]
//        world_square[3, 1] = translate[1]
//        self.world_square = world_square
//        # and given the size of the viewport we can set up ndc square -> viewport matrix
//        self.viewport = Box(0, 0, width, height)
//        self.square_viewport = square_viewport_matrix(self.viewport)
//        # and going from one to the other is then the concatenation of the 2 (and its inverse)
//        self.world_viewport = self.square_viewport * self.world_square
//        self.viewport_world = self.world_viewport.get_inverse()

//    def backward(self, vec2):
//        "viewport -> world"
//        #print vec2, "-->", 
//        result = self.viewport_world.transform((vec2[0], vec2[1], 0))
//        #print result
//        return result

//    def forward(self, vec2):
//        "world -> viewport"
//        #print vec2, "-->", self.world_viewport.transform((vec2[0], vec2[1], 0))

//#    def update_viewport_size(self, w, h):
//#        self.viewport.xmax = w
//#        self.viewport.ymax = h
//#        self.aspect_ratio = self.viewport.width() / self.viewport.height()

//    def zoom(self, factor, x, y): # in pixels
//        # zoom
//        # 1. translate
//        eye = Matrix44()
//        eye[3,0] = -x
//        eye[3,1] = -y
//        #print self.square_viewport
//        #print 'translated'
//        tmp = eye * self.square_viewport
//        #print tmp
//        # 2. scale
//        eye = Matrix44()
//        eye[0,0] = factor
//        eye[1,1] = factor
//        tmp = eye * tmp
//        #print tmp
//        # 3. translate back
//        eye = Matrix44()
//        eye[3,0] = x
//        eye[3,1] = y
//        tmp = eye * tmp
//        #print "ndc -> viewport", tmp
//        self.square_viewport = tmp

//        self.world_viewport = self.square_viewport * self.world_square
//        self.viewport_world = self.world_viewport.get_inverse()
//        
//        #print self.world_viewport
//        #print self.viewport_world
//        
//        ll = self.backward((self.viewport.xmin, self.viewport.ymin))
//        tr = self.backward((self.viewport.xmax, self.viewport.ymax))

//        # get new world_square matrix
//        self.visible_world = Box(ll[0], ll[1], tr[0], tr[1])
//        cx, cy = self.visible_world.center()
//        scale = 2. / self.visible_world.width(), 2. / self.visible_world.height()
//        translate = -scale[0] * cx, -scale[1] * cy
//        # by means of which we can calculate a world -> ndc square matrix
//        world_square = Matrix44()
//        world_square[0, 0] = scale[0]
//        world_square[1, 1] = scale[1]
//        world_square[3, 0] = translate[0]
//        world_square[3, 1] = translate[1]
//        self.world_square = world_square
//        self.square_viewport = square_viewport_matrix(self.viewport)
//        # and going from one to the other is then the concatenation of the 2 (and its inverse)
//        self.world_viewport = self.square_viewport * self.world_square
//        self.viewport_world = self.world_viewport.get_inverse()

//    def pan(self, dx, dy): # in pixels
//        # pan -- translate
//#        eye = Matrix44()
//#        eye[3,0] = dx
//#        eye[3,1] = dy
//#        #print 'translated'
//#        #print eye
//#        tmp = eye * self.square_viewport

//        ll = self.backward((0, 0))
//        tr = self.backward((256, 256))
//        # get new world_square matrix
//        wrld = Box(ll[0], ll[1], tr[0], tr[1])
//        #print wrld.width()
//        #print wrld.height()


//        #print "BEFORE"
//        #print "wld->ndc (bef)"
//        #print self.world_square
//        #print "ndc->vp (bef)"
//        #print self.square_viewport
//        #print "wld->vp"
//        #print self.world_viewport
//        #print "vp->wld"
//        #print self.viewport_world
//        #print "".join(reversed("BEFORE"))
//        #print "\n"
//        self.square_viewport[3,0] += dx
//        self.square_viewport[3,1] += dy
//        #print "ndc -> vp", self.square_viewport
//        #print "wd -> ndc", self.world_square
//#        #print tmp
//#        self.square_viewport = tmp
//        self.world_viewport = self.square_viewport * self.world_square
//        #print self.world_viewport
//        #print "vp -> world (before)", self.viewport_world
//        self.viewport_world = self.world_viewport.get_inverse()



//        #print "AFTER"
//        #print "wld->ndc"
//        #print self.world_square
//        #print "ndc->vp"
//        #print self.square_viewport
//        #print "wld->vp"
//        #print self.world_viewport
//        #print "vp->wld"
//        #print self.viewport_world
//        #print "".join(reversed("AFTER"))
//        #print "\n"


//        #print "vp -> world (after) ", self.viewport_world
//        ll = self.backward((0,0))
//        tr = self.backward((512,512))
//        #print ll
//        #print tr
//        # get new world_square matrix
//        self.visible_world = Box(ll[0], ll[1], tr[0], tr[1])
//        #print "==>", self.visible_world.width(), "x", self.visible_world.height()

//        cx, cy = self.visible_world.center()
//        scale = 2.0 / self.visible_world.width(), 2. / self.visible_world.height()

//        translate = -scale[0] * cx, -scale[1] * cy
//        # by means of which we can calculate a world -> ndc square matrix
//        world_square = Matrix44()
//        world_square[0, 0] = scale[0]
//        world_square[1, 1] = scale[1]
//        world_square[3, 0] = translate[0]
//        world_square[3, 1] = translate[1]
//        self.world_square = world_square
//        self.square_viewport = square_viewport_matrix(self.viewport)
//        # and going from one to the other is then the concatenation of the 2 (and its inverse)
//        self.world_viewport = self.square_viewport * self.world_square
//        self.viewport_world = self.world_viewport.get_inverse()
