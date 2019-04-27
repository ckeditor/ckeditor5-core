/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import DomConverter from '@ckeditor/ckeditor5-engine/src/view/domconverter';

import DowncastWriter from '@ckeditor/ckeditor5-engine/src/view/downcastwriter';

// TODO let's move toWidget() to Widget.
import { toWidget, toWidgetEditable, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';

import { insertElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcasthelpers';

// import { stringify } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

export default class Block extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._setSchema();
		this._setConverters();
		this._setMapping();
		this._setDataPipeline();
		this._fixRoot();
	}

	_setSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'multiBlock', {
			isObject: true,
			allowAttributes: [ 'template' ],

			// TODO see below.
			allowIn: '$root'
		} );

		schema.register( 'textBlock', {
			allowAttributes: [ 'template' ],
			allowContentOf: '$root',

			// Theoretically, this shouldn't be needed but without this
			// it's impossible to place the selection in a textBlock,
			// when there's also a multiBlock next to it.
			// TODO this is weird – check it.
			allowIn: '$root'
		} );

		schema.register( 'blockSlot', {
			isLimit: true,
			allowIn: 'multiBlock',
			allowAttributes: [ 'slotName' ],

			// TODO disallow textBlock and multiBlock in blockSlot.
			allowContentOf: '$root'
		} );

		// Allow block and textBlock elements only directly in root.
		schema.addChildCheck( ( context, childDefinition ) => {
			if ( childDefinition.name == 'multiBlock' || childDefinition.name == 'textBlock' ) {
				return context.endsWith( '$root' ) || context.endsWith( '$clipboardHolder' );
			}
		} );
	}

	_setConverters() {
		const editor = this.editor;
		const conversion = editor.conversion;

		// multiBlock --------------------------------------------------------------

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'multiBlock',
			view: ( modelElement, viewWriter ) => {
				const viewElement = cloneViewElement( 'editing', modelElement.getAttribute( 'template' ), viewWriter );

				viewWriter.setCustomProperty( 'multiBlock', true, viewElement );

				const viewSlots = findMultiBlockViewSlots( viewWriter.createRangeIn( viewElement ) );
				const modelSlots = findMultiBlockModelSlots( modelElement );

				if ( Object.keys( viewSlots ).sort().join( ',' ) != Object.keys( modelSlots ).sort().join( ',' ) ) {
					throw new Error( 'Different set of slots in the template and in the model.' );
				}

				for ( const slotName of Object.keys( viewSlots ) ) {
					editor.editing.mapper.bindElements( modelSlots[ slotName ], viewSlots[ slotName ] );

					toWidgetEditable( viewSlots[ slotName ], viewWriter );
				}

				return toWidget( viewElement, viewWriter );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'multiBlock',
			view: ( modelElement, viewWriter ) => {
				const viewElement = viewWriter.createContainerElement( 'ck-multiblock' );

				const template = cloneViewElement( 'data', modelElement.getAttribute( 'template' ), viewWriter );

				const viewSlots = findMultiBlockViewSlots( viewWriter.createRangeIn( template ) );
				const modelSlots = findMultiBlockModelSlots( modelElement );

				if ( Object.keys( viewSlots ).sort().join( ',' ) != Object.keys( modelSlots ).sort().join( ',' ) ) {
					throw new Error( 'Different set of slots in the template and in the model.' );
				}

				for ( const slotName of Object.keys( viewSlots ) ) {
					editor.data.mapper.bindElements( modelSlots[ slotName ], viewSlots[ slotName ] );
				}

				viewWriter.insert( viewWriter.createPositionAt( viewElement, 0 ), template );

				return viewElement;
			}
		} );

		editor.data.upcastDispatcher.on(
			'element:ck-multiblock',
			prepareMultiBlockUpcastConverter( editor.model, editor.editing.view, editor.data )
		);

		// textBlock ----------------------------------------------------------

		editor.conversion.for( 'editingDowncast' ).add(
			dispatcher => {
				const insertViewElement = insertElement( ( modelElement, viewWriter ) => {
					const viewElement = cloneViewElement( 'editing', modelElement.getAttribute( 'template' ), viewWriter );

					viewWriter.setCustomProperty( 'textBlock', true, viewElement );

					return viewElement;
				} );

				dispatcher.on( 'insert:textBlock', ( evt, data, conversionApi ) => {
					insertViewElement( evt, data, conversionApi );

					// Use the existing "old" mapping created by `insertViewElement()`.
					const viewContainer = conversionApi.mapper.toViewElement( data.item );
					const viewSlot = findTextBlockViewSlot( conversionApi.writer.createRangeIn( viewContainer ) );

					conversionApi.mapper.bindElements( data.item, viewSlot );
				} );
			}
		);

		editor.conversion.for( 'dataDowncast' ).add(
			dispatcher => {
				const insertViewElement = insertElement( ( modelElement, viewWriter ) => {
					const container = viewWriter.createContainerElement( 'ck-textblock' );

					const content = cloneViewElement( 'data', modelElement.getAttribute( 'template' ), viewWriter );

					viewWriter.insert( viewWriter.createPositionAt( container, 0 ), content );

					return container;
				} );

				dispatcher.on( 'insert:textBlock', ( evt, data, conversionApi ) => {
					insertViewElement( evt, data, conversionApi );

					// Use the existing "old" mapping created by `insertViewElement()`.
					const viewContainer = conversionApi.mapper.toViewElement( data.item );
					const viewSlot = findTextBlockViewSlot( conversionApi.writer.createRangeIn( viewContainer ) );

					conversionApi.mapper.bindElements( data.item, viewSlot );
				} );
			}
		);

		editor.data.upcastDispatcher.on( 'element:ck-textblock', prepareTextBlockUpcastConverter( editor.model, editor.editing.view ) );
	}

	// We have many more elements in the view than in the model, so we need to
	// make sure that every position in the view maps to something in the model,
	// and vice versa.
	_setMapping() {
		this.editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.getCustomProperty( 'multiBlock' ) )
		);
	}

	// Wraps root content in textBlocks.
	// TODO Merges subsequent blocks of the base text type.
	_fixRoot() {
		const editor = this.editor;
		const doc = editor.model.document;

		doc.registerPostFixer( writer => {
			if ( !didRootContentChange() ) {
				return;
			}

			for ( const node of doc.getRoot().getChildren() ) {
				if ( !node.is( 'multiBlock' ) && !node.is( 'textBlock' ) ) {
					const textBlock = textBlockToModelElement( editor.config.get( 'block.defaultTextBlock' ), writer, editor.data );

					writer.remove( writer.createRangeIn( textBlock ) );

					writer.wrap( writer.createRangeOn( node ), textBlock );
				}
			}
		} );

		function didRootContentChange() {
			for ( const change of doc.differ.getChanges() ) {
				if ( change.position.parent.rootName == 'main' ) {
					return true;
				}
			}

			return false;
		}
	}

	_setDataPipeline() {
		const editor = this.editor;

		editor.data.init = function( allRootsData ) {
			if ( typeof allRootsData == 'string' ) {
				throw new Error( 'Wrong data format.' );
			}

			const data = allRootsData.main;

			editor.model.enqueueChange( 'transparent', writer => {
				const modelRoot = this.model.document.getRoot();
				const dataDocFrag = writer.createDocumentFragment();

				writer.remove( writer.createRangeIn( modelRoot ) );

				for ( const block of data ) {
					const node = blockToModelElement( block, writer, editor.data );

					writer.append( node, dataDocFrag );
				}

				writer.insert( dataDocFrag, modelRoot, 0 );
			} );
		};
	}
}

function blockToModelElement( block, writer, dataController ) {
	if ( block.type == 'multiBlock' ) {
		return multiBlockToModelElement( block, writer, dataController );
	}

	if ( block.type == 'textBlock' ) {
		return textBlockToModelElement( block, writer, dataController );
	}

	throw new Error( `Wrong block type: "${ block.type }".` );
}

function multiBlockToModelElement( blockData, writer, dataController ) {
	const template = new DomConverter().domToView( blockData.render() );
	const block = writer.createElement( 'multiBlock', { template } );

	if ( blockData.slots ) {
		for ( const slotName of Object.keys( blockData.slots ) ) {
			const slotDocFrag = dataController.parse( blockData.slots[ slotName ], 'blockSlot' );
			// Ideally, every slot should have different element name so we can configure schema differently for them.
			const slotContainer = writer.createElement( 'blockSlot', { slotName } );

			writer.append( slotDocFrag, slotContainer );
			writer.append( slotContainer, block );
		}
	}

	return block;
}

function textBlockToModelElement( blockData, writer, dataController ) {
	const template = new DomConverter().domToView( blockData.render() );
	const slotDocFrag = dataController.parse( blockData.slot, 'textBlock' );

	const block = writer.createElement( 'textBlock', { template } );

	writer.append( slotDocFrag, block );

	return block;
}

/**
 * @param {'data'|'editing'} pipeline
 * @param element
 * @param writer
 * @param {Function} [skipChildren]
 */
function cloneViewElement( pipeline, element, writer, skipChildren ) {
	let clone;

	if ( pipeline == 'editing' && element.getAttribute( 'data-block-slot' ) ) {
		clone = writer.createEditableElement( element.name, element.getAttributes() );
	} else {
		clone = writer.createContainerElement( element.name, element.getAttributes() );
	}

	if ( !skipChildren || !skipChildren( element ) ) {
		for ( const child of element.getChildren() ) {
			writer.insert( writer.createPositionAt( clone, 'end' ), cloneViewNode( pipeline, child, writer, skipChildren ) );
		}
	}

	return clone;
}

function cloneViewNode( pipeline, node, writer, skipChildren ) {
	if ( node.is( 'element' ) ) {
		return cloneViewElement( pipeline, node, writer, skipChildren );
	} else {
		return writer.createText( node.data );
	}
}

function cloneViewElementWithoutSlotsContent( pipeline, element, writer ) {
	return cloneViewElement( pipeline, element, writer, element => element.getAttribute( 'data-block-slot' ) );
}

/**
 * @param {module:engine/view/range~Range}
 */
function findTextBlockViewSlot( range ) {
	for ( const value of range ) {
		if ( value.type == 'elementStart' && value.item.getAttribute( 'data-block-slot' ) === 'true' ) {
			return value.item;
		}
	}

	throw new Error( 'Could not find a field in the text block.' );
}

/**
 * @param {module:engine/view/range~Range}
 */
function findMultiBlockViewSlots( range ) {
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
function findMultiBlockModelSlots( parent ) {
	const slots = {};

	for ( const child of parent.getChildren() ) {
		if ( child.getAttribute( 'slotName' ) ) {
			slots[ child.getAttribute( 'slotName' ) ] = child;
		} else {
			throw new Error( 'multiBlock must contain only slots.' );
		}
	}

	return slots;
}

// Copy paste from upcasthelpers, but with two changes:
//
// * it doesn't convert the view element children at all,
// * instead, it sets that as an attribute of the model block element.
//
// TODO this shouldn't be that hard: https://github.com/ckeditor/ckeditor5-engine/issues/1728
function prepareMultiBlockUpcastConverter( model, view ) {
	return ( evt, data, conversionApi ) => {
		// When element was already consumed then skip it.
		if ( !conversionApi.consumable.test( data.viewItem, { name: true } ) ) {
			return;
		}

		const downcastWriter = new DowncastWriter( view.document );
		const modelElement = conversionApi.writer.createElement( 'multiBlock' );

		conversionApi.writer.setAttribute(
			'template',
			cloneViewElementWithoutSlotsContent( 'data', data.viewItem.getChild( 0 ), downcastWriter ),
			modelElement
		);

		const viewSlots = findMultiBlockViewSlots( downcastWriter.createRangeIn( data.viewItem.getChild( 0 ) ) );

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

function prepareTextBlockUpcastConverter( model, view ) {
	return ( evt, data, conversionApi ) => {
		// When element was already consumed then skip it.
		if ( !conversionApi.consumable.test( data.viewItem, { name: true } ) ) {
			return;
		}

		const modelElement = conversionApi.writer.createElement( 'textBlock' );

		conversionApi.writer.setAttribute(
			'template',
			cloneViewElementWithoutSlotsContent( 'data', data.viewItem.getChild( 0 ), new DowncastWriter( view.document ) ),
			modelElement
		);

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
