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

import ViewPosition from '@ckeditor/ckeditor5-engine/src/view/position';

import {
	downcastElementToElement,
	downcastAttributeToAttribute
} from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';

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
					const viewContainerElement = viewWriter.createContainerElement( 'div', { class: 'media' } );

					toWidget( viewContainerElement, viewWriter );

					const viewMediaElement = viewWriter.createUIElement( 'div', { class: 'media-preview' }, function( domDocument ) {
						const domElement = this.toDomElement( domDocument );

						domElement.innerText = 'PLACEHOLDER';

						return domElement;
					} );

					viewWriter.insert( ViewPosition.createAt( viewContainerElement, 0 ), viewMediaElement );

					return viewContainerElement;
				}
			} )
		);

		editor.conversion.for( 'editingDowncast' ).add(
			downcastAttributeToAttribute( {
				model: {
					name: 'media',
					key: 'id'
				},
				view: ( value, data ) => {
					if ( value == null ) {
						return;
					}

					// It should be a bit easier: https://github.com/ckeditor/ckeditor5-engine/issues/1586
					const mapper = editor.editing.mapper;
					const domConverter = editor.editing.view.domConverter;

					const modelElement = data.item;
					const viewElement = mapper.toViewElement( modelElement );
					const viewMediaElement = viewElement.getChild( 0 );

					previewService
						.get( value )
						.then( preview => {
							const domMediaElement = domConverter.mapViewToDom( viewMediaElement );

							domMediaElement.innerText = preview;
						} );
				}
			} )
		);
	}
}

window.insertMedia = function( id ) {
	const editor = window.editor;

	editor.model.change( writer => {
		const mediaElement = writer.createElement( 'media', { id } );

		editor.model.insertContent( mediaElement );

		console.log( getData( editor.model ) );
	} );
};

window.changeMediaId = function( newId ) {
	const editor = window.editor;

	const selectedElement = editor.model.document.selection.getSelectedElement();

	if ( !selectedElement || selectedElement.name != 'media' ) {
		console.log( 'No media selected' );

		return;
	}

	editor.model.change( writer => {
		writer.setAttribute( 'id', newId, selectedElement );

		console.log( getData( editor.model ) );
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
