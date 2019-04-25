/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console, window, document, DOMParser */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import ArticlePluginSet from '../_utils/articlepluginset';
import Block from '../_neos/block';
import MagicBlock from '../_neos/magicblock';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, Block, MagicBlock ],
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
		},
		block: {
			defaultTextBlock: {
				type: 'textBlock',
				slot: '<p></p>',

				render() {
					return d( `
						<div class="block block-text">
							<div class="block-content" data-block-slot=true></div>
						</div>
					` );
				}
			}
		},
		initialData: {
			main: [
				// {
				// 	type: 'textBlock',
				// 	slot: '<h1>I\'m totally editable</h1><p>Text block content...</p>',
				// 	render() {
				// 		return d( `
				// 			<div class="block block-text">
				// 				<div class="block-content" data-block-slot=true></div>
				// 			</div>
				// 		` );
				// 	}
				// },
				//
				{
					type: 'multiBlock',
					slots: {
						heading: '<h1 class="block-heading">Block A</h1>',
						caption: '<p>Content of block A.</p>'
					},
					render() {
						return d( `
							<div class="block block-multi">
								<div class="block-content" data-block-slot=heading></div>
								<img src="http://placekitten.com/700/200" alt="Random kitten" width="700" height="200">
								<div class="block-content" data-block-slot=caption></div>
							</div>
						` );
					}
				},
				//
				// {
				// 	type: 'textBlock',
				// 	slot: '<h1>I\'m totally editable</h1><p>Text block content...</p>',
				// 	render() {
				// 		return d( `
				// 			<div class="block block-text">
				// 				<div class="block-content" data-block-slot=true></div>
				// 			</div>
				// 		` );
				// 	}
				// },
				// {
				// 	type: 'multiBlock',
				// 	render() {
				// 		return d( `
				// 			<div class="block block-multi">
				// 				<h1 class="block-heading">Block B</h1>
				// 				<p>Content of block B.</p>
				// 			</div>
				// 		` );
				// 	}
				// },
				//
				// {
				// 	type: 'multiBlock',
				// 	render() {
				// 		return d( `
				// 			<div class="block block-multi">
				// 				<h1 class="block-heading">Block C</h1>
				// 				<p>Content of block C.</p>
				// 			</div>
				// 		` );
				// 	}
				// },
			]
		}
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );

const parser = new DOMParser();

function d( htmlString ) {
	const doc = parser.parseFromString( htmlString, 'text/html' );

	if ( doc.body.children.length != 1 ) {
		throw Error( 'Block\'s render() callback must return exactly one element' );
	}

	return doc.body.firstElementChild;
}
