
class DrawProgram {
    constructor(gl, vertexShaderText, fragmentShaderText) {

        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // Create program: attach, link, validate, detach, delete
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            const shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    }

    _specify_data_for_shaderProgram(gl, shaderProgram, attribute_name, itemSize, stride, offset) {

        const attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,    // * Attribute location
            itemSize,           // * Number of components per vertex attribute.
                                //   Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,           // * Type of elements
            false,              // * Is normalized?
            stride,             // * stride 
            offset              // * Offset from the beginning of 
        );
    }
}


export class PolygonDrawProgram extends DrawProgram {
    constructor(gl) {

        let vertexShaderText = `
precision highp float;

attribute vec3 vertexPosition_modelspace;
attribute vec3 vertexColor;
uniform mat4 M;
varying vec4 fragColor;
uniform float opacity;

void main()
{
    fragColor = vec4(vertexColor, opacity);
    gl_Position = M * vec4(vertexPosition_modelspace, 1);
}
`;
        let fragmentShaderText = `
precision highp float;

varying vec4 fragColor;
void main()
{
    gl_FragColor = vec4(fragColor);
}
`;

        super(gl, vertexShaderText, fragmentShaderText)
    }

    taint()
    {

        //let gl = this.gl;
        //let shaderProgram = this.shaderProgram;
        //gl.useProgram(shaderProgram);
        //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
        //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);
    }

    clear()
    {
        // clear both the color and the depth
        // instead of clearing per tile, 
        // we clear before and after all tiles have been rendered
        // this way the contents of the depth buffer is preserved between tiles (which is what we need, 
        // to guarantee the final image to be correct)
        let gl = this.gl;
        gl.clearDepth(1.0);
        gl.clear(gl.CLEAR_COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    drawTile(matrix, tile, opacity, denominator, step, boundaryWidth)
    {
    // drawTile(matrix, tile, tree_setting, width, height) {
        // guard: if no data in the tile, we will skip rendering
        let triangleVertexPosBufr = tile.polygon_triangleVertexPosBufr;
        if (triangleVertexPosBufr === null) {
            //console.log('drawprograms.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
            return;
        }
        // render
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);

        //var readout = new Uint8Array(4);
        //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
        //console.log('drawprograms.js color of the center before drawing:', readout)

        //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
        //itemSize = 3: x, y, z;   
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);

            let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
            gl.uniform1f(opacity_location, opacity);
        }

        gl.disable(gl.CULL_FACE)
        // gl.enable(gl.CULL_FACE); //must ENABLE       
        //if (tree_setting.draw_cw_faces == true) {
        //gl.cullFace(gl.BACK); //triangles from FME are clockwise
        //}
        //else {
        // gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
        //}
        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);

        //if (tree_setting.do_depth_test == true) {
        gl.enable(gl.DEPTH_TEST);
        //}
        //else {            
        //    gl.disable(gl.DEPTH_TEST);
        //}
        //if a fragment is closer to the camera, then it has a smaller depth value
        gl.depthFunc(gl.LESS); 

        

//        gl.depthFunc(gl.LEQUAL); 

        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

        //if (tree_setting.do_blend == false || tree_setting.opacity == 1) {
            //After an area merges another area, we can see a thin sliver.
            //disable blending can avoid those slivers,
            //but the alpha value does not have influence anymore
            //when the opacity is 1, we do not need to blend
            //gl.disable(gl.BLEND) 
        //}
        //else {
            gl.disable(gl.BLEND)
        //}        
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
        //renderer._clearDepth()
        //gl.disable(gl.BLEND)
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
//        gl.drawArrays(gl.LINES, 0, triangleVertexPosBufr.numItems);

        //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
        //console.log('drawprograms.js color of the center before drawing:', readout)
    }
}


export class LineDrawProgram extends DrawProgram {
    constructor(gl) {

        let vertexShaderText = `
precision highp float;

attribute vec2 displacement;
attribute vec4 vertexPosition_modelspace;

uniform mat4 M;
uniform float near;
uniform float half_width_reality;


void main()
{
    vec4 pos = vertexPosition_modelspace;
    if (pos.z <= near && pos.w > near)
    {
        pos.x +=  displacement.x * half_width_reality;
        pos.y +=  displacement.y * half_width_reality;
        gl_Position = M * vec4(pos.xyz, 1.0);
    } else {
        gl_Position = vec4(-10.0,-10.0,-10.0,1.0);
        return;
    }
}
`;

        let fragmentShaderText = `
precision highp float;
uniform vec4 uColor;

void main()
{
    gl_FragColor = uColor; // color of the lines
}
`;

        super(gl, vertexShaderText, fragmentShaderText)

//        this.colors = [[141, 211, 199]
//            , [190, 186, 218]
//            , [251, 128, 114]
//            , [128, 177, 211]
//            , [253, 180, 98]
//            , [179, 222, 105]
//            , [252, 205, 229]
//            , [217, 217, 217]
//            , [188, 128, 189]
//            , [204, 235, 197]
//        ].map(x => { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
        this.colors = [
//            [166,206,227],
//            [31,120,180],
//            [178,223,138],
//            [51,160,44],
//            [251,154,153],
//            [227,26,28],
//            [253,191,111],
//            [255,127,0],
//            [202,178,214],
//            [106,61,154],
//            [255,255,153],
//            [177,89,40],

// [27.,158.,119.],
// [217.,95.,2.],
// [117.,112.,179.],
// [231.,41.,138.],
// [102.,166.,30.],
// [230.,171.,2.],
// [166.,118.,29.],

[0., 0., 0.]

        ].map(x => { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
        console.log(this.colors);
    }
    
    taint()
    {
        //let gl = this.gl;
        //let shaderProgram = this.shaderProgram;
        //gl.useProgram(shaderProgram);
        //this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);
        ////itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
        //this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);
    }
    

    drawTile(matrix, tile, opacity, denominator, step, boundaryWidth)
    {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        let triangleVertexPosBufr = tile.line_triangleVertexPosBufr;
        let displacementBuffer = tile.displacementBuffer;

        if (triangleVertexPosBufr === null) {
            return;
        }
        gl.useProgram(shaderProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);
                                            //(gl, shaderProgram, attribute_name, itemSize, stride, offset) 
        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);

        var half_width_reality = boundaryWidth * denominator / 1000 / 2;
        { // -- BEGIN scope region
        let M_location = gl.getUniformLocation(shaderProgram, 'M');
        gl.uniformMatrix4fv(M_location, false, matrix);
        // console.log(`matrix := ${matrix}`)

        let near_location = gl.getUniformLocation(shaderProgram, 'near');
        gl.uniform1f(near_location, step);
        // console.log(`near := ${step}`)

        let half_width_reality_location = gl.getUniformLocation(shaderProgram, 'half_width_reality');
        gl.uniform1f(half_width_reality_location, half_width_reality);
        // make color for this tile
//        let r
//        if (tile.id == 1) {
//            r = 1.0
//        } else {
//            r = 0.0
//        }
        // let c = this.colors[tile.id % this.colors.length]
        // let c = [0.663, 0.663, 0.663]; //dark gray
        let c = [0,0,0] // all black
//        let c = [1,1,1] // all white
        let color_location = gl.getUniformLocation(shaderProgram, 'uColor');
        gl.uniform4f(color_location, c[0], c[1], c[2], 0.5);
        } // -- END scope region
        // FIXME: should we be explicit about face orientation and use culling?
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);

        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
//        if (tree_setting.do_blend == true) {
          //  gl.enable(gl.BLEND)
//        }
//        else {
        gl.disable(gl.BLEND)
//        }
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
//        console.log(`gl.TRIANGLES with numItems: ${triangleVertexPosBufr.numItems}`)
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
    }
}
