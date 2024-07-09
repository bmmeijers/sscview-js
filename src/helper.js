export class WorkerHelper {
    constructor() {
        this.tasks = {}
        this.worker = new Worker('worker.js')
        this.worker.onmessage = (evt) => { this.receive(evt) } //evt: {id: id, msg: arrays}, arrays; see worker.js
    }

    send(url, callback) //e.g., callback: the function of makeBuffers in TileContent.load_ssc_tile(url, gl)
    {
        // use a random id
        const id = Math.round((Math.random() * 1e18)).toString(36).substring(0, 10)
        this.tasks[id] = callback
        this.worker.postMessage({ id: id, msg: url }) //parse the data of the obj file specified by the url
    }

    receive(evt) {
        const id = evt.data.id;
        const msg = evt.data.msg // e.g., arrays = parse_obj(data_text)
        this.tasks[id](msg) // execute the callback that was registered while sending
        delete this.tasks[id]
    }
}
