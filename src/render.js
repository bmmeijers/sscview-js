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
}

class CombinedDrawProgram extends DrawProgram
{
    constructor(gl) {

        let vertexShaderText = `
            precision highp float;
            
            attribute vec3 vertexPosition_modelspace;
            attribute vec4 vertexColor;
            uniform mat4 M;
            varying vec4 fragColor;
            
            attribute vec2 displacement;
            attribute vec4 Line_vertexPosition_modelspace;

            uniform float feature_type_vs; //0: points;   1: lines;   2: polygons

            uniform float near;

            void main()
            {
                if (feature_type_vs > 1.0 && feature_type_vs < 2.0)
                {
                    vec4 pos = Line_vertexPosition_modelspace;

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
                else //if (feature_type_vs > 10.0)
                {
                    // fragColor = vertexColor;
                //     gl_Position = M * vec4(vertexPosition_modelspace, 1.0);
                }
            }
        `;

        let fragmentShaderText = `
            precision mediump float;
            
            varying vec4 fragColor;
            uniform float feature_type_fs; //0: points;   1: lines;   2: polygons

            void main()
            {
                // if (feature_type_fs == 1)
                // {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // color of the lines: black
                // }
                // else if (feature_type_fs == 2)
                // {
                //     gl_FragColor = vec4(fragColor);
                // }              
            }
        `;

        super(gl, vertexShaderText, fragmentShaderText)
    }

    // draw_tilecontent(matrix, tilecontent, near)
    // {
    //     let gl = this.gl;
    //     let shaderProgram = this.shaderProgram;
    //     gl.useProgram(shaderProgram);
    //     // tilecontent.upload(gl);
    //     var tilecontent_buffer = tilecontent.polygon_triangleVertexPositionBuffer;
    //     if (tilecontent_buffer === null)
    //     {
    //         return;
    //     }
    //     gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent_buffer);
    //     // FIXME: better to store with bucket how the layout of the mesh is?
    //     const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
    //     gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
    //     const colorAttrib = gl.getAttribLocation(shaderProgram, 'vertexColor');
    //     gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 24, 12);
    //     gl.enableVertexAttribArray(positionAttrib);
    //     gl.enableVertexAttribArray(colorAttrib);
    //     {
    //         let M = gl.getUniformLocation(shaderProgram, 'M');
    //         gl.uniformMatrix4fv(M, false, matrix);
    //     }

    //     let feature_type_location = gl.getUniformLocation(shaderProgram, 'feature_type');
    //     gl.uniform1f(feature_type_location, 1);


    //     gl.disable(gl.BLEND);
    //     gl.enable(gl.DEPTH_TEST);
    //     gl.drawArrays(gl.TRIANGLES, 0, tilecontent_buffer.numItems);
    // }






    draw_tilecontent(matrix, tilecontent, near) {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        let triangleVertexPositionBuffer = tilecontent.line_triangleVertexPositionBuffer;
        let displacementBuffer = tilecontent.displacementBuffer;

        gl.useProgram(shaderProgram);
        // tilecontent.upload(gl);
        if (triangleVertexPositionBuffer === null) {
            return;
        }

        

        //void vertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, GLintptr offset)
        //size is the number of components per attribute. For example, with RGB colors, it would be 3; and with an
        //alpha channel, RGBA, it would be 4. If we have location data with (x,y,z) attributes, it would be 3; and if we
        //had a fourth parameter w, (x,y,z,w), it would be 4. Texture parameters (s,t) would be 2. type is the datatype,
        //stride and offset can be set to the default of 0 for now and will be reexamined in Chapter 9 when we discuss
        //interleaved arrays.

        //console.log("buffer:", triangleVertexPositionBuffer)
        //console.log("displacementBuffer:", displacementBuffer)


        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        const dxdyAttrib = gl.getAttribLocation(shaderProgram, 'displacement');
        gl.enableVertexAttribArray(displacementBuffer);
        gl.vertexAttribPointer(
            dxdyAttrib,    // * Attribute location
            2,              // * Number of components per attribute ????? 
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            0,             // * stride 
            0              // * Offset from the beginning of 
            //     a single vertex to this attribute
        );


        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
        const positionAttrib = gl.getAttribLocation(shaderProgram, 'Line_vertexPosition_modelspace');
        gl.vertexAttribPointer(
            positionAttrib,
            4,
            gl.FLOAT,
            false,
            0,
            0
        );

        //            console.log('positionAttrib ' + positionAttrib);
        //            console.log('colorAttrib ' + colorAttrib);




        gl.enableVertexAttribArray(positionAttrib);
        //            gl.enableVertexAttribArray(colorAttrib);
        {
            let M = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M, false, matrix)
        }

        // let feature_type = 1;
        {
            let feature_type_vs_location = gl.getUniformLocation(shaderProgram, 'feature_type_vs');
            gl.uniform1f(feature_type_vs_location, 1.5);
    

        }


        //set the viewport inside the canvas container of the web map
        //the following is a default setting
        //{
        //    let rect = el.getBoundingClientRect();
        //    gl.viewport(0, 0, rect.width, rect.height);
        //}

        {
            let where = gl.getUniformLocation(shaderProgram, 'near');
            //                let val = Math.min(near, 10000.0) / 10000.0;
            //                console.log(val);
            gl.uniform1f(where, near);
        }

        // let feature_type_fs_location = gl.getUniformLocation(shaderProgram, 'feature_type_fs');
        // gl.uniform1f(feature_type_fs_location, 1.5);

        // Set clear color to white, fully opaque
        gl.clearColor(1., 1., 1., 1.0);
        gl.clearDepth(1.0); // Clear everything




        //console.log("gl.COLOR_BUFFER_BIT:", gl.COLOR_BUFFER_BIT)
        //console.log("gl.DEPTH_BUFFER_BIT:", gl.DEPTH_BUFFER_BIT)
        //console.log("gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT:", gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        //The COLOR_BUFFER_BIT constant indicates the buffers currently enabled for color writing.
        //The DEPTH_BUFFER_BIT constant indicates the depth buffer.
        //gl.COLOR_BUFFER_BIT: 16384 or 0100000000000000; why this value?
        //gl.DEPTH_BUFFER_BIT: undefined
        //gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT: 16384 or 0100000000000000
        
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color  //commented by Dongliang: seems that it has no effects  ********************
        //gl.clear(gl.COLOR_BUFFER_BIT)

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);

        gl.enable(gl.CULL_FACE);
        //            gl.disable(gl.CULL_FACE);

        gl.cullFace(gl.BACK);
        //            gl.cullFace(gl.FRONT);
        //            gl.cullFace(gl.FRONT_AND_BACK);


        //            gl.lineWidth(20);

        gl.drawArrays(
            //                gl.LINE_LOOP, 
            //                gl.POINTS,
            //                gl.TRIANGLES,
            gl.TRIANGLES,
            0,
            triangleVertexPositionBuffer.numItems
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

              vec4 vout = M * vec4(vertexPosition_modelspace, 1);
              gl_Position = vout;

            //   gl_Position = M * vec4(vertexPosition_modelspace, 1);
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



    draw_tilecontent(matrix, tilecontent, near)
    {
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        // tilecontent.upload(gl);
        var tilecontent_buffer = tilecontent.polygon_triangleVertexPositionBuffer;
        if (tilecontent_buffer === null)
        {
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent_buffer);
        // FIXME: better to store with bucket how the layout of the mesh is?
        const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        const colorAttrib = gl.getAttribLocation(shaderProgram, 'vertexColor');
        gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(positionAttrib);
        gl.enableVertexAttribArray(colorAttrib);
        {
            let M_location = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M_location, false, matrix);
        }

        //gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST); //this will make the interior boundaries thinner
        gl.drawArrays(gl.TRIANGLES, 0, tilecontent_buffer.numItems);
    }

    
}

class LineDrawProgram extends DrawProgram {
    constructor(gl) {

        let vertexShaderText = `
            // vertex shader
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
                    //vout.z = vout.z - 0.000001; //for displaying ****************************
                    gl_Position = vout;
                } else {
                    gl_Position = vec4(-10.0,-10.0,-10.0,1.0);
                    return;
                }
            }
            `;
        let fragmentShaderText = `
            // fragment shader
            precision mediump float;
            varying vec3 fragColor;
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
        let triangleVertexPositionBuffer = tilecontent.line_triangleVertexPositionBuffer;
        let displacementBuffer = tilecontent.displacementBuffer;

        gl.useProgram(shaderProgram);
        // tilecontent.upload(gl);
        if (triangleVertexPositionBuffer === null) {
            return;
        }

        //console.log("near:", near);

        //void vertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, GLintptr offset)
        //size is the number of components per attribute. For example, with RGB colors, it would be 3; and with an
        //alpha channel, RGBA, it would be 4. If we have location data with (x,y,z) attributes, it would be 3; and if we
        //had a fourth parameter w, (x,y,z,w), it would be 4. Texture parameters (s,t) would be 2. type is the datatype,
        //stride and offset can be set to the default of 0 for now and will be reexamined in Chapter 9 when we discuss
        //interleaved arrays.

        //console.log("buffer:", triangleVertexPositionBuffer)
        //console.log("displacementBuffer:", displacementBuffer)


        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        const dxdyAttrib = gl.getAttribLocation(shaderProgram, 'displacement');
        gl.enableVertexAttribArray(displacementBuffer);
        gl.vertexAttribPointer(
            dxdyAttrib,    // * Attribute location
            2,              // * Number of components per attribute ????? 
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            0,             // * stride 
            0              // * Offset from the beginning of 
            //     a single vertex to this attribute
        );


        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
        const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        gl.vertexAttribPointer(
            positionAttrib,
            4,
            gl.FLOAT,
            false,
            0,
            0
        );

        //            console.log('positionAttrib ' + positionAttrib);
        //            console.log('colorAttrib ' + colorAttrib);




        gl.enableVertexAttribArray(positionAttrib);
        //            gl.enableVertexAttribArray(colorAttrib);
        {
            let M = gl.getUniformLocation(shaderProgram, 'M');
            gl.uniformMatrix4fv(M, false, matrix)
        }

        //set the viewport inside the canvas container of the web map
        //the following is a default setting
        //{
        //    let rect = el.getBoundingClientRect();
        //    gl.viewport(0, 0, rect.width, rect.height);
        //}

        {
            let where = gl.getUniformLocation(shaderProgram, 'near');
            //                let val = Math.min(near, 10000.0) / 10000.0;
            //                console.log(val);
            gl.uniform1f(where, near);
        }

        // Set clear color to white, fully opaque
        //gl.clearColor(1., 1., 1., 1.0);
        //gl.clearDepth(1.0); // Clear everything

        //console.log("gl.COLOR_BUFFER_BIT:", gl.COLOR_BUFFER_BIT)
        //console.log("gl.DEPTH_BUFFER_BIT:", gl.DEPTH_BUFFER_BIT)
        //console.log("gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT:", gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        //The COLOR_BUFFER_BIT constant indicates the buffers currently enabled for color writing.
        //The DEPTH_BUFFER_BIT constant indicates the depth buffer.
        //gl.COLOR_BUFFER_BIT: 16384 or 0100000000000000; why this value?
        //gl.DEPTH_BUFFER_BIT: undefined
        //gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT: 16384 or 0100000000000000
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color  //commented by Dongliang: seems that it has no effects  ********************
        //gl.clear(gl.COLOR_BUFFER_BIT)

        //gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);

        //gl.enable(gl.CULL_FACE);
        //            gl.disable(gl.CULL_FACE);

        //gl.cullFace(gl.BACK);
                    //gl.cullFace(gl.FRONT);
        //            gl.cullFace(gl.FRONT_AND_BACK);


        //            gl.lineWidth(20);

        gl.drawArrays(
            //                gl.LINE_LOOP, 
            //                gl.POINTS,
            //                gl.TRIANGLES,
            gl.TRIANGLES,
            0,
            triangleVertexPositionBuffer.numItems
        );
    }
}




export class Renderer
{
    constructor(gl, ssctree) {
        this.gl = gl
        this.ssctree = ssctree
        // this.polygon_drawprogram = new PolygonDrawProgram(gl);        
        // this.line_drawprogram = new LineDrawProgram(gl);
        // this.combined_drawprogram = new CombinedDrawProgram(gl);


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
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)  //commented by Dongliang: seems that it has no effects  ********************
        var tiles = this.ssctree.get_active_tiles(box3d)
        if (tiles.length > 0) {
            //console.log("matrix:", matrix);
            // var polygon_drawprogram = new PolygonDrawProgram(this.gl);
            // tiles.forEach(tile => {
            //     //this.polygon_drawprogram.draw_tilecontent(matrix, tile.content, near);
            //     //this.line_drawprogram.draw_tilecontent(matrix, tile.content, near);

            //     // this.line_drawprogram.draw_tilecontent(matrix, tile.content, near);
            //     polygon_drawprogram.draw_tilecontent(matrix, tile.content, near);
            //     // this.combined_drawprogram.draw_tilecontent(matrix, tile.content, near);
            // })







            var polygon_drawprogram = new PolygonDrawProgram(this.gl);
            tiles.forEach(tile => {
                polygon_drawprogram.draw_tilecontent(matrix, tile.content, near);
            })

            //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)


            var line_drawprogram = new LineDrawProgram(this.gl);
            tiles.forEach(tile => {
                line_drawprogram.draw_tilecontent(matrix, tile.content, near);
            })

            // var line_drawprogram = new LineDrawProgram(this.gl);


            //this.Test_Draw(rect);













            // tiles.forEach(tile => {
            //     line_drawprogram.draw_tilecontent(matrix, tile.content, near);
            // })

        }

        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()
    }

    Test_Draw(rect) {
        /* Step2: Define the geometry and store it in buffer objects */
        var gl = this.gl;
        
        var vertices = [-0.3, 0.5, -0.3, -0.5, 0.2, -0.5,];
        
        // Create a new buffer object
        var vertex_buffer = gl.createBuffer();

        // Bind an empty array buffer to it
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

        // Pass the vertices data to the buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // Unbind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        /* Step3: Create and compile Shader programs */

        // Vertex shader source code
        var vertCode =
            'attribute vec2 coordinates;' +
            'void main(void) {' + ' gl_Position = vec4(coordinates, 0.9, 1.0);' + '}';

        //Create a vertex shader object
        var vertShader = gl.createShader(gl.VERTEX_SHADER);

        //Attach vertex shader source code
        gl.shaderSource(vertShader, vertCode);

        //Compile the vertex shader
        gl.compileShader(vertShader);

        //Fragment shader source code
        var fragCode = 'void main(void) {' + 'gl_FragColor = vec4(0.0, 0.0, 1.0, 0.5);' + '}';

        // Create fragment shader object
        var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

        // Attach fragment shader source code
        gl.shaderSource(fragShader, fragCode);

        // Compile the fragment shader
        gl.compileShader(fragShader);

        // Create a shader program object to store combined shader program
        var shaderProgram = gl.createProgram();

        // Attach a vertex shader
        gl.attachShader(shaderProgram, vertShader);

        // Attach a fragment shader
        gl.attachShader(shaderProgram, fragShader);

        // Link both programs
        gl.linkProgram(shaderProgram);

        // Use the combined shader program object
        gl.useProgram(shaderProgram);

        /* Step 4: Associate the shader programs to buffer objects */

        //Bind vertex buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

        //Get the attribute location
        var coord = gl.getAttribLocation(shaderProgram, "coordinates");

        //point an attribute to the currently bound VBO
        gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);

        //Enable the attribute
        gl.enableVertexAttribArray(coord);

        /* Step5: Drawing the required object (triangle) */

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0.5);

        // gl.clearDepth(0.9);

        // Enable the depth test
        gl.enable(gl.DEPTH_TEST);
        // gl.depthFunc(gl.NEVER);
        // gl.depthFunc(gl.ALWAYS);
        // gl.depthFunc(gl.LEQUAL);
        // gl.depthFunc(gl.GEQUAL);

        // console.log("gl.getParameter(gl.DEPTH_WRITEMASK):", gl.getParameter(gl.DEPTH_WRITEMASK));

        // Clear the color buffer bit
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // gl.clear(gl.COLOR_BUFFER_BIT);
        // gl.clear(gl.DEPTH_BUFFER_BIT);

        // console.log("gl.DEPTH_BUFFER_BIT:", gl.DEPTH_BUFFER_BIT);


        

        // Set the view port
        gl.viewport(0, 0, rect.width, rect.height);

        // Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);


    }

    setViewport(width, height)
    {
        this.gl.viewport(0, 0, width, height);
    }

    // onContentReady(obj)
    // {
    //     this.addBucket(obj.data)
    //     // schedule re-render!
    //     // FIXME: this should only happen when not already rendering /animating the map...
    //     // should the map keep state of {animating|still} ???
    //     // this.map.abortAndRender()
    // }
}
