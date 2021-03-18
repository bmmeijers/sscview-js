class Tile
{
    /** A Tile in the TilePyramid */
    constructor(tileMatrix, col, row)
    {
        if (col < 0 || row < 0 || col > tileMatrix.matrixSize[0] || row > tileMatrix.matrixSize[1])
        {
            throw new Error('tile outside bounds of tileMatrix')
        }
        this.tileMatrix = tileMatrix;
        this.col = col
        this.row = row
    }

    /** bounds in world coordinates (Rijksdriehoekstelsel) 

    returns array with: [xmin, ymin, xmax, ymax]
    */
    bounds()
    {
        let x = this.col
        let y = this.row
        return [
            this.tileMatrix.topLeftCorner[0] +   x    * this.tileMatrix.tileSpan[0],
            this.tileMatrix.topLeftCorner[1] + -(y+1) * this.tileMatrix.tileSpan[1],
            this.tileMatrix.topLeftCorner[0] +  (x+1) * this.tileMatrix.tileSpan[0],
            this.tileMatrix.topLeftCorner[1] +  -y    * this.tileMatrix.tileSpan[1]
        ]
    }

    /** the URL where we can get the image for this tile */
    getRequestUrl()
    {
        let url = "https://geodata.nationaalgeoregister.nl/tiles/service/wmts?"
        url += "service=WMTS&request=GetTile&version=1.0.0&format=image/png8"
        url += "&tileMatrixSet=" + this.tileMatrix.tileMatrixSet
        url += "&layer=" + this.tileMatrix.layer
        url += "&style=" + this.tileMatrix.style
        url += "&tileMatrix=" + this.tileMatrix.level
        url += "&TileCol=" + this.col
        url += "&TileRow=" + this.row
        return url
    }

    /** Get a unique identifier that we can use to manage the tile resources */
    getId()
    {
        return `${this.tileMatrix.layer}-${this.tileMatrix.level}-${this.col}-${this.row}`
    }
}

class TileMatrix
{
    /** One matrix of tiles in the tile pyramid */
    constructor(level, scaleDenominator)
    {
        this.scaleDenominator = scaleDenominator

        this.layer = "opentopo"
//        this.layer = "2016_ortho25"
//        this.layer = "brtachtergrondkaart"
//        this.layer = "top25raster"
//        this.layer = "ahn2_05m_ruw"
        
        this.style = "default"
        this.tileMatrixSet = "EPSG:28992" // some also have 16 levels

        this.identifier = level
        this.level = level
        const howMany = Math.pow(2, level)
        this.matrixSize = [howMany, howMany]

        this.topLeftCorner = [-285401.920, 903401.920]
        this.tileSize = [256.0, 256.0]

        // the pixel coordinates need to be transferred into world coordinates
        // pixelSpan = scaleDenominator × 0.28 * 10^-3 / metersPerUnit(crs)
        const standardPixelMeter = 0.00028
        const pixelInMeter = scaleDenominator * standardPixelMeter
        this.tileSpan = this.tileSize.map(tileSize => {return tileSize * pixelInMeter})
    }

    /** the axis aligned box in world coordinates around all tiles of this matrix */
    bounds()
    {
        return [
            this.topLeftCorner[0],
            this.topLeftCorner[1] - this.tileSpan[1] * this.matrixSize[1],
            this.topLeftCorner[0] + this.tileSpan[0] * this.matrixSize[0],
            this.topLeftCorner[1]
        ]
    }

    /** return a list of Tile objects that overlap the box2d axis aligned box */
    overlappingTiles(box2d)
    {
        let minX = box2d[0]
        let minY = box2d[1]
        let maxX = box2d[2]
        let maxY = box2d[3]

        // make sure here that we do not exit the domain of the tileMatrix
        minX = Math.max(minX, this.topLeftCorner[0])
        minY = Math.max(minY, this.topLeftCorner[1] - this.tileSpan[1] * this.matrixSize[1])
        maxX = Math.min(maxX, this.topLeftCorner[0] + this.tileSpan[0] * this.matrixSize[0])
        maxY = Math.min(maxY, this.topLeftCorner[1])

        // get the bottom left corner of the tileMatrix
        let bottomLeftCorner = [this.topLeftCorner[0], 
                                this.topLeftCorner[1] - this.tileSpan[1] * this.matrixSize[1]]

        // how many tiles do we need to cover the extent?
        // BUG: if the x,y of lower-left corner is far away 
        //      outside from corner of screen
        //      we need to add 1 more row and/or 1 more column!
        //      - would it be different for when raster fits within screen?
        let countX = Math.ceil((maxX - minX) / this.tileSpan[0])
        let countY = Math.ceil((maxY - minY) / this.tileSpan[1])

        // in which row and col does the point minX,minY fall?
        // get (row, col) in right-up coordinate system, instead of right-bottom
        let minCol = Math.floor((minX - bottomLeftCorner[0]) / this.tileSpan[0])
        let minRow = Math.floor((minY - bottomLeftCorner[1]) / this.tileSpan[1])

        let result = []
        // add 1 in both dimensions to be sure to cover the extent
        for (let col = minCol; col < Math.min((minCol + countX + 1), this.matrixSize[0]); col++) {
            for (let row = minRow; row <= Math.min((minRow + countY + 1), this.matrixSize[1]); row++) {
                // flip coordinate of y-axis
                // (row in WMTS is top-down, not bottom-up))
                let x = col
                let y = this.matrixSize[1] - 1 - row
                if (x >= 0 && x < this.matrixSize[0] && y >= 0 && y < this.matrixSize[1]) {
                    result.push( this.getTile(x , y))
                }
            }
        }
        return result
    }

    /** get a tile object for the column and row

    the tile object keeps a reference to this tileMatrix object */
    getTile(col, row)
    {
        return new Tile(this, col, row)
    }
}

export class WMTSLayer // TiledWebMapScheme ??
{
    /** a tiled map layer, with images available at multiple map scales */
    constructor() // layerName, style, tileMatrixSetName)
    {
        // layer has TileMatrixSet -> TileMatrix[*] -> Tile[*]
        this.tileMatrixSet = []

        let scaleDenominator = 12288000.0
        for (let i = 0; i < 14; i++) {
            this.tileMatrixSet.push(new TileMatrix(i, scaleDenominator))
            scaleDenominator /= 2
        }
    }

    /** get the overlapping tiles for a 2D extent at a specific map scale */
    tilesInView(box2d, scaleDenominator)
    {
        // snap to scale and find right tileMatrix
        let tileMatrix = this.snapToScale(scaleDenominator)
        // return the tiles we are looking for
        return tileMatrix.overlappingTiles(box2d)
    }

    /** snap to tileMatrix closest in scale, closest half way two scale denominators*/
    snapToScale(scaleDenominator)
    {
        // map to correct tileMatrix, i.e. snap to a scale
        for (var tileMatrix of this.tileMatrixSet) { 
            // Note: buble will translate for .. of .. with correct setting in rollup.config.js
            let nextScaleDenominator = tileMatrix.scaleDenominator * 0.5 
            let halfWayScale = tileMatrix.scaleDenominator - nextScaleDenominator * 0.5
            // when the scaleDenominator becomes bigger than the scale boundary
            // we have found the relevant tileMatrix
            if (scaleDenominator >= halfWayScale)
            {
                break
            }
        }
        // if we end here without break, we are over-zoomed
        // and we return last tileMatrix in the tileMatrixSet
        return tileMatrix
    }
}

/** check whether a number is a power of 2 */
let isPowerOf2 = ((value) => { return (value & (value - 1)) == 0 })

/** generate a random color in rgb space 
(note, may be biased to darker colors, due to how color space is organized
*/
let getRandomColor = () =>  {
    let r = Math.floor(Math.random() * 255) // Math.min(Math.floor(Math.random() * 256) / 256., 0.75)
    let g = Math.floor(Math.random() * 255) // Math.min(Math.floor(Math.random() * 256) / 256., 0.75)
    let b = Math.floor(Math.random() * 255) // Math.min(Math.floor(Math.random() * 256) / 256., 0.75)
    return [r, g, b, 0]
}

// FIXME: maybe use this, later:
//function rand(min, max) {
//    return parseInt(Math.random() * (max-min+1), 10) + min;
//}
//function getRandomColor() {
//    var h = rand(180, 250);
//    var s = rand(30, 100);
//    var l = rand(20, 70);
//    return 'hsl(' + h + ',' + s + '%,' + l + '%)';
//}
// input: h in [0,360] and s,v in [0,1] - output: r,g,b in [0,1]
// https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
//function hsl2rgb(h,s,l) 
//{
//  let a=s*Math.min(l,1-l);
//  let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);                 
//  return [f(0),f(8),f(4)];
//}   



class GPUTile
{
    constructor(gl)
    {
        this.gl = gl
        this.vertexCoordBuffer = null  // will be set by uploadPoints
        this.texture = null            // will be set by uploadTexture
        this.textureCoordBuffer = null
    }
    
    uploadPoints(points)
    {
        let gl = this.gl
        const [xmin, ymin, xmax, ymax] = points
//        console.log(`uploading ${xmin} ${ymin}, ${xmax} ${ymax}`)
        const [r, g, b, _] = getRandomColor()
//        console.log(` ${r} ${g} ${b}`)
        // buffer is an object with a reference to the memory location on the GPU

        this.vertexCoordBuffer = gl.createBuffer();
        // FIXME:
        // Not needed to upload colors here, remove them
        // Also, remove this from the buffer layout
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexCoordBuffer);
        const coords = new Float32Array([
            // x, y,    z, r, g, b
            xmin, ymax, 0, r, g, b,
            xmin, ymin, 0, r, g, b,
            xmax, ymin, 0, r, g, b,
            xmin, ymax, 0, r, g, b,
            xmax, ymin, 0, r, g, b,
            xmax, ymax, 0, r, g, b
        ])
        gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
//        console.log(coords)
    }

    /** init the texture as a white image of 1x1 pixel */
    initTexture() {
//        return
        let gl = this.gl
        this.textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0
        ]), gl.STATIC_DRAW);
        return // TMP
        
//        this.texture = gl.createTexture();
//        gl.bindTexture(gl.TEXTURE_2D, this.texture);
//        // Because images have to be download over the internet
//        // they might take a moment until they are ready.
//        // Until then we put a single pixel in the texture so we can
//        // use it immediately. When the image has finished downloading
//        // we'll update the texture with the contents of the image.
//        const level = 0;
//        const internalFormat = gl.RGBA;
//        const width = 1;
//        const height = 1;
//        const border = 0;
//        const srcFormat = gl.RGBA;
//        const srcType = gl.UNSIGNED_BYTE;
//        const pixel = new Uint8Array([255, 255, 255, 1]) //getRandomColor());  // white
//        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
//            width, height, border, srcFormat, srcType,
//            pixel);
//        this.textureCoordBuffer = gl.createBuffer();
//        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
//        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//            0.0, 0.0,
//            0.0, 1.0,
//            1.0, 1.0,
//            0.0, 0.0,
//            1.0, 1.0,
//            1.0, 0.0
//        ]), gl.STATIC_DRAW);
    }
    
    /** once we have an image download, replace the initial 1x1 white pixel */
    uploadTexture(bitmap)
    {
        // guard: somehow texture has been removed already, so bail out
//        if (this.texture === null) { return }
        let gl = this.gl
        this.texture = gl.createTexture();
        // no need to create new texture here, just replace the uploaded bitmap
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        // create mip maps
        if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }

    /** destroy the gpu resources that were allocated */
    destroy()
    {
        let gl = this.gl
        // clear buffers 
        let buffers = [this.vertexCoordBuffer, this.textureCoordBuffer]
        buffers.forEach(
            buffer => {
                if (buffer !== null) {
                    gl.deleteBuffer(buffer)
                    buffer = null
                }
            }
        )
        // clear textures
        let textures = [this.texture]
        textures.forEach(
            texture => {
                if (texture !== null) {
                    gl.deleteTexture(texture)
                    texture = null
                }
            }
        )
    }
}


class DrawProgram {
    constructor(gl, vertexShaderText, fragmentShaderText) {

        const vertexShader   = loadShader(gl, gl.VERTEX_SHADER,   vertexShaderText);
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

        console.error(this.shaderProgram)

        // FIXME:
        // when to call these detach/delete's? After succesful compilation?
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

    _specifyDataForShaderProgram(gl, shaderProgram, attributeName, itemSize, stride, offset) {
        const attribLocation = gl.getAttribLocation(shaderProgram, attributeName);
        // console.log(`${attributeName} => ${attribLocation}`)
        gl.enableVertexAttribArray(attribLocation);
        gl.vertexAttribPointer(
            attribLocation,     // * Attribute location
            itemSize,           // * Number of components per vertex attribute.
                                //   Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,           // * Type of elements
            false,              // * Is normalized?
            stride,             // * stride 
            offset              // * Offset from the beginning of 
        );
    }

    clearColor() {
        let gl = this.gl
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer
    }
    
    drawTile(matrix, tile)
    {
        // guard: if no data in the tile, we will skip rendering
        let triangleVertexPosBufr = tile.vertexCoordBuffer;
        if (triangleVertexPosBufr === null || tile.texture === null) {
//            console.warn('no data found for rendering')
            return;
        }
        // render
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
        //itemSize = 3: x, y, z;   
        this._specifyDataForShaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
        //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
//        this._specifyDataForShaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

        let M_location = gl.getUniformLocation(shaderProgram, 'M');
        gl.uniformMatrix4fv(M_location, false, matrix);

        let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
        gl.uniform1f(opacity_location, 1.0);

        gl.bindBuffer(gl.ARRAY_BUFFER, tile.textureCoordBuffer)
        this._specifyDataForShaderProgram(gl, shaderProgram, 'aTextureCoord', 2, 0, 0)

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.texture);

        const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
        gl.uniform1i(uSampler, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

//        gl.disable(gl.BLEND);
//        gl.enable(gl.DEPTH_TEST);
//        gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!

        gl.disable(gl.CULL_FACE)
        gl.disable(gl.DEPTH_TEST)
//        gl.disable(gl.BLEND)

        // mode  -- A GLenum specifying the type primitive to render.
        // first -- A GLint specifying the starting index in the array of vector points. 
        // count -- A GLsizei specifying the number of indices to be rendered. 

        // 2 triangles per tile -> 6 vertices
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

}

function center2d(box2d) {
    // 2D center of bottom of box
    let xmin = box2d[0]
    let ymin = box2d[1]
    let xmax = box2d[2]
    let ymax = box2d[3]
    return [xmin + 0.5 * (xmax - xmin),
            ymin + 0.5 * (ymax - ymin)]
}

function distance2d(target, against) {
    // find projected distance between 2 box3d objects
    let ctr_t = center2d(target)
    let ctr_a = center2d(against)
    let dx2 = Math.pow(ctr_a[0] - ctr_t[0], 2)
    let dy2 = Math.pow(ctr_a[1] - ctr_t[1], 2)
    return dx2+dy2
}


export class WMTSRenderer 
{
    constructor(gl, msgBus)
    {
        this.layer = new WMTSLayer()
        this.gl = gl
        this.msgBus = msgBus
        
        this.program = new DrawProgram(this.gl,

//`
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
//`,
//`
//precision highp float;

//varying vec4 fragColor;
//void main()
//{
//    gl_FragColor = vec4(fragColor);
//}
//`
`
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
,
`
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
        )
        this.activeTiles = new Map()
        this.activeDownloads = new Map()
    }

    sortRadially(tilesInView, aabb) {
        // sort the tiles in view radially
        // decorate-sort-undecorate based on squared distance of
        // 2D center of viewport <<=>> 2D center of tile
        tilesInView = tilesInView.map(
            elem => {
                return [distance2d(elem.bounds(), aabb), elem]
            }
        )
        tilesInView.sort(
            (a, b) => {
                if (a[0] < b[0]) { return -1 }
                else if (a[0] > b[0]) { return 1 }
                else { return 0 }
            }
        )
        tilesInView = tilesInView.map(
            elem => { return elem[1] }
        )
        return tilesInView
    }

    update(aabb, scaleDenominator, matrix) {
        let tilesInViewCurrent = this.layer.tilesInView(aabb, scaleDenominator)
        tilesInViewCurrent = this.sortRadially(tilesInViewCurrent, aabb)

        let tilesInViewAbove2 = this.layer.tilesInView(aabb, 2 * scaleDenominator)
        tilesInViewAbove2 = this.sortRadially(tilesInViewAbove2, aabb)

        let tilesInViewAbove4 = this.layer.tilesInView(aabb, 4 * scaleDenominator)
        tilesInViewAbove4 = this.sortRadially(tilesInViewAbove4, aabb)

        let tilesInView = tilesInViewAbove4
//        let tilesInView = tilesInViewAbove4.concat(tilesInViewAbove2).concat(tilesInViewCurrent)

//        let tilesInView = tilesInViewAbove2.concat(tilesInViewCurrent)

        let gpuTiles = []
        tilesInView.forEach((tile) => {
            let tileId = tile.getId()
            if (this.activeTiles.has(tileId)) {
//                console.log(tileId)
                gpuTiles.push(this.activeTiles.get(tileId))
            } else {
                let gpuTile = new GPUTile(this.gl)
                // FIXME: should we upload grid / integer coordinates to GPU
                //        and transform on GPU towards final position based on transform?
                //        maybe that does give less ugly seams between tiles (tiny white sliver)
                gpuTile.uploadPoints(tile.bounds()) 
                gpuTile.initTexture()

                // if we would abort a running request
                // how do we make sure to re-request this info?
                // * easiest:
                //    should we also remove it from the activeTiles map
                //    and destroy the resources from the GPU?
                // * harder:
                //    keep info on GPU, but re-request texture later?

                let abortController = new AbortController();
                const signal = abortController.signal;
                // book keeping
                this.activeTiles.set(tileId, gpuTile)
                this.activeDownloads.set(tileId, abortController);
                // fire request for tile retrieval
                fetch(tile.getRequestUrl(), { mode: 'cors', signal})
                    .then((response) => {
                        // FIXME:
                        // try again when we have a failing download?
                        // how often? with decay?
                        if (!response.ok) {
                            // throw response;
                            console.warn(response)
                            let tileToDestroy = this.activeTiles.get(tileId)
                            tileToDestroy.destroy()
                            this.activeTiles.delete(tileId)
                        }
                        return response.blob()
                    })
                    .then((blob) => {
                        return createImageBitmap(blob);
                    }).then((bitmap) => {
                        gpuTile.uploadTexture(bitmap)
                        this.activeDownloads.delete(tileId)
                        this.msgBus.publish('data.tile.loaded',
                                            'tile.loaded.texture')
                    }).catch((e) => {
                        this.activeDownloads.delete(tileId)
                        // console.error(e);
                    });
            }
        })

        let tileIdsOnScreen = new Set()
        tilesInView.map((tile) => { 
            let tileId = tile.getId()
            tileIdsOnScreen.add(tileId)
        })
//        console.log(tileIdsOnScreen)
        let purge = false
        
            // cancel unneeded tiles when we have a rather huge backlog
            // note, we express this against how many tiles are needed on screen
//            if (this.activeDownloads.size > (2 * tileIdsOnScreen.size))
//            {
                console.log(`cancelling as activeDownloads size has grown to ${this.activeDownloads.size} > ${(2 * tileIdsOnScreen.size)}`)
                let list = this.activeDownloads.entries()
                for (let i = 0; i < this.activeDownloads.size; i++) // for .. of  does not work with rollup
                {
                    let [tileId, abortController] = list.next().value
                    if (!tileIdsOnScreen.has(tileId)) {
                        setTimeout(()=> {
                            // console.log(`cancelling download of ${tileId}`)
                            abortController.abort();
                            // also remove the tile from the GPU and from the activeTiles list
                            let gpuTileToCancel = this.activeTiles.get(tileId)
                            gpuTileToCancel.destroy()
                            this.activeTiles.delete(tileId)
                            // activeDownloads.delete(tileId) is called in catch() of fetch
                        })
                    }
                }
//            }

        if (purge === true) {
            // purge all tiles not on screen if we get many activeTiles
            // this also cancels downloads for tiles not currently on screen
            const factor = 8
            if (this.activeTiles.size > (factor * tileIdsOnScreen.size)) {
                console.log(`purging old tiles ${this.activeTiles.size} > ${(factor * tileIdsOnScreen.size)}`)
                let list = this.activeTiles.entries()
                for (let i = 0; i < this.activeTiles.size; i++) // for .. of  does not work with rollup
                {
                    let [tileId, gpuTileToCancel] = list.next().value
                    if (!tileIdsOnScreen.has(tileId)) {
                        if (this.activeDownloads.has(tileId))
                        {
                            let abortController = this.activeDownloads.get(tileId)
                            abortController.abort();
                        }
                        gpuTileToCancel.destroy()
                        this.activeTiles.delete(tileId)
                    }
                }
            }
        }

//        for (let [tileId, abortController] of this.activeDownloads.entries() )
//        {
//            console.log(`tile with controller: ${tileId}`)
//            if (!tileIdsNeeded.has(tileId)) {
//                tileIdsToRemove.push(tileId)
//                console.log(`We should cancel -- ${x} => ${y}`)
//            }
//        }
//        console.log(tileIdsToRemove)

        // draw all tiles we see
        this.program.clearColor()
        gpuTiles.forEach((gpuTile) => {
            this.program.drawTile(matrix, gpuTile)
        })
    }
}
// how to continue?

// [x] step 1
// upload tile bounds (i.e. correct triangles)
// upload (random) tile colour attribute to GPU for a tile
// draw all tiles by executing a draw program on the tile

// [x] step 2
// upload texture to the GPU and use it while drawing

// [x] step 3
// add download from the tile of PDOK to the process and
// have the GPU tile also have access to the image as texture
// [x] register the abortController signal also for each download

// [x] step 4
// remove tiles that have been uploaded to the GPU
// but are not in view any more

// [x] step 5
// cancel downloads that have a open request for a tile 
// but are not in view any more

// [ ] step 6
// see if we can use the Evictor pattern also used for the large data set
// and defer unloading (e.g. based on distance to center / scale)

// [x] step 7 
// robust to download errors, e.g. 500 / 404 on server side

// FIX issues
// [ ] get correct tilesInView -- row x col -- missing tiles / not outside tileMatrix

// [ ] get and draw 2 tileMatrix-es for tilesOnScreen --> draw smaller scale first, on top larger scale - 
//     go up 1 level and get overlapping tiles there, draw and fetch this higher level first, then on top draw current level
//      -- we can also increase the viewport size --> zooming / panning would pull in extra info, already ...
//         however, this pattern of pulling in extra tiles could also be wasteful (e.g. moving in opposite direction)

// [ ] render transparent PNGs as transparent? - ahn2?

// [ ] make it possible to add multiple layers on top of each other (lufo + naming) and have layer control widget

// [x] recover from failing tile downloads?
// [ ] handle 404 / 503 when tiles fail differently



//        console.log(currentTileSet)

//        for ( let [ tileId, _ ] of this.downloadQueue.entries() ) {
//            if ( ! currentTileSet.has( tileId ) ) {
//                // not needed any more, cancel the download
//            }
//        }


// Rendering representation of a Tile:

//        this.vertexCoordBuffer = null;  // the coordinates in the real world
//        this.textureImage2D = null;     // the texture image
//        this.textureCoordBuffer = null; // the coordinates that place the textured image



/*


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
*/



////getRandomColor() {
////    let r = Math.floor(Math.random() * 256)
////    let g = Math.floor(Math.random() * 256)
////    let b = Math.floor(Math.random() * 256)
////    return [r, g, b]
////}

//        // we can upload the world coordinates as triangle strip(?) or as 2 independent triangles
//        // see: https://obviam.net/posts/2011/04.opengles-android-texture-mapping/
//        // [[216931.52, 579981.76, 0], [216931.52, 573100.48, 0], [223812.8, 573100.48, 0], [216931.52, 579981.76, 0], [223812.8, 573100.48, 0], [223812.8, 579981.76, 0]]
//        //        2----4
//        //        |\   |
//        //        | \  |
//        //        |  \ |
//        //        |   \|
//        //        1----3
//        // [2-1-3, 2-3-4]
//    }

//    uploadPlaceHolderTexture()
//    {
//        // Call in the constructor?
//        // setup texture as placeholder for texture to be retrieved later
//        this.textureImage2D = gl.createTexture();
//        gl.bindTexture(gl.TEXTURE_2D, this.textureImage2D);
//        // Because images have to be download over the internet
//        // they might take a moment until they are ready.
//        // Until then put a single pixel in the texture so we can
//        // use it immediately. When the image has finished downloading
//        // we'll update the texture with the contents of the image.
//        const level = 0;
//        const internalFormat = gl.RGBA;
//        const width = 1;
//        const height = 1;
//        const border = 0;
//        const srcFormat = gl.RGBA;
//        const srcType = gl.UNSIGNED_BYTE;
//        const pixel = new Uint8Array([255, 255, 255, 0]);  // white
//        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
//            width, height, border, srcFormat, srcType,
//            pixel);

//        this.textureCoordBuffer = gl.createBuffer();
//        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
//        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//            0.0, 0.0,
//            0.0, 1.0,
//            1.0, 1.0,
//            0.0, 0.0,
//            1.0, 1.0,
//            1.0, 0.0
//        ]), gl.STATIC_DRAW);
//    }

//    uploadTextureImage(blob)
//    {
//        // Giving options does not work for Firefox (do we need to give all option fields?)
//        let bitmap = createImageBitmap(blob);
//        this.textureImage2D = gl.createTexture(); // FIXME: do we need to make a new texture?
//        gl.bindTexture(gl.TEXTURE_2D, this.textureImage2D);
//        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
//        if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) {
//            gl.generateMipmap(gl.TEXTURE_2D);
//        } else {
//            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//        }
//        // this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
//    }
//    
//    uploadVertexCoordBuffer()
//    {
//        let vertices = [];  // FIXME: we should have vertices here
//                            // decide whether we do world coordinates, or row-col coordinates
//        // create-bind-upload
//        this.vertexCoordBuffer = gl.createBuffer();  //buffer is an object with a reference to the memory location on the GPU
//        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexCoordBuffer);
//        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
//        // FIXMe: should we remember number of triangles for this buffer
//        // this.buffer.numItems = (mesh.length) / 3;
//        // do not keep the floatarray object alive
//        // now we have uploaded the triangles to the GPU
//        // FIXME: is this needed?
//        // this.buffer.buffer = null
//    }

//    load(layer)
//    {
//        let controller = new AbortController()
//        let signal = controller.signal

//        fetch( tile.getRequestURL(), { signal } ).then( function ( res ) {
//            layer.downloadQueue.delete( tileId );
//            return res.arrayBuffer();

//        } ).then( function ( buffer ) {
//            uploadTextureImage()
//        }
//    }
//}

// export default WMTSRenderer

