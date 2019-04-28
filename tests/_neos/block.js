/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import DomConverter from '@ckeditor/ckeditor5-engine/src/view/domconverter';

// TODO let's move toWidget() to Widget.
import { toWidget, toWidgetEditable, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';

import { insertElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcasthelpers';

import diffToChanges from '@ckeditor/ckeditor5-utils/src/difftochanges';
import diff from '@ckeditor/ckeditor5-utils/src/diff';

// import { stringify } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

export default class Block extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	static get pluginName() {
		return 'Block';
	}

	init() {
		this._repository = this.editor.config.get( 'block.repository' );

		this._setSchema();
		this._setConverters();
		this._setMapping();
		this._setDataPipeline();

		// TODO we should be listening for editor.data#ready, but #1732.
		this.editor.on( 'ready', () => {
			this._setObserver();
		} );
	}

	_setSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'objectBlock', {
			isObject: true,
			allowAttributes: [ 'blockName', 'blockProps', 'blockUid' ],

			// TODO see below.
			allowIn: '$root'
		} );

		schema.register( 'textBlock', {
			allowAttributes: [ 'blockName', 'blockProps', 'blockUid' ],
			allowContentOf: '$root',

			// Theoretically, this shouldn't be needed but without this
			// it's impossible to place the selection in a textBlock,
			// when there's also a objectBlock next to it.
			// TODO this is weird – check it.
			allowIn: '$root'
		} );

		schema.register( 'blockSlot', {
			isLimit: true,
			allowIn: 'objectBlock',
			allowAttributes: [ 'slotName' ],

			// TODO disallow textBlock and objectBlock in blockSlot.
			allowContentOf: '$root'
		} );

		// Allow block and textBlock elements only directly in root.
		schema.addChildCheck( ( context, childDefinition ) => {
			if ( childDefinition.name == 'objectBlock' || childDefinition.name == 'textBlock' ) {
				return context.endsWith( '$root' ) || context.endsWith( '$clipboardHolder' );
			}
		} );
	}

	_setConverters() {
		const editor = this.editor;
		const conversion = editor.conversion;

		// objectBlock --------------------------------------------------------------

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'objectBlock',
			view: ( modelElement, viewWriter ) => {
				// TODO duplicated in the converted for textBlock.
				const templateViewElement = cloneViewElement(
					'editing',
					this._renderBlock( modelElement.getAttribute( 'blockName' ), modelElement.getAttribute( 'blockProps' ) ),
					viewWriter
				);

				viewWriter.setCustomProperty( 'objectBlock', true, templateViewElement );

				const viewSlots = findViewSlots( viewWriter.createRangeIn( templateViewElement ) );
				const modelSlots = findObjectBlockModelSlots( modelElement );

				if ( Object.keys( viewSlots ).sort().join( ',' ) != Object.keys( modelSlots ).sort().join( ',' ) ) {
					throw new Error( 'Different set of slots in the template and in the model.' );
				}

				for ( const slotName of Object.keys( viewSlots ) ) {
					editor.editing.mapper.bindElements( modelSlots[ slotName ], viewSlots[ slotName ] );

					toWidgetEditable( viewSlots[ slotName ], viewWriter );
				}

				return toWidget( templateViewElement, viewWriter );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'objectBlock',
			view: ( modelElement, viewWriter ) => {
				const blockName = modelElement.getAttribute( 'blockName' );
				const blockProps = modelElement.getAttribute( 'blockProps' );
				const blockUid = modelElement.getAttribute( 'blockUid' );

				const wrapperViewElement = viewWriter.createContainerElement( 'ck-objectblock', {
					'data-block-name': blockName,
					'data-block-props': JSON.stringify( blockProps ),
					'data-block-uid': blockUid
				} );

				const templateViewElement = cloneViewElement(
					'data',
					this._renderBlock( blockName, blockProps ),
					viewWriter
				);

				const viewSlots = findViewSlots( viewWriter.createRangeIn( templateViewElement ) );
				const modelSlots = findObjectBlockModelSlots( modelElement );

				if ( Object.keys( viewSlots ).sort().join( ',' ) != Object.keys( modelSlots ).sort().join( ',' ) ) {
					throw new Error( 'Different set of slots in the template and in the model.' );
				}

				for ( const slotName of Object.keys( viewSlots ) ) {
					editor.data.mapper.bindElements( modelSlots[ slotName ], viewSlots[ slotName ] );
				}

				viewWriter.insert( viewWriter.createPositionAt( wrapperViewElement, 0 ), templateViewElement );

				return wrapperViewElement;
			}
		} );

		editor.data.upcastDispatcher.on(
			'element:ck-objectblock',
			prepareObjectBlockUpcastConverter( editor.model, editor.editing.view, editor.data )
		);

		// textBlock ----------------------------------------------------------

		editor.conversion.for( 'editingDowncast' ).add(
			dispatcher => {
				const insertViewElement = insertElement( ( modelElement, viewWriter ) => {
					const templateViewElement = cloneViewElement(
						'editing',
						this._renderBlock( modelElement.getAttribute( 'blockName' ), modelElement.getAttribute( 'blockProps' ) ),
						viewWriter
					);

					viewWriter.setCustomProperty( 'textBlock', true, templateViewElement );

					return templateViewElement;
				} );

				dispatcher.on( 'insert:textBlock', ( evt, data, conversionApi ) => {
					insertViewElement( evt, data, conversionApi );

					// Use the existing "old" mapping created by `insertViewElement()`.
					const templateViewElement = conversionApi.mapper.toViewElement( data.item );
					const viewSlot = findViewSlots( conversionApi.writer.createRangeIn( templateViewElement ) ).main;

					if ( !viewSlot ) {
						throw new Error( 'Text block\'s template does not contain the main slot.' );
					}

					conversionApi.mapper.bindElements( data.item, viewSlot );
				} );
			}
		);

		editor.conversion.for( 'dataDowncast' ).add(
			dispatcher => {
				const insertViewElement = insertElement( ( modelElement, viewWriter ) => {
					const blockName = modelElement.getAttribute( 'blockName' );
					const blockProps = modelElement.getAttribute( 'blockProps' );
					const blockUid = modelElement.getAttribute( 'blockUid' );

					const wrapperViewElement = viewWriter.createContainerElement( 'ck-textblock', {
						'data-block-name': blockName,
						'data-block-props': JSON.stringify( blockProps ),
						'data-block-uid': blockUid
					} );

					const templateViewElement = cloneViewElement(
						'data',
						this._renderBlock( blockName, blockProps ),
						viewWriter
					);

					viewWriter.insert( viewWriter.createPositionAt( wrapperViewElement, 0 ), templateViewElement );

					return wrapperViewElement;
				} );

				dispatcher.on( 'insert:textBlock', ( evt, data, conversionApi ) => {
					insertViewElement( evt, data, conversionApi );

					// Use the existing "old" mapping created by `insertViewElement()`.
					const wrapperViewElement = conversionApi.mapper.toViewElement( data.item );
					const viewSlot = findViewSlots( conversionApi.writer.createRangeIn( wrapperViewElement ) ).main;

					if ( !viewSlot ) {
						throw new Error( 'Text block\'s template does not contain the main slot.' );
					}

					conversionApi.mapper.bindElements( data.item, viewSlot );
				} );
			}
		);

		editor.data.upcastDispatcher.on( 'element:ck-textblock', prepareTextBlockUpcastConverter( editor.model ) );
	}

	// We have many more elements in the view than in the model, so we need to
	// make sure that every position in the view maps to something in the model,
	// and vice versa.
	_setMapping() {
		this.editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.getCustomProperty( 'objectBlock' ) )
		);
	}

	// TODO
	// firing the insert/remove/update events like this, with all the data, is completely non-optimal.
	_setObserver() {
		const editor = this.editor;
		const doc = editor.model.document;
		let previousItems = Array.from( doc.getRoot().getChildren() );

		doc.registerPostFixer( writer => {
			if ( !didRootContentChange( doc ) ) {
				return;
			}

			// Wraps root content in textBlocks.
			// TODO Merges subsequent blocks of the base text type.
			for ( const node of doc.getRoot().getChildren() ) {
				if ( !node.is( 'objectBlock' ) && !node.is( 'textBlock' ) ) {
					const textBlock = textBlockToModelElement( this._repository.getDefinition( { name: 'default' } ), writer, editor.data );

					writer.remove( writer.createRangeIn( textBlock ) );

					writer.wrap( writer.createRangeOn( node ), textBlock );
				}
			}

			// Sets new uids for new nodes (TODO potentially this must be done by the external service).
			// Fires change events.
			const newItems = Array.from( doc.getRoot().getChildren() );
			const changes = diffToChanges( diff( previousItems, newItems ), newItems );

			for ( const change of changes ) {
				if ( change.type == 'insert' ) {
					for ( const block of change.values ) {
						// There are two places where uids are generated for new items.
						// Here, and in the `getDefinition()` call.
						writer.setAttribute( 'blockUid', uid(), block );
					}

					this.fire( 'insert', {
						index: change.index,
						blocks: change.values.map( block => modelElementToBlock( block, editor.data ) )
					} );
				} else {
					this.fire( 'remove', {
						index: change.index,
						howMany: change.howMany
					} );
				}
			}

			previousItems = newItems;
		} );

		doc.on( 'change:data', () => {
			for ( const change of doc.differ.getChanges() ) {
				let changeAncestor;

				if ( change.type == 'remove' || change.type == 'insert' ) {
					changeAncestor = change.position.parent;
				} else {
					changeAncestor = change.range.getCommonAncestor();
				}

				const block = findBlockAncestor( changeAncestor );

				if ( block ) {
					this.fire( 'update', modelElementToBlock( block, editor.data ) );
				}
			}
		} );
	}

	_setDataPipeline() {
		const editor = this.editor;
		const repository = this._repository;

		editor.data.init = function( allRootsData ) {
			if ( typeof allRootsData != 'object' || !Array.isArray( allRootsData.main ) ) {
				throw new Error( 'Wrong data format.' );
			}

			const data = allRootsData.main;

			editor.model.enqueueChange( 'transparent', writer => {
				const modelRoot = this.model.document.getRoot();
				const dataDocFrag = writer.createDocumentFragment();

				for ( const blockData of data ) {
					const node = blockToModelElement( repository.getDefinition( blockData ), writer, editor.data );

					writer.append( node, dataDocFrag );
				}

				writer.insert( dataDocFrag, modelRoot, 0 );
			} );
		};
	}

	_renderBlock( blockName, blockProps ) {
		return new DomConverter().domToView( this._repository.render( blockName, blockProps ) );
	}
}

function blockToModelElement( blockData, writer, dataController ) {
	if ( blockData.type == 'objectBlock' ) {
		return objectBlockToModelElement( blockData, writer, dataController );
	}

	if ( blockData.type == 'textBlock' ) {
		return textBlockToModelElement( blockData, writer, dataController );
	}

	throw new Error( `Wrong block type: "${ blockData.type }".` );
}

function objectBlockToModelElement( blockData, writer, dataController ) {
	const block = writer.createElement( 'objectBlock', {
		blockName: blockData.name,
		blockProps: Object.assign( {}, blockData.props ),
		blockUid: blockData.uid
	} );

	for ( const slotName of Object.keys( blockData.slots ) ) {
		const slotDocFrag = dataController.parse( blockData.slots[ slotName ], 'blockSlot' );

		// Ideally, every slot should have different element name so we can configure schema differently for them.
		const slotContainer = writer.createElement( 'blockSlot', { slotName } );

		writer.append( slotDocFrag, slotContainer );
		writer.append( slotContainer, block );
	}

	return block;
}

function textBlockToModelElement( blockData, writer, dataController ) {
	const slotDocFrag = dataController.parse( blockData.slots.main, 'textBlock' );

	const block = writer.createElement( 'textBlock', {
		blockName: blockData.name,
		blockProps: Object.assign( {}, blockData.props ),
		blockUid: blockData.uid
	} );

	writer.append( slotDocFrag, block );

	return block;
}

function modelElementToBlock( block, dataController ) {
	const slots = {};

	if ( block.is( 'textBlock' ) ) {
		slots.main = dataController.stringify( block );
	} else {
		for ( const slot of block.getChildren() ) {
			slots[ slot.getAttribute( 'slotName' ) ] = dataController.stringify( slot );
		}
	}

	return {
		name: block.getAttribute( 'blockName' ),
		props: block.getAttribute( 'blockProps' ),
		uid: block.getAttribute( 'blockUid' ),
		slots
	};
}

/**
 * @param {'data'|'editing'} pipeline
 * @param element
 * @param writer
 */
function cloneViewElement( pipeline, element, writer ) {
	let clone;

	if ( pipeline == 'editing' && element.getAttribute( 'data-block-slot' ) ) {
		clone = writer.createEditableElement( element.name, element.getAttributes() );
	} else {
		clone = writer.createContainerElement( element.name, element.getAttributes() );
	}

	for ( const child of element.getChildren() ) {
		writer.insert( writer.createPositionAt( clone, 'end' ), cloneViewNode( pipeline, child, writer ) );
	}

	return clone;
}

function cloneViewNode( pipeline, node, writer ) {
	if ( node.is( 'element' ) ) {
		return cloneViewElement( pipeline, node, writer );
	} else {
		return writer.createText( node.data );
	}
}

/**
 * @param {module:engine/view/range~Range}
 */
function findViewSlots( range ) {
	const slots = {};

	for ( const value of range ) {
		if ( value.type == 'elementStart' && value.item.getAttribute( 'data-block-slot' ) ) {
			slots[ value.item.getAttribute( 'data-block-slot' ) ] = value.item;
		}
	}

	return slots;
}

/**
 * @param {module:engine/model/element~Element} parent
 */
function findObjectBlockModelSlots( parent ) {
	const slots = {};

	for ( const child of parent.getChildren() ) {
		if ( child.getAttribute( 'slotName' ) ) {
			slots[ child.getAttribute( 'slotName' ) ] = child;
		} else {
			throw new Error( 'objectBlock must contain only slots.' );
		}
	}

	return slots;
}

// Copy paste from upcasthelpers, but with two changes:
//
// * it doesn't convert the view element children,
// * instead, it converts only the content of slots.
//
// TODO this shouldn't be that hard: https://github.com/ckeditor/ckeditor5-engine/issues/1728
function prepareObjectBlockUpcastConverter( model, view ) {
	return ( evt, data, conversionApi ) => {
		// When element was already consumed then skip it.
		if ( !conversionApi.consumable.test( data.viewItem, { name: true } ) ) {
			return;
		}

		const modelElement = conversionApi.writer.createElement( 'objectBlock', {
			blockName: data.viewItem.getAttribute( 'data-block-name' ),
			blockProps: JSON.parse( data.viewItem.getAttribute( 'data-block-props' ) ),
			blockUid: data.viewItem.getAttribute( 'data-block-uid' )
		} );

		const viewSlots = findViewSlots( view.createRangeIn( data.viewItem.getChild( 0 ) ) );

		for ( const slotName of Object.keys( viewSlots ) ) {
			// Ideally, every slot should have different element name so we can configure schema differently for them.
			const slotContainer = conversionApi.writer.createElement( 'blockSlot', { slotName } );

			conversionApi.writer.append( slotContainer, modelElement );

			conversionApi.convertChildren( viewSlots[ slotName ], conversionApi.writer.createPositionAt( slotContainer, 0 ) );
		}

		// Find allowed parent for element that we are going to insert.
		// If current parent does not allow to insert element but one of the ancestors does
		// then split nodes to allowed parent.
		const splitResult = conversionApi.splitToAllowedParent( modelElement, data.modelCursor );

		// When there is no split result it means that we can't insert element to model tree, so let's skip it.
		if ( !splitResult ) {
			return;
		}

		// Insert element on allowed position.
		conversionApi.writer.insert( modelElement, splitResult.position );

		// Consume appropriate value from consumable values list.
		conversionApi.consumable.consume( data.viewItem, { name: true } );

		const parts = conversionApi.getSplitParts( modelElement );

		// Set conversion result range.
		data.modelRange = model.createRange(
			conversionApi.writer.createPositionBefore( modelElement ),
			conversionApi.writer.createPositionAfter( parts[ parts.length - 1 ] )
		);

		// Now we need to check where the `modelCursor` should be.
		if ( splitResult.cursorParent ) {
			// If we split parent to insert our element then we want to continue conversion in the new part of the split parent.
			//
			// before: <allowed><notAllowed>foo[]</notAllowed></allowed>
			// after:  <allowed><notAllowed>foo</notAllowed><converted></converted><notAllowed>[]</notAllowed></allowed>

			data.modelCursor = conversionApi.writer.createPositionAt( splitResult.cursorParent, 0 );
		} else {
			// Otherwise just continue after inserted element.

			data.modelCursor = data.modelRange.end;
		}
	};
}

// TODO it seems that it can be a normal converter now.
function prepareTextBlockUpcastConverter( model ) {
	return ( evt, data, conversionApi ) => {
		// When element was already consumed then skip it.
		if ( !conversionApi.consumable.test( data.viewItem, { name: true } ) ) {
			return;
		}

		const modelElement = conversionApi.writer.createElement( 'textBlock', {
			blockName: data.viewItem.getAttribute( 'data-block-name' ),
			blockProps: JSON.parse( data.viewItem.getAttribute( 'data-block-props' ) ),
			blockUid: data.viewItem.getAttribute( 'data-block-uid' )
		} );

		// Find allowed parent for element that we are going to insert.
		// If current parent does not allow to insert element but one of the ancestors does
		// then split nodes to allowed parent.
		const splitResult = conversionApi.splitToAllowedParent( modelElement, data.modelCursor );

		// When there is no split result it means that we can't insert element to model tree, so let's skip it.
		if ( !splitResult ) {
			return;
		}

		// Insert element on allowed position.
		conversionApi.writer.insert( modelElement, splitResult.position );

		// Convert children and insert to element.
		conversionApi.convertChildren( data.viewItem, conversionApi.writer.createPositionAt( modelElement, 0 ) );

		// Consume appropriate value from consumable values list.
		conversionApi.consumable.consume( data.viewItem, { name: true } );

		const parts = conversionApi.getSplitParts( modelElement );

		// Set conversion result range.
		data.modelRange = model.createRange(
			conversionApi.writer.createPositionBefore( modelElement ),
			conversionApi.writer.createPositionAfter( parts[ parts.length - 1 ] )
		);

		// Now we need to check where the `modelCursor` should be.
		if ( splitResult.cursorParent ) {
			// If we split parent to insert our element then we want to continue conversion in the new part of the split parent.
			//
			// before: <allowed><notAllowed>foo[]</notAllowed></allowed>
			// after:  <allowed><notAllowed>foo</notAllowed><converted></converted><notAllowed>[]</notAllowed></allowed>

			data.modelCursor = conversionApi.writer.createPositionAt( splitResult.cursorParent, 0 );
		} else {
			// Otherwise just continue after inserted element.

			data.modelCursor = data.modelRange.end;
		}
	};
}

function didRootContentChange( doc ) {
	for ( const change of doc.differ.getChanges() ) {
		if ( ( change.type == 'insert' || change.type == 'remove' ) && change.position.parent.rootName == 'main' ) {
			return true;
		}
	}

	return false;
}

function findBlockAncestor( element ) {
	return element.getAncestors( { includeSelf: true } ).find( element => element.is( 'textBlock' ) || element.is( 'objectBlock' ) );
}

function uid() {
	return Math.floor( Math.random() * 9e4 );
}
