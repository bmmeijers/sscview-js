'use strict';

import test from 'tape';
import { WMTSLayer } from '../src/wmts';

test('WMTSLayer will have 14 tileMatrixSet objects', function(t) {
    let layer = new WMTSLayer();
    t.equal(layer.tileMatrixSet.length, 14)
    t.end();
});

test('WMTSLayer matrixSize (number of tiles) for index 0 and 13 correct', function(t) {
    let layer = new WMTSLayer();
    t.deepEqual(layer.tileMatrixSet[0].matrixSize, [1, 1])
    t.deepEqual(layer.tileMatrixSet[13].matrixSize, [8192, 8192])
    t.end();
});

test('Extent with overlappingTiles gives correct tiles', (t) => {
    const layer = new WMTSLayer()
    const tms = layer.tileMatrixSet[2]
    // tms.bounds() == [ -285401.92, 22598.08, 595401.92, 903401.92 ]

    // only expect top half
    let aabb = [ -285401, 465000, 595401, 903401 ]

    let result = [ [ 0, 1 ], [ 0, 0 ], [ 1, 1 ], [ 1, 0 ], [ 2, 1 ], [ 2, 0 ], [ 3, 1 ], [ 3, 0 ] ]
    tms.overlappingTiles(aabb).map((tile, idx) => {
        t.equal(tile.col, result[idx][0])
        t.equal(tile.row, result[idx][1])
    })

    // only expect bottom half
    aabb = [ -285401, 22599, 595401, 463000 ]
    result = [ [ 0, 3 ], [ 0, 2 ], [ 1, 3 ], [ 1, 2 ], [ 2, 3 ], [ 2, 2 ], [ 3, 3 ], [ 3, 2 ] ]
    tms.overlappingTiles(aabb).map((tile, idx) => {
        t.equal(tile.col, result[idx][0])
        t.equal(tile.row, result[idx][1])
    })

    // if we ask outside of extent, we should not get row/cols that fall
    // outside of matrix size, but just all tiles of the tileMatrix
    aabb = [ -111385401.92, 0, 695401.92, 1111903401.92 ]
    t.equal(tms.overlappingTiles(aabb).length, tms.matrixSize[0]*tms.matrixSize[1])
    t.end()
});

test('Tile bounds - min smaller than max', (t) => {
    let layer = new WMTSLayer();
    let tileMatrixSet = layer.tileMatrixSet[2]
    for (let c = 0; c < tileMatrixSet.matrixSize[0]; c++) {
        for (let r = 0; r < tileMatrixSet.matrixSize[1]; r++) {
            let tile = tileMatrixSet.getTile(c, r)
            let aabb = tile.bounds()
            // xmin should be smaller than xmax of tile
            t.assert(aabb[0] < aabb[2])
            // ymin should be smaller than ymax of tile
            t.assert(aabb[1] < aabb[3])
        }
    }

    t.end();
});

test('Tile bounds - at level 0 exact bounds', (t) => {
    let layer = new WMTSLayer();
    let tileMatrixSet = layer.tileMatrixSet[0]
    let tile = tileMatrixSet.getTile(0, 0)
    let aabb = tile.bounds()
    let extent = [
        tileMatrixSet.topLeftCorner[0],
        tileMatrixSet.topLeftCorner[1] - tileMatrixSet.tileSpan[1],
        tileMatrixSet.topLeftCorner[0] + tileMatrixSet.tileSpan[0],
        tileMatrixSet.topLeftCorner[1]
    ]
    t.deepEqual(extent, aabb)

    t.end();
});

test('WMTSLayer.snapToScale() gives correct tileMatrix', (t) => {
    const layer = new WMTSLayer();

    // halfway at 72k and 96k
    // t.deepEqual(actual, expected, 'is equal (use node's deepEqual)')
    t.deepEqual(layer.snapToScale(71999), layer.tileMatrixSet[8])
    t.deepEqual(layer.snapToScale(72000), layer.tileMatrixSet[7])
    t.deepEqual(layer.snapToScale(72001), layer.tileMatrixSet[7])

    // around explicit scale
    t.deepEqual(layer.snapToScale(95999), layer.tileMatrixSet[7])
    t.deepEqual(layer.snapToScale(96000), layer.tileMatrixSet[7])
    t.deepEqual(layer.snapToScale(96001), layer.tileMatrixSet[7])

    // and halfway at other end
    t.deepEqual(layer.snapToScale(143999), layer.tileMatrixSet[7])
    t.deepEqual(layer.snapToScale(144000), layer.tileMatrixSet[6])
    t.deepEqual(layer.snapToScale(144001), layer.tileMatrixSet[6])

    // if we over-zoom (1:10),
    // we should snap to the last tileMatrix in the set
    t.deepEqual(layer.snapToScale(10),
                layer.tileMatrixSet[layer.tileMatrixSet.length-1])

    // if we are zoomed out much, we expect the top
    t.deepEqual(layer.snapToScale(2*12288000),
                layer.tileMatrixSet[0])
    t.end()
});

test('tilesInView produces a set of tiles', (t) => {
    const layer = new WMTSLayer();
    let tiles = layer.tilesInView([ -285401, 465000, 595401, 465500 ], 72000)
    t.equal(tiles.length, 128)
    t.end()
});

test('Each tile object starts with correct URL for retrieval', (t) => {
    const layer = new WMTSLayer();
    layer.tilesInView([ -285401, 465000, 595401, 465500 ], 25000).forEach(
        (tile) => {
            t.assert(tile.getRequestURL().startsWith('https://geodata.nationaalgeoregister.nl/tiles/service/wmts?service=WMTS&request=GetTile&version=1.0.0&format=image/png&tileMatrixSet=EPSG:28992&layer=brtachtergrondkaart&style=default'))
        }
    );
    t.end()
});

test('A tile gives a correct ID for getID', (t) => {
    const layer = new WMTSLayer();
    let tiles = layer.tilesInView([ -285401, 465000, 595401, 465500 ], 25000)
    let tile = tiles[0]
    t.equal(tile.getId(), 'brtachtergrondkaart-9-0-254')
    t.end()
});
