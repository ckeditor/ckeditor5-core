/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, document, window */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import ColorPicker from './colorpicker.js';
import ArticlePluginSet from '../../_utils/articlepluginset';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet ],
		toolbar: [ 'headings', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ],
		image: {
			toolbar: [ 'imageStyleFull', 'imageStyleSide', '|', 'imageTextAlternative' ]
		}
	} )
	.then( editor => {
		window.editor = editor;
		window.colorPicker = new ColorPicker();
	} )
	.catch( err => {
		console.error( err.stack );
	} );
