/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module core/editingkeystrokehandler
 */

import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler';

/**
 * A keystroke handler for editor editing. Its instance is available
 * in {@link module:core/editor/standardeditor~StandardEditor#keystrokes} so plugins
 * can register their keystrokes.
 *
 * E.g. an undo plugin would do this:
 *
 *		editor.keystrokes.set( 'ctrl + Z', 'undo' );
 *		editor.keystrokes.set( 'ctrl + shift + Z', 'redo' );
 *		editor.keystrokes.set( 'ctrl + Y', 'redo' );
 *
 * @extends utils/keystrokehandler~KeystrokeHandler
 */
export default class EditingKeystrokeHandler extends KeystrokeHandler {
	/**
	 * Creates an instance of the keystroke handler.
	 *
	 * @param {module:core/editor/editor~Editor} editor
	 */
	constructor( editor ) {
		super();

		/**
		 * The editor instance.
		 *
		 * @readonly
		 * @member {module:core/editor/editor~Editor}
		 */
		this.editor = editor;
	}

	/**
	 * Registers a handler for the specified keystroke.
	 *
	 * * The handler can be specified as a command name or a callback.
	 *
	 * @param {String|Array.<String|Number>} keystroke Keystroke defined in a format accepted by
	 * the {@link module:utils/keyboard~parseKeystroke} function.
	 * @param {Function} callback If a string is passed, then the keystroke will
	 * {@link module:core/editor/editor~Editor#execute execute a command}.
	 * If a function, then it will be called with the
	 * {@link module:engine/view/observer/keyobserver~KeyEventData key event data} object and
	 * a helper to both `preventDefault` and `stopPropagation` of the event.
	 */
	set( keystroke, callback ) {
		if ( typeof callback == 'string' ) {
			const commandName = callback;

			callback = () => {
				this.editor.execute( commandName );
			};
		}

		super.set( keystroke, callback );
	}

	/**
	 * @inheritDoc
	 */
	listenTo( emitter ) {
		this._listener.listenTo( emitter, 'keydown', ( evt, data ) => {
			const handled = this.press( data );

			if ( handled ) {
				data.preventDefault();
			}
		} );
	}
}
