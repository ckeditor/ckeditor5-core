/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';
import Plugin from '../../src/plugin';

class JSONData extends Plugin {
	static get pluginName() {
		return 'JSONData';
	}

	init() {
		this._initDataPipeline();
	}

	/**
	 * Initialize the editor data pipeline.
	 *
	 * @private
	 */
	_initDataPipeline() {
		const editor = this.editor;

		// Override the data initialisation process - supports only direct JSON input.
		editor.data.init = function( allRootsData ) {
			const parsedData = JSON.parse( allRootsData.trim() );

			editor.model.enqueueChange( 'transparent', writer => {
				const root = editor.model.document.getRoot( parsedData.root );

				createChildren( writer, root, parsedData.children );
			} );
		};

		// Override stringify method used by `editor.getData()`.
		editor.data.stringify = modelElementOrFragment => {
			const data = {
				// Supports only stringification of a root element.
				root: modelElementOrFragment.toJSON(),
				children: Array.from( modelElementOrFragment.getChildren() ).map( child => child.toJSON() )
			};

			return JSON.stringify( data );
		};
	}
}

/**
 * Creates children from passed definitions.
 *
 * @param {module:engine/model/writer~Writer} writer
 * @param {module:engine/model/element~Element} parentElement
 * @param {Array.<Object>} childrenData
 */
function createChildren( writer, parentElement, childrenData = [] ) {
	for ( const child of childrenData ) {
		if ( !child.name ) {
			writer.appendText( child.data, child.attributes, parentElement );
		} else {
			const childElement = writer.createElement( child.name, child.attributes );

			writer.append( childElement, parentElement );

			createChildren( writer, childElement, child.children );
		}
	}
}

function createEditor( data, parent ) {
	return ClassicEditor
		.create( data, {
			plugins: [ ArticlePluginSet, JSONData ],
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

			parent.appendChild( editor.ui.element );
		} )
		.catch( err => {
			console.error( err.stack );
		} );
}

const updateButton = document.getElementById( 'update' );
const initButton = document.getElementById( 'init' );
const destroyButton = document.getElementById( 'destroy' );
const prettyPrint = document.getElementById( 'pretty-print' );

updateButton.addEventListener( 'click', updateData );
prettyPrint.addEventListener( 'change', updateData );

initButton.addEventListener( 'click', () => {
	initButton.disabled = true;

	const data = document.getElementById( 'data' ).value;

	createEditor( data, document.getElementById( 'editor' ) ).then( () => {
		updateButton.disabled = false;
		prettyPrint.disabled = false;
		destroyButton.disabled = false;
	} );
} );

destroyButton.addEventListener( 'click', () => {
	updateButton.disabled = true;
	prettyPrint.disabled = true;
	destroyButton.disabled = true;

	window.editor.destroy()
		.then( () => {
			window.editor.ui.element.remove();
			window.editor = null;
			initButton.disabled = false;
		} );
} );

function updateData() {
	let data = window.editor.getData();

	const isPrettyPrint = prettyPrint.checked;

	if ( isPrettyPrint ) {
		data = JSON.stringify( JSON.parse( data ), undefined, '\t' );
	}

	document.getElementById( 'data' ).value = data;
}
