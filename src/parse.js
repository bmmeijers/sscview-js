


function parse_obj(txt)
{
    let fcolor = null  //feature color
    let step_high = null
    let class_color = generate_class_color()

    let vertices = []
    //we will reverse the order of the groups to avoid drawing all the lower ssc levels 
    //(we only draw the immediate-lower level, useful for the case when we want to draw a level with transparency).
    let trianglegroups = [] 
    let grouped_triangles = [] //for webgl, it is important to keep the order of the triangles in a group
    let btriangles = [] //triangles of boundaries
    let deltas = [] //deltas of boundaries

    txt.split('\n').forEach(line => {
        let words = line.split(' ');
        // skip empty line
        if (line.length == 0) {
             return 
        }
        // dispatch based on first character on the line
        switch (words[0])
        {
            case 'v': {
                vertices.push([parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3])])
                break
            }

            case 'g': {
                trianglegroups.push(grouped_triangles)
                grouped_triangles = []
                let feature_class = parseInt(words[1].split('_')[0]);
                fcolor = class_color[feature_class];
                if (fcolor === undefined) 
                {
                    console.error('color not defined for feature class ' + feature_class);
                    fcolor = { r_frac: 1., g_frac: 0, b_frac: 0 };
                }
                break
            }

            case 'f': {
                // 3 vertex indentifiers make a triangle; add coordinates and colors
                for (let i = 1; i <= 3; i++) {
                    let vertex = vertices[parseInt(words[i]) - 1];
                    grouped_triangles.push([vertex[0], vertex[1], vertex[2], fcolor.r_frac, fcolor.g_frac, fcolor.b_frac])
                }
                break
            }

            case '#': {
                // words[1]: step_high; words[2]: edge_id
                if (words.length > 1) {
                    step_high = parseFloat(words[1])
                }
                break
            }

            case 'l': {
                let polyline = [];
                //console.log('words:', words)
                //console.log('step_high:', step_high)
                for (let i = 1; i < words.length; i++) {
                    polyline.push(vertices[words[i] - 1]);
                }

                let point_records = [];
                for (let j = 0; j < polyline.length; j++) {
                    let pt = polyline[j];
                    point_records.push([pt[0], pt[1], pt[2], step_high]); //pt[2] is step_low
                }

                for (var k = 0; k < point_records.length - 1; k++) {
                    let start = point_records[k];    //start point of a line segment
                    let end = point_records[k + 1];  //end point of the line segment
                    let start_xy = start.slice(0, 2);
                    let end_xy = end.slice(0, 2);
                    let v = make_vector_start_end(start_xy, end_xy);
                    let length = norm(v);

                    if (length != 0) {
                        let unitvec = div(v, length);
                        //The lengths of startr, startl, endr, and endl are sqrt(2)
                        let startr = add(mul(unitvec, -1), rotate90cw(unitvec));
                        let startl = add(mul(unitvec, -1), rotate90ccw(unitvec));
                        let endr = add(unitvec, rotate90cw(unitvec));
                        let endl = add(unitvec, rotate90ccw(unitvec));

                        //start consists of x, y, z (step_low), step_high, while
                        //startl consists of only x, y
                        btriangles.push(start, start, end, start, end, end);
                        deltas.push(startl, startr, endl, startr, endr, endl);
                    }
                }
                break;
            }

            default: {
                break
            }
        }
    })

    trianglegroups.push(grouped_triangles)
    let trianglegroup_dts = [] //a list of dictionaries; each dictionary stores a group of triangles
    for (var i = 1; i < trianglegroups.length; i++) {
        let minz = Number.MAX_VALUE
        let maxz = - Number.MAX_VALUE        
        for (var j = 0; j < trianglegroups[i].length; j++) {
            let tri = trianglegroups[i][j]
            if (tri[2] < minz) {
                minz = tri[2]
            }
            if (tri[2] > maxz) {
                maxz = tri[2]
            }
        }
        let avgz = (maxz + minz) / 2
        trianglegroup_dts.push({ 'avgz': avgz, 'trianglegroup': trianglegroups[i]})
    }

    let original_triangles = []
    trianglegroup_dts.forEach(trianglegroup_dt =>
        trianglegroup_dt.trianglegroup.forEach(triangle =>
            original_triangles.push(triangle)
        )
    )
    
    trianglegroup_dts.sort((a, b) => b.avgz - a.avgz) //in descending order    
    let triangles = []
    trianglegroup_dts.forEach(trianglegroup_dt =>
        trianglegroup_dt.trianglegroup.forEach(triangle =>
            triangles.push(triangle)
        )
    ) 

    let triangles32 = new Float32Array(triangles.flat(1))
    let btriangles32 = new Float32Array(btriangles.flat(1))
    let deltas32 = new Float32Array(deltas.flat(1))

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
    var class_color_dt = {
        // atkis
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

        // top10nl
        // http://register.geostandaarden.nl/visualisatie/top10nl/1.2.0/BRT_TOP10NL_1.2_beschrijving_visualisatie.xlsx
        // aeroway / runway
        10000: { r: 204, g: 204, b: 204 },
        10001: { r: 204, g: 204, b: 204 },
        10002: { r: 204, g: 204, b: 204 },
        10100: { r: 204, g: 204, b: 204 },
        10101: { r: 204, g: 204, b: 204 },
        10102: { r: 204, g: 204, b: 204 },

        // road - highway
        10200: { r: 153, g: 96, b: 137 },
        10201: { r: 153, g: 96, b: 137 },
        10202: { r: 153, g: 96, b: 137 },

        // road - main road
        10300: { r: 230, g: 0, b: 0 },
        10301: { r: 230, g: 0, b: 0 },
        10302: { r: 230, g: 0, b: 0 },
        10310: { r: 230, g: 0, b: 0 },
        10311: { r: 230, g: 0, b: 0 },
        10312: { r: 230, g: 0, b: 0 },

        //// road - regional road
        //10400: { r: 255, g: 150, b: 0 },   //check
        //10401: { r: 255, g: 150, b: 0 },   //check
        //10402: { r: 255, g: 150, b: 0 },   //check
        //10410: { r: 255, g: 150, b: 0 },   //check
        //10411: { r: 255, g: 150, b: 0 },   //check
        //10412: { r: 255, g: 150, b: 0 },   //check
        // road - regional road
        10400: { r: 255, g: 170, b: 0 },   //check
        10401: { r: 255, g: 170, b: 0 },   //check
        10402: { r: 255, g: 170, b: 0 },   //check
        10410: { r: 255, g: 170, b: 0 },   //check
        10411: { r: 255, g: 170, b: 0 },   //check
        10412: { r: 255, g: 170, b: 0 },   //check


        // road - local road
        10500: { r: 255, g: 255, b: 0 },
        10501: { r: 255, g: 255, b: 0 },
        10502: { r: 255, g: 255, b: 0 },
        10510: { r: 255, g: 255, b: 0 },
        10511: { r: 255, g: 255, b: 0 },
        10512: { r: 255, g: 255, b: 0 },

        // road: street
        10600: { r: 255, g: 255, b: 255 },
        10601: { r: 255, g: 255, b: 255 },
        10602: { r: 255, g: 255, b: 255 },

        // road: other type
        10700: { r: 255, g: 255, b: 255 },
        10701: { r: 255, g: 255, b: 255 },
        10702: { r: 255, g: 255, b: 255 },
        10710: { r: 255, g: 255, b: 255 },
        10711: { r: 255, g: 255, b: 255 },
        10712: { r: 255, g: 255, b: 255 },
        10790: { r: 255, g: 255, b: 255 },
        10791: { r: 255, g: 255, b: 255 },
        10792: { r: 255, g: 255, b: 255 },

        //// road: half paved
        //10720: { r: 179, g: 179, b: 179 },   //check
        //10721: { r: 179, g: 179, b: 179 },   //check
        //10722: { r: 179, g: 179, b: 179 },   //check
        // road: half paved
        10720: { r: 179, g: 179, b: 0 },   //check
        10721: { r: 179, g: 179, b: 0 },   //check
        10722: { r: 179, g: 179, b: 0 },   //check

        // road: unpaved
        10730: { r: 156, g: 156, b: 156 },
        10731: { r: 156, g: 156, b: 156 },
        10732: { r: 156, g: 156, b: 156 },

        // road - cyclists
        10740: { r: 255, g: 211, b: 127 },
        10741: { r: 255, g: 211, b: 127 },
        10742: { r: 255, g: 211, b: 127 },

        // road - pedestrians
        10750: { r: 255, g: 167, b: 127 },
        10751: { r: 255, g: 167, b: 127 },
        10752: { r: 255, g: 167, b: 127 },
        10760: { r: 255, g: 167, b: 127 },
        10761: { r: 255, g: 167, b: 127 },
        10762: { r: 255, g: 167, b: 127 },

        10780: { r: 255, g: 255, b: 255 },

        12400: { r: 190, g: 232, b: 255 },
        12405: { r: 190, g: 232, b: 255 },
        12415: { r: 190, g: 232, b: 255 },
        12425: { r: 190, g: 232, b: 255 },
        12435: { r: 190, g: 232, b: 255 },
        12500: { r: 190, g: 232, b: 255 },
        12505: { r: 190, g: 232, b: 255 },

        12800: { r: 190, g: 232, b: 255 },
        12820: { r: 190, g: 232, b: 255 },

        13000: { r: 0, g: 0, b: 0 },

        // pier (aanlegsteiger)
        14000: { r: 104, g: 104, b: 104 },
        14002: { r: 104, g: 104, b: 104 },
        14003: { r: 104, g: 104, b: 104 },

        14010: { r: 255, g: 255, b: 222 },
        14030: { r: 156, g: 156, b: 156 },
        14040: { r: 201, g: 235, b: 112 },
        14050: { r: 255, g: 255, b: 190 },
        14060: { r: 140, g: 168, b: 0 },

        14070: { r: 140, g: 168, b: 0 },
        14072: { r: 140, g: 168, b: 0 },
        14073: { r: 140, g: 168, b: 0 },

        14080: { r: 140, g: 168, b: 0 },
        14090: { r: 140, g: 168, b: 0 },

        // burial ground
        14100: { r: 204, g: 204, b: 204 },
        14102: { r: 204, g: 204, b: 204 },
        14103: { r: 204, g: 204, b: 204 },
        14110: { r: 204, g: 204, b: 204 },
        14112: { r: 204, g: 204, b: 204 },
        14113: { r: 204, g: 204, b: 204 },

        14120: { r: 255, g: 255, b: 222 },

        // grassland
        14130: { r: 201, g: 235, b: 112 },
        14132: { r: 201, g: 235, b: 112 },
        14133: { r: 201, g: 235, b: 112 },

        // hay
        14140: { r: 252, g: 179, b: 251 },
        14142: { r: 252, g: 179, b: 251 },
        14143: { r: 252, g: 179, b: 251 },

        14160: { r: 255, g: 255, b: 255 },
        14162: { r: 255, g: 255, b: 255 },
        14170: { r: 201, g: 235, b: 112 },

        // rail body
        14180: { r: 255, g: 255, b: 255 },
        14182: { r: 255, g: 255, b: 255 },
        14183: { r: 255, g: 255, b: 255 },

        14190: { r: 255, g: 255, b: 115 }
    };

    for (let key in class_color_dt) {
        let color = class_color_dt[key];  //color is a dictionary of elements r, g, b
        color.r_frac = color.r / 255;
        color.g_frac = color.g / 255;
        color.b_frac = color.b / 255;
    }

    return class_color_dt;
}

export default parse_obj;
