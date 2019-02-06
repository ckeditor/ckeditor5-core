/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ModelSelection from '@ckeditor/ckeditor5-engine/src/model/selection';
import DocumentSelection from '@ckeditor/ckeditor5-engine/src/model/documentselection';

class AddClassToAllLinks extends Plugin {
	init() {
		this.editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:linkHref', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;
				const viewSelection = viewWriter.document.selection;
				const viewElement = viewWriter.createAttributeElement( 'a', { class: 'my-class' }, { priority: 5 } );

				if ( data.item instanceof ModelSelection || data.item instanceof DocumentSelection ) {
					viewWriter.wrap( viewSelection.getFirstRange(), viewElement );
				} else {
					viewWriter.wrap( conversionApi.mapper.toViewRange( data.range ), viewElement );
				}
			} );
		} );
	}
}

class AddTargetToExternalLinks extends Plugin {
	init() {
		this.editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:linkHref', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;
				const viewSelection = viewWriter.document.selection;
				const viewElement = viewWriter.createAttributeElement( 'a', { target: '_blank' }, { priority: 5 } );

				if ( data.attributeNewValue.match( /ckeditor\.com/ ) ) {
					viewWriter.unwrap( conversionApi.mapper.toViewRange( data.range ), viewElement );
				} else {
					if ( data.item instanceof ModelSelection || data.item instanceof DocumentSelection ) {
						viewWriter.wrap( viewSelection.getFirstRange(), viewElement );
					} else {
						viewWriter.wrap( conversionApi.mapper.toViewRange( data.range ), viewElement );
					}
				}
			} );
		} );
	}
}

class AddClassToUnsafeLinks extends Plugin {
	init() {
		this.editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:linkHref', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;
				const viewSelection = viewWriter.document.selection;
				const viewElement = viewWriter.createAttributeElement( 'a', { class: 'unsafe-link' }, { priority: 5 } );

				if ( data.attributeNewValue.match( /http:\/\// ) ) {
					if ( data.item instanceof ModelSelection || data.item instanceof DocumentSelection ) {
						viewWriter.wrap( viewSelection.getFirstRange(), viewElement );
					} else {
						viewWriter.wrap( conversionApi.mapper.toViewRange( data.range ), viewElement );
					}
				} else {
					viewWriter.unwrap( conversionApi.mapper.toViewRange( data.range ), viewElement );
				}
			} );
		} );
	}
}

class AddClassToAllHeading1 extends Plugin {
	init() {
		this.editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'insert:heading1', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;

				viewWriter.addClass( 'my-class', conversionApi.mapper.toViewElement( data.item ) );
			} );
		} );
	}
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [
			ArticlePluginSet,

			AddClassToAllLinks,
			AddTargetToExternalLinks,
			AddClassToUnsafeLinks,
			AddClassToAllHeading1
		],
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
