/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '../../src/plugin';

import ArticlePluginSet from '../_utils/articlepluginset';

class ListStyleType extends Plugin {
	init() {
		// Allow `<listItem>` in model having `listStyleType` attribute.
		this.editor.model.schema.extend( 'listItem', {
			allowAttributes: [ 'listStyleType' ]
		} );

		// Provide view -> model converter for `<ul>`/`<ol>` for handling `list-style-type` style.
		//
		// This will be done using a trick. Because we don't represent `<ul>`/`<ol>` in the model and want to set the attribute on
		// `<listItem>` model element, we will provide a converter not for `<ul>`/`<ol>` but for `<li>`. In this converter, we will check if
		// the `<li>` was in a `<ul>`/`<ol>` that had `list-style-type` style. If yes, we will apply an attribute to the `<listItem>`.
		this.editor.conversion.for( 'upcast' ).add( dispatcher => {
			dispatcher.on( 'element:li', upcastListStyleTypeConverter );
		} );

		// Provide model -> view converter for `listStyleType` attribute.
		//
		// Basically, take the first element in the list (all elements from the same list have the same indent) and use it to
		// apply `style` attribute to `<ul>`/`<ol>`.
		this.editor.conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:listStyleType:listItem', ( evt, data, conversionApi ) => {
				if ( !conversionApi.consumable.consume( data.item, evt.name ) ) {
					return;
				}

				// Handle only the first element in the list.
				const prev = data.item.previousSibling;

				if ( prev && prev.is( 'listItem' ) && prev.getAttribute( 'listIndent' ) == data.item.getAttribute( 'listIndent' ) ) {
					return;
				}

				// Attribute conversion is fired after element conversion so we can assume that the `<listItem>` already got converted.
				// This means that there is a `<ul>`/`<ol>` in the view that we can modify.
				const viewLi = conversionApi.mapper.toViewElement( data.item );

				// Set or remove style on `<li>` parent.
				if ( data.attributeNewValue == null ) {
					conversionApi.writer.removeStyle( 'list-style-type', viewLi.parent );
				} else {
					conversionApi.writer.setStyle( 'list-style-type', data.attributeNewValue, viewLi.parent );
				}
			} );
		} );

		// Provide a post-fixer that will clear `listStyleType` attribute in case if a list item is renamed (to paragraph, heading...).
		this.editor.model.document.registerPostFixer( writer => {
			let changed = false;

			for ( const entry of this.editor.model.document.differ.getChanges() ) {
				if ( entry.type == 'insert' && entry.name != 'listItem' && entry.name != '$text' ) {
					const item = entry.position.nodeAfter;

					if ( item.hasAttribute( 'listStyleType' ) ) {
						writer.removeAttribute( 'listStyleType', item );

						changed = true;
					}
				}
			}

			return changed;
		} );

		// Provide a post-fixer that will guarantee that all list items in the same list have the same `listStyleType`.
		// `listStyleType` may mess-up in a few cases: collaboration (when changes are done simultaneously), when list item is outdented
		// (sublist might have had a different list style), when list is broken (when bigger chunk of content is pasted in the
		// middle of a list) or when list items are pasted (they might have different list style than the list they are pasted into).
		this.editor.model.document.registerPostFixer( writer => {
			let changed = false;

			// Check each list only once. For each changed/added/removed `listItem` store the head of that list and then, for all the
			// changed list, run fixing algorithm.
			const listHeads = new Set();

			for ( const entry of this.editor.model.document.differ.getChanges() ) {
				// `entry.name` covers insertions and removals, `entry.attributeKey` covers attribute changes.
				if ( entry.name == 'listItem' || entry.attributeKey && entry.attributeKey.indexOf( 'list' ) == 0 ) {
					const head = getListHead( entry.position || entry.range.start );

					if ( head ) {
						listHeads.add( head );
					}
				}
			}

			for ( const item of listHeads ) {
				// Keep `changed` set to `true` if `checkListStyleType` returned `false`.
				changed = fixListStyleType( writer, item ) || changed;
			}

			return changed;
		} );
	}
}

function getListHead( position ) {
	let prev = position.nodeBefore;

	if ( !prev || !prev.is( 'listItem' ) ) {
		// Happens when the first list item was removed.
		const next = position.nodeAfter;

		if ( !next || !next.is( 'listItem' ) ) {
			// Happens when the whole list was removed.
			return null;
		}

		return next;
	}

	// Find the first list item in this list.
	while ( prev.previousSibling && prev.previousSibling.is( 'listItem' ) ) {
		prev = prev.previousSibling;
	}

	return prev;
}

function fixListStyleType( writer, item ) {
	let changed = false;

	const styleTypeForIndent = {};
	let lastIndent = item.getAttribute( 'listIndent' );
	let lastType = item.getAttribute( 'listType' );

	// Look through all items in the list.
	while ( item && item.is( 'listItem' ) ) {
		const indent = item.getAttribute( 'listIndent' );
		const type = item.getAttribute( 'listType' );

		const styleType = item.getAttribute( 'listStyleType' );

		// If we are leaving a list level (going "up"), forget the information about this level.
		if ( lastIndent > indent ) {
			delete styleTypeForIndent[ lastIndent ];
		}

		// If `listType` differs, it means that we are entering a different list,
		// forget the information about this level (this can happen only on `0` indent).
		if ( lastType != type ) {
			delete styleTypeForIndent[ indent ];
		}

		lastIndent = indent;
		lastType = type;

		// If this is the first item on this list level, save style type for this level.
		// If any item on this level will have different `listStyleType`, it will be changed.
		if ( !styleTypeForIndent[ indent ] ) {
			styleTypeForIndent[ indent ] = styleType;
		}

		if ( styleTypeForIndent[ indent ] != styleType ) {
			writer.setAttribute( 'listStyleType', styleTypeForIndent[ indent ], item );

			changed = true;
		}

		item = item.nextSibling;
	}

	return changed;
}

function upcastListStyleTypeConverter( evt, data, conversionApi ) {
	const viewLi = data.viewItem;
	const viewList = viewLi.parent;

	if ( !conversionApi.consumable.consume( viewList, { styles: 'list-style-type' } ) ) {
		return;
	}

	// Note: this converter will be fired after the default `<li>` converter. This means that `<listItem>` is already created in the model.
	// All we need to do is "find it" and apply `listStyleType` on it.
	//
	// `data.modelRange` is a range on all elements inserted by the previous converter(s).
	//
	// The range should always start before the first inserted element. We can use this information to apply `listStyleType` to the first
	// inserted `<listItem>` (note that multiple `<listItem>`s might have been added if the `<li>` contained sub-list).
	//
	// Then, the post-fixer will apply the missing `listStyleType` attribute on appropriate `<listItem>`s.
	const modelListItem = data.modelRange.start.nodeAfter;

	conversionApi.writer.setAttribute( 'listStyleType', viewList.getStyle( 'list-style-type' ), modelListItem );
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ ArticlePluginSet, ListStyleType ],
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
