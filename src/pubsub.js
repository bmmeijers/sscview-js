// from https://github.com/kelektiv/node-uuid
// mit license

// Lookup Table
//let byteToHex = [];

//for (let i = 0; i < 256; ++i) {
//    byteToHex[i] = (i + 0x100).toString(16).substr(1);
//}

//function bytesToUuid(buf, offset) {
//    let i = offset || 0;
//    let bth = byteToHex;
//    // join used to fix memory issue caused by concatenation: 
//    // https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
//    return ([bth[buf[i++]], bth[buf[i++]],
//    bth[buf[i++]], bth[buf[i++]], '-',
//    bth[buf[i++]], bth[buf[i++]], '-',
//    bth[buf[i++]], bth[buf[i++]], '-',
//    bth[buf[i++]], bth[buf[i++]], '-',
//    bth[buf[i++]], bth[buf[i++]],
//    bth[buf[i++]], bth[buf[i++]],
//    bth[buf[i++]], bth[buf[i++]]]).join('');
//}

//function mathRNG() {
//    let rnds = new Array(16);
//    for (let i = 0, r; i < 16; i++) {
//        if ((i & 0x03) === 0) {
//            r = Math.random() * 0x100000000;
//        }
//        rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
//    }
//    return rnds;
//}

function getUuid() {
//    let x = mathRNG();
//    return bytesToUuid(x);
    return Math.round(Math.random() * 1e18).toString(36).substring(0, 10)
}
// end: from https://github.com/kelektiv/node-uuid


class MessageBus {
    constructor() {
        this._topics = {}; // {topic: [subscriberFn, ...], ...}
    }

    publish(topic, message, sender) {
        // console.log('publish invoked ' + topic + ' ' + sender + ' ' + message);
        if (sender === null) {
            sender = 0
        }
        let subscribers = this._topics[topic];
        if (!subscribers) {
            return false;
        }
        subscribers.forEach(subscriberFn => {
            setTimeout(subscriberFn(topic, message, sender), 0)
        });

        return true;
    }

    subscribe(topic, func) {
        // if the topic list does not exist yet, make one
        if (!this._topics[topic]) {
            this._topics[topic] = [];
        }
        // add the topic to the list
        this._topics[topic].push(func)
        // return reference to arrow function that removes subscription, once invoked
        return {
            remove: (() => {
                // console.log('Invoking remove')
                // console.log(this._topics[topic])
                // console.log('old length ' + this._topics[topic].length)
                let index = this._topics[topic].indexOf(func)
                // console.log(index)
                this._topics[topic].splice(index, 1)
                // console.log('new length ' + this._topics[topic].length)
                if (this._topics[topic].length === 0) {
                    delete this._topics[topic]
                }
            })
        }
    }

}

const instance = new MessageBus();
Object.freeze(instance);

//all the different MessageBusConnectors share the same MessageBus (same topics)
export class MessageBusConnector {

    constructor() {
        this.id = getUuid()
    }

    publish(topic, message) {
        return instance.publish(topic, message, this.id)
    }

    subscribe(topic, func) {
        return instance.subscribe(topic, func)
    }
}

export default MessageBusConnector;
