/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, setInterval */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';

import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

import { downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';
import { upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';

import { getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

function MyPlugin( editor ) {
	editor.model.schema.register( 'div', {
		allowIn: [ '$root', 'div' ],
		isObject: true
	} );

	editor.model.schema.extend( '$text', {
		allowIn: 'div'
	} );

	editor.conversion.for( 'downcast' ).add( downcastElementToElement( {
		model: 'div',
		view: ( modelElement, writer ) => {
			return toWidget( writer.createContainerElement( 'div', { class: 'widget' } ), writer );
		}
	} ) );

	editor.conversion.for( 'upcast' ).add( upcastElementToElement( {
		model: 'div',
		view: 'div'
	} ) );
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, Widget, MyPlugin ],
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

		setInterval( () => {
			console.log( getData( editor.model ) );
		}, 3000 );
	} )
	.catch( err => {
		console.error( err.stack );
	} );
