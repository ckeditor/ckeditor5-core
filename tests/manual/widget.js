/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '../../src/plugin';
import ArticlePluginSet from '../_utils/articlepluginset';
import { downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';
import { upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';

class SuperField extends Plugin {
	init() {
		const editor = this.editor;

		const schema = editor.model.schema;
		const conversion = editor.conversion;

		// Configure the schema.
		schema.register( 'superField', {
			isObject: true,
			isBlock: true,
			allowWhere: '$block',
			allowAttributes: [ 'input', 'dropdown', 'date' ]
		} );

		conversion.for( 'downcast' ).add( downcastElementToElement( {
			model: 'superField',
			view: ( modelElement, viewWriter ) => {
				const div = viewWriter.createContainerElement( 'div' );

				viewWriter.setAttribute( 'data-input-widget', true, div );
				viewWriter.setAttribute( 'data-input-widget-input', modelElement.getAttribute( 'input' ), div );
				viewWriter.setAttribute( 'data-input-widget-dropdown', modelElement.getAttribute( 'dropdown' ), div );
				viewWriter.setAttribute( 'data-input-widget-date', modelElement.getAttribute( 'date' ), div );

				return div;
			}
		} ) );

		conversion.for( 'upcast' )
			.add( upcastElementToElement( {
				view: {
					name: 'div',
					attributes: {
						'data-input-widget': true
					}
				},
				model: ( viewMedia, modelWriter ) => {
					const input = viewMedia.getAttribute( 'data-input-widget-input' );
					const dropdown = viewMedia.getAttribute( 'data-input-widget-dropdown' );
					const date = viewMedia.getAttribute( 'data-input-widget-date' );

					return modelWriter.createElement( 'superField', { input, dropdown, date } );
				}
			} ) );
	}
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
