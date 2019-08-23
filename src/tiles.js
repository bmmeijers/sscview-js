import { now } from "./animate"
import Transform from './transform';

export class SSCTree {
    constructor(msgbus) {
        this.msgbus = msgbus
        this.tree = null
        this.retrieved = {}
    }

    load() {
        //
        // FIXME: convert to worker that does this
        // 
        // fetch('nl/tree_max9_fanout10_9.json')

        //we specify folder 'dist_test', 'dist_buchholz_greedy', or 'dist_buchholz_astar' in sscview-js\rollup.config.js
        let data_folder = 'data/';
//        let jsonfile = 'nodes.json';
        let jsonfile = 'tree_buchholz.json';
        //let jsonfile = 'tree.json';

        fetch(data_folder + jsonfile)
            .then(r => {
                return r.json()
            })
            .then(tree => {
                this.tree = tree;
                let box3d = tree.box;
                tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2]
                let dataelements = obtain_dataelements(this.tree)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    element.url = data_folder + element.info
                })
            })
            .then(() => {
                this.msgbus.publish('data.tree.loaded', 'tree.ready')
            }) // FIXME: Notify via PubSub that tree has loaded (should re-render map if not rendering)
            .catch(err => {
                console.error(err)
            })
    }

    fetch_tiles(box3d, gl) {
        if (this.tree === null) { return }

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
        // FIXME: sort the tiles via the distance from center of the box?
        overlapped_dataelements.map(elem => {
            if (!this.retrieved[elem.url] && elem.content === null) {
                let content = new TileContent(this.msgbus)
                content.load(elem.url, gl) //e.g., elem.url = de/buchholz_greedy_test.obj
                elem.content = content
                this.retrieved[elem.url] = true 
                // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
                // FIXME: put this in the tile itself, instead of in extra object 'this.retrieved'
            }
        })
    }

    get_relevant_tiles(box3d) {
        if (this.tree === null) { return [] }

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
        return overlapped_dataelements
            .filter(elem => { // those tiles that are loaded and overlap the screen
                //elem.content may have been assigned in function set_active_tiles
                return elem.content !== null && overlaps3d(box3d, elem.box)
            })
            .map(elem => { // set for each tile to be rendered the last accessed time
                elem.last_touched = now();
                return elem
            })
    }

}


class TileContent {
    constructor(msgbus) {
        this.msgbus = msgbus
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;
        this.polygon_triangleVertexPosBufr = null;
    }

    load(url, gl) {
        fetch(url)  //e.g., url = "http://localhost:8000/de/buchholz_greedy_test.obj"
            .then(response => { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
            .then(data_text => {
                var data_from_text = this._obtain_data_from_text(data_text, gl, this.class_color_dt);
                this.line_triangleVertexPosBufr = data_from_text[0];
                this.displacementBuffer = data_from_text[1];
                this.polygon_triangleVertexPosBufr = data_from_text[2];
                this.msgbus.publish('data.tile.loaded', 'tile.ready')
            })
            .catch(err => { console.error(err) });
    }

    _obtain_data_from_text(data_text, gl) {
        //data_text is the content of an .obj file

        var class_color_dt = generate_class_color_dt();
        var deltas_bound_triangles = [];
        var line_and_polygon_triangleVertexPosBufr = 
            this._obtain_line_and_polygon_triangleVertexPosBufr(data_text, gl, class_color_dt, deltas_bound_triangles)

        let displacementElements = new Float32Array(deltas_bound_triangles.flat(1));
        let displacementBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, displacementElements, gl.STATIC_DRAW);

        displacementBuffer.itemSize = 2; //each item has only x and y
        displacementBuffer.numItems = displacementElements.length / 2;

        return [
            line_and_polygon_triangleVertexPosBufr[0],
            displacementBuffer,
            line_and_polygon_triangleVertexPosBufr[1]];
    }


    _obtain_line_and_polygon_triangleVertexPosBufr(data_text, gl,
        class_color_dt, deltas_bound_triangles) {

        var step_high = [];
        var vertex_lt = [];
        var feature_color = [];
        var triangle_color_lt = [];
        var vertices_bound_triangles = []; //vertices of the boundaries, in order to form triangles to display the boundaries
        data_text.split("\n").forEach(l => this._parseLine(
            l, vertex_lt, class_color_dt, triangle_color_lt,
            step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles));

        //obtain line_triangleVertexPosBufr;
        var line_vertexElements = new Float32Array(vertices_bound_triangles.flat(1));
        var line_itemSize = 4; //the number of elements, which is 4 for position, i.e., x, y, z (step_low), step_high
        var line_extended_itemSize = line_itemSize; //for computing the number of vertices; 
        var line_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, line_vertexElements, line_itemSize, line_extended_itemSize);

        //obtain polygon_triangleVertexPosBufr;
        var polygon_vertexElements = new Float32Array(triangle_color_lt);
        var polygon_itemSize = 3; //the number of elements, which is 3 for position, i.e., x, y, z 
        //each vertex has 6 elements in triangle_color_lt, i.e., x, y, z, r_frac, g_frac, b_frac
        var polygon_extended_itemSize = 6; //for computing the number of vertices;        
        var polygon_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, polygon_vertexElements, polygon_itemSize, polygon_extended_itemSize);

        return [line_triangleVertexPosBufr, polygon_triangleVertexPosBufr];
    }


    _obtain_triangleVertexPosBufr(gl, vertexElements, itemSize, extended_itemSize) {
        
        let triangleVertexPosBufr = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        gl.bufferData(gl.ARRAY_BUFFER, vertexElements, gl.STATIC_DRAW);

        triangleVertexPosBufr.itemSize = itemSize;        
        triangleVertexPosBufr.numItems = vertexElements.length / extended_itemSize; //the number of vertices;

        return triangleVertexPosBufr;
    }


    _parseLine(line, vertex_lt, class_color_dt, triangle_color_lt,
        step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles) {

        var words = line.split(' ');
        if (words[0] == 'v') {
            vertex_lt.push({
                x: Number(words[1]),
                y: Number(words[2]),
                z: Number(words[3])
            });
        } else if (words[0] == 'g') {
            var feature_class = Number(words[1].split('_')[0]);
            feature_color[0] = class_color_dt[feature_class];
        } else if (words[0] == 'f') {
            // 3 vertex indentifiers make a triangle; add coordinates and colors
            var f_color = feature_color[0];
            for (i = 1; i <= 3; i++) {
                var vertex = vertex_lt[Number(words[i]) - 1];
                triangle_color_lt.push(vertex.x, vertex.y, vertex.z,
                    f_color.r_frac, f_color.g_frac, f_color.b_frac);
            }
        }
        else if (words[0] == '#') {
            // words[1]: step_high; words[2]: edge_id
            if (words.length > 1) {
                step_high[0] = words[1];
            }
        }
        else if (words[0] == 'l') {
            var polyline = [];
            for (var i = 1; i < words.length; i++) {
                polyline.push(vertex_lt[words[i] - 1]);
            }

            var point_records = [];
            for (var j = 0; j < polyline.length; j++) {
                var pt = polyline[j];
                point_records.push([pt.x, pt.y, pt.z, step_high[0]]); //pt.z is step_low
            }

            for (var j = 0; j < point_records.length - 1; j++) {
                var start = point_records[j];    //start point of a line segment
                var end = point_records[j + 1];  //end point of the line segment
                var start_xy = start.slice(0, 2);
                var end_xy = end.slice(0, 2);
                var v = make_vector_start_end(start_xy, end_xy);
                var length = norm(v);

                if (length != 0) {
                    var unitvec = div(v, length);
                    //The lengths of startr, startl, endr, and endl are sqrt(2)
                    var startr = add(mul(unitvec, -1), rotate90cw(unitvec));
                    var startl = add(mul(unitvec, -1), rotate90ccw(unitvec));
                    var endr = add(unitvec, rotate90cw(unitvec));
                    var endl = add(unitvec, rotate90ccw(unitvec));


                    //start consists of x, y, z (step_low), step_high, while
                    //startl consists of only x, y
                    vertices_bound_triangles.push(start, start, end, start, end, end);
                    deltas_bound_triangles.push(startl, startr, endl, startr, endr, endl);
                }
            }
        }

        //#region vector computation

        function sub(a, b) {
            /*Subtract a vector b from a, or subtract a scalar*/
            var result_values = [];
            if (isNaN(b)) { //b is not a number; b is iterable
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] - b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] - b);
                }
            }

            return result_values;
        }

        function add(a, b) {
            /*Add a vector b to a, or add a scalar*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] + b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] + b);
                }
            }

            return result_values;
        }

        function mul(a, b) {
            /*Multiply a vector either element-wise with another vector, or with a
            scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] * b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] * b);
                }
            }

            return result_values;
        }

        function div(a, b) {
            /*Element-wise division with another vector, or with a scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] / b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] / b);
                }
            }

            return result_values;
        }


        //function make_vector(end, start) {
        //    /*Creates a vector from the start to the end.

        //    Vector is made based on two points{ end - (minus) start.
        //        */
        //    return sub(end, start);
        //}

        function make_vector_start_end(start, end) {
            /*Creates a vector from the start to the end.
            
            Vector is made based on two points{ end - (minus) start.
                */
            return sub(end, start);
        }

        function dot(v1, v2) {
            /*Returns dot product of v1 and v2 */
            if (v1.length != v2.length) {
                throw "Vector dimensions should be equal";
            }

            var dot_value = 0;
            for (var i = 0; i < v1.length; i++) {
                dot_value += v1[i] * v2[i];
            }
            return dot_value;
        }


        function norm2(v) {
            /*Returns the norm of v, *squared*.*/
            return dot(v, v);
        }


        function norm(a) {
            /*L2 norm*/
            return Math.sqrt(norm2(a));
        }


        function dist(start, end) {
            /*Distance between two positons*/
            return norm(make_vector_start_end(start, end));
        }


        function unit(v) {
            /*Returns the unit vector in the direction of v.*/
            return div(v, norm(v));
        }


        function cross(a, b) {
            /*Cross product between a 3-vector or a 2-vector*/
            if (a.length != b.length) {
                throw "Vector dimensions should be equal";
            }
            if (a.length == 3) {
                return (
                    a[1] * b[2] - a[2] * b[1],
                    a[2] * b[0] - a[0] * b[2],
                    a[0] * b[1] - a[1] * b[0]);
            }
            else if (a.length == 2) {
                return a[0] * b[1] - a[1] * b[0];
            }
            else {
                throw 'Vectors must be 2D or 3D';
            }
        }

        function angle(v1, v2) {
            /*angle between 2 vectors*/
            return Math.acos(dot(v1, v2) / (norm(v1) * norm(v2)));
        }

        function angle_unit(v1, v2) {
            /*angle between 2 *unit* vectors*/
            let d = dot(v1, v2)
            if (d > 1.0 || d < -1.0) {
                console.log("dot not in [-1, 1] -- clamp");
            }
            d = Math.max(-1.0, Math.min(1.0, d));
            return Math.acos(d);
        }

        function near_zero(val) {
            if (Math.abs(val) <= Math.pow(0.1, 8)) {
                return true;
            }
            else {
                return false;
            }
        }

        function bisector(u1, u2) {
            /*Based on two unit vectors perpendicular to the wavefront,
            get the bisector
            
            The magnitude of the bisector vector represents the speed
                in which a vertex has to move to keep up(stay at the intersection of)
            the 2 wavefront edges
            */
            let direction = add(u1, u2);

            var max_value = 0;
            for (var i = 0; i < direction.length; i++) {
                max_value = Math.max(max_value, Math.abs(direction[i]));
            }

            if (near_zero(max_value)) {
                return (0, 0);
            }
            let alpha = 0.5 * Math.PI + 0.5 * angle_unit(u1, u2);
            let magnitude = Math.sin(alpha); //if u1 and u2 are unit vectors, then magnitude = sqrt(2) / 2
            var bisector_result = div(unit(direction), magnitude);
            return bisector_result;
        }


        function rotate90ccw(v) {
            /*Rotate 2d vector 90 degrees counter clockwise
            
                (x, y) -> (-y, x)
            */
            return [-v[1], v[0]];
        }


        function rotate90cw(v) {
            /*Rotate 2d vector 90 degrees clockwise
            
                (x, y) -> (y, -x)
            */
            return [v[1], -v[0]];
        }
    

    //#endregion
    }


}





function obtain_overlapped_dataelements(node, box3d) {
    // console.log(box)
    let result = []
    let stack = [node]
    while (stack.length > 0) {
        let node = stack.pop()

        // visit chids, if they overlap
        node.children.forEach(child => {
            if (overlaps3d(node.box, box3d)) {
                stack.push(child)
            }
        });

        // add data elements to result list, if box overlaps
        node.dataelements.forEach(element => {
            if (overlaps3d(element.box, box3d)) {
                result.push(element)
            }
        });
    }
    return result
}


function obtain_dataelements(root) {
    // FIXME: make iterator/generator function* 
    // to avoid making the whole result list
    let result = []
    let stack = [root]
    while (stack.length > 0) {
        const node = stack.pop()

        // visit chids, if they overlap
        node.children.forEach(child => {
            stack.push(child)
        });

        // add data elements to result list, if box overlaps
        node.dataelements.forEach(element => {
            result.push(element)
        });
    }
    return result
}

function overlaps2d(one, other) {
    // Separating axes theorem
    // xmin=[0][0]
    // xmax=[1][0]
    // ymin=[0][1]
    // ymax=[1][1]
    // If one of the following is true then there can be no overlap
    return !(one[1][0] < other[0][0] ||
        one[0][0] > other[1][0] ||
        one[1][1] < other[0][1] ||
        one[0][1] > other[1][1])
}


export function overlaps3d(one, other) {
    // Separating axes theorem, nD
    const dims = 3
    let are_overlapping = true;
    for (let min = 0; min < dims; min++) {
        let max = min + dims
        if ((one[max] < other[min]) || (one[min] > other[max])) {
            are_overlapping = false
            break
        }
    }
    return are_overlapping
}

function generate_class_color_dt() {

    var class_color_dt = {
        2101: { r: 239, g: 200, b: 200 },
        2112: { r: 255, g: 174, b: 185 },
        2114: { r: 204, g: 204, b: 204 },
        2201: { r: 138, g: 211, b: 175 },
        2202: { r: 51, g: 204, b: 153 },
        2213: { r: 170, g: 203, b: 175 },
        2230: { r: 181, g: 227, b: 181 },
        2301: { r: 157, g: 157, b: 108 },
        3103: { r: 254, g: 254, b: 254 },
        3302: { r: 204, g: 153, b: 255 },
        4101: { r: 234, g: 216, b: 189 },
        4102: { r: 230, g: 255, b: 204 },
        4103: { r: 171, g: 223, b: 150 },
        4104: { r: 255, g: 255, b: 192 },
        4105: { r: 40, g: 200, b: 254 },
        4107: { r: 141, g: 197, b: 108 },
        4108: { r: 174, g: 209, b: 160 },
        4109: { r: 207, g: 236, b: 168 },
        4111: { r: 190, g: 239, b: 255 },
        5112: { r: 181, g: 208, b: 208 },
    };

    for (var key in class_color_dt) {
        var color = class_color_dt[key];  //color is a dictionary of elements r, g, b
        color.r_frac = color.r / 255;
        color.g_frac = color.g / 255;
        color.b_frac = color.b / 255;
    }

    return class_color_dt;
}


// let isPowerOf2 = ((value) => { return (value & (value - 1)) == 0 })

export default SSCTree

