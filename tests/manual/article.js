/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, setTimeout */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import { downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';

import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

import { getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

const previewService = {
	_previews: new Map(),

	get( id ) {
		return new Promise( resolve => {
			if ( this._previews.has( id ) ) {
				return resolve( this._previews.get( id ) );
			}

			setTimeout( () => {
				const preview = `PREVIEW:${ id }:${ Math.random() }`;

				this._previews.set( id, preview );

				resolve( preview );
			}, 2000 );
		} );
	}
};

class Media extends Plugin {
	init() {
		const editor = this.editor;

		editor.model.schema.register( 'media', {
			allowAttributes: 'id',
			isBlock: true,
			isObject: true,
			allowWhere: '$block'
		} );

		editor.conversion.for( 'editingDowncast' ).add(
			downcastElementToElement( {
				model: 'media',
				view: ( modelElement, viewWriter ) => {
					const viewElement = viewWriter.createUIElement( 'div', { class: 'media' }, function( domDocument ) {
						const domElement = this.toDomElement( domDocument );

						domElement.innerText = 'PLACEHOLDER';

						if ( modelElement.hasAttribute( 'id' ) ) {
							previewService
								.get( modelElement.getAttribute( 'id' ) )
								.then( preview => {
									domElement.innerText = preview;
								} );
						}

						return domElement;
					} );

					toWidget( viewElement, viewWriter );

					return viewElement;
				}
			} )
		);
	}
}

window.insertMedia = function( id ) {
	const editor = window.editor;

	editor.model.change( writer => {
		const mediaElement = writer.createElement( 'media', { id } );

		console.log( mediaElement );
		console.log( getData( editor.model ) );

		editor.model.insertContent( mediaElement );
	} );
};

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Essentials, Paragraph, Widget, Media ]
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
