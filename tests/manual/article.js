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
	editor.model.schema.register( 'placeholder', {
		allowWhere: '$text',
		isObject: true
	} );

	editor.model.schema.extend( '$text', {
		allowIn: 'placeholder'
	} );

	editor.conversion.for( 'editingDowncast' ).add(
		downcastElementToElement( {
			model: 'placeholder',
			view: ( modelItem, viewWriter ) => {
				const widgetElement = viewWriter.createContainerElement( 'placeholder' );

				return toWidget( widgetElement, viewWriter );
			}
		} )
	);

	editor.conversion.for( 'dataDowncast' ).add(
		downcastElementToElement( {
			model: 'placeholder',
			view: 'placeholder'
		} )
	);

	editor.conversion.for( 'upcast' ).add(
		upcastElementToElement( {
			view: 'placeholder',
			model: 'placeholder'
		} )
	);
}

function insertPlaceholder( editor, text ) {
	editor.model.change( writer => {
		const placeholder = writer.createElement( 'placeholder' );
		writer.insertText( text, placeholder );

		writer.insert( placeholder, editor.model.document.selection.getFirstPosition() );
	} );
}

window.insertPlaceholder = insertPlaceholder;

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
