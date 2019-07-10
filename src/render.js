// FIXME: rename draw to renderFunc ?

class DrawProgram
{
    constructor(gl, vertexShaderText, fragmentShaderText) {

        //console.log('here' + gl)
        // this.context = gl;

        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        // vertex shader source and compile
        gl.shaderSource(vertexShader, vertexShaderText);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
            return;
        }
        // fragment shader source and compile
        gl.shaderSource(fragmentShader, fragmentShaderText);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
            return;
        }
        // create program: attach, link, validate, detach, delete
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(this.program));
            return;
        }
        gl.validateProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(this.program));
            return;
        }

        // FIXME: when to call these detach/delete's?
        // gl.detachShader(this.program, vertexShader);
        // gl.detachShader(this.program, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        this.context = gl;
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
              gl_Position = M * vec4(vertexPosition_modelspace, 1.0);
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



    draw(matrix, tilecontent, near)
    {
        let gl = this.context;
        gl.useProgram(this.program);
        // tilecontent.upload(gl);
        if (tilecontent.buffer === null)
        {
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent.buffer);
        // FIXME: better to store with bucket how the layout of the mesh is?
        const positionAttrib = gl.getAttribLocation(this.program, 'vertexPosition_modelspace');
        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        const colorAttrib = gl.getAttribLocation(this.program, 'vertexColor');
        gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(positionAttrib);
        gl.enableVertexAttribArray(colorAttrib);
        {
            let M = gl.getUniformLocation(this.program, 'M');
            gl.uniformMatrix4fv(M, false, matrix);
        }
        // FIXME: do we need to call this every time, or is it sufficient to do at init of transform?
        // {
        //     let rect = el.getBoundingClientRect();
        //     gl.viewport(0, 0, rect.width, rect.height);
        // }
        // gl.clearColor(1., 1., 1., 1.0);
        // gl.clearDepth(1.0);
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, tilecontent.buffer.numItems);
        //gl.drawArrays(gl.LINE_LOOP, 0, bucket.buffer.numItems);
    }
}

class LineDrawProgram extends DrawProgram {
    constructor(gl) {

        let vertexShaderText = `
            // vertex shader
            precision highp float;
            //attribute float dx;
            //attribute float dy;

            attribute vec2 displacement;
            attribute vec4 vertexPosition_modelspace;

            //attribute vec3 vertexColor;

            uniform mat4 M;
            uniform float near;

            //varying vec3 fragColor;
            void main()
            {
            //    fragColor = vertexColor;
                vec4 pos = vertexPosition_modelspace;

                if (pos.z <= near && pos.w > near)
                {
                //  if (pos.x == 185950.0 && pos.y == 310570.0)
                //  {
                //    pos.z = -2.0;
                //  }
                //  pos.x += dx * edge_frac / 10000.0;
                //  pos.y += dy * edge_frac / 10000.0;
                    vec4 vout = M * vec4(pos.xyz, 1.0);
                    vout.x += displacement.x;
                    vout.y += displacement.y;
                //    vout.x += dx;
                //    vout.y += dy;
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
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // fragColor,
            }
            `;

        super(gl, vertexShaderText, fragmentShaderText)
    }


    draw(matrix, tilecontent, near) {
        let gl = this.context;
        let program = this.program;
        let triangleVertexPositionBuffer = tilecontent.buffer;
        let displacementBuffer = tilecontent.displacementBuffer;

        gl.useProgram(program);
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
        const dxdyAttrib = gl.getAttribLocation(program, 'displacement');
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
        const positionAttrib = gl.getAttribLocation(program, 'vertexPosition_modelspace');
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
            let M = gl.getUniformLocation(program, 'M');
            gl.uniformMatrix4fv(M, false, matrix)
        }

        //set the viewport inside the canvas container of the web map
        //the following is a default setting
        //{
        //    let rect = el.getBoundingClientRect();
        //    gl.viewport(0, 0, rect.width, rect.height);
        //}

        {
            let where = gl.getUniformLocation(program, 'near');
            //                let val = Math.min(near, 10000.0) / 10000.0;
            //                console.log(val);
            gl.uniform1f(where, near);
        }

        gl.clearColor(1., 1., 1., 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);

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

        //            gl.drawElements(gl.TRIANGLES, indexElements.length, gl.UNSIGNED_SHORT, 0);








        //gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
        //// FIXME: better to store with bucket how the layout of the mesh is?
        //const positionAttrib = gl.getAttribLocation(this.program, 'vertexPosition_modelspace');
        //gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        //const colorAttrib = gl.getAttribLocation(this.program, 'vertexColor');
        //gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 24, 12);
        //gl.enableVertexAttribArray(positionAttrib);
        //gl.enableVertexAttribArray(colorAttrib);
        //{
        //    let M = gl.getUniformLocation(this.program, 'M');
        //    gl.uniformMatrix4fv(M, false, matrix);
        //}
        //// FIXME: do we need to call this every time, or is it sufficient to do at init of transform?
        //// {
        ////     let rect = el.getBoundingClientRect();
        ////     gl.viewport(0, 0, rect.width, rect.height);
        //// }
        //// gl.clearColor(1., 1., 1., 1.0);
        //// gl.clearDepth(1.0);
        //// gl.clear(gl.COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);
        //gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
        //gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);
        ////gl.drawArrays(gl.LINE_LOOP, 0, bucket.buffer.numItems);
    }
}


class ImageTileProgram extends DrawProgram
{
    constructor(gl)
    {
        console.log('here' + gl)
        // this.context = gl;

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

    draw(matrix, tilecontent, near)
    {
        let gl = this.context;
        gl.useProgram(this.program);
        // tilecontent.upload(gl);
        if (tilecontent.buffer === null)
        {
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent.buffer);
        // FIXME: better to store with bucket how the layout of the mesh is?
        const positionAttrib = gl.getAttribLocation(this.program, 'vertexPosition_modelspace');
        // gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttrib);

        {
            let M = gl.getUniformLocation(this.program, 'M');
            gl.uniformMatrix4fv(M, false, matrix);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent.textureCoordBuffer)
        const textureAttrib = gl.getAttribLocation(this.program, 'aTextureCoord');
        gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureAttrib);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tilecontent.texture);

        const uSampler = gl.getUniformLocation(this.program, 'uSampler');
        gl.uniform1i(uSampler, 0);

        // FIXME: do we need to call this every time, or is it sufficient to do at init of transform?
        // {
        //     let rect = el.getBoundingClientRect();
        //     gl.viewport(0, 0, rect.width, rect.height);
        // }
        // gl.clearColor(1., 1., 1., 1.0);
        // gl.clearDepth(1.0);
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, tilecontent.buffer.numItems);
        //gl.drawArrays(gl.LINE_LOOP, 0, bucket.buffer.numItems);
    }
}


// class Bucket
// {
//     constructor(gl, mesh)
//     {
        
//         this.buffer = null;
//         this.context = gl;

//         this.mesh = mesh;
//         this.uploaded = false;
//     }

//     upload()
//     {
//         if (this.uploaded === true || this.mesh === null)
//         {
//             return;
//         }
//         let gl = this.context;
//         this.buffer = gl.createBuffer();
//         // bind buffer
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
//         gl.bufferData(gl.ARRAY_BUFFER, this.mesh, gl.STATIC_DRAW);
//         // remember size
//         // this.buffer.itemSize = 3;
//         this.buffer.numItems = (this.mesh.length) / 6;
//         this.mesh = null;
//     }

//     destroy()
//     {
//         let gl = this.context;
//         gl.deleteBuffer(this.buffer);
//         this.buffer = null;
//     }
// }

export class Renderer
{
    constructor(gl, tileset) {
        this.context = gl
        this.tileset = tileset
        //console.log(this.tileset)
        // this.map = map;
        // this.buckets = [];
        this.programs = [
            //new PolygonDrawProgram(gl),
            new LineDrawProgram(gl),
            new ImageTileProgram(gl)
        ]
        // console.log(this.context);
        // console.log(this.buckets);
    }

    // addBucket(mesh)
    // {
    //     console.log('making new mesh')
    //     let b = new Bucket(this.context, mesh)
    //     this.buckets.push(b)
    //     // setTimeout(() => {
    //     //     this.buckets.map(bucket => {
    //     //         bucket.destroy()
    //     //     })
    //     // }, 15000)
    // }

    render(matrix, box, near)
    {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?
        var tiles = this.tileset.getActiveTiles(box)
        if (tiles.length > 0)
        {
            this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT)
            // this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT)
            tiles.forEach(tile => {
                this.programs[0].draw(matrix, tile.content, near)
            })
        }
        else
        {
            this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT)
        }
        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.context.clear()
    }

    setViewport(width, height)
    {
        this.context.viewport(0, 0, width, height);
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
