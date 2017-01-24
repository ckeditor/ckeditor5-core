/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module core/command/helpers/getschemavalidranges
 */

import TreeWalker from '@ckeditor/ckeditor5-engine/src/model/treewalker';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';
import Position from '@ckeditor/ckeditor5-engine/src/model/position';

/**
 * Walks through given array of ranges and removes parts of them that are not allowed by passed schema to have the
 * attribute set. This is done by breaking a range in two and omitting the not allowed part.
 *
 * @param {String} attribute Attribute key.
 * @param {Array.<module:engine/model/range~Range>} ranges Ranges to be validated.
 * @param {module:engine/model/schema~Schema} schema Document schema.
 * @returns {Array.<module:engine/model/range~Range>} Ranges without invalid parts.
 */
export default function getSchemaValidRanges( attribute, ranges, schema ) {
	const validRanges = [];

	for ( let range of ranges ) {
		const walker = new TreeWalker( { boundaries: range, mergeCharacters: true } );
		let step = walker.next();

		let last = range.start;
		let from = range.start;
		let to = range.end;

		while ( !step.done ) {
			const name = step.value.item.name || '$text';
			const itemPosition = Position.createBefore( step.value.item );

			if ( !schema.check( { name: name, inside: itemPosition, attributes: attribute } ) ) {
				if ( !from.isEqual( last ) ) {
					validRanges.push( new Range( from, last ) );
				}

				from = walker.position;
			}

			last = walker.position;
			step = walker.next();
		}

		if ( from && !from.isEqual( to ) ) {
			validRanges.push( new Range( from, to ) );
		}
	}

	return validRanges;
}
