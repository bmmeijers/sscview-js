
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

        // FIXME: when to call these detach/delete's? After succesful compilation?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

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
            itemSize,           // * Number of components per vertex attribute. Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,           // * Type of elements
            false,              // * Is normalized?
            stride,             // * stride 
            offset              // * Offset from the beginning of 
        );

    }

}




export class ImageTileDrawProgram extends DrawProgram 
{
    constructor(gl) {
        let vertexShaderText = `
precision highp float;

attribute vec3 vertexPosition_modelspace;
attribute vec2 aTextureCoord;

uniform mat4 M;

varying highp vec2 vTextureCoord;


void main()
{
    gl_Position = M * vec4(vertexPosition_modelspace, 1.0);
    vTextureCoord = aTextureCoord;
}
`

        let fragmentShaderText = `
precision highp float;

varying highp vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float opacity;
            
void main()
{
    vec4 color = texture2D(uSampler, vTextureCoord);
    color.a = opacity;
    gl_FragColor = color;
}
`
        //uniform float opacity;
        //vec4 color = texture2D(u_tex, v_texCoord);
        //color.a = 0.5;

        super(gl, vertexShaderText, fragmentShaderText)
    }

//    draw(matrix, tilecontent)
    draw_tile(matrix, tile, tree_setting) {
        if (tile.content.buffer === null)
        {
            return;
        }
        //console.log('drawprograms.js tree_setting.opacity 3:', tree_setting.opacity)
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer); 

        // FIXME: better to store with bucket how the layout of the mesh is?
        const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        // gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttrib);

        {
            let M = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M, false, matrix);

            let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
            
            gl.uniform1f(opacity_location, tree_setting.opacity);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer)
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'aTextureCoord', 2, 0, 0)
        //console.log('test')
        //const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
        //gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        //gl.enableVertexAttribArray(textureAttrib);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.content.texture);

        const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
        gl.uniform1i(uSampler, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

//        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!
    }
}

export class ImageFboDrawProgram extends DrawProgram {
    constructor(gl) {
        let vertexShaderText =
            'precision highp float;\n' +
            'attribute vec4 a_Position;\n' +
            'attribute vec2 a_TexCoord;\n' +
            'varying vec2 v_TexCoord;\n' +
            'void main() {\n' +
            '  gl_Position = a_Position;\n' +
            '  v_TexCoord = a_TexCoord;\n' +
            '}\n';

        let fragmentShaderText = `
            precision highp float;       
            uniform sampler2D uSampler;
            uniform float opacity;
            varying vec2 v_TexCoord;
            void main() {
              vec4 color = texture2D(uSampler, v_TexCoord);
              if (color.a == 0.0) //when clearing the buffer of fbo, we used value 0.0 for opacity; see render.js
                { discard; } 
              else 
                { color.a = opacity; } 
              gl_FragColor = color;
            }`;

        super(gl, vertexShaderText, fragmentShaderText)
    }

    draw_fbo(fbo, opacity) {
        //console.log('drawprograms.js fbo:', fbo)
        if (fbo === null) {
            console.log('drawprograms.js fbo is null:', fbo)
            return;
        }
        //console.log('drawprograms.js tree_setting.opacity 3:', tree_setting.opacity)
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.program = shaderProgram;
        // Set the vertex information
        var n = initVertexBuffers(gl);
        if (n < 0) {
            console.log('Failed to set the vertex information');
            return;
        }

        {
            let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
            gl.uniform1f(opacity_location, opacity);
        }


        //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer);

        //// FIXME: better to store with bucket how the layout of the mesh is?
        //const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        //// gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        //gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
        //gl.enableVertexAttribArray(positionAttrib);



        //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer)
        //const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
        //gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        //gl.enableVertexAttribArray(textureAttrib);

        gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
        gl.uniform1i(uSampler, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        //        gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.DEPTH_TEST);

        //gl.clearColor(0.0, 0.0, 0.0, 1.0);
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer

        //gl.clearDepth(1.0);
        //gl.clear(gl.DEPTH_BUFFER_BIT);
        //gl.clearColor(1.0, 1.0, 1.0, 0.0);
        //gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
        gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!
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

        this.colors = [[141, 211, 199]
            , [190, 186, 218]
            , [251, 128, 114]
            , [128, 177, 211]
            , [253, 180, 98]
            , [179, 222, 105]
            , [252, 205, 229]
            , [217, 217, 217]
            , [188, 128, 189]
            , [204, 235, 197]
        ].map(x => { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
    }


    draw_tile(matrix, tile, near_St, redering_settings, tree_setting) {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        let triangleVertexPosBufr = tile.content.line_triangleVertexPosBufr;
        let displacementBuffer = tile.content.displacementBuffer;

        if (triangleVertexPosBufr === null) {
            return;
        }
        gl.useProgram(shaderProgram);

        // void vertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, GLintptr offset)
        // size is the number of components per attribute. For example, with RGB colors, it would be 3; and with an
        // alpha channel, RGBA, it would be 4. If we have location data with (x,y,z) attributes, it would be 3; and if we
        // had a fourth parameter w, (x,y,z,w), it would be 4. Texture parameters (s,t) would be 2. type is the datatype,
        // stride and offset can be set to the default of 0 for now and will be reexamined in Chapter 9 when we discuss
        // interleaved arrays.

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);

        // the unit of boundary_width is mm; 1 mm equals 3.7795275590551 pixels
        // FIXME: MM: at which amount of dots per inch has this been calculated?

         // FIXME: settings/view
//        let boundary_width_screen = 0.2;
        //var boundary_width_screen = parseFloat(document.getElementById('boundary_width_slider').value);
        // The unit of the map must be meter!!!
        // redering_settings.boundary_width: the width on screen
        var half_width_reality = redering_settings.boundary_width * near_St[1] / 1000 / 2;
//        if (width_increase > 0)
//        {
//            half_width_reality *= width_increase;
//        }

        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);

            let near_location = gl.getUniformLocation(shaderProgram, 'near');
            gl.uniform1f(near_location, near_St[0]);

            let half_width_reality_location = gl.getUniformLocation(shaderProgram, 'half_width_reality');
            gl.uniform1f(half_width_reality_location, half_width_reality);
            var c = [0.0, 0.0, 0.0]; // black
//            if (width_increase <= 0)
//            {
//                // var c = this.colors[tile.id % this.colors.length];
//                c = [1.0, 1.0, 1.0]; // white
//            }
            var color_location = gl.getUniformLocation(shaderProgram, 'uColor');
            gl.uniform4f(color_location, c[0], c[1], c[2], tree_setting.opacity);
        }

        //// Set clear color to white, fully opaque
        //// gl.clearColor(1., 1., 1., 1.0);
        //// gl.clearDepth(1.0); // Clear everything

        //// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color
        //// gl.clear(gl.COLOR_BUFFER_BIT)

        //// gl.disable(gl.BLEND);
        ////gl.enable(gl.BLEND); // FIXME: needed?
        //gl.disable(gl.DEPTH_TEST);

        //// gl.enable(gl.CULL_FACE);
        // gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?

        //// gl.cullFace(gl.BACK);
        //// gl.cullFace(gl.FRONT);
        //// gl.cullFace(gl.FRONT_AND_BACK);

        //gl.drawArrays(
        //    gl.TRIANGLES, // kind of primitives to render; e.g., POINTS, LINES
        //    0,            // Specifies the starting index in the enabled arrays.
        //    triangleVertexPosBufr.numItems // Specifies the number of indices to be rendered.
        //);


        //gl.enable(gl.CULL_FACE);
        gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?



        //if (tree_setting.draw_cw_faces == true) {
        //    gl.cullFace(gl.BACK); //triangles from FME are clock wise
        //}
        //else {
        //    gl.cullFace(gl.FRONT); //triangles from SSC are counter-clock wise; 
        //}

        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);

        //if (tree_setting.do_depth_test == true) {
        //    gl.enable(gl.DEPTH_TEST);
        //}
        //else {
        //    gl.disable(gl.DEPTH_TEST);
        //}
        gl.disable(gl.DEPTH_TEST);

        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

        if (tree_setting.do_blend == true) {
            gl.enable(gl.BLEND)
        }
        else {
            gl.disable(gl.BLEND)
        }

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
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

        //        let vertexShaderText = `
//precision highp float;

//attribute vec3 vertexPosition_modelspace;
//attribute vec3 vertexColor;
//uniform mat4 M;
//varying vec4 fragColor;
//uniform float opacity;
//varying vec3 vertexColor2;
//varying float opacity2;

//void main()
//{
//    vertexColor2 = vertexColor;
//    opacity2 = opacity;

//    gl_Position = M * vec4(vertexPosition_modelspace, 1);
//}
//`;
//        let fragmentShaderText = `
//precision mediump float;

//uniform vec4 fragColor2;
//varying vec3 vertexColor2;
//varying float opacity2;

//void main()
//{
//    gl_FragColor = vec4(vertexColor2,opacity2);
//}
//`;

        super(gl, vertexShaderText, fragmentShaderText)
    }


    draw_tile(matrix, tile, tree_setting, width, height) {
        // guard: if no data in the tile, we will skip rendering
        let triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
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
            //console.log('drawprograms.js tree_setting.opacity 2:', tree_setting.opacity)
            gl.uniform1f(opacity_location, tree_setting.opacity);
            //gl.uniform1f(opacity_location, 1);
        }


        gl.enable(gl.CULL_FACE); //must ENABLE       
        if (tree_setting.draw_cw_faces == true) {
            gl.cullFace(gl.BACK); //triangles from FME are clockwise
        }
        else {
            gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
        }
        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);

        if (tree_setting.do_depth_test == true) {
            gl.enable(gl.DEPTH_TEST);
        }
        else {            
            gl.disable(gl.DEPTH_TEST);
        }
        //if a fragment is closer to the camera, then it has a smaller depth value
        gl.depthFunc(gl.LEQUAL); 


        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

        if (tree_setting.do_blend == false || tree_setting.opacity == 1) {
            //After an area merges another area, we can see a thin sliver.
            //disable blending can avoid those slivers,
            //but the alpha value does not have influence anymore
            //when the opacity is 1, we do not need to blend
            gl.disable(gl.BLEND) 
        }
        else {
            gl.enable(gl.BLEND)
        }        
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
        //renderer._clearDepth()
        //gl.disable(gl.BLEND)
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);

        //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
        //console.log('drawprograms.js color of the center before drawing:', readout)
    }


    draw_tile_into_fbo(matrix, tile, tree_setting, width, height) {
        // guard: if no data in the tile, we will skip rendering
        let triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
        if (triangleVertexPosBufr === null) {
            //console.log('drawprograms.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
            return 0;
        }
        // render
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        gl.viewport(0, 0, width, height)

        var readout = new Uint8Array(4);
        gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
        //console.log('drawprograms.js color of the center before drawing:', readout)

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);

        //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
        //itemSize = 3: x, y, z;   
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
        this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);

            let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
            //console.log('drawprograms.js tree_setting.opacity 2:', tree_setting.opacity)
            //gl.uniform1f(opacity_location, tree_setting.opacity);
            gl.uniform1f(opacity_location, 1);
        }
        
        //gl.enable(gl.CULL_FACE); //must ENABLE 
        //console.log('')
        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT)
        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK)
        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK)

        //FIXME
        //To my understanding, we should enable face culling.
        //However, if face culling is enabled, color white is drawn to the screen, which is strange.
        //gl.enable(gl.CULL_FACE); //must ENABLE
        gl.disable(gl.CULL_FACE);


        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT)
        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK)
        //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK:',
        //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK)

        if (tree_setting.draw_cw_faces == true) {
            gl.cullFace(gl.BACK); //triangles from FME are clockwise
        }
        else {
            gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
        }
        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);
        //gl.cullFace(gl.FRONT_AND_BACK);

        if (tree_setting.do_depth_test == true) {
            gl.enable(gl.DEPTH_TEST);
        }
        else {
            gl.disable(gl.DEPTH_TEST);
        }
        //if a fragment is closer to the camera, then it has a smaller depth value
        //gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        //gl.depthFunc(gl.GEQUAL);
        //gl.depthFunc(gl.ALWAYS);



        //gl.disable(gl.BLEND) //we always opaquely draw into Fbo

        //gl.enable(gl.BLEND);
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);



        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

        if (tree_setting.do_blend == true) {
            gl.enable(gl.BLEND)
        }
        else {
            //After an area merges another area, we can see a thin sliver.
            //disable blending can avoid those slivers,
            //but the alpha value does not have influence anymore
            gl.disable(gl.BLEND)
        }
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value

        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);


        //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        ////gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js color of the center after drawing:', readout)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        ////gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
        //console.log('drawprograms.js color of the center original:', readout)
        //return triangleVertexPosBufr.numItems
    }


}

//function Float64ArrayTo32(array64) {
//    var array32 = new Float32Array(array64.length)
//    for (var i = 0; i < array64.length; i++) {
//        array32[i] = array64[i]
//    }

//    //console.log('drawprograms.js array64:', array64)

//    return array64

//}

function initVertexBuffers(gl) {
    var verticesTexCoords = new Float32Array([
        // Vertex coordinates, texture coordinate
        -1, 1, 0.0, 1.0,
        -1, -1, 0.0, 0.0,
        1, 1, 1.0, 1.0,
        1, -1, 1.0, 0.0,
    ]);
    var n = 4; // The number of vertices

    // Create the buffer object
    var vertexTexCoordBuffer = gl.createBuffer();
    if (!vertexTexCoordBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

    var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
    //console.log('drawprograms.js FSIZE:', FSIZE);
    //Get the storage location of a_Position, assign and enable buffer
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
    gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

    // Get the storage location of a_TexCoord
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (a_TexCoord < 0) {
        console.log('Failed to get the storage location of a_TexCoord');
        return -1;
    }
    // Assign the buffer object to a_TexCoord variable
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

    return n;
}


export function initFramebufferObject(gl, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function () {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a frame buffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer.texture = texture; // Store the texture object

    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // Bind the object to target
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
    framebuffer.depthBuffer = depthBuffer


    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.fbo = framebuffer; //fbo: frambuffer object
}