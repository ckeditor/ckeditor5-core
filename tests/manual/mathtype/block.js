/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console:false, document, window, CKEditorInspector */

import BalloonEditor from '@ckeditor/ckeditor5-editor-balloon/src/ballooneditor';
import BlockToolbar from '@ckeditor/ckeditor5-ui/src/toolbar/block/blocktoolbar';
import ArticlePluginSet from '@ckeditor/ckeditor5-core/tests/_utils/articlepluginset';
import Aligment from '@ckeditor/ckeditor5-alignment/src/alignment';
import Underline from '@ckeditor/ckeditor5-basic-styles/src/underline';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code';
import Strikethrough from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import Subscript from '@ckeditor/ckeditor5-basic-styles/src/subscript';
import Superscript from '@ckeditor/ckeditor5-basic-styles/src/superscript';
import EasyImage from '@ckeditor/ckeditor5-easy-image/src/easyimage';
import Font from '@ckeditor/ckeditor5-font/src/font';
import Highlight from '@ckeditor/ckeditor5-highlight/src/highlight';
import Indent from '@ckeditor/ckeditor5-indent/src/indent';
import Mention from '@ckeditor/ckeditor5-mention/src/mention';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import RemoveFormat from '@ckeditor/ckeditor5-remove-format/src/removeformat';
import MathType from '@wiris/mathtype-ckeditor5';

import { CS_CONFIG } from '@ckeditor/ckeditor5-cloud-services/tests/_utils/cloud-services-config';

window.editors = {};

BalloonEditor
	.create( document.querySelector( '#editor1' ), {
		plugins: [
			ArticlePluginSet,
			BlockToolbar,
			MathType
		],
		blockToolbar: [ 'heading', '|', 'undo', 'redo', '|', 'MathType', 'ChemType' ],
		toolbar: [ 'bold', 'italic' ]
	} )
	.then( newEditor => {
		console.log( 'Editor was initialized', newEditor );
		console.log( 'You can now play with it using global `editor`.' );

		CKEditorInspector.attach( 'first', newEditor );
		window.editors.first = newEditor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );

BalloonEditor
	.create( document.querySelector( '#editor2' ), {
		cloudServices: CS_CONFIG,
		plugins: [
			BlockToolbar,
			ArticlePluginSet,
			Aligment,
			Underline,
			Strikethrough,
			Code,
			Subscript,
			Superscript,
			EasyImage,
			Font,
			Highlight,
			Indent,
			Mention,
			PasteFromOffice,
			RemoveFormat,
			MathType
		],
		blockToolbar: [
			'heading', 'alignment', '|',
			'blockQuote', 'imageUpload', 'mediaEmbed', 'insertTable', '|',
			'bulletedList', 'numberedList', 'indent', 'outdent', '|', 'undo', 'redo', '|',
			'MathType', 'ChemType'
		],
		toolbar: [
			'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', 'highlight', '|',
			'bold', 'italic', 'underline', 'strikethrough', 'code', 'subscript', 'superscript', 'removeFormat', '|',
			'link'
		],
		image: {
			toolbar: [ 'imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative' ]
		},
		mediaEmbed: {
			previewsInData: true,
			toolbar: [ 'blockQuote' ]
		},
		mention: {
			feeds: [
				{
					marker: '@',
					feed: getFeed,
					itemRenderer: item => {
						const span = document.createElement( 'span' );

						span.classList.add( 'custom-item' );
						span.id = `mention-list-item-id-${ item.itemId }`;

						span.innerHTML = `${ item.name } <span class="custom-item-username">${ item.id }</span>`;

						return span;
					}
				},
				{
					marker: '#',
					feed: [
						{ id: '#1002', text: 'Some bug in editor' },
						{ id: '#1003', text: 'Introduce this feature' },
						{ id: '#1004', text: 'Missing docs' },
						{ id: '#1005', text: 'Another bug' },
						{ id: '#1006', text: 'More bugs' }
					],
					itemRenderer: item => `Issue ${ item.id }: ${ item.text }`
				}
			]
		},
		table: {
			contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells' ],
			tableToolbar: [ 'bold', 'italic' ]
		}
	} )
	.then( newEditor => {
		console.log( 'Editor was initialized', newEditor );
		console.log( 'You can now play with it using global `editors`.' );

		CKEditorInspector.attach( 'second', newEditor );
		window.editors.second = newEditor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );

function getFeed( feedText ) {
	return Promise.resolve( [
		{ itemId: '1', name: 'Barney Stinson', id: '@swarley' },
		{ itemId: '2', name: 'Lily Aldrin', id: '@lilypad' },
		{ itemId: '3', name: 'Marshall Eriksen', id: '@marshmallow' },
		{ itemId: '4', name: 'Robin Scherbatsky', id: '@rsparkles' },
		{ itemId: '5', name: 'Ted Mosby', id: '@tdog' }
	].filter( item => {
		const searchString = feedText.toLowerCase();

		return item.name.toLowerCase().includes( searchString ) || item.id.toLowerCase().includes( searchString );
	} ) );
}
