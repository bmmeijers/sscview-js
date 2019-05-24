"use strict";

class Rectangle {
    constructor(xmin, ymin, xmax, ymax)
    {
        this.xmin = xmin
        this.ymin = ymin
        this.xmax = xmax
        this.ymax = ymax
    }

    width()
    {
        return this.xmax - this.xmin
    }

    height()
    {
        return this.ymax - this.ymin
    }

    toString()
    {
        return `new Rectangle(${this.xmin}, ${this.ymin}, ${this.xmax}, ${this.ymax})`
    }

    area()
    {
        return this.width() * this.height()
    }

    center()
    {
        return [this.xmin + this.width() * 0.5,
                this.ymin + this.height() * 0.5]
    }
}

export default Rectangle
