/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';

import { downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';
import { upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

function PlaceholderPlugin( editor ) {
	editor.model.schema.register( 'variable', {
		allowWhere: '$text',
		isObject: true
	} );

	editor.model.schema.extend( '$text', {
		allowIn: 'variable'
	} );

	editor.conversion.for( 'editingDowncast' ).add(
		downcastElementToElement( {
			model: 'variable',
			view: ( modelItem, viewWriter ) => {
				const widgetElement = viewWriter.createContainerElement( 'variable' );

				return toWidget( widgetElement, viewWriter );
			}
		} )
	);

	editor.conversion.for( 'dataDowncast' ).add(
		downcastElementToElement( {
			model: 'variable',
			view: 'variable'
		} )
	);

	editor.conversion.for( 'upcast' ).add(
		upcastElementToElement( {
			view: 'variable',
			model: 'variable'
		} )
	);
}

function insertVariable( editor, text ) {
	editor.model.change( writer => {
		const variable = writer.createElement( 'variable' );
		writer.insertText( text, variable );

		writer.insert( variable, editor.model.document.selection.getFirstPosition() );
	} );
}

window.insertVariable = insertVariable;

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, PlaceholderPlugin ],
		toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ],
		image: {
			toolbar: [ 'imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative' ]
		}
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
