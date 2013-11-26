var event = {
    bind: function(el, type, fn, capture) {
        if (el.addEventListener) {
            el.addEventListener(type, fn, capture);
        } else {
            el.attachEvent('on' + type, fn);
        }
    },

    unbind: function(el, type, fn, capture) {
        if (el.removeEventListener) {
            el.removeEventListener(type, fn, capture);
        } else {
            el.detachEvent('on' + type, fn);
        }
    }
};

function Carousel(el) {
    if (!(this instanceof Carousel)) return new Carousel(el);
    if (!el) throw new TypeError('swipe() requires an element');
    this.el = el;
    this.child = el.children[0];
    this.total = this.child.children.length;
    this.childWidth = el.getBoundingClientRect().width;
    this.width = this.childWidth * this.total | 0;
    this.child.style.width = this.width + 'px';
    this.child.style.height = this.height + 'px';
    this.interval(5000);
    this.duration(600);
    this.show(0, 0);
    this.bind();
}

/**
 * Set the swipe threshold to `n`.
 *
 * This is the factor required for swipe
 * to detect when a slide has passed the
 * given threshold, and may display the next
 * or previous slide. For example the default
 * of `.5` means that the user must swipe _beyond_
 * half of the side width.
 *
 * @param {Number} n
 * @api public
 */

Carousel.prototype.threshold = function(n){
  this._threshold = n;
};

/**
 * Set the "fast" swipe threshold to `ms`.
 *
 * This is the amount of time in milliseconds
 * which determines if a swipe was "fast" or not. When
 * the swipe's duration is less than `ms` only 1/10th of
 * the slide's width must be exceeded to display the previous
 * or next slide.
 *
 * @param {Number} n
 * @api public
 */

Carousel.prototype.fastThreshold = function(ms){
  this._fastThreshold = ms;
};

/**
 * Refresh sizing data.
 *
 * @api public
 */

Carousel.prototype.refresh = function(){
  var children = this.children();
  var visible = children.visible.length;
  var prev = this.visible || visible;

  var i = indexOf(children.visible, this.currentEl);

  // we removed/added item(s), update current
  if (visible < prev && i <= this.currentVisible && i >= 0) {
    this.currentVisible -= this.currentVisible - i;
  } else if (visible > prev && i > this.currentVisible) {
    this.currentVisible += i - this.currentVisible;
  }

  this.visible = visible;
  this.childWidth = this.el.getBoundingClientRect().width;
  this.width = Math.ceil(this.childWidth * visible);
  this.child.style.width = this.width + 'px';
  this.child.style.height = this.height + 'px';
  this.show(this.currentVisible, 0, { silent: true });
};

Carousel.prototype.bind = function(){
  // TODO: create a bulk event management component.. this is nasty
  event.bind(this.child, 'mousedown', this.ontouchstart.bind(this));
  event.bind(this.child, 'mousemove', this.ontouchmove.bind(this));
  event.bind(document, 'mouseup', this.ontouchend.bind(this));
  event.bind(this.child, 'touchstart', this.ontouchstart.bind(this));
  event.bind(this.child, 'touchmove', this.ontouchmove.bind(this));
  event.bind(document, 'touchend', this.ontouchend.bind(this));
};

Carousel.prototype.unbind = function(){
  // TODO: me
};

/**
 * Handle touchstart.
 *
 * @api private
 */

Carousel.prototype.ontouchstart = function(e){
  e.stopPropagation();
  if (e.touches) e = e.touches[0];

  this.transitionDuration(0);
  this.dx = 0;

  this.down = {
    x: e.pageX,
    at: new Date
  };
};

/**
 * Handle touchmove.
 *
 * For the first and last slides
 * we apply some resistence to help
 * indicate that you're at the edges.
 *
 * @api private
 */

Carousel.prototype.ontouchmove = function(e){
  if (!this.down) return;
  if (e.touches && e.touches.length > 1) return;
  e.stopPropagation();
  e.preventDefault();
  if (e.touches) e = e.touches[0];
  var s = this.down;
  var x = e.pageX;
  var w = this.childWidth;
  var i = this.current;
  this.dx = x - s.x;
  var dir = this.dx < 0 ? 1 : 0;
  if (this.isFirst() && 0 == dir) this.dx /= 2;
  if (this.isLast() && 1 == dir) this.dx /= 2;
  this.translate((i * w) + -this.dx);
};

/**
 * Handle touchend.
 *
 * @api private
 */

Carousel.prototype.ontouchend = function(e){
  if (!this.down) return;
  e.stopPropagation();

  // touches
  if (e.changedTouches) e = e.changedTouches[0];

  // setup
  var dx = this.dx;
  var x = e.pageX;
  var w = this.childWidth;

  // < 200ms swipe
  var ms = new Date - this.down.at;
  var threshold = ms < 200 ? w / 30 : w / 6;
  var dir = dx < 0 ? 1 : 0;
  var half = Math.abs(dx) >= 50;

  // clear
  this.down = null;

  // first -> next
  if (this.isFirst() && 1 == dir && half) return this.next();

  // first -> first
  if (this.isFirst()) return this.prev();

  // last -> last
  if (this.isLast() && 1 == dir) return this.next();

  // last -> prev
  if (this.isLast()) return this.prev();

  // N -> N + 1
  if (1 == dir && half) return this.next();

  // N -> N - 1
  if (0 == dir && half) return this.prev();

  // N -> N
  this.show(this.current);
};

/**
 * Set transition duration to `ms`.
 *
 * @param {Number} ms
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.duration = function(ms){
  this._duration = ms;
  return this;
};

/**
 * Set cycle interval to `ms`.
 *
 * @param {Number} ms
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.interval = function(ms){
  this._interval = ms;
  return this;
};

/**
 * Play through all the elements.
 *
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.play = function(){
  if (this.timer) return;
  this.timer = setInterval(this.cycle.bind(this), this._interval);
  return this;
};

/**
 * Stop playing.
 *
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.stop = function(){
  clearInterval(this.timer);
  return this;
};

/**
 * Show the next slide, when the end
 * is reached start from the beginning.
 *
 * @api public
 */

Carousel.prototype.cycle = function(){
  if (this.isLast()) {
    this.current = -1;
    this.next();
  } else {
    this.next();
  }
};

/**
 * Check if we're on the first slide.
 *
 * @return {Boolean}
 * @api public
 */

Carousel.prototype.isFirst = function(){
  return this.current == 0;
};

/**
 * Check if we're on the last slide.
 *
 * @return {Boolean}
 * @api public
 */

Carousel.prototype.isLast = function(){
  return this.current == this.total - 1;
};

/**
 * Show the previous slide, if any.
 *
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.prev = function(){
  this.show(this.current - 1);
  return this;
};

/**
 * Show the next slide, if any.
 *
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.next = function(){
  this.show(this.current + 1);
  return this;
};

/**
 * Show slide `i`.
 *
 * @param {Number} i
 * @return {Carousel} self
 * @api public
 */

Carousel.prototype.show = function(i, ms){
  if (null == ms) ms = this._duration;
  i = Math.max(0, Math.min(i, this.total - 1));
  var x = this.childWidth * i;
  this.current = i;
  this.transitionDuration(ms);
  this.translate(x);
  return this;
};

/**
 * Set transition duration.
 *
 * @api private
 */

Carousel.prototype.transitionDuration = function(ms){
  var s = this.child.style;
  s.webkitTransitionDuration =
  s.MozTransitionDuration =
  s.msTransitionDuration =
  s.OTransitionDuration =
  s.transitionDuration = ms + 'ms';
};

/**
 * Translate to `x`.
 *
 * @api private
 */

Carousel.prototype.translate = function(x){
  var s = this.child.style;
  x = -x;
  s.webkitTransform = s.MozTransform = 'translate3d(' + x + 'px, 0, 0)';
  s.msTransform = s.OTransform = 'translateX(' + x + 'px)';
};
