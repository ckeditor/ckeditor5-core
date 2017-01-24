/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module core/editor/standardeditor
 */

import Editor from './editor';
import EditingKeystrokeHandler from '../editingkeystrokehandler';
import EditingController from '@ckeditor/ckeditor5-engine/src/controller/editingcontroller';

import getDataFromElement from '@ckeditor/ckeditor5-utils/src/dom/getdatafromelement';
import setDataInElement from '@ckeditor/ckeditor5-utils/src/dom/setdatainelement';

/**
 * Class representing a typical browser-based editor. It handles a single source element and
 * uses {@link module:engine/controller/editingcontroller~EditingController}.
 */
export default class StandardEditor extends Editor {
	/**
	 * Creates a new instance of the standard editor.
	 *
	 * @param {HTMLElement} element The DOM element that will be the source
	 * for the created editor.
	 * @param {Object} config The editor config.
	 */
	constructor( element, config ) {
		super( config );

		/**
		 * The element on which the editor has been initialized.
		 *
		 * @readonly
		 * @member {HTMLElement}
		 */
		this.element = element;

		// Documented in Editor.
		this.editing = new EditingController( this.document );

		/**
		 * Instance of the {@link module:core/keystrokehandler~KeystrokeHandler}.
		 *
		 * @readonly
		 * @member {module:core/keystrokehandler~KeystrokeHandler}
		 */
		this.keystrokes = new EditingKeystrokeHandler( this );

		/**
		 * Editor UI instance.
		 *
		 * This property is set by more specialized editor constructors. However, it's required
		 * for plugins to work (their UI-related part will try to interact with editor UI),
		 * so every editor class which is meant to work with default plugins should set this property.
		 *
		 * @readonly
		 * @member {module:core/editor/editorui~EditorUI} #ui
		 */

		this.keystrokes.listenTo( this.editing.view );
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		return Promise.resolve()
			.then( () => this.keystrokes.destroy() )
			.then( () => this.editing.destroy() )
			.then( super.destroy() );
	}

	/**
	 * Sets the data in the editor's main root.
	 *
	 * @param {*} data The data to load.
	 */
	setData( data ) {
		this.data.set( data );
	}

	/**
	 * Gets the data from the editor's main root.
	 */
	getData() {
		return this.data.get();
	}

	/**
	 * Updates the {@link #element editor element}'s content with the data.
	 */
	updateEditorElement() {
		setDataInElement( this.element, this.getData() );
	}

	/**
	 * Loads the data from the {@link #element editor element} to the main root.
	 */
	loadDataFromEditorElement() {
		this.setData( getDataFromElement( this.element ) );
	}

	/**
	 * Creates a standard editor instance.
	 *
	 * @param {HTMLElement} element See {@link module:core/editor/standardeditor~StandardEditor}'s param.
	 * @param {Object} config See {@link module:core/editor/standardeditor~StandardEditor}'s param.
	 * @returns {Promise} Promise resolved once editor is ready.
	 * @returns {module:core/editor/standardeditor~StandardEditor} return.editor The editor instance.
	 */
	static create( element, config ) {
		return new Promise( ( resolve ) => {
			const editor = new this( element, config );

			resolve(
				editor.initPlugins()
					.then( () => {
						editor.fire( 'dataReady' );
						editor.fire( 'ready' );
					} )
					.then( () => editor )
			);
		} );
	}
}
