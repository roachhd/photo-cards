"use strict"

//void function(){

/**
 * @todo Style nav
 * @todo Implement "slide"
 * @todo Touch events?
 * @todo Test more
 */

// ----------------
// Shared variables
// ----------------

/** Element that wraps our cards and navigation
@type {HTMLDivElement} */
var _container

/** Element that wraps our cards (only)
@type {HTMLDivElement} */
var _stack

/** Control buttons
 * @type {object}
 * @property {HTMLButtonElement} prev - Button to go to previous card
 * @property {HTMLButtonElement} next - Button to go to next card
 */
var _controls = {
	root: null,
	prev: null,
	next: null
}

/** Total number of cards element.
@type {number} */
var _total

/** Index for currently shown card. One-indexed.
@type {number} */
var _current

/** Prefix to use in the hash before the card number
@type {string} */
var _hashPrefix

/** Information on the detected animation type and current statuts
@type {object} */
var _animation

// ----------------------
// Initialization helpers
// ----------------------

/**
 * Get the hash prefix to use from a data-prefix attribute.
 * @param {HTMLElement} container - should have a data-prefix attribute
 * @returns {string} Hash prefix
 */
function getHashPrefix(container) {
	var re = /^([a-z]+[\-=:_]?)?$/i
	var def = 'card'
	try {
		var candidate = container.getAttribute('data-prefix').trim()
		return re.test(candidate) ? candidate : def
	}
	catch (e) {
		return def
	}
}

/**
 * Get a valid OR fallback color scheme for an element,
 * based on its data-color attribute.
 * @param {HTMLElement} element
 * @returns {{valid:boolean, name:string}}
 */
function getColorSchemeInfo(element) {
	var list = ['white', 'light', 'dark', 'black']
	var result = {
		valid: false,
		name: list[0]
	}
	var candidate = element.getAttribute('data-color')
	if (typeof candidate === 'string') {
		var clean = candidate.trim().toLowerCase()
		if (list.indexOf(clean) !== -1 ) {
			result.valid = true
			result.name = clean
		}
	}
	return result
}

/**
 * Set valid color scheme names as the data-color attribute of
 * the main container and of each card, validating the existing
 * attributes if any.
 * @param {HTMLElement} container
 * @param {HTMLCollection} cards
 * @param {string} baseColorScheme
*/
function updateColorSchemes(container, cards, baseColorScheme) {
	container.setAttribute('data-color', baseColorScheme)
	for (var i = 0; i < cards.length; i++) {
		var color = getColorSchemeInfo(cards[i])
		var value = color.valid ? color.name : baseColorScheme
		cards[i].setAttribute('data-color', value)
	}
}

/**
 * Validate an image size name against a list of valid names
 * and update the element’s attribute accordingly.
 * @param {HTMLElement} element
 * @param {string} attr - attribute name
 */
function validateImgSize(element, attr) {
	var SIZES = ['small', 'medium', 'big', 'full', 'cover']
	var fallback = SIZES[2]
	var current = element.getAttribute(attr)
	if (SIZES.indexOf(current) === -1) {
		element.setAttribute(attr, fallback)
	}
}

/**
 * Replace <img> elements with <span style="background-image: url">.
 * (Ideally we would use the `object-fit` CSS property instead.)
 * @param {HTMLCollection} pics - <img> whose parent are <figure>
 */
function fitImages(pics) {
	var RATIO_LANDSCAPE = 1.1
	var RATIO_PORTRAIT  = 0.85

	for (var i = 0, l = pics.length; i < l; i++) {
		var pic = pics[i]
		var fig = pic.parentElement
		var size = fig.getAttribute('data-size')

		// Add background-image property
		var html = '<span class="dummy" style="background-image: url(' + pic.src + ');"></span>'

		// Calculate aspect ratio
		var type = 'unknown'
		if (pic.width > 100 && pic.height > 100) {
			var ratio = pic.width / pic.height
			if (ratio > RATIO_LANDSCAPE) { type = 'landscape' }
			else if (ratio < RATIO_PORTRAIT) { type = 'portrait' }
			else { type = 'square' }
		}
		fig.setAttribute('data-type', type)
		fig.insertAdjacentHTML('afterbegin', html)
	}
}

/**
 * Get the animation type from the container's class, and returns it
 * if it is supported. Otherwise, return a default type.
 * @param {HTMLElement} container - should have a data-animation attribute
 * @returns {string} Validated type
 */
function getAnimationInfo(container) {
	var hasTransition = function() {
		return (
			container.style['transition'] !== undefined ||
			container.style['webkitTransition'] !== undefined
		)
	}
	var getTransformProperty = function() {
		var match = ''
		var properties = ['WebkitTransform', 'msTransform', 'transform']
		properties.forEach(function(p) {
			if (container.style[p] !== undefined) { match = p }
		})
		return match
	}

	var anim = {
		type: 'none',
		transformProp: null,
		blocking: false,
		skipHashchange: false
	}
	var attr = container.getAttribute('data-animation')
	var type = (attr || '').toLowerCase().trim()

	if (type === 'fade') {
		if (hasTransition()) {
			anim.type = type
		}
	}
	if (type === 'slide') {
		var prop = getTransformProperty(container)
		if (prop && hasTransition()) {
			anim.type = type
			anim.transformProp = prop
		}
	}
	return anim
}

// -------------------
// UI management utils
// -------------------

/**
 * Extracts a card number from the URL hash if any.
 * Returns value has properties:
 * - baseUrl (string), current URL without hash;
 * - validIndex {number} validated index from hash (or fallback);
 * - hasCardHash {boolean} whether the hash format looked like a card index.
 * @returns {object}
 */
function getUrlInfo() {
	var fragments = window.location.href.split('#')
	var result = {
		baseUrl: fragments[0],
		validIndex: 1,
		hasCardHash: false
	}
	if (fragments[1]) {
		var re = new RegExp('^' + _hashPrefix + '(\\d+)$')
		var match = fragments[1].match(re)
		if (match) {
			result.hasCardHash = true
			var index = parseInt(match[1], 10)
			var valid = Math.max( Math.min(index, _total) , 1)
			// Make sure that: 1 <= validIndex <= _total
			result.validIndex = valid
		}
	}
	return result
}

/**
 * Update the state of prev/next buttons
 * @param {number} index - valid card index
 */
function updateControls(index) {
	_controls.prev.hidden = (index === 1) ? true : false
	_controls.next.hidden = (index === _total) ? true : false
}

/**
 * Update the URL’s hash
 * @param {number} index - valid card index
 */
function updateHash(index) {
	var url = getUrlInfo()
	var newUrl = url.baseUrl + '#' + _hashPrefix + index
	// Avoid triggering controler associated to onhashchange
	_animation.skipHashchange = true
	// Avoiding window.location.hash so we don’t fill the history
	window.location.replace(newUrl)
}

/**
 * Update the container’s data-currentcolor attribute 
 * @param {number} index - valid card index
 */
function updateColor(index) {
	// The main container should have a data-currentcolor attribute
	// that is always up to date with the color scheme name of the
	// currently shown card.
	var color = _stack.children[index-1].getAttribute('data-color')
	_container.setAttribute('data-currentcolor', color)
}

/**
 * Update all UI parts when showing new card
 * @param {number} index - valid card index
 */
function updateUI(index) {
	updateHash(index)
	updateColor(index)
	updateControls(index)
}

// -------------------
// Interaction helpers
// -------------------

/**
 * Manage keyboard input. Calls `goToCard()`.
 * @param {object} e - keyboard event
 */
function keyControl(e) {
	var dirKeys = {
		prevKeys: [ 37 /*left*/, 38 /*top*/ ],
		nextKeys: [ 39 /*right*/, 40 /*down*/ ],
	}
	// We only want direction keys, with no modifiers
	if (e.repeat || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
		return
	}

	if (dirKeys.nextKeys.indexOf(e.keyCode) !== -1 && _current < _total) {
		goToCard(_current + 1)
	} else
	if (dirKeys.prevKeys.indexOf(e.keyCode) !== -1 && _current > 1) {
		goToCard(_current - 1)
	}
}

/**
 * Manage button input. Calls `goToCard()`.
 * @param {object} event - click event
 */
function buttonControl(event) {
	var btn = event.currentTarget
	if (!btn.hidden) {
		if (btn.classList.contains('next') && _current < _total) {
			goToCard(_current + 1)
		} else
		if (btn.classList.contains('prev') && _current > 1) {
			goToCard(_current - 1)
		}
	}
}

/**
 * Show a card (possibly a default card) if the hash
 * was changed manually and looks like a card’s index.
 * @param {object} event - click event
 */
function hashchangeControl(event) {
	// If we changed the hash programatically, this should be true
	if (_animation.skipHashchange) {
		_animation.skipHashchange = false
	}
	// Everything else should be manual changes
	else {
		var url = getUrlInfo()
		if (url.hasCardHash) {
			goToCard(url.validIndex)
		}
	}
}

// -------------------------------
// Manage card state and animation
// -------------------------------

/**
 * Show the new card and hide the current one.
 * Responsible for updating `current`.
 * @param {number} targetIndex - Integer index (1-indexed!) of card to show
 * @param {boolean} initial - Is this the initial card?
 */
function goToCard(targetIndex, initial) {
	// We may block access to this function for specific
	// times, depending on the animation style.
	if (_animation.blocking) return

	var unblock = function() {
		_animation.blocking = false
		if (initial && _animation.type !== 'none') {
			// Activate CSS transition/animation effects
			_container.classList.add('animate')
		}
	}
	var afterFade = function() {
		this.removeEventListener('webkitTransitionEnd', afterFade)
		this.removeEventListener('transitionend', afterFade)
		if (this.getAttribute('data-state') === 'closing') {
			this.removeAttribute('data-state')
		}
	}

	if (!initial) {
		var prevCard = _stack.children[ _current - 1 ]
	}
	var nextCard = _stack.children[ targetIndex - 1 ]

	if (nextCard && (initial || prevCard)) {

		_animation.blocking = true
		_current = targetIndex
		if (!initial) {
			updateUI(_current)
		} else {
			updateControls(_current)
			updateColor(_current)
		}

		if (_animation.type === 'none') {
			nextCard.setAttribute('data-state', 'open')
			if (!initial) {
				prevCard.removeAttribute('data-state')
			}
			setTimeout(unblock, 150)
		} else

		if (_animation.type === 'fade') {
			if (!initial) {
				prevCard.setAttribute('data-state', 'closing')
				prevCard.addEventListener('webkitTransitionEnd', afterFade)
				prevCard.addEventListener('transitionend', afterFade)
			}
			nextCard.setAttribute('data-state', 'open')
			setTimeout(unblock, 150)
		} else

		if (_animation.type === 'slide') {
			var percent = (targetIndex - 1) * 100
			var value = 'translateX(-' + percent + '%)'
			_stack.style[_animation.transformProp] = value
			setTimeout(unblock, 250)
		}
	}
}

// --------------------
// Initialization steps
// --------------------

function init() {

	// Start populating core script variables.
	// Order often matters as functions reference container, stack, etc.
	_container = document.querySelector('.pcards')
	_stack = _container.querySelector('.pcards-stack')

	// Get hash prefix or use default
	_hashPrefix = getHashPrefix(_container)

	// Make sure we have good color scheme names
	updateColorSchemes(_container, _stack.children,
		getColorSchemeInfo(_container).name)

	// And a default image size set on the container
	validateImgSize(_container, 'data-imgsize')

	_total     = _stack.children.length
	_current   = getUrlInfo().validIndex
	_animation = getAnimationInfo(_container)

	_controls.root = _container.querySelector('.pcards-controls')
	_controls.root.hidden = false
	_controls.prev = _controls.root.querySelector('.prev')
	_controls.next = _controls.root.querySelector('.next')

	// Set images as backgrounds
	var pics = _stack.querySelectorAll('figure > img')
	fitImages(pics)

	// Show the initial card
	goToCard(_current, true)

	// Manage events
	document.body.addEventListener('keydown', keyControl)
	window.addEventListener('hashchange', hashchangeControl)
	_controls.prev.addEventListener('click', buttonControl)
	_controls.next.addEventListener('click', buttonControl)
}

init()

// }()
