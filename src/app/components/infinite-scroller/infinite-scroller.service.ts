import { Injectable } from '@angular/core';
import { MESSAGES, NUM_AVATARS, NUM_IMAGES } from './messages'

var INIT_TIME = new Date().getTime();

/**
 * Constructs a random item with a given id.
 * @param {number} id An identifier for the item.
 * @return {Object} A randomly generated item.
 */
function getItem(id) { debugger
    function pickRandom(a) {
        return a[Math.floor(Math.random() * a.length)];
    }

    return new Promise(function (resolve) {
        var item = {
            id: id,
            avatar: Math.floor(Math.random() * NUM_AVATARS),
            self: Math.random() < 0.1,
            image: Math.random() < 1.0 / 20 ? Math.floor(Math.random() * NUM_IMAGES) : '',
            time: new Date(Math.floor(INIT_TIME + id * 20 * 1000 + Math.random() * 20 * 1000)),
            message: pickRandom(MESSAGES)
        };
        //if (item.image === '') {
            resolve(item);
        //}
        // var image = new Image();
        // image.src = 'images/image' + item.image + '.jpg';
        // image.addEventListener('load', function () {
        //     item.image = image;
        //     resolve(item);
        // });
        // image.addEventListener('error', function () {
        //     item.image = '';
        //     resolve(item);
        // });
    });
}

@Injectable()
export class InfiniteScrollerService {
    // Collect template nodes to be cloned when needed.
    tombstone = document.querySelector("#templates > .chat-item.tombstone");
    messageTemplate = document.querySelector("#templates > .chat-item:not(.tombstone)");
    nextItem = 0;

    constructor() { }

    fetch(count) { debugger
        // Fetch at least 30 or count more objects for display.
        count = Math.max(30, count);
        return new Promise(function (resolve, reject) {
            // Assume 50 ms per item.
            setTimeout(function () {
                var items = [];
                for (var i = 0; i < Math.abs(count); i++) {
                    items[i] = getItem(this.nextItem_++);
                }
                resolve(Promise.all(items));
            }.bind(this), 1000 /* Simulated 1 second round trip time */);
        }.bind(this));
    }

    createTombstone() {
        return <HTMLDivElement>this.tombstone.cloneNode(true);
    }

    render(item, div) {
        debugger
        // TODO: Different style?
        div = div || this.messageTemplate.cloneNode(true);
        div.dataset.id = item.id;
        // div.querySelector('.avatar').src = 'images/avatar' + item.avatar + '.jpg';
        div.querySelector('.bubble p').textContent = item.message;
        div.querySelector('.bubble .posted-date').textContent = item.time.toString();

        // var img = div.querySelector('.bubble img');
        // if(item.image !== '') {
        //     img.classList.remove('invisible');
        //     img.src = item.image.src;
        //     img.width = item.image.width;
        //     img.height = item.image.height;
        // } else {
        //     img.src = '';
        //     img.classList.add('invisible');
        // }

        if (item.self) {
            div.classList.add('from-me');
        } else {
            div.classList.remove('from-me');
        }
        return div;
    }

}
