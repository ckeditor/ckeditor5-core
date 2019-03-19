/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global document, console, window */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import Clipboard from '@ckeditor/ckeditor5-clipboard/src/clipboard';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import List from '@ckeditor/ckeditor5-list/src/list';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

class SecondImageCaption extends Plugin {
	init() {
		const editor = this.editor;

		// Allow type attribute on caption in the model - it will store the type of caption.
		editor.model.schema.extend( 'caption', {
			allowAttributes: [ 'type' ]
		} );

		// Convert the class on figcaption to 'type' attribute in the model
		editor.conversion.for( 'upcast' ).attributeToAttribute( {
			view: {
				name: 'figcaption',
				key: 'class',
				value: /figure-[\S]+/
			},
			model: {
				key: 'type',
				value: viewElement => {
					const regexp = /figure-([\S]+)/;

					const match = viewElement.getAttribute( 'class' ).match( regexp );

					return match[ 1 ];
				}
			}
		} );

		// Convert 'type' attribute from the model to the view.
		editor.conversion.for( 'downcast' ).attributeToAttribute( {
			model: {
				name: 'caption',
				key: 'type'
			},
			view: modelAttributeValue => ( { key: 'class', value: `figure-${ modelAttributeValue }` } )
		} );

		editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'insert:caption', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;

				const modelCaption = data.item;

				// Check only the "title" caption the legend will be put below the <img>.
				if ( modelCaption.getAttribute( 'type' ) == 'title' ) {
					const viewCaption = conversionApi.mapper.toViewElement( modelCaption );

					// Only fix caption if it is placed after the image (is second child of the <figure>.
					if ( viewCaption.index === 1 ) {
						// Move the entire caption element to the first position in <figure>
						viewWriter.move( viewWriter.createRangeOn( viewCaption ), viewWriter.createPositionAt( viewCaption.parent, 0 ) );
					}
				}
				// Use the "lowest" priority to be sure that caption was already converted and is in the view.
			}, { priority: 'lowest' } );
		} );
	}
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [
			Enter, Typing, Paragraph, Heading, Image, ImageCaption, SecondImageCaption, Undo, Clipboard, Bold, Italic, Heading, List
		],
		toolbar: [ 'heading', '|', 'undo', 'redo', 'bold', 'italic', 'bulletedList', 'numberedList' ],
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
