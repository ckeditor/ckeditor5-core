/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, setTimeout */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '../../src/plugin';
import ArticlePluginSet from '../_utils/articlepluginset';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

class SuperField extends Plugin {
	init() {
		const editor = this.editor;

		const model = editor.model;
		const schema = model.schema;
		const conversion = editor.conversion;

		// Configure the schema.
		schema.register( 'superField', {
			isLimit: true,
			isObject: true,
			allowWhere: '$block',
			allowAttributes: [ 'counter', 'dropdown', 'date' ]
		} );

		// Add converters.

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'superField',
			view: ( modelElement, viewWriter ) => {
				// Create the widget view element.
				const div = toWidget( createSuperFieldElement( viewWriter, modelElement ), viewWriter );

				// Create a wrapper for custom UI (must use UIElement!).
				const renderFunction = createCustomUIRenderer( editor, modelElement );
				const customUIWrapper = viewWriter.createUIElement( 'div', {}, renderFunction );

				// And insert it inside the widget element.
				viewWriter.insert( viewWriter.createPositionAt( div, 0 ), customUIWrapper );

				// Returns the following structure:
				//
				// 	<div>				   // widget element
				//		<div>			   // UIElement (wrapper for the custom UI)
				//			<button />
				//			<input />      // will be turned into a jQuery date picker
				//			<dropdown />
				//		</div>
				// </div>
				return div;
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'superField',
			view: ( modelElement, viewWriter ) => createSuperFieldElement( viewWriter, modelElement )
		} );

		conversion.for( 'upcast' ).elementToElement( {
			view: {
				name: 'div',
				attributes: {
					'data-input-widget': true
				}
			},
			model: ( viewMedia, modelWriter ) => {
				const counter = viewMedia.getAttribute( 'data-input-widget-counter' );
				const dropdown = viewMedia.getAttribute( 'data-input-widget-dropdown' );
				const date = viewMedia.getAttribute( 'data-input-widget-date' );

				return modelWriter.createElement( 'superField', { counter, dropdown, date } );
			}
		} );
	}
}

function createCustomUIRenderer( editor, modelElement ) {
	return function renderCustomUI( domDocument ) {
		const domUiWrap = this.toDomElement( domDocument );

		// ==================================
		// Add a custom button to the widget.
		const domButton = domDocument.createElement( 'button' );

		domButton.addEventListener( 'click', () => {
			editor.model.change( writer => {
				const attribute = modelElement.getAttribute( 'counter' );

				const oldValue = parseInt( attribute );
				const newValue = oldValue + 1;

				console.log( `Change button: ${ oldValue } -> ${ newValue }` );

				writer.setAttribute( 'counter', newValue, modelElement );
				domButton.innerText = `Increment (${ modelElement.getAttribute( 'counter' ) })`;
			} );
		} );
		domButton.innerText = `Increment (${ modelElement.getAttribute( 'counter' ) })`;
		domButton.setAttribute( 'disabled', 'disabled' );

		domUiWrap.appendChild( domButton );

		// ================================
		// Add a custom input to the widget.
		// Initialize jQuery date picker on it.
		// Note: there's a bug that changing the date via the jQ panel will not change it
		// in the input – that's most likely jQ date picker's bug. It works when changing by typing
		// in this widget.
		const domInput = domDocument.createElement( 'input' );

		domInput.setAttribute( 'value', modelElement.getAttribute( 'date' ) );
		domInput.addEventListener( 'input', evt => {
			editor.model.change( writer => {
				const oldValue = modelElement.getAttribute( 'input' );
				const newValue = evt.srcElement.value;

				console.log( `Change input: ${ oldValue } -> ${ newValue }` );

				writer.setAttribute( 'date', newValue, modelElement );
			} );
		} );
		domInput.className = 'jq-datepicker';
		domInput.setAttribute( 'disabled', 'disabled' );

		domUiWrap.appendChild( domInput );

		// ==================================
		// Add a custom select to the widget.
		// The options available in this dropdown are loaded from an asynchronous (e.g. external)
		// provider – `loadDropdownOptions()`.
		const domSelect = domDocument.createElement( 'select' );
		domSelect.setAttribute( 'disabled', 'disabled' );

		domSelect.addEventListener( 'change', evt => {
			editor.model.change( writer => {
				const oldValue = modelElement.getAttribute( 'dropdown' );
				const newValue = evt.srcElement.value;

				console.log( `Change dropdown: ${ oldValue } -> ${ newValue }` );

				writer.setAttribute( 'dropdown', newValue, modelElement );
			} );
		} );

		// =================================
		// Load the options into the dropdown, enable the jQ date picker and
		// enable all the form fields once everything is ready.

		loadDropdownOptions()
			.then( data => {
				for ( const { value, label } of data ) {
					const domOption = domDocument.createElement( 'option' );
					domOption.setAttribute( 'value', value );
					domOption.innerText = label;

					domSelect.appendChild( domOption );
				}
			} )
			.then( () => {
				window.$( '.jq-datepicker' ).datepicker();

				// Enable the form:
				domInput.removeAttribute( 'disabled' );
				domButton.removeAttribute( 'disabled' );
				domSelect.removeAttribute( 'disabled' );
			} );

		domUiWrap.appendChild( domSelect );

		// =======================================
		// Below code is used to prevent CKEditor from handling events on elements inside a widget.
		preventCKEditorHandling( domButton, editor );
		preventCKEditorHandling( domSelect, editor );
		preventCKEditorHandling( domInput, editor );

		return domUiWrap;
	};
}

function loadDropdownOptions() {
	const data = [];

	for ( let i = 0; i < Math.random() * 10 + 5; i++ ) {
		data.push( { value: i, label: `Item: ${ i }` } );
	}

	return new Promise( resolve => {
		setTimeout( () => resolve( data ), 500 );
	} );
}

function createSuperFieldElement( viewWriter, modelElement ) {
	return viewWriter.createContainerElement( 'div', {
		'data-input-widget': true,
		'data-input-widget-counter': modelElement.getAttribute( 'counter' ),
		'data-input-widget-dropdown': modelElement.getAttribute( 'dropdown' ),
		'data-input-widget-date': modelElement.getAttribute( 'date' )
	} );
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, SuperField ],
		toolbar: [
			'heading',
			'|',
			'bold',
			'italic',
			'link',
			'bulletedList',
			'numberedList',
			'blockQuote',
			'insertTable',
			'mediaEmbed',
			'undo',
			'redo'
		],
		image: {
			toolbar: [ 'imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative' ]
		},
		table: {
			contentToolbar: [
				'tableColumn',
				'tableRow',
				'mergeTableCells'
			]
		}
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );

// Hack needed to make the input fields accessible and responsive when used in a widget.
function preventCKEditorHandling( domElement, editor ) {
	// Prevent the editor from listening on below events in order to stop rendering selection.
	domElement.addEventListener( 'click', stopEventPropagationAndHackRendererFocus, { capture: true } );
	domElement.addEventListener( 'mousedown', stopEventPropagationAndHackRendererFocus, { capture: true } );
	domElement.addEventListener( 'focus', stopEventPropagationAndHackRendererFocus, { capture: true } );

	// Prevents TAB handling or other editor keys listeners which might be executed on editors selection.
	domElement.addEventListener( 'keydown', stopEventPropagationAndHackRendererFocus, { capture: true } );

	function stopEventPropagationAndHackRendererFocus( evt ) {
		evt.stopPropagation();
		// This prevents rendering changed view selection thus preventing to changing DOM selection while inside a widget.
		editor.editing.view._renderer.isFocused = false;
	}
}
