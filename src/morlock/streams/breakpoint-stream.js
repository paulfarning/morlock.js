import { objectVals, mapObject, apply, getOption, push } from "morlock/core/util";
import { testMQ } from "morlock/core/dom";
module Stream from "morlock/core/stream";
module ResizeStream from "morlock/streams/resize-stream";

/**
 * Create a new Stream containing events which fire when the browser
 * enters and exits breakpoints (media queries).
 * @param {Object} breakpoints Map containing the name of each breakpoint
 *   as the key. The value can be either a media query string or a map
 *   with min and/or max keys.
 * @return {Stream} The resulting stream.
 */
export function create(breakpoints, options) {
  var baseStream = ResizeStream.create();
  var resizeStream;

  if (options.debounceMs) {
    resizeStream = Stream.debounce(
      options.debounceMs,
      baseStream
    );
  } else if (options.throttleMs) {
    resizeStream = Stream.throttle(
      options.throttleMs,
      baseStream
    );
  } else {
    resizeStream = baseStream;
  }

  var breakpointStreams = mapObject(function(val, key) {
    var s = Stream.create();

    var mq = 'string' === typeof val ? val : breakpointToString(val);

    Stream.onValue(resizeStream, function() {
      var wasActive = Stream.getValue(s);
      wasActive = wasActive !== null ? wasActive : false;

      if (wasActive !== testMQ(mq)) {
        Stream.emit(s, !wasActive);
      }
    });

    return Stream.map(push([key]), s);
  }, breakpoints);

  return apply(Stream.merge, objectVals(breakpointStreams));
}

/**
 * Convert a map with max/min values into a media query string.
 * @param {Object} options The options.
 * @param {number=} options.min The minimum size.
 * @param {number=} options.max The maximum size.
 * @return {string} The resulting media query.
 */
function breakpointToString(options) {
  var mq;

  if ('undefined' !== typeof options.mq) {
    mq = options.mq;
  } else {
    var max = getOption(options.max, Infinity);
    var min = getOption(options.min, 0);

    mq = 'only screen';
    if (max < Infinity) {
      mq += ' and (max-width: ' + max + 'px)';
    }
    if (min > 0) {
      mq += ' and (min-width: ' + min + 'px)';
    }
  }

  return mq;
}
