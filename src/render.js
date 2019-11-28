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

    _prepare_vertices(gl, shaderProgram, attribute_name, itemSize, stride, offset) {

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
            
            void main()
            {
              gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `

        super(gl, vertexShaderText, fragmentShaderText)
    }

//    draw(matrix, tilecontent)
    draw_tile(matrix, tile) {
        if (tile.content.buffer === null)
        {
            return;
        }

        let gl = this.gl;
        gl.useProgram(this.shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer);

        // FIXME: better to store with bucket how the layout of the mesh is?
        const positionAttrib = gl.getAttribLocation(this.shaderProgram, 'vertexPosition_modelspace');
        // gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttrib);

        {
            let M = gl.getUniformLocation(this.shaderProgram, 'M');
            gl.uniformMatrix4fv(M, false, matrix);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer)
        const textureAttrib = gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
        gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureAttrib);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.content.texture);

        const uSampler = gl.getUniformLocation(this.shaderProgram, 'uSampler');
        gl.uniform1i(uSampler, 0);

        gl.disable(gl.BLEND);
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


    draw_tile(matrix, tile, near_St, boundary_width_screen) {
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
        this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        this._prepare_vertices(gl, shaderProgram, 'displacement', 2, 0, 0);

        // the unit of boundary_width is mm; 1 mm equals 3.7795275590551 pixels
        // FIXME: MM: at which amount of dots per inch has this been calculated?

         // FIXME: settings/view
//        let boundary_width_screen = 0.2;
        //var boundary_width_screen = parseFloat(document.getElementById('boundary_width_slider').value);
        // The unit of the map must be meter!!!
        var half_width_reality = boundary_width_screen * near_St[1] / 1000 / 2;
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
            gl.uniform4f(color_location, c[0], c[1], c[2], 1.0);
        }

        // Set clear color to white, fully opaque
        // gl.clearColor(1., 1., 1., 1.0);
        // gl.clearDepth(1.0); // Clear everything

        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color
        // gl.clear(gl.COLOR_BUFFER_BIT)

        // gl.disable(gl.BLEND);
        gl.enable(gl.BLEND); // FIXME: needed?
        gl.disable(gl.DEPTH_TEST);

        // gl.enable(gl.CULL_FACE);
        // gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?

        // gl.cullFace(gl.BACK);
        // gl.cullFace(gl.FRONT);
        // gl.cullFace(gl.FRONT_AND_BACK);

        gl.drawArrays(
            gl.TRIANGLES, // kind of primitives to render; e.g., POINTS, LINES
            0,            // Specifies the starting index in the enabled arrays.
            triangleVertexPosBufr.numItems // Specifies the number of indices to be rendered.
        );
    }
}



class PolygonDrawProgram extends DrawProgram {
    constructor(gl) {
        let vertexShaderText = `
precision highp float;

attribute vec3 vertexPosition_modelspace;
attribute vec4 vertexColor;
uniform mat4 M;
varying vec4 fragColor;

void main()
{
    fragColor = vertexColor;
    gl_Position = M * vec4(vertexPosition_modelspace, 1);
}
`;
        let fragmentShaderText = `
precision mediump float;

varying vec4 fragColor;
void main()
{
    gl_FragColor = vec4(fragColor);
}
`;
        super(gl, vertexShaderText, fragmentShaderText)
    }

    draw_tile(matrix, tile) {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);

        var triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
        if (triangleVertexPosBufr === null) {
            return;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        this._prepare_vertices(gl, shaderProgram, 'vertexColor', 3, 24, 12);

        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);
        }

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
    }
}


export class Renderer {
    constructor(gl, ssctree) {
        this.gl = gl
        this.ssctree = ssctree
        this.settings = { boundary_width: 0.2 }

        // construct programs once, at init time
        this.programs = [
            new PolygonDrawProgram(this.gl),
            new LineDrawProgram(this.gl),
            new ImageTileDrawProgram(gl)
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

    render_relevant_tiles(matrix, box3d, near_St) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?

        var tiles = this.ssctree.get_relevant_tiles(box3d)
//            .filter(tile => {return tile.hasOwnProperty('content') && tile.content !== null})

//        let gl = this.gl;
//        gl.clearColor(1.0, 1.0, 1.0, 1.0);
//        gl.clearDepth(1.0); // Clear everything
//        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color

        this._clear();
        if (tiles.length > 0) {

            var polygon_draw_program = this.programs[0];
            tiles
//            .filter(tile => {tile.}) // FIXME tile should only have polygon data
            .forEach(tile => {
                polygon_draw_program.draw_tile(matrix, tile);
            })

            var image_tile_draw_program = this.programs[2];
            tiles
                .filter(
                    // tile should have image data
                    tile => {
                        return tile.texture !== null
                    }
                ) 
                .forEach(tile => {
                    image_tile_draw_program.draw_tile(matrix, tile);
                })


            // FIXME: if lines have width == 0; why draw them?
            // If we want to draw lines twice -> thick line under / small line over
            // we need to do this twice + move the code for determining line width here...
            var line_draw_program = this.programs[1];
            tiles
            .forEach(tile => {
                // FIXME: would be nice to specify width here in pixels.
                // bottom lines (black)
                // line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                // interior (color)
                line_draw_program.draw_tile(matrix, tile, near_St, this.settings.boundary_width);
            })
        }

        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()
    }

    _clear()
    {
        let gl = this.gl;
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  // Clear the color buffer with specified clear color

    }

    setViewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }


}
