import { now } from "./animate"
import Transform from './transform';

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
    for (let min = 0; min < dims; min++)
    {
        let max = min + dims
        if ((one[max] < other[min]) || (one[min] > other[max]))
        {
            are_overlapping = false
            break
        }
    }
    return are_overlapping
}


let isPowerOf2 = ((value) => {return (value & (value - 1)) == 0})


class TileContent {
    constructor(msgbus) {
        this.msgbus = msgbus
        this.polygon_triangleVertexPositionBuffer = null;
        this.line_triangleVertexPositionBuffer = null;
        this.displacementBuffer = null;
        // this.texture = null;
        // this.textureCoordBuffer = null;
        this.class_color_dt = this.generate_class_color_dt();

        //this.line_vertexElements = null;
        //this.polygon_vertexElements = null;
        //this.polygon_vertexElements = null;
    }

    load(url, gl) {

        fetch(url)  //e.g., url = "http://localhost:8000/de/buchholz_greedy_test.obj"
            .then(response => {
                return response.text()  //e.g., the text (dataset) stored in an .obj file
            })
            .then(
                data_text => {

                    this._process_lines(data_text, gl, this.class_color_dt)
                    this._process_polygons(data_text, gl, this.class_color_dt)
                    // this.msgbus.publish('data', 'tile.loaded.triangles')

                    map.panBy(0, 0);
                }
            )
            .catch(err => { console.error(err) })

    }

    //_obtain_data_from_text(data_text, gl, class_color_dt) {
    //    var deltas_bound_triangles = [];
    //    var line_and_polygon_vertexElements = 
    //        _obtain_line_and_polygon_vertexElements(data_text, gl, class_color_dt, deltas_bound_triangles)




    //}

    //_obtain_line_and_polygon_vertexElements(data_text, gl,
    //    class_color_dt, deltas_bound_triangles) {

    //    var step_high = [];
    //    var vertex_lt = [];
    //    var feature_color = [];
    //    var triangle_color_lt = [];
    //    var vertices_bound_triangles = []; //vertices of the boundaries, in order to form triangles to display the boundaries


    //    data_text.split("\n").forEach(l => this.parseLine(l,
    //        vertex_lt, class_color_dt, triangle_color_lt,
    //        step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles));

    //    var line_vertexElements = new Float32Array(vertices_bound_triangles.flat(1));
    //    var polygon_vertexElements = new Float32Array(triangle_color_lt);

    //    return [line_vertexElements, polygon_vertexElements];
    //}



    /**
    Retrieve a chunk of data from the server

    Allocates an ArrayBuffer and makes the data available
    to the main thread *without* copying overhead
    */
    _process_polygons(data_text, gl, class_color_dt) {
        //data_text is the content of an .obj file
        this.polygon_triangleVertexPositionBuffer =
            this._obtain_triangleVertexPositionBuffer(data_text, gl, class_color_dt, 'polygon');
    }

    _process_lines(data_text, gl, class_color_dt) {
        //data_text is the content of an .obj file

        var deltas_bound_triangles = [];
        this.line_triangleVertexPositionBuffer =
            this._obtain_triangleVertexPositionBuffer(data_text, gl,
                class_color_dt, 'line', deltas_bound_triangles)

        let displacementElements = new Float32Array(deltas_bound_triangles.flat(1));
        let displacementBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);

        {
            let width_in_pixels = 0.45;
            let ratio = 0.0025 * width_in_pixels;
            //let ratio = 0.01 * width_in_pixels;
            displacementElements.forEach(
                function (val, index, arr) {
                    arr[index] = val * ratio;
                }
            );
        }
        gl.bufferData(gl.ARRAY_BUFFER, displacementElements, gl.STATIC_DRAW);

        displacementBuffer.itemSize = 2; //each item has only x and y
        displacementBuffer.numItems = displacementElements.length / 2;

        this.displacementBuffer = displacementBuffer;
        console.log("line displacementBuffer:", displacementBuffer)
    }

    _obtain_triangleVertexPositionBuffer(data_text, gl,
        class_color_dt, feature_type, deltas_bound_triangles = null) {

        var step_high = [];
        var vertex_lt = [];
        var feature_color = [];
        var triangle_color_lt = [];
        var vertices_bound_triangles = []; //vertices of the boundaries, in order to form triangles to display the boundaries

        if (deltas_bound_triangles == null) {
            //movements of the vertices of the boundaries, in order to form triangles to display the boundaries
            var deltas_bound_triangles = [];
        }

        data_text.split("\n").forEach(l => this.parseLine(l,
            vertex_lt, class_color_dt, triangle_color_lt,
            step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles));

        //console.log('Message received from worker');
        let triangleVertexPositionBuffer = gl.createBuffer();


        console.log(feature_type + " triangleVertexPositionBuffer:", triangleVertexPositionBuffer)

        if (feature_type == 'polygon') {
            var vertexElements = new Float32Array(triangle_color_lt);
            var itemSize = 3; //the number of elements, which is 3 for position, i.e., x, y, z            
            //each vertice has 6 elements in triangle_color_lt, i.e., x, y, z, r_frac, g_frac, b_frac
            var extended_itemSize = 6; //for computing the number of vertices;




            //var numItems = vertexElements.length / extended_itemSize;
            //var str = '[';

            //for (var i = 0; i < 3; i++) {
            //    for (var j = 0; j < numItems; j++) {
            //        var index = j * 6 + i;
            //        str += vertexElements[index] + ' ';
            //    }
            //    str += '; ';
            //}

            //for (var j = 0; j < numItems; j++) {
            //    str += '1 ';
            //}

            //str += ']';
            //console.log("triangleVertexPosition:", str);
        }
        else if (feature_type == 'line') {
            var vertexElements = new Float32Array(vertices_bound_triangles.flat(1));
            var itemSize = 4; //the number of elements, which is 4 for position, i.e., x, y, z (step_low), step_high
            var extended_itemSize = itemSize;  //for computing the number of vertices; 
        }

        // bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexElements, gl.STATIC_DRAW);

        //itemSize is the number of elements, which is 3 for position, i.e., x, y, z
        triangleVertexPositionBuffer.itemSize = itemSize;

        //numItems is the number of vertices; 
        //each vertice has 6 elements in triangle_color_lt, 
        //i.e., x, y, z, r_frac, g_frac, b_frac
        triangleVertexPositionBuffer.numItems = vertexElements.length / extended_itemSize;

        return triangleVertexPositionBuffer;
    }

    parseLine(line, vertex_lt, class_color_dt, triangle_color_lt,
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

            //console.log("step_high[0]:", step_high[0]);
            //console.log("polyline:", polyline);

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
                    var startr = bisector(mul(unitvec, -1), rotate90cw(unitvec));
                    var startl = bisector(mul(unitvec, -1), rotate90ccw(unitvec));
                    var endr = bisector(unitvec, rotate90cw(unitvec));
                    var endl = bisector(unitvec, rotate90ccw(unitvec));

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
            let magnitude = Math.sin(alpha);

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

    generate_class_color_dt() {
        var class_color_dt = {
            2101: { r: 239, g: 200, b: 200, r_frac: 239 / 255, g_frac: 200 / 255, b_frac: 200 / 255 },
            2112: { r: 255, g: 174, b: 185, r_frac: 255 / 255, g_frac: 174 / 255, b_frac: 185 / 255 },
            2114: { r: 204, g: 204, b: 204, r_frac: 204 / 255, g_frac: 204 / 255, b_frac: 204 / 255 },
            2201: { r: 138, g: 211, b: 175, r_frac: 138 / 255, g_frac: 211 / 255, b_frac: 175 / 255 },
            2202: { r: 51, g: 204, b: 153, r_frac: 51 / 255, g_frac: 204 / 255, b_frac: 153 / 255 },
            2213: { r: 170, g: 203, b: 175, r_frac: 170 / 255, g_frac: 203 / 255, b_frac: 175 / 255 },
            2230: { r: 181, g: 227, b: 181, r_frac: 181 / 255, g_frac: 227 / 255, b_frac: 181 / 255 },
            2301: { r: 157, g: 157, b: 108, r_frac: 157 / 255, g_frac: 157 / 255, b_frac: 108 / 255 },
            3103: { r: 254, g: 254, b: 254, r_frac: 254 / 255, g_frac: 254 / 255, b_frac: 254 / 255 },
            3302: { r: 204, g: 153, b: 255, r_frac: 204 / 255, g_frac: 153 / 255, b_frac: 255 / 255 },
            4101: { r: 234, g: 216, b: 189, r_frac: 234 / 255, g_frac: 216 / 255, b_frac: 189 / 255 },
            4102: { r: 230, g: 255, b: 204, r_frac: 230 / 255, g_frac: 255 / 255, b_frac: 204 / 255 },
            4103: { r: 171, g: 223, b: 150, r_frac: 171 / 255, g_frac: 223 / 255, b_frac: 150 / 255 },
            4104: { r: 255, g: 255, b: 192, r_frac: 255 / 255, g_frac: 255 / 255, b_frac: 192 / 255 },
            4105: { r: 40, g: 200, b: 254, r_frac: 40 / 255, g_frac: 200 / 255, b_frac: 254 / 255 },
            4107: { r: 141, g: 197, b: 108, r_frac: 141 / 255, g_frac: 197 / 255, b_frac: 108 / 255 },
            4108: { r: 174, g: 209, b: 160, r_frac: 174 / 255, g_frac: 209 / 255, b_frac: 160 / 255 },
            4109: { r: 207, g: 236, b: 168, r_frac: 207 / 255, g_frac: 236 / 255, b_frac: 168 / 255 },
            4111: { r: 190, g: 239, b: 255, r_frac: 190 / 255, g_frac: 239 / 255, b_frac: 255 / 255 },
            5112: { r: 181, g: 208, b: 208, r_frac: 181 / 255, g_frac: 208 / 255, b_frac: 208 / 255 },
        };
        return class_color_dt;
    }
}


function obtain_overlapped_dataelements(node, box3d)
{
    // console.log(box)
    let result = []
    let stack = [node]
    while (stack.length > 0)
    {
        let node = stack.pop()

        // visit chids, if they overlap
        node.children.forEach(child => {
            if (overlaps3d(node.box, box3d))
            {
                stack.push(child)
            }
        });

        // add data elements to result list, if box overlaps
        node.dataelements.forEach(element => {
            if (overlaps3d(element.box, box3d))
            {
                result.push(element)
            }
        });
    }
    return result
}


function obtain_dataelements(root)
{
    // FIXME: make iterator/generator function* 
    // to avoid making the whole result list
    let result = []
    let stack = [root]
    while (stack.length > 0)
    {
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

        let countrycodeslash = 'de/';
        let jsonfile = 'tree_buchholz_astar_tgap_bottoms_vario.json';
        //let jsonfile = 'tree_greedy_test.json';

        fetch(countrycodeslash + jsonfile)
            .then(r => {
                return r.json()
            })
            .then(tree => {
                this.tree = tree;
                let box3d = tree.box3d;
                tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2]
                let dataelements = obtain_dataelements(this.tree)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    element.url = countrycodeslash + element.info
                    //console.log('tile.url (dataset):', tile.url)
                })
            })
            .then(() => {
                this.msgbus.publish('data.tree.loaded', 'tree.ready')
            }) // FIXME: Notify via PubSub that tree has loaded (should re-render map if not rendering)
            .catch(err => {
                console.error(err)
            })
    }

    set_active_tiles(box3d, gl) {
        if (this.tree === null) { return }

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
        // FIXME: sort the tiles via the distance from center of the box?
        overlapped_dataelements.map(elem => {
            if (!this.retrieved[elem.url] && elem.content === null) {
                let content = new TileContent(this.msgbus)
                content.load(elem.url, gl) //e.g., elem.url = de/buchholz_greedy_test.obj
                elem.content = content
                this.retrieved[elem.url] = true // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
            }
        })
        //map.panBy(0, 0);
    }

    get_active_tiles(box3d) {
        if (this.tree === null) { return [] }

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
         //console.log(tiles.length)
        return overlapped_dataelements
            .filter(elem => { // those tiles that are loaded and overlap the screen
                //elem.content may have been assigned in function set_active_tiles
                return elem.content !== null && overlaps3d(box3d, elem.box)  
            })
            .map(elem => { // set for each tile to be rendered the last accessed time
                elem.last_touched = now(); 
                // console.log(elem.info)
                return elem
            })
    }

}

export default SSCTree

