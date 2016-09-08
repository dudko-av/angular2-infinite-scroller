import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MESSAGES } from './components/infinite-scroller/messages';

@Component({
    selector: 'my-app',
    template: require('./app.component.html'),
    styles: [require('./app.component.css')],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
    index = 0;
    data: any[] = MESSAGES;

    ngOnInit() {

    }
}
