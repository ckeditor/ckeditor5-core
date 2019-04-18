/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';

import indexOf from '@ckeditor/ckeditor5-utils/src/dom/indexof';

function MagicBlocks( editor ) {
	const editingView = editor.editing.view;
	const viewRoot = editingView.document.getRoot();

	editingView.document.registerPostFixer( writer => {
		// Cloning so we're sure we can make modifications as we iterate (without affecting the loop).
		let children = Array.from( viewRoot.getChildren() );

		for ( const child of children ) {
			if ( child.is( 'uiElement' ) && child.hasClass( 'magic-block' ) ) {
				if ( !isMagicBlockStillNeeded( child ) ) {
					writer.remove( child );

					continue;
				}
			}
		}

		children = Array.from( viewRoot.getChildren() );

		for ( const child of children ) {
			if ( !child.is( 'containerElement' ) ) {
				continue;
			}

			if ( !child.previousSibling && isWidget( child ) ) {
				insertMagicBlockAt( writer, writer.createPositionBefore( child ) );
			}

			if ( isWidget( child ) && ( !child.nextSibling || isWidget( child.nextSibling ) ) ) {
				insertMagicBlockAt( writer, writer.createPositionAfter( child ) );
			}
		}
	} );

	editor.ui.on( 'ready', () => {
		const domRoot = editingView.getDomRoot();

		domRoot.addEventListener( 'mousedown', evt => {
			if ( evt.target.classList.contains( 'magic-block' ) ) {
				const viewPosition = editingView.domConverter.domPositionToView( evt.target.parentNode, indexOf( evt.target ) );
				const modelPosition = editor.editing.mapper.toModelPosition( viewPosition );

				editor.model.change( writer => {
					const paragraph = writer.createElement( 'paragraph' );

					writer.insert( paragraph, modelPosition );
					writer.setSelection( paragraph, 0 );
				} );
			}
		} );
	} );

	function insertMagicBlockAt( writer, position ) {
		const magicBlock = writer.createUIElement( 'p', { class: 'magic-block' }, function( domDocument ) {
			const domElement = this.toDomElement( domDocument );

			domElement.textContent = '\u00a0';

			return domElement;
		} );

		writer.insert( position, magicBlock );
	}

	function isMagicBlockStillNeeded( magicBlock ) {
		if ( !magicBlock.previousSibling && isWidget( magicBlock.nextSibling ) ) {
			return true;
		}

		if ( !magicBlock.nextSibling && isWidget( magicBlock.previousSibling ) ) {
			return true;
		}

		if ( isWidget( magicBlock.previousSibling ) && isWidget( magicBlock.nextSibling ) ) {
			return true;
		}

		return false;
	}

	function isWidget( node ) {
		if ( !node.is( 'element' ) ) {
			return false;
		}

		return !!node.getCustomProperty( 'widget' );
	}
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, MagicBlocks ],
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
