define("morlock/controllers/sticky-element-controller", 
  ["morlock/core/util","morlock/core/dom","morlock/core/stream","morlock/streams/scroll-stream","morlock/streams/resize-stream","morlock/controllers/scroll-position-controller","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var getOption = __dependency1__.getOption;
    var partial = __dependency1__.partial;
    var getStyle = __dependency2__.getStyle;
    var setStyle = __dependency2__.setStyle;
    var setStyles = __dependency2__.setStyles;
    var addClass = __dependency2__.addClass;
    var removeClass = __dependency2__.removeClass;
    var insertBefore = __dependency2__.insertBefore;
    var documentScrollY = __dependency2__.documentScrollY;
    var detachElement = __dependency2__.detachElement;
    var Stream = __dependency3__;
    var ScrollStream = __dependency4__;
    var ResizeStream = __dependency5__;
    var ScrollPositionController = __dependency6__["default"];

    function StickyElementController(elem, container, options) {
      if (!(this instanceof StickyElementController)) {
        return new StickyElementController(elem, container, options);
      }

      this.elem = elem;
      this.container = container;
      this.fixed = false;
      this.useTransform = true;
      this.originalZIndex = '';
      this.elemWidth = 0;
      this.elemHeight = 0;
      this.containerTop = 0;
      this.containerHeight = 0;
      this.originalTop = 0;
      this.spacer = document.createElement('div');

      options || (options = {});

      this.zIndex = getOption(options.zIndex, 1000);
      this.marginTop = getOption(options.marginTop, 0);

      this.useTransform = CustomModernizr.csstransforms && getOption(options.useTransform, true);

      Stream.onValue(ScrollStream.create(), partial(onScroll, this));
      Stream.onValue(
        Stream.debounce(64, ResizeStream.create()),
        partial(onResize, this)
      );

      setupPositions(this);
    }

    function resetPositions(stickyElement) {
      unfix(stickyElement);

      stickyElement.currentTop = null;

      detachElement(stickyElement.spacer);

      setStyles(stickyElement.elem, {
        'zIndex': stickyElement.originalZIndex,
        'width': '',
        'position': stickyElement.originalPosition,
        'left': '',
        'top': stickyElement.originalOffsetTop
      });
    }

    function setupPositions(stickyElement) {
      var containerPosition = getStyle(stickyElement.container, 'position');
      if (containerPosition.length === 0) {
        setStyle(stickyElement.container, 'position', 'relative');
      }

      stickyElement.originalZIndex = getStyle(stickyElement.elem, 'zIndex');
      stickyElement.originalPosition = getStyle(stickyElement.elem, 'position');
      stickyElement.originalOffsetTop = getStyle(stickyElement.elem, 'top');

      // Slow, avoid
      var dimensions = stickyElement.elem.getBoundingClientRect();
      stickyElement.elemWidth = dimensions.width;
      stickyElement.elemHeight = dimensions.height;

      var currentScroll = documentScrollY();

      var containerDimensions = stickyElement.container.getBoundingClientRect();
      stickyElement.containerTop = containerDimensions.top + currentScroll;
      stickyElement.containerHeight = containerDimensions.height;

      stickyElement.originalTop = stickyElement.elem.offsetTop;

      setStyles(stickyElement.elem, {
        'position': 'absolute',
        'top': stickyElement.originalTop + 'px',
        'left': stickyElement.elem.offsetLeft + 'px',
        'width': stickyElement.elemWidth + 'px'
      });

      addClass(stickyElement.spacer, 'stick-element-spacer');

      setStyles(stickyElement.spacer, {
        // 'width': stickyElement.elemWidth + 'px',
        'height': stickyElement.elemHeight + 'px',
        'display': getStyle(stickyElement.elem, 'display'),
        'float': getStyle(stickyElement.elem, 'float'),
        'pointerEvents': 'none',
        'visibility': 'hidden',
        'opacity': 0,
        'zIndex': -1
      });

      // Insert spacer into DOM
      insertBefore(stickyElement.spacer, stickyElement.elem);

      var whenToStick = stickyElement.containerTop - stickyElement.marginTop;
      
      stickyElement.onBeforeHandler_ || (stickyElement.onBeforeHandler_ = partial(unfix, stickyElement));
      stickyElement.onAfterHandler_ || (stickyElement.onAfterHandler_ = partial(fix, stickyElement));

      if (stickyElement.topOfContainer_) {
        stickyElement.topOfContainer_.off('before', stickyElement.onBeforeHandler_);
        stickyElement.topOfContainer_.off('after', stickyElement.onAfterHandler_);
      }

      stickyElement.topOfContainer_ = new ScrollPositionController(whenToStick);
      stickyElement.topOfContainer_.on('before', stickyElement.onBeforeHandler_);
      stickyElement.topOfContainer_.on('after', stickyElement.onAfterHandler_);

      if (currentScroll < whenToStick) {
        stickyElement.onBeforeHandler_();
      } else {
        stickyElement.onAfterHandler_();
      }
    }

    function onScroll(stickyElement, scrollY) {
      if (!stickyElement.fixed) { return; }

      if (scrollY < 0) {
        scrollY = 0;
      }

      var newTop = scrollY + stickyElement.marginTop - stickyElement.containerTop;
      var maxTop = stickyElement.containerHeight - stickyElement.elemHeight;

      if (stickyElement.useTransform) {
        maxTop -= stickyElement.originalTop;
      } else {
        newTop += stickyElement.originalTop;
      }

      newTop = Math.min(newTop, maxTop);

      if (stickyElement.currentTop !== newTop) {
        if (stickyElement.useTransform) {
          setStyle(stickyElement.elem, 'transform', 'translateY(' + newTop + 'px)');
        } else {
          setStyle(stickyElement.elem, 'top', newTop + 'px');
        }

        stickyElement.currentTop = newTop;
      }
    }

    function onResize(stickyElement) {
      resetPositions(stickyElement);
      setupPositions(stickyElement);
      onScroll(stickyElement, documentScrollY());
    }

    function fix(stickyElement) {
      if (stickyElement.fixed) { return; }

      addClass(stickyElement.elem, 'fixed');
      setStyles(stickyElement.elem, {
        'zIndex': stickyElement.zIndex
      });

      stickyElement.fixed = true;
    }

    function unfix(stickyElement) {
      if (!stickyElement.fixed) { return; }

      removeClass(stickyElement.elem, 'fixed');
      setStyles(stickyElement.elem, {
        'zIndex': stickyElement.originalZIndex,
        'top': stickyElement.originalTop
      });

      stickyElement.fixed = false;
    }

    __exports__["default"] = StickyElementController;
  });