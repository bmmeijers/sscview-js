// FIXME: rename draw to renderFunc ?

class SimpleProgram
{
    constructor(gl)
    {
        console.log('here' + gl)
        // this.context = gl;

        let vertexShaderText = [
            'precision highp float;',
            '',
            'attribute vec3 vertexPosition_modelspace;',
            'attribute vec4 vertexColor;',
            'uniform mat4 M;',
            'varying vec4 fragColor;',
            '',
            'void main()',
            '{',
            '  fragColor = vertexColor;',
            '  gl_Position = M * vec4(vertexPosition_modelspace, 1.0);',
            '}'
        ].join('\n');
        let fragmentShaderText = [
            'precision mediump float;',
            '',
            'varying vec4 fragColor;',
            '',
            'void main()',
            '{',
            '  gl_FragColor = vec4(fragColor);',
            '}'
        ].join('\n');    

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

    draw(matrix, tilecontent)
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


class ImageTileProgram
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

    draw(matrix, tilecontent)
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
    constructor(gl, tileset)
    {
        this.context = gl
        this.tileset = tileset
        console.log(this.tileset)
        // this.map = map;
        // this.buckets = [];
        this.programs = [new SimpleProgram(gl),
                         new ImageTileProgram(gl)]
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

    render(matrix, box)
    {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?
        var tiles = this.tileset.getActiveTiles(box)
        if (tiles.length > 0)
        {
            // this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT)
            tiles.forEach(tile => {
                console.log("Drawing: " + tile.info)
                this.programs[1].draw(matrix, tile.content)
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
