import {
    Directive, OnInit, ElementRef, TemplateRef, ViewContainerRef, Input, OnChanges, ChangeDetectorRef, IterableDiffer,
    IterableDiffers, EmbeddedViewRef, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { InfiniteScrollerService } from './infinite-scroller.service';

// Number of items to instantiate beyond current view in the scroll direction.
const RUNWAY_ITEMS = 50;

// Number of items to instantiate beyond current view in the opposite direction.
const RUNWAY_ITEMS_OPPOSITE = 10;

// The number of pixels of additional length to allow scrolling to.
const SCROLL_RUNWAY = 2000;

// The animation interval (in ms) for fading in content from tombstones.
const ANIMATION_DURATION_MS = 200;

@Directive({
    selector: '[infiniteScroller]'
})
export class InfiniteScrollerDirective implements OnInit {

   ngOnInit() {

   }

}
