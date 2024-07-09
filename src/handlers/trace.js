/**
* Records the trace of the mouse
*/

import { now as _now } from '../animate';

class Trace
{
    constructor(val)
    {
        this._trace = []
        this.push(val);
    }

    shift(cutoff)  // value in msec
    {
        // remove old positions older than `cutoff` value (in milli seconds)
        const now = _now();
        while ((this._trace.length > 0) && (now - this._trace[0][0] > cutoff))
        {
            // remove at beginning of array
            this._trace.shift();
        }
    }

    push(val)
    {
        const now = _now();
        this._trace.push([now, val]);
    }
    
    average()
    {
        let sum = 0
        this._trace.forEach( (record) => {
            // let time = record[0]
            let val = record[1]
            sum += val/this._trace.length
        })
        return sum
    }

    first()
    {
        return this._trace[0]
    }

    last()
    {
        return this._trace[this._trace.length - 1]
    }

    lastbutone()
    {
        return this._trace[this._trace.length - 2]
    }

    length()
    {
        return this._trace.length
    }
}

export default Trace
