(function () {
    'use strict';

    //export var facecount = 0

    //export function setfacecount() {
    //    facecount = 0
    //}

    //export function readfacecount() {
    //    console.log('parse.js facecount:', facecount)
    //    return facecount
    //}

    function parse_obj(txt) {
        var fcolor = null;  //feature color
        var step_high = null;
        var class_color = generate_class_color();

        //let vertices = []
        //we will reverse the order of the groups to avoid drawing all the lower ssc levels 
        //(we only draw the immediate-lower level, useful for the case when we want to draw a level with transparency).
        //let trianglegroups = [] 
        //let output = {
        //    triangles: [], //each element is a point
        //    btriangles: [], //triangles of boundaries, each element is a point
        //    deltas: [] //deltas of boundaries, each element is a point
        //}

        var output = {
            vertices: [],
            triangles: [], //each element is a point
            boundaries: {
                triangles: [], //triangles of boundaries, each element is a point
                deltas: [] //deltas of boundaries, each element is a point
            }
        };

        //let grouped_triangles = [] //for webgl, it is important to keep the order of the triangles in a group


        txt.split('\n').forEach(function (line) {
            // skip empty line
            if (line.length == 0) {
                 return 
            }
            //if line = 'l 1 2 3 ', then line.split(' ') will return ['l', '1', '2', '3', '']
            //in order to remove the empty element, .replace(/\s*$/, '') is used.
            line = line.replace(/\s*$/, ''); //remove all the spaces at the end.
            var words = line.split(' ');

            // dispatch based on first character on the line
            switch (words[0])
            {
                case 'v': {
                    output.vertices.push([parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3])]);
                    break
                }

                case 'g': {
                    //trianglegroups.push(grouped_triangles)
                    //grouped_triangles = []
                    //facecount += 1
                    //console.log('parse.js reading facecount:', facecount)
                    //console.log('parse.js words:', words)
                    var feature_class = words[1].split('_')[0];
                    fcolor = class_color[feature_class];
                    //console.log('parse.js feature_class:', feature_class)
                    //console.log('parse.js fcolor:', fcolor)
                    if (fcolor === undefined) 
                    {
                        console.error('color not defined for feature class ' + feature_class);
                        fcolor = { r_frac: 1., g_frac: 0, b_frac: 0 };
                    }
                    break
                }

                case 'f': {
                    // 3 vertex indentifiers make a triangle; add coordinates and colors
                    for (var i = 1; i <= 3; i++) {
                        var vertex = output.vertices[parseInt(words[i]) - 1];
                        //the vertices of all the triangles are saved in the same list
                        //grouped_triangles.push([vertex[0], vertex[1], vertex[2], fcolor.r_frac, fcolor.g_frac, fcolor.b_frac])
                        output.triangles.push([vertex[0], vertex[1], vertex[2], fcolor.r_frac, fcolor.g_frac, fcolor.b_frac]);
                    }
                    break
                }

                case '#': {
                    // words[1]: step_high; words[2]: edge_id
                    if (words.length > 1) {
                        //console.log('')
                        //console.log('parse.js words[1]:', words[1])
                        step_high = parseFloat(words[1]);
                        //console.log('parse.js step_high:', step_high)
                    }
                    break
                }

                case 'l': {
                    var polyline = [];
                    //console.log('words:', words)
                    //console.log('step_high:', step_high)
                    for (var i$1 = 1; i$1 < words.length; i$1++) {
                        polyline.push(output.vertices[words[i$1] - 1]);
                    }

                    var point_records = [];
                    for (var j = 0; j < polyline.length; j++) {
                        //console.log('')
                        //console.log('parse.js polyline.length:', polyline.length)
                        //console.log('parse.js j:', j)
                        var pt = polyline[j];
                        //console.log('parse.js pt:', pt)
                        point_records.push([pt[0], pt[1], pt[2], step_high]); //pt[2] is step_low
                    }

                    for (var k = 0; k < point_records.length - 1; k++) {
                        var start = point_records[k];    //start point of a line segment
                        var end = point_records[k + 1];  //end point of the line segment
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
                            output.boundaries.triangles.push(start, start, end, start, end, end);
                            output.boundaries.deltas.push(startl, startr, endl, startr, endr, endl);
                        }
                    }
                    break;
                }
            }
        });

        //trianglegroups.push(grouped_triangles)
        //let trianglegroup_dts = [] //a list of dictionaries; each dictionary stores a group of triangles
        //for (var i = 1; i < trianglegroups.length; i++) { //trianglegroups[0] is empty
        //    let maxz = - Number.MAX_VALUE        
        //    for (var j = 0; j < trianglegroups[i].length; j++) {
        //        let vt = trianglegroups[i][j]

        //        if (vt[2] > maxz) {
        //            maxz = vt[2]
        //        }
        //    }
        //    trianglegroup_dts.push({ 'maxz': maxz, 'trianglegroup': trianglegroups[i]})
        //}

        ////let original_triangles = []
        ////trianglegroup_dts.forEach(trianglegroup_dt =>
        ////    trianglegroup_dt.trianglegroup.forEach(triangle =>
        ////        original_triangles.push(triangle)
        ////    )
        ////)
        
        //trianglegroup_dts.sort((a, b) => b.maxz - a.maxz) //in descending order    
        //let triangles = []
        //trianglegroup_dts.forEach(trianglegroup_dt =>
        //    trianglegroup_dt.trianglegroup.forEach(triangle =>
        //        triangles.push(triangle)
        //    )
        //) 

        var triangles32 = new Float32Array(output.triangles.flat(1));
        var btriangles32 = new Float32Array(output.boundaries.triangles.flat(1));
        var deltas32 = new Float32Array(output.boundaries.deltas.flat(1));

        //we must return buffers intead of triangles32; see file worker.js for the reason
        return [triangles32.buffer, btriangles32.buffer, deltas32.buffer]
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
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] - b);
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
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] + b);
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
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] * b);
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
            for (var j = 0; j < a.length; j++) {
                result_values.push(a[j] / b);
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


    //function dist(start, end) {
    //    /*Distance between two positons*/
    //    return norm(make_vector_start_end(start, end));
    //}


    //function unit(v) {
    //    /*Returns the unit vector in the direction of v.*/
    //    return div(v, norm(v));
    //}


    //function cross(a, b) {
    //    /*Cross product between a 3-vector or a 2-vector*/
    //    if (a.length != b.length) {
    //        throw "Vector dimensions should be equal";
    //    }
    //    if (a.length == 3) {
    //        return (
    //            a[1] * b[2] - a[2] * b[1],
    //            a[2] * b[0] - a[0] * b[2],
    //            a[0] * b[1] - a[1] * b[0]);
    //    }
    //    else if (a.length == 2) {
    //        return a[0] * b[1] - a[1] * b[0];
    //    }
    //    else {
    //        throw 'Vectors must be 2D or 3D';
    //    }
    //}

    //function angle(v1, v2) {
    //    /*angle between 2 vectors*/
    //    return Math.acos(dot(v1, v2) / (norm(v1) * norm(v2)));
    //}

    //function angle_unit(v1, v2) {
    //    /*angle between 2 *unit* vectors*/
    //    let d = dot(v1, v2)
    //    if (d > 1.0 || d < -1.0) {
    //        console.log("dot not in [-1, 1] -- clamp");
    //    }
    //    d = Math.max(-1.0, Math.min(1.0, d));
    //    return Math.acos(d);
    //}

    //function near_zero(val) {
    //    if (Math.abs(val) <= Math.pow(0.1, 8)) {
    //        return true;
    //    }
    //    else {
    //        return false;
    //    }
    //}

    //function bisector(u1, u2) {
    //    /*Based on two unit vectors perpendicular to the wavefront,
    //    get the bisector
        
    //    The magnitude of the bisector vector represents the speed
    //        in which a vertex has to move to keep up(stay at the intersection of)
    //    the 2 wavefront edges
    //    */
    //    let direction = add(u1, u2);

    //    var max_value = 0;
    //    for (var i = 0; i < direction.length; i++) {
    //        max_value = Math.max(max_value, Math.abs(direction[i]));
    //    }

    //    if (near_zero(max_value)) {
    //        return (0, 0);
    //    }
    //    let alpha = 0.5 * Math.PI + 0.5 * angle_unit(u1, u2);
    //    let magnitude = Math.sin(alpha); //if u1 and u2 are unit vectors, then magnitude = sqrt(2) / 2
    //    var bisector_result = div(unit(direction), magnitude);
    //    return bisector_result;
    //}


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



    function generate_class_color() {
        var class_color_raw_dt = {
            // atkis
            '2101': [239, 200, 200],
            '2112': [255, 174, 185],
            '2114': [204, 204, 204],
            '2201': [138, 211, 175],
            '2202': [51, 204, 153],
            '2213': [170, 203, 175],
            '2230': [181, 227, 181],
            '2301': [157, 157, 108],
            '3103': [254, 254, 254],
            '3302': [204, 153, 255],
            '4101': [234, 216, 189],
            '4102': [230, 255, 204],
            '4103': [171, 223, 150],
            '4104': [255, 255, 192],
            '4105': [40, 200, 254],
            '4107': [141, 197, 108],
            '4108': [174, 209, 160],
            '4109': [207, 236, 168],
            '4111': [190, 239, 255],
            '5112': [181, 208, 208],

            // top10nl
            // http://register.geostandaarden.nl/visualisatie/top10nl/1.2.0/BRT_TOP10NL_1.2_beschrijving_visualisatie.xlsx
            // aeroway / runway
            '10000': [204, 204, 204],
            '10001': [204, 204, 204],
            '10002': [204, 204, 204],
            '10100': [204, 204, 204],
            '10101': [204, 204, 204],
            '10102': [204, 204, 204],

            // road - highway
            '10200': [153, 96, 137],
            '10201': [153, 96, 137],
            '10202': [153, 96, 137],

            // road - main road
            '10300': [230, 0, 0],
            '10301': [230, 0, 0],
            '10302': [230, 0, 0],
            '10310': [230, 0, 0],
            '10311': [230, 0, 0],
            '10312': [230, 0, 0],

            //// road - regional road
            //10400': [255, 150, 0],   //check
            //10401': [255, 150, 0],   //check
            //10402': [255, 150, 0],   //check
            //10410': [255, 150, 0],   //check
            //10411': [255, 150, 0],   //check
            //10412': [255, 150, 0],   //check
            // road - regional road
            '10400': [255, 170, 0],   //check
            '10401': [255, 170, 0],   //check
            '10402': [255, 170, 0],   //check
            '10410': [255, 170, 0],   //check
            '10411': [255, 170, 0],   //check
            '10412': [255, 170, 0],   //check


            // road - local road
            '10500': [255, 255, 0],
            '10501': [255, 255, 0],
            '10502': [255, 255, 0],
            '10510': [255, 255, 0],
            '10511': [255, 255, 0],
            '10512': [255, 255, 0],

            // road: street
            '10600': [255, 255, 255],
            '10601': [255, 255, 255],
            '10602': [255, 255, 255],

            // road: other type
            '10700': [255, 255, 255],
            '10701': [255, 255, 255],
            '10702': [255, 255, 255],
            '10710': [255, 255, 255],
            '10711': [255, 255, 255],
            '10712': [255, 255, 255],
            '10790': [255, 255, 255],
            '10791': [255, 255, 255],
            '10792': [255, 255, 255],

            //// road: half paved
            //10720': [179, 179, 179],   //check
            //10721': [179, 179, 179],   //check
            //10722': [179, 179, 179],   //check
            // road: half paved
            '10720': [179, 179, 0],   //check
            '10721': [179, 179, 0],   //check
            '10722': [179, 179, 0],   //check

            // road: unpaved
            '10730': [156, 156, 156],
            '10731': [156, 156, 156],
            '10732': [156, 156, 156],

            // road - cyclists
            '10740': [255, 211, 127],
            '10741': [255, 211, 127],
            '10742': [255, 211, 127],

            // road - pedestrians
            '10750': [255, 167, 127],
            '10751': [255, 167, 127],
            '10752': [255, 167, 127],
            '10760': [255, 167, 127],
            '10761': [255, 167, 127],
            '10762': [255, 167, 127],

            '10780': [255, 255, 255],

            '12400': [190, 232, 255],
            '12405': [190, 232, 255],
            '12415': [190, 232, 255],
            '12425': [190, 232, 255],
            '12435': [190, 232, 255],
            '12500': [190, 232, 255],
            '12505': [190, 232, 255],

            '12800': [190, 232, 255],
            '12820': [190, 232, 255],

            '13000': [0, 0, 0],

            // pier (aanlegsteiger)
            '14000': [104, 104, 104],
            '14002': [104, 104, 104],
            '14003': [104, 104, 104],

            '14010': [255, 255, 222],
            '14030': [156, 156, 156],
            '14040': [201, 235, 112],
            '14050': [255, 255, 190],
            '14060': [140, 168, 0],

            '14070': [140, 168, 0],
            '14072': [140, 168, 0],
            '14073': [140, 168, 0],

            '14080': [140, 168, 0],
            '14090': [140, 168, 0],

            // burial ground
            '14100': [204, 204, 204],
            '14102': [204, 204, 204],
            '14103': [204, 204, 204],
            '14110': [204, 204, 204],
            '14112': [204, 204, 204],
            '14113': [204, 204, 204],

            '14120': [255, 255, 222],

            // grassland
            '14130': [201, 235, 112],
            '14132': [201, 235, 112],
            '14133': [201, 235, 112],

            // hay
            '14140': [252, 179, 251],
            '14142': [252, 179, 251],
            '14143': [252, 179, 251],

            '14160': [255, 255, 255],
            '14162': [255, 255, 255],
            '14170': [201, 235, 112],

            // rail body
            '14180': [255, 255, 255],
            '14182': [255, 255, 255],
            '14183': [255, 255, 255],

            '14190': [255, 255, 115],


            // according to dryness        
            'wet': [254, 229, 217],  //wet, normal
            'dry': [252, 174, 145],  //dry
            'verydry': [251, 106, 74],  //very dry
            'extremelydry': [203, 24, 29],  //extremely dry
            'drynessunknown': [128, 128, 128],  //dryness unknown
            
            '0': [254, 229, 217],  //wet, normal
            '1': [252, 174, 145],  //dry
            '2': [251, 106, 74],  //very dry
            '3': [203, 24, 29],  //extremely dry
            '-1': [128, 128, 128],  //dryness unknown
        };

        var class_color_dt = {};
        for (var key in class_color_raw_dt) {
            var rgb = class_color_raw_dt[key];  //rgb is a list of elements r, g, b
            var colordt = {};
            colordt.r = rgb[0];
            colordt.g = rgb[1];
            colordt.b = rgb[2];
            colordt.r_frac = rgb[0] / 255;
            colordt.g_frac = rgb[1] / 255;
            colordt.b_frac = rgb[2] / 255;
            class_color_dt[key] = colordt;
        }

        //console.log('parse.js class_color_dt:', class_color_dt)
        return class_color_dt;
    }

    self.onmessage = function(e) {    
        var id = e.data.id;
        var url = e.data.msg;

        fetch(url)  //e.g., url = "/gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj"
            .then(function (response) { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
            .then(function (data_text) { 
                var arrays = parse_obj(data_text);
                // the arrays are transferable objects (ArrayBuffer objects)
                // (will be transferred without copy overhead to main process)
                postMessage({id: id, msg: arrays}, arrays);  
            })
            .catch(function (err) { console.error(err); });
    };

}());
