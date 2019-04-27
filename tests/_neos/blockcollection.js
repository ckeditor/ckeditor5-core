/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global DOMParser */

import { throttle } from 'lodash';

export default class BlockCollection {
	constructor( initialData ) {
		this._data = initialData;
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
		const throttledRender = throttle( () => this._render(), 100 );

		blockPlugin.on( 'insert', ( evt, change ) => {
			this._data.splice( change.index, 0, ...change.blocks );

			throttledRender();
		} );

		blockPlugin.on( 'remove', ( evt, change ) => {
			this._data.splice( change.index, change.howMany );

			throttledRender();
		} );
	}

	_render() {
		this._container.innerHTML = '';

		for ( const blockData of this._data ) {
			const container = d( `
				<table class="data-console-block">
					<tr>
						<th>uid</th>
						<td>${ blockData.uid }</td>
					</tr>
					<tr>
						<th>name</th>
						<td>${ blockData.name }</td>
					</tr>
					<tr>
						<th>props</th>
						<td>${ formatObject( blockData.props || {} ) }</td>
					</tr>
					<tr>
						<th>slots</th>
						<td>${ formatObject( blockData.slots || {} ) }</td>
					</tr>
				</table>
			` );

			this._container.appendChild( container );
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
		html += `<li><code>${ prop }</code>: <code>${ formatValue( obj[ prop ] ) }</code></li>`;
	}

	return `<ul>${ html }</ul>`;
}

function formatValue( value ) {
	if ( typeof value == 'number' ) {
		return value;
	}

	return value.slice( 0, 50 ).replace( /</g, '&lt;' );
}
