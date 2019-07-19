// FIXME: rename draw to renderFunc ?

class DrawProgram
{
    constructor(gl, vertexShaderText, fragmentShaderText) {

        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // create program: attach, link, validate, detach, delete
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

        // FIXME: when to call these detach/delete's?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        

        //
        // creates a shader of the given type, uploads the source and
        // compiles it.
        //
        function loadShader(gl, type, source) {

            const shader = gl.createShader(type);            
            gl.shaderSource(shader, source); // Send the source to the shader object            
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
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



class LineDrawProgram extends DrawProgram {
    constructor(gl) {

        let vertexShaderText = `
            precision highp float;

            attribute vec2 displacement;
            attribute vec4 vertexPosition_modelspace;
            uniform mat4 M;
            uniform float near;

            void main()
            {
                vec4 pos = vertexPosition_modelspace;

                if (pos.z <= near && pos.w > near)
                {
                    vec4 vout = M * vec4(pos.xyz, 1.0);
                    vout.x += displacement.x;
                    vout.y += displacement.y;
                    gl_Position = vout;
                } else {
                    gl_Position = vec4(-10.0,-10.0,-10.0,1.0);
                    return;
                }
            }
            `;

        let fragmentShaderText = `
            precision mediump float;

            void main()
            {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // color of the lines: black
            }
            `;

        super(gl, vertexShaderText, fragmentShaderText)
    }


    draw_tilecontent(matrix, tilecontent, near) {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        let triangleVertexPosBufr = tilecontent.line_triangleVertexPosBufr;
        let displacementBuffer = tilecontent.displacementBuffer;

        gl.useProgram(shaderProgram);
        // tilecontent.upload(gl);
        if (triangleVertexPosBufr === null) {
            return;
        }

        //console.log("near:", near);

        //void vertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, GLintptr offset)
        //size is the number of components per attribute. For example, with RGB colors, it would be 3; and with an
        //alpha channel, RGBA, it would be 4. If we have location data with (x,y,z) attributes, it would be 3; and if we
        //had a fourth parameter w, (x,y,z,w), it would be 4. Texture parameters (s,t) would be 2. type is the datatype,
        //stride and offset can be set to the default of 0 for now and will be reexamined in Chapter 9 when we discuss
        //interleaved arrays.

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        this._prepare_vertices(gl, shaderProgram, 'displacement', 2, 0, 0);
    
        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);

            let where = gl.getUniformLocation(shaderProgram, 'near');
            gl.uniform1f(where, near);
        }

        // Set clear color to white, fully opaque
        //gl.clearColor(1., 1., 1., 1.0);
        //gl.clearDepth(1.0); // Clear everything

        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color
        //gl.clear(gl.COLOR_BUFFER_BIT)

        //gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);

        //gl.enable(gl.CULL_FACE);
        //            gl.disable(gl.CULL_FACE);

        //gl.cullFace(gl.BACK);
        //gl.cullFace(gl.FRONT);
        //            gl.cullFace(gl.FRONT_AND_BACK);

        gl.drawArrays(
            gl.TRIANGLES, //kind of primitives to render; e.g., POINTS, LINES
            0,            //Specifies the starting index in the enabled arrays.
            triangleVertexPosBufr.numItems // Specifies the number of indices to be rendered.
        );
    }
}



class PolygonDrawProgram extends DrawProgram
{
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



    draw_tilecontent(matrix, tilecontent)
    {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        // tilecontent.upload(gl);
        var triangleVertexPosBufr = tilecontent.polygon_triangleVertexPosBufr;
        if (triangleVertexPosBufr === null)
        {
            return;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        this._prepare_vertices(gl, shaderProgram, 'vertexColor', 3, 24, 12);

        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);
        }

        //gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
    }    
}






export class Renderer
{
    constructor(gl, ssctree) {
        this.gl = gl
        this.ssctree = ssctree

        //console.log(this.ssctree)
        // this.map = map;
        // this.buckets = [];
        //this.programs = [
        //    new PolygonDrawProgram(gl),
        //    new LineDrawProgram(gl),
        //    //new ImageTileProgram(gl)
        //]
        // console.log(this.gl);
        // console.log(this.buckets);
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

    render_active_tiles(matrix, box3d, near, rect) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?
        var tiles = this.ssctree.get_active_tiles(box3d)
        if (tiles.length > 0) {

            var polygon_drawprogram = new PolygonDrawProgram(this.gl);
            tiles.forEach(tile => {
                polygon_drawprogram.draw_tilecontent(matrix, tile.content);
            })

            var line_drawprogram = new LineDrawProgram(this.gl);
            tiles.forEach(tile => {
                line_drawprogram.draw_tilecontent(matrix, tile.content, near);
            })
        }

        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()
    }


    setViewport(width, height)
    {
        this.gl.viewport(0, 0, width, height);
    }


}
