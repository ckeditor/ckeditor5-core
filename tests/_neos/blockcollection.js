/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global DOMParser, document, console */

import { throttle } from 'lodash';

export default class BlockCollection {
	constructor( initialData ) {
		this._data = initialData;
		this._modifiedBlocks = [];

		// TODO hack for incorrect init order (selection is changed before we start to observe the editor).
		this._selectedBlockUid = initialData[ 0 ].uid;
	}

	getData() {
		return this._data;
	}

	renderTo( container ) {
		this._container = container;

		this._render();
	}

	observe( editor ) {
		const blockPlugin = editor.plugins.get( 'Block' );
		const throttledRender = throttle( () => this._render(), 100, { leading: false } );

		blockPlugin.on( 'insert', ( evt, change ) => {
			console.log( '#insert', change );

			this._data.splice( change.index, 0, ...change.blocks );

			this._modifiedBlocks.push( ...change.blocks.map( block => block.uid ) );

			throttledRender();
		} );

		blockPlugin.on( 'remove', ( evt, change ) => {
			console.log( '#remove', change );

			this._data.splice( change.index, change.howMany );

			throttledRender();
		} );

		blockPlugin.on( 'update', ( evt, changedBlock ) => {
			console.log( '#update', changedBlock );

			const index = this._data.findIndex( block => block.uid === changedBlock.uid );

			this._data.splice( index, 1, changedBlock );

			this._modifiedBlocks.push( changedBlock.uid );

			throttledRender();
		} );

		blockPlugin.on( 'select', ( evt, selectedBlockUid ) => {
			console.log( '#select', selectedBlockUid );

			this._selectedBlockUid = selectedBlockUid;

			this._renderSelection();
		} );
	}

	_render() {
		this._container.innerHTML = '';

		for ( const blockData of this._data ) {
			const container = d( `
				<table class="console-block" id="console-block-${ blockData.uid }">
					<tr class="block-core-data">
						<th rowspan=3>
							#${ blockData.uid }<br>
							${ blockData.name }
						</th>
					</tr>
					<tr class="block-additional-data">
						<th>props</th>
						<td colspan=3>${ formatObject( blockData.props || {} ) }</td>
					</tr>
					<tr class="block-additional-data">
						<th>slots</th>
						<td colspan=3>${ formatObject( blockData.slots || {} ) }</td>
					</tr>
				</table>
			` );

			this._container.appendChild( container );
		}

		for ( const uid of new Set( this._modifiedBlocks ) ) {
			const dataBlock = document.getElementById( `console-block-${ uid }` );

			dataBlock.classList.add( 'console-block-modified' );
		}

		this._modifiedBlocks = [];

		this._renderSelection();
	}

	_renderSelection() {
		document
			.querySelectorAll( '.console-block-selected' )
			.forEach( element => element.classList.remove( 'console-block-selected' ) );

		const selectedDataBlock = document.getElementById( `console-block-${ this._selectedBlockUid }` );

		if ( selectedDataBlock ) {
			selectedDataBlock.classList.add( 'console-block-selected' );
		}
	}
}

const parser = new DOMParser();

function d( htmlString ) {
	const doc = parser.parseFromString( htmlString, 'text/html' );

	return doc.body.firstElementChild;
}

function formatObject( obj ) {
	let html = '';

	for ( const prop of Object.keys( obj ) ) {
		html +=
			`<li>
				<code class="property-name">${ prop }</code>:
				<code class="property-value">${ formatValue( obj[ prop ] ) }</code>
			</li>`;
	}

	return `<ul>${ html }</ul>`;
}

function formatValue( value ) {
	if ( typeof value == 'number' ) {
		return value;
	}

	return value.slice( 0, 70 ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' );
}
