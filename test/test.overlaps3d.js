//"use strict";

//import test from 'tape';

//// importing this function from tiles.js says: "window is not defined"
//// maybe due to the use of the fetch api ?
//// (which is only available on the window object)

//function read_tree()
//{
//    var fs = require('fs')
//    var obj = JSON.parse(fs.readFileSync('/tmp/tree.json', 'utf8'))
//    console.log(obj)
//    return obj
//}

//function visit(node, box)
//{
//    let result = []
//    let stack = [node]
//    while (stack.length > 0)
//    {
//        let node = stack.pop()

//        // visit chids, if they overlap
//        node.children.forEach(child => {
//            if (overlaps3d(node.box, box))
//            {
//                stack.push(child)
//            }
//        });

//        // add data elements to result list, if box overlaps
//        node.dataelements.forEach(element => {
//            if (overlaps3d(element.box, box))
//            {
//                result.push(element)
//            }
//        });
//    }
//    return result
//}


//function overlaps3d(one, other) {
//    // Separating axes theorem, nD, here n = dims = 3
//    const dims = 3
//    let are_overlapping = true;
//    for (let min = 0; min < dims; min++)
//    {
//        let max = min + dims
//        if ((one[max] < other[min]) || (one[min] > other[max]))
//        {
//            are_overlapping = false
//            break
//        }
//    }
//    return are_overlapping
//}

//test('#read', function(t) {
//    let tree = read_tree()
//    let other = [5, 22600, 15, 15, 22615, 15]
//    t.assert(overlaps3d(tree.box, other) == true)
//    t.end()
//})


//test('#visit', function(t) {
//    let tree = read_tree()
//    let box = [5, 22600, 15, 15, 22615, 15]
//    let result = visit(tree, box)
//    console.log(result)
//    t.assert(result.length == 1)
//    // t.assert(overlaps3d(tree.box, other) == true)
//    t.end()
//})

//test('#overlaps', function(t) {
//    let one = [0, 0, 0, 10, 10, 10]
//    let other = [5, 5, 5, 15, 15, 15]
//    t.assert(overlaps3d(one, other) == true)
//    t.end()
//})

//test('#overlaps-containment', function(t) {
//    let one = [0, 0, 0, 10, 10, 10]
//    let other = [4, 4, 4, 6, 6, 6]
//    t.assert(overlaps3d(one, other) == true)
//    t.end()
//})

//test('#not-overlapping', function(t) {
//    let one = [0, 0, 0, 10, 10, 10]
//    let other = [5, 5, 12, 15, 15, 15]
//    t.assert(overlaps3d(one, other) == false)
//    t.end()
//})

//test('#not-overlapping', function(t) {
//    let one = [0, 0, 0, 10, 10, 10]
//    let other = [5, 12, 5, 15, 15, 15]
//    t.assert(overlaps3d(one, other) == false)
//    t.end()
//})

//test('#not-overlapping', function(t) {
//    let one = [0, 0, 0, 10, 10, 10]
//    let other = [12, 5, 5, 15, 15, 15]
//    t.assert(overlaps3d(one, other) == false)
//    t.end()
//})
