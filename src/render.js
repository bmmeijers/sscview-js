// FIXME: rename draw to renderFunc ?

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
            itemSize,           // * Number of components per attribute ????? 
            gl.FLOAT,           // * Type of elements
            false,              // * Is normalized?
            stride,             // * stride 
            offset              // * Offset from the beginning of 
        );

    }

}




class ImageTileDrawProgram extends DrawProgram 
{
    constructor(gl)
    {
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
        //console.log('render.js tree_setting.opacity 3:', tree_setting.opacity)
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
        const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
        gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureAttrib);

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




class LineDrawProgram extends DrawProgram {
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
precision mediump float;
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

        if (tree_setting.do_depth_test == true) {
            gl.enable(gl.DEPTH_TEST);
        }
        else {
            gl.disable(gl.DEPTH_TEST);
        }

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



class PolygonDrawProgram extends DrawProgram {
    constructor(gl) {
        let vertexShaderText = `
precision highp float;

attribute vec3 vertexPosition_modelspace;
attribute vec3 vertexColor;
uniform mat4 M;
varying vec4 fragColor;
uniform float opacity;
varying vec3 vertexColor2;
varying float opacity2;

void main()
{
    vertexColor2 = vertexColor;
    opacity2 = opacity;
    
    gl_Position = M * vec4(vertexPosition_modelspace, 1);
}
`;
        let fragmentShaderText = `
precision mediump float;

uniform vec4 fragColor2;
varying vec3 vertexColor2;
varying float opacity2;

void main()
{
    gl_FragColor = vec4(vertexColor2,opacity2);
}
`;

        //gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5);
        //fragColor = vec4(vertexColor2, opacity2);
        //fragColor = vec4(vertexColor, opacity);

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

//varying vec4 fragColor;
//varying vec3 vertexColor2;
//varying float opacity2;

//void main()
//{
//    fragColor = vec4(vertexColor2, opacity2);
//    gl_FragColor = vec4(fragColor);
//}
//`;


//        let vertexShaderText = `
//precision highp float;

//attribute vec3 vertexPosition_modelspace;
//attribute vec3 vertexColor;
//uniform mat4 M;
//varying vec4 fragColor;
//uniform float opacity;

//void main()
//{
//    fragColor = vec4(vertexColor, opacity);
//    gl_Position = M * vec4(vertexPosition_modelspace, 1);
//}
//`;
//        let fragmentShaderText = `
//precision mediump float;

//varying vec4 fragColor;
//void main()
//{
//    gl_FragColor = vec4(fragColor);
//}
//`;

        super(gl, vertexShaderText, fragmentShaderText)
    }


    draw_tile(matrix, tile, tree_setting) {
        // guard: if no data in the tile, we will skip rendering
        let triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
        if (triangleVertexPosBufr === null) {
            //console.log('render.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
            return;
        }
        // render
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
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
            //console.log('render.js tree_setting.opacity 2:', tree_setting.opacity)
            gl.uniform1f(opacity_location, tree_setting.opacity);
        }

        //gl.enable(gl.CULL_FACE);
        ////gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?

        
               
        //if (tree_setting.draw_cw_faces == true) {
        //    gl.cullFace(gl.BACK); //triangles from FME are clockwise
        //}
        //else {
        //    gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
        //}
        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);

        if (tree_setting.do_depth_test == true) {
            gl.enable(gl.DEPTH_TEST);
        }
        else {            
            gl.disable(gl.DEPTH_TEST);
        }
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);


        //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
        
        if (tree_setting.do_blend == true) {
            gl.enable(gl.BLEND)
        }
        else {
            gl.disable(gl.BLEND)
        }        
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //make it transparent according to alpha value
        //renderer._clearDepth()
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
    }
}



export class Renderer {
    constructor(gl, ssctrees) {
        this.gl = gl
        this.ssctrees = ssctrees
        this.settings = {
            boundary_width: 0.2,
            backdrop_opacity: 1,
            foreground_opacity: 0.5,
            //layer_opacity: 0.5
        }

        // construct programs once, at init time
        this.programs = [
            new PolygonDrawProgram(gl),
            new LineDrawProgram(gl),
            new ImageTileDrawProgram(gl)
            //new ForegroundDrawProgram(gl)
        ];
    }

    // addBucket(mesh)
    // {
    //     console.log('making new mesh')
    //     let b = new Bucket(this.gl, mesh)
    //     this.buckets.push(b)
    //     // setTimeout(() => {
    //     //     this.buckets.map(bucket => {
    //     //         bucket.destroy()
    //     //     })
    //     // }, 15000)
    // }


    render_ssctrees(steps, transform, St) {

        this._clearColor()
        //this.renderer._clearDepth()
        //console.log('map.js steps.length:', steps.length)

        //console.log('map.js render this.ssctrees.length:', this.ssctrees.length)
        //console.log('map.js this.ssctrees[0]:', this.ssctrees[0])

        //draw from the last layer to the first layer; first layer will be on top
        for (var i = steps.length - 1; i >= 0; i--) {
            //clear the depth before drawing the new layer so that the new layer will not be discarded by the depth test
            this._clearDepth()
            let ssctree = this.ssctrees[i]
            //console.log('map.js render ssctree:', ssctree)
            let step = steps[i] - 0.001 //to compensate with the rounding problems

            //let last_step = ssctree.tree.metadata.no_of_steps_Ns
            let last_step = Number.MAX_SAFE_INTEGER
            if (ssctree.tree != null) { //the tree is null when the tree hasn't been loaded yet. 
                last_step = ssctree.tree.metadata.no_of_steps_Ns
                //last_step = this.ssctrees[i].tree.metadata.no_of_steps_Ns
            }

            if (step < 0) {
                step = 0
            }
            else if (step >= last_step) {
                step = last_step
            }
            steps[i] = step
            //console.log('map.js, step after snapping:', step)


            var matrix_box3d = ssctree.prepare_active_tiles(step, transform, this.gl)
            this.render_relevant_tiles(ssctree, matrix_box3d[0], matrix_box3d[1], [step, St]);
        }


    }

    render_relevant_tiles(ssctree, matrix, box3d, near_St) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?




        //this._clearColor()

        //this.ssctrees.forEach(ssctree => {

        //this._clearDepth()
        if (ssctree.tree == null) { //before the tree is loaded, ssctree.tree == null
            return
        }

        let tree_setting = ssctree.tree_setting
        //tree_setting.opacity = this.settings.foreground_opacity
        //console.log('render.js tree_setting.as_backdrop:', tree_setting.as_backdrop)
        //if (tree_setting.as_backdrop == true) {
        //    tree_setting.opacity = this.settings.backdrop_opacity
        //}

        //console.log('render.js tree_setting.opacity:', tree_setting.opacity)


        //console.log('')
        //console.log('render.js ssctree.tree:', ssctree.tree)
        //console.log('render.js ssctree.tree.box:', ssctree.tree.box)
        //            var z_low = ssctree.tree.box[2] - 0.001
        //            var z_high = ssctree.tree.box[5] - 0.001
        //            var z_plane = box3d[2]
        //            if (z_plane < z_low || z_plane >= z_high) {
        //                return
        //            }

        //console.log('render.js ssctree.tree_setting.tree_root_file_nm:', ssctree.tree_setting.tree_root_file_nm)
        //console.log('render.js box3d:', box3d)
        //console.log('render.js near_St:', near_St)

        var tiles = ssctree.get_relevant_tiles(box3d)
        //console.log('render.js, render_relevant_tiles, tiles.length:', tiles.length)
        if (tiles.length > 0 && tree_setting.do_draw == true && tree_setting.opacity > 0) {
            var polygon_draw_program = this.programs[0];
            tiles.forEach(tile => {
                //            .filter(tile => {tile.}) // FIXME tile should only have polygon data
                polygon_draw_program.draw_tile(matrix, tile, tree_setting);
            })

            var image_tile_draw_program = this.programs[2];
            tiles.filter(
                // tile should have image data
                tile => {
                    return tile.texture !== null
                })
                .forEach(tile => {
                    image_tile_draw_program.draw_tile(matrix, tile, tree_setting);
                })


            // If we want to draw lines twice -> thick line under / small line over
            // we need to do this twice + move the code for determining line width here...
            if (this.settings.boundary_width > 0) {
                var line_draw_program = this.programs[1];
                tiles.forEach(tile => {
                    // FIXME: would be nice to specify width here in pixels.
                    // bottom lines (black)
                    // line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                    // interior (color)
                    line_draw_program.draw_tile(matrix, tile, near_St, this.settings, tree_setting);
                })
            }



        }

        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()


        //})


    }

    _clearDepth()
    {
        let gl = this.gl;
        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
//        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear both color and depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);  // clear depth buffer
    }

    _clearColor()
    {
        let gl = this.gl;
        gl.clearColor(1.0, 1.0, 1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear both color and depth buffer
    }

    setViewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }


}
