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

	return value.slice( 0, 70 ).replace( /</g, '&lt;' );
}
