import { EventDispatcher } from '../dist/camera-controls.module.js';

/**
 * Represents a pseudo element, works in WebWorker.
 * @extends EventDispatcher
 */
export class PseudoElement extends EventDispatcher {

	/** @type {PseudoDocument} */
	ownerDocument = new PseudoDocument();
	/** @type {any} */
	style = {};
	/** @private @type {DOMRect} */
	_domRect = new DOMRect();

	constructor() {

		super();

	}

	/**
	 * @returns {DOMRect} The DOMRect.
	 */
	getBoundingClientRect() {

		return DOMRect.fromRect( this._domRect );

	}

	/**
	 * Just for compatibility. doesn't work.
	 * @returns {Promise<void>} A promise that rejects.
	 */
	requestPointerLock() {

		return Promise.reject();

	}

	/**
	 * Just for compatibility. do nothing.
	 * @param {string} _ The attribute name.
	 * @param {string} __ The attribute value.
	 */
	setAttribute( _, __ ) {}

	/**
	 * Updates the PseudoElement size based on a given bound.
	 * @param {DOMRect} bound The new bound.
	 */
	update( bound ) {

		this._domRect.x = bound.x;
		this._domRect.y = bound.y;
		this._domRect.width = bound.width;
		this._domRect.height = bound.height;

	}

}

/**
 * Represents a pseudo document.
 * @extends EventDispatcher
 */
class PseudoDocument extends EventDispatcher {

	/**
	 * Creates an instance of PseudoDocument.
	 */
	constructor() {

		super();

	}

	/**
	 * Exits pointer lock.
	 */
	exitPointerLock() {}

	/**
	 * Just for compatibility. do nothing.
	 * @returns {PseudoElement|null} The element locking the pointer.
	 */
	get pointerLockElement() {

		return null;

	}

}
