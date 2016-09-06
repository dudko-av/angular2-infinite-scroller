import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { InfiniteScrollerComponent } from './components/infinite-scroller/infinite-scroller.component';
import { InfiniteScrollerDirective } from './components/infinite-scroller/infinite-scroller.directive';

@NgModule({
    declarations: [AppComponent, InfiniteScrollerComponent, InfiniteScrollerDirective],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule
    ]
})
export class AppModule {}
