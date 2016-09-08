import {
    Directive, OnInit, ElementRef, TemplateRef, ViewContainerRef, Input, OnChanges, ChangeDetectorRef, IterableDiffer,
    IterableDiffers, EmbeddedViewRef, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { Observable } from 'rxjs/Rx';

// Number of items to instantiate beyond current view in the scroll direction.
const RUNWAY_ITEMS = 50;

// Number of items to instantiate beyond current view in the opposite direction.
const RUNWAY_ITEMS_OPPOSITE = 10;

// The number of pixels of additional length to allow scrolling to.
const SCROLL_RUNWAY = 2000;

// The animation interval (in ms) for fading in content from tombstones.
const ANIMATION_DURATION_MS = 200;

class Anchor {
    index: number = 0;
    offset: number = 0;
}

@Directive({
    selector: '[infiniteScroller]'
})
export class InfiniteScrollerDirective implements OnInit {
    @Input('infiniteScrollerOf') list: any[];
    anchorItem: Anchor = new Anchor();
    firstAttachedItem: number = 0;
    lastAttachedItem: number = 0;
    anchorScrollTop: number = 0;
    tombstoneSize: number = 0;
    tombstoneWidth: number = 0;
    tombstones: any[] = [];
    scroller: HTMLElement;
    items: any[] = [];
    loadedItems: number = 0;
    requestInProgress: boolean = false;

    // Create an element to force the scroller to allow scrolling to a certain
    // point.
    scrollRunway: HTMLElement = document.createElement('div');
    scrollRunwayEnd = 0;

    constructor(
        elemRef: ElementRef,
        private tmpRef: TemplateRef<any>,
        private viewRef: ViewContainerRef
    ) {
        this.scroller = elemRef.nativeElement.parentNode;
    }

   ngOnInit() {
        Observable.fromEvent(this.scroller, 'scroll').subscribe(() => {

        });
       Observable.fromEvent(window, 'resize').subscribe(() => {

       });
       // Internet explorer seems to require some text in this div in order to
       // ensure that it can be scrolled to.
       this.scrollRunway.textContent = ' ';
       this.scrollRunway.style.position = 'absolute';
       this.scrollRunway.style.height = '1px';
       this.scrollRunway.style.width = '1px';
       this.scrollRunway.style.transition = 'transform 0.2s';
       this.scroller.appendChild(this.scrollRunway);
       // Init
       this.onResize();
   }

    /**
     * Called when the browser window resizes to adapt to new scroller bounds and
     * layout sizes of items within the scroller.
     */
    onResize() {
        // TODO: If we already have tombstones attached to the document, it would
        // probably be more efficient to use one of them rather than create a new
        // one to measure.
        let view = this.viewRef.createEmbeddedView(this.tmpRef);
        let tombstone = view.rootNodes[0];
        tombstone.style.position = 'absolute';
        tombstone.classList.remove('invisible');
        this.tombstoneSize = tombstone.offsetHeight;
        this.tombstoneWidth = tombstone.offsetWidth;
        view.destroy();

        // Reset the cached size of items in the scroller as they may no longer be
        // correct after the item content undergoes layout.
        for (var i = 0; i < this.items.length; i++) {
            this.items[i].height = this.items[i].width = 0;
        }
        this.onScroll();
    }

    /**
     * Called when the scroller scrolls. This determines the newly anchored item
     * and offset and then updates the visible elements, requesting more items
     * from the source if we've scrolled past the end of the currently available
     * content.
     */
    onScroll() {
        let delta = this.scroller.scrollTop - this.anchorScrollTop;
        // Special case, if we get to very top, always scroll to top.
        if (this.scroller.scrollTop == 0) {
            this.anchorItem = new Anchor();
        } else {
            this.anchorItem = this.calculateAnchoredItem(this.anchorItem, delta);
        }
        this.anchorScrollTop = this.scroller.scrollTop;
        var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, this.scroller.offsetHeight);
        if (delta < 0)
            this.fill(this.anchorItem.index - RUNWAY_ITEMS, lastScreenItem.index + RUNWAY_ITEMS_OPPOSITE);
        else
            this.fill(this.anchorItem.index - RUNWAY_ITEMS_OPPOSITE, lastScreenItem.index + RUNWAY_ITEMS);
    }

    /**
     * Calculates the item that should be anchored after scrolling by delta from
     * the initial anchored item.
     * @param {{index: number, offset: number}} initialAnchor The initial position
     *     to scroll from before calculating the new anchor position.
     * @param {number} delta The offset from the initial item to scroll by.
     * @return {{index: number, offset: number}} Returns the new item and offset
     *     scroll should be anchored to.
     */
    calculateAnchoredItem(initialAnchor: Anchor, delta: number): Anchor {
        if (delta == 0)
            return initialAnchor;
        delta += initialAnchor.offset;
        var i = initialAnchor.index;
        var tombstones = 0;
        if (delta < 0) {
            while (delta < 0 && i > 0 && this.items[i - 1].height) {
                delta += this.items[i - 1].height;
                i--;
            }
            tombstones = Math.max(-i, Math.ceil(Math.min(delta, 0) / this.tombstoneSize));
        } else {
            while (delta > 0 && i < this.items.length && this.items[i].height && this.items[i].height < delta) {
                delta -= this.items[i].height;
                i++;
            }
            if (i >= this.items.length || !this.items[i].height)
                tombstones = Math.floor(Math.max(delta, 0) / this.tombstoneSize);
        }
        i += tombstones;
        delta -= tombstones * this.tombstoneSize;
        return {
            index: i,
            offset: delta,
        };
    }

    /**
     * Sets the range of items which should be attached and attaches those items.
     * @param {number} start The first item which should be attached.
     * @param {number} end One past the last item which should be attached.
     */
    fill(start: number, end: number) {
        this.firstAttachedItem = Math.max(0, start);
        this.lastAttachedItem = end;
        this.attachContent();
    }

    /**
     * Attaches content to the scroller and updates the scroll position if
     * necessary.
     */
    attachContent() {
        // Collect nodes which will no longer be rendered for reuse.
        // TODO: Limit this based on the change in visible items rather than looping
        // over all items.
        var i;
        var unusedNodes = [];
        for (i = 0; i < this.items.length; i++) {
            // Skip the items which should be visible.
            if (i == this.firstAttachedItem) {
                i = this.lastAttachedItem - 1;
                continue;
            }
            if (this.items[i].node) {
                if (this.items[i].node.classList.contains('tombstone')) {
                    this.tombstones.push(this.items[i].node);
                    this.tombstones[this.tombstones.length - 1].classList.add('invisible');
                } else {
                    unusedNodes.push(this.items[i].node);
                }
            }
            this.items[i].node = null;
        }

        var tombstoneAnimations = {};
        // Create DOM nodes.
        for (i = this.firstAttachedItem; i < this.lastAttachedItem; i++) {
            while (this.items.length <= i)
                this.addItem();
            if (this.items[i].node) {
                // if it's a tombstone but we have data, replace it.
                if (this.items[i].node.classList.contains('tombstone') &&
                    this.items[i].data) {
                    // TODO: Probably best to move items on top of tombstones and fade them in instead.
                    if (ANIMATION_DURATION_MS) {
                        this.items[i].node.style.zIndex = 1;
                        tombstoneAnimations[i] = [this.items[i].node, this.items[i].top - this.anchorScrollTop];
                    } else {
                        this.items[i].node.classList.add('invisible');
                        this.tombstones.push(this.items[i].node);
                    }
                    this.items[i].node = null;
                } else {
                    continue;
                }
            }
            var node = this.items[i].data ? this.source.render(this.items[i].data, unusedNodes.pop()) : this.getTombstone();
            // Maybe don't do this if it's already attached?
            node.style.position = 'absolute';
            this.items[i].top = -1;
            this.scroller.appendChild(node);
            this.items[i].node = node;
        }

        // Remove all unused nodes
        while (unusedNodes.length) {
            this.scroller.removeChild(unusedNodes.pop());
        }

        // Get the height of all nodes which haven't been measured yet.
        for (i = this.firstAttachedItem; i < this.lastAttachedItem; i++) {
            // Only cache the height if we have the real contents, not a placeholder.
            if (this.items[i].data && !this.items[i].height) {
                this.items[i].height = this.items[i].node.offsetHeight;
                this.items[i].width = this.items[i].node.offsetWidth;
            }
        }

        // Fix scroll position in case we have realized the heights of elements
        // that we didn't used to know.
        // TODO: We should only need to do this when a height of an item becomes
        // known above.
        this.anchorScrollTop = 0;
        for (i = 0; i < this.anchorItem.index; i++) {
            this.anchorScrollTop += this.items[i].height || this.tombstoneSize;
        }
        this.anchorScrollTop += this.anchorItem.offset;

        // Position all nodes.
        var curPos = this.anchorScrollTop - this.anchorItem.offset;
        i = this.anchorItem.index;
        while (i > this.firstAttachedItem) {
            curPos -= this.items[i - 1].height || this.tombstoneSize;
            i--;
        }
        while (i < this.firstAttachedItem) {
            curPos += this.items[i].height || this.tombstoneSize;
            i++;
        }
        // Set up initial positions for animations.
        for (var i in tombstoneAnimations) {
            var anim = tombstoneAnimations[i];
            this.items[i].node.style.transform = 'translateY(' + (this.anchorScrollTop + anim[1]) + 'px) scale(' + (this.tombstoneWidth / this.items[i].width) + ', ' + (this.tombstoneSize / this.items[i].height) + ')';
            // Call offsetTop on the nodes to be animated to force them to apply current transforms.
            this.items[i].node.offsetTop;
            anim[0].offsetTop;
            this.items[i].node.style.transition = 'transform ' + ANIMATION_DURATION_MS + 'ms';
        }
        for (i = this.firstAttachedItem; i < this.lastAttachedItem; i++) {
            var anim = tombstoneAnimations[i];
            if (anim) {
                anim[0].style.transition = 'transform ' + ANIMATION_DURATION_MS + 'ms, opacity ' + ANIMATION_DURATION_MS + 'ms';
                anim[0].style.transform = 'translateY(' + curPos + 'px) scale(' + (this.items[i].width / this.tombstoneWidth) + ', ' + (this.items[i].height / this.tombstoneSize) + ')';
                anim[0].style.opacity = 0;
            }
            if (curPos != this.items[i].top) {
                if (!anim)
                    this.items[i].node.style.transition = '';
                this.items[i].node.style.transform = 'translateY(' + curPos + 'px)';
            }
            this.items[i].top = curPos;
            curPos += this.items[i].height || this.tombstoneSize;
        }

        this.scrollRunwayEnd = Math.max(this.scrollRunwayEnd, curPos + SCROLL_RUNWAY)
        this.scrollRunway.style.transform = 'translate(0, ' + this.scrollRunwayEnd + 'px)';
        this.scroller.scrollTop = this.anchorScrollTop;

        if (ANIMATION_DURATION_MS) {
            // TODO: Should probably use transition end, but there are a lot of animations we could be listening to.
            setTimeout(function() {
                for (var i in tombstoneAnimations) {
                    var anim = tombstoneAnimations[i];
                    anim[0].classList.add('invisible');
                    this.tombstones_.push(anim[0]);
                    // Tombstone can be recycled now.
                }
            }.bind(this), ANIMATION_DURATION_MS)
        }

        this.maybeRequestContent();
    }

    /**
     * Creates or returns an existing tombstone ready to be reused.
     * @return {Element} A tombstone element ready to be used.
     */
    getTombstone() {
        let tombstone = this.tombstones.pop();
        if (tombstone) {
            tombstone.classList.remove('invisible');
            tombstone.style.opacity = 1;
            tombstone.style.transform = '';
            tombstone.style.transition = '';
            return tombstone;
        }
        return this.source.createTombstone();
    }

    /**
     * Adds an item to the items list.
     */
    addItem() {
        this.items.push({
            'data': null,
            'node': null,
            'height': 0,
            'width': 0,
            'top': 0,
        })
    }

    /**
     * Adds the given array of items to the items list and then calls
     * attachContent to update the displayed content.
     * @param {Array<Object>} items The array of items to be added to the infinite
     *     scroller list.
     */
    addContent(items) {
        this.requestInProgress = false;
        var startIndex = this.items.length;
        for (var i = 0; i < items.length; i++) {
            if (this.items.length <= this.loadedItems)
                this.addItem();
            this.items[this.loadedItems++].data = items[i];
        }
        this.attachContent();
    }

    /**
     * Requests additional content if we don't have enough currently.
     */
    maybeRequestContent() {
        // Don't issue another request if one is already in progress as we don't
        // know where to start the next request yet.
        if (this.requestInProgress)
            return;
        var itemsNeeded = this.lastAttachedItem - this.loadedItems;
        if (itemsNeeded <= 0)
            return;
        this.requestInProgress = true;
        var lastItem = this.items[this.loadedItems - 1];
        this.source.fetch(itemsNeeded).then(this.addContent.bind(this));
    }

}
