define(['loading', 'slyScroller', './focushandler', 'focusManager', 'scrollHelper'], function (loading, slyScroller, focusHandler, focusManager, scrollHelper) {

    function focusViewSlider() {

        var selected = this.querySelector('.selected');

        if (selected) {
            focusManager.focus(selected);
        } else {
            focusManager.autoFocus(this);
        }
    }

    function createHeaderScroller(view, instance, initialTabId) {

        var userViewNames = view.querySelector('.userViewNames');

        userViewNames.classList.add('hiddenScrollX');
        userViewNames.classList.add('focusable');
        userViewNames.classList.add('focuscontainer-x');
        userViewNames.style.scrollBehavior = 'smooth';
        userViewNames.focus = focusViewSlider;

        loading.hide();

        var initialTab = initialTabId ? userViewNames.querySelector('.btnUserViewHeader[data-id=\'' + initialTabId + '\']') : null;

        if (!initialTab) {
            initialTab = userViewNames.querySelector('.btnUserViewHeader');
        }

        // In Edge the web components aren't always immediately accessible
        setTimeout(function() {
            instance.setFocusDelay(view, initialTab);
        }, 0);
    }

    function parentWithClass(elem, className) {

        while (!elem.classList || !elem.classList.contains(className)) {
            elem = elem.parentNode;

            if (!elem) {
                return null;
            }
        }

        return elem;
    }

    function initEvents(view, instance) {

        // Catch events on the view headers
        var userViewNames = view.querySelector('.userViewNames');
        userViewNames.addEventListener('click', function (e) {

            var elem = parentWithClass(e.target, 'btnUserViewHeader');

            if (elem) {
                scrollHelper.toCenter(userViewNames, elem, true);
                instance.setFocusDelay(view, elem);
            }
        });

        userViewNames.addEventListener('focus', function (e) {

            var elem = parentWithClass(e.target, 'btnUserViewHeader');

            if (elem) {
                scrollHelper.toCenter(userViewNames, elem, true);
                instance.setFocusDelay(view, elem);
            }
        }, true);
    }

    function selectUserView(page, id, self) {

        var btn = page.querySelector(".btnUserViewHeader[data-id='" + id + "']");

        self.bodySlyFrame.slideTo(0, true);

        page.querySelector('.contentScrollSlider').innerHTML = '';
        var promise = self.loadViewContent.call(self, page, id, btn.getAttribute('data-type'));

        if (promise) {
            promise.then(function () {
                fadeInRight(page.querySelector('.contentScrollSlider'));
            });
        }
    }

    function fadeInRight(elem, iterations) {

        var translateX = Math.round(window.innerWidth / 100);
        var keyframes = [
          { opacity: '0', transform: 'translate3d(' + translateX + 'px, 0, 0)', offset: 0 },
          { opacity: '1', transform: 'none', offset: 1 }];
        var timing = { duration: 300, iterations: iterations };
        elem.animate(keyframes, timing);
    }

    function tabbedPage(page, pageOptions) {

        var self = this;
        pageOptions = pageOptions || {};

        // lock the height so that the location of the top tabs won't fluctuate
        var contentScrollSlider = page.querySelector('.contentScrollSlider');
        contentScrollSlider.classList.add('focuscontainer-x');

        var selectedItemInfoInner = page.querySelector('.selectedItemInfoInner');
        var selectedIndexElement = page.querySelector('.selectedIndex');

        var tagName = 'paper-button';

        self.renderTabs = function (tabs, initialTabId) {

            page.querySelector('.userViewNames').innerHTML = tabs.map(function (i) {

                return '<' + tagName + ' class="flat btnUserViewHeader" data-id="' + i.Id + '" data-type="' + (i.CollectionType || '') + '"><h2 class="userViewButtonText">' + i.Name + '</h2></' + tagName + '>';

            }).join('');

            createHeaderScroller(page, self, initialTabId);
            createHorizontalScroller(page);
            initEvents(page, self);
        };

        function onAlphaPickerValueChanged() {

            var value = pageOptions.alphaPicker.value();

            trySelectValue(value);
        }

        function trySelectValue(value) {

            var card;

            // If it's the symbol just pick the first card
            if (value == '#') {

                card = contentScrollSlider.querySelector('.card');

                if (card) {
                    self.bodySlyFrame.toCenter(card, false);
                    return;
                }
            }

            card = contentScrollSlider.querySelector('.card[data-prefix^=\'' + value + '\']');

            if (card) {
                self.bodySlyFrame.toCenter(card, false);
                return;
            }

            // go to the previous letter
            var values = pageOptions.alphaPicker.values();
            var index = values.indexOf(value);

            if (index < values.length - 2) {
                trySelectValue(values[index + 1]);
            } else {
                var all = contentScrollSlider.querySelectorAll('.card');
                card = all.length ? all[all.length - 1] : null;

                if (card) {
                    self.bodySlyFrame.toCenter(card, false);
                }
            }
        }

        if (pageOptions.alphaPicker) {
            pageOptions.alphaPicker.on('alphavaluechanged', onAlphaPickerValueChanged);
        }

        var focusTimeout;
        var focusDelay = 0;
        self.setFocusDelay = function (view, elem, immediate) {

            var viewId = elem.getAttribute('data-id');

            var btn = view.querySelector('.btnUserViewHeader.selected');

            if (btn) {

                if (viewId == btn.getAttribute('data-id')) {
                    return;
                }
            }

            if (elem !== btn) {
                if (btn) {
                    btn.classList.remove('selected');
                }
                elem.classList.add('selected');
            }

            if (focusTimeout) {
                clearTimeout(focusTimeout);
            }

            var onTimeout = function() {

                selectUserView(view, viewId, self);

            };

            if (immediate) {
                onTimeout();
            } else {
                focusTimeout = setTimeout(onTimeout, focusDelay);
            }

            // No delay the first time
            focusDelay = 700;
        };

        function createHorizontalScroller(view) {

            var scrollFrame = view.querySelector('.itemScrollFrame');

            var options = {
                horizontal: 1,
                itemNav: 0,
                mouseDragging: 1,
                touchDragging: 1,
                slidee: view.querySelector('.contentScrollSlider'),
                itemSelector: '.card',
                smart: true,
                releaseSwing: true,
                scrollBy: 200,
                speed: 340,
                immediateSpeed: pageOptions.immediateSpeed,
                elasticBounds: 1,
                dragHandle: 1,
                dynamicHandle: 1,
                clickBar: 1,
                //centerOffset: window.innerWidth * .05,
                scrollWidth: 200000,
                enableAutoNativeScroll: true
            };

            slyScroller.create(scrollFrame, options).then(function (slyFrame) {
                self.bodySlyFrame = slyFrame;
                self.bodySlyFrame.init();
                initFocusHandler(view, self.bodySlyFrame);
            });
        }

        function initFocusHandler(view) {

            if (pageOptions.handleFocus) {

                var scrollSlider = view.querySelector('.contentScrollSlider');

                self.focusHandler = new focusHandler({
                    parent: scrollSlider,
                    selectedItemInfoInner: selectedItemInfoInner,
                    selectedIndexElement: selectedIndexElement,
                    animateFocus: pageOptions.animateFocus,
                    slyFrame: self.bodySlyFrame
                });
            }
        }

        self.destroy = function () {

            if (pageOptions.alphaPicker) {
                pageOptions.alphaPicker.off('alphavaluechanged', onAlphaPickerValueChanged);
            }

            if (self.focusHandler) {
                self.focusHandler.destroy();
                self.focusHandler = null
            }
            if (self.bodySlyFrame) {
                self.bodySlyFrame.destroy();
                self.bodySlyFrame = null
            }
        };
    }

    return tabbedPage;
});