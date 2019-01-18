/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, setTimeout */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '../../src/plugin';
import ArticlePluginSet from '../_utils/articlepluginset';
import { downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';
import { upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

const superFieldSymbol = Symbol( 'superField' );

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

		conversion.for( 'editingDowncast' ).add( downcastElementToElement( {
			model: 'superField',
			view: ( modelElement, viewWriter ) => {
				const div = createSuperFieldElement( viewWriter, modelElement );

				viewWriter.setCustomProperty( superFieldSymbol, true, div );

				const uiWrap = viewWriter.createUIElement( 'div', {}, function( domDocument ) {
					const domUiWrap = this.toDomElement( domDocument );

					// Add a custom button to the widget.
					const domButton = domDocument.createElement( 'button' );

					domButton.addEventListener( 'click', () => {
						model.change( writer => {
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

					// Add a custom input to the widget.
					const domInput = domDocument.createElement( 'input' );
					domInput.setAttribute( 'value', modelElement.getAttribute( 'date' ) );
					domInput.addEventListener( 'input', evt => {
						model.change( writer => {
							const oldValue = modelElement.getAttribute( 'input' );
							const newValue = evt.srcElement.value;

							console.log( `Change input: ${ oldValue } -> ${ newValue }` );

							writer.setAttribute( 'date', newValue, modelElement );
						} );
					} );

					domInput.className = 'jq-datepicker';
					domInput.setAttribute( 'disabled', 'disabled' );

					domUiWrap.appendChild( domInput );

					// Add a custom select to the widget.
					const domSelect = domDocument.createElement( 'select' );
					domSelect.setAttribute( 'disabled', 'disabled' );

					domSelect.addEventListener( 'change', evt => {
						model.change( writer => {
							const oldValue = modelElement.getAttribute( 'dropdown' );
							const newValue = evt.srcElement.value;

							console.log( `Change dropdown: ${ oldValue } -> ${ newValue }` );

							writer.setAttribute( 'dropdown', newValue, modelElement );
						} );
					} );

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

					// Below code is used to prevent CKEditor from handling events on elements inside a widget.
					preventCKEditorHandling( domButton, editor );
					preventCKEditorHandling( domSelect, editor );
					preventCKEditorHandling( domInput, editor );

					return domUiWrap;
				} );

				viewWriter.insert( viewWriter.createPositionAt( div, 0 ), uiWrap );

				return toWidget( div, viewWriter );
			}
		} ) );

		conversion.for( 'dataDowncast' ).add( downcastElementToElement( {
			model: 'superField',
			view: ( modelElement, viewWriter ) => createSuperFieldElement( viewWriter, modelElement )
		} ) );

		conversion.for( 'upcast' ).add( upcastElementToElement( {
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
		} ) );
	}
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
