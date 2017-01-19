/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ComponentFactory from 'ckeditor5-ui/src/componentfactory';
import FocusTracker from 'ckeditor5-utils/src/focustracker';
import KeystrokeHandler from 'ckeditor5-utils/src/keystrokehandler';

/**
 * A simplified classic editor UI class. Useful for testing features.
 *
 * @memberOf tests.core._utils
 * @extends ui.View
 */
export default class ClassicTestEditorUI {
	/**
	 * Creates an instance of the test editor UI class.
	 *
	 * @param {core.editor.Editor} editor The editor instance.
	 * @param {ui.editorUI.EditorUIView} view View of the ui.
	 */
	constructor( editor, view ) {
		/**
		 * Editor that the UI belongs to.
		 *
		 * @readonly
		 * @member {core.editor.Editor} tests.core._utils.ClassicTestEditorUI#editor
		 */
		this.editor = editor;

		/**
		 * View of the ui.
		 *
		 * @readonly
		 * @member {ui.editorUI.EditorUIView} tests.core._utils.ClassicTestEditorUI#view
		 */
		this.view = view;

		/**
		 * Instance of the {@link ui.ComponentFactory}.
		 *
		 * @readonly
		 * @member {ui.ComponentFactory} tests.core._utils.ClassicTestEditorUI#componentFactory
		 */
		this.componentFactory = new ComponentFactory( editor );

		/**
		 * Keeps information about editor focus.
		 *
		 * @member {utils.FocusTracker} tests.core._utils.ClassicTestEditorUI#focusTracker
		 */
		this.focusTracker = new FocusTracker();

		/**
		 * Instance of the {@link module:core/keystrokehandler~KeystrokeHandler}.
		 *
		 * @readonly
		 * @member {module:core/keystrokehandler~KeystrokeHandler}
		 */
		this.keystrokes = new KeystrokeHandler();
	}

	/**
	 * Initializes the UI.
	 *
	 * @returns {Promise} A Promise resolved when the initialization process is finished.
	 */
	init() {
		this.keystrokes.listenTo( this.view.element );

		return this.view.init();
	}

	/**
	 * Destroys the UI.
	 *
	 * @returns {Promise} A Promise resolved when the destruction process is finished.
	 */
	destroy() {
		return this.view.destroy()
			.then( () => this.keystrokes.destroy() );
	}
}
