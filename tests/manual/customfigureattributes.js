/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, prompt */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ArticlePluginSet from '../_utils/articlepluginset';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

/**
 * Plugin that converts custom attributes for elements that are wrapped in <figure> in the view.
 *
 * @extends module:core/plugin~Plugin
 */
class CustomFigureAttributes extends Plugin {
	init() {
		const editor = this.editor;

		// Define schema and converters (two-way) for specific attributes on the <img> and <table> elements.
		setupCustomAttributeConversion( 'img', 'image', 'id', editor );
		setupCustomAttributeConversion( 'img', 'image', 'class', editor );
		setupCustomAttributeConversion( 'table', 'table', 'id', editor );
		setupCustomAttributeConversion( 'table', 'table', 'class', editor );
		setupCustomAttributeConversion( 'table', 'table', 'style', editor );
		setupCustomAttributeConversion( 'table', 'table', 'width', editor );

		// Add button to change a class.
		editor.ui.componentFactory.add( 'changeClass', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: 'Change class',
				withText: true
			} );

			this.listenTo( view, 'execute', () => {
				const selectedElement = editor.model.document.selection.getSelectedElement();

				if ( !selectedElement ) {
					return;
				}

				if ( editor.model.schema.checkAttribute( selectedElement, 'custom-class' ) ) {
					// eslint-disable-next-line no-alert
					const value = prompt( 'Set new value ("foo", "bar" or "baz")', selectedElement.getAttribute( 'custom-class' ) || '' );

					editor.model.change( writer => {
						writer.setAttribute( 'custom-class', value, selectedElement );
					} );
				}
			} );

			return view;
		} );
	}
}

/**
 * Helper method that search for given view element in all children of model element.
 *
 * @param {module:engine/view/item~Item} viewElement
 * @param {String} viewElementName
 * @param {module:engine/conversion/downcastdispatcher~DowncastConversionApi} conversionApi
 * @return {module:engine/view/item~Item}
 */
function findViewChild( viewElement, viewElementName, conversionApi ) {
	const viewChildren = [ ...conversionApi.writer.createRangeIn( viewElement ).getItems() ];

	return viewChildren.find( item => item.is( viewElementName ) );
}

/**
 * Setups conversion for custom attribute on view elements contained inside figure.
 *
 * This method:
 *
 * - adds proper schema rules
 * - adds an upcast converter
 * - adds a downcast converter
 *
 * @param {String} viewElementName
 * @param {String} modelElementName
 * @param {String} viewAttribute
 * @param {module:core/editor/editor~Editor} editor
 */
function setupCustomAttributeConversion( viewElementName, modelElementName, viewAttribute, editor ) {
	// Extend schema to store attribute in the model.
	const modelAttribute = `custom-${ viewAttribute }`;

	editor.model.schema.extend( modelElementName, { allowAttributes: [ modelAttribute ] } );

	editor.conversion.for( 'upcast' ).add( upcastAttribute( viewElementName, viewAttribute, modelAttribute ) );
	editor.conversion.for( 'downcast' ).add( downcastAttribute( modelElementName, viewElementName, viewAttribute, modelAttribute ) );
}

/**
 * Returns a custom attribute upcast converter.
 *
 * @param {String} viewElementName
 * @param {String} viewAttribute
 * @param {String} modelAttribute
 * @returns {Function}
 */
function upcastAttribute( viewElementName, viewAttribute, modelAttribute ) {
	return dispatcher => dispatcher.on( `element:${ viewElementName }`, ( evt, data, conversionApi ) => {
		const viewItem = data.viewItem;
		const modelRange = data.modelRange;

		const modelElement = modelRange && modelRange.start.nodeAfter;

		if ( !modelElement ) {
			return;
		}

		conversionApi.writer.setAttribute( modelAttribute, viewItem.getAttribute( viewAttribute ), modelElement );
	} );
}

/**
 * Returns a custom attribute downcast converter.
 *
 * @param {String} modelElementName
 * @param {String} viewElementName
 * @param {String} viewAttribute
 * @param {String} modelAttribute
 * @returns {Function}
 */
function downcastAttribute( modelElementName, viewElementName, viewAttribute, modelAttribute ) {
	return dispatcher => dispatcher.on( `attribute:${ modelAttribute }:${ modelElementName }`, ( evt, data, conversionApi ) => {
		const modelElement = data.item;

		const viewFigure = conversionApi.mapper.toViewElement( modelElement );
		const viewElement = findViewChild( viewFigure, viewElementName, conversionApi );

		if ( !viewElement ) {
			return;
		}

		if ( data.attributeNewValue === null ) {
			conversionApi.writer.removeAttribute( viewAttribute, viewElement );
		} else {
			conversionApi.writer.setAttribute( viewAttribute, data.attributeNewValue, viewElement );
		}

		conversionApi.writer.setAttribute( viewAttribute, modelElement.getAttribute( modelAttribute ), viewElement );
	} );
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// Add plugin alongside other plugins
		plugins: [ ArticlePluginSet, CustomFigureAttributes ],
		toolbar: [
			'heading',
			'|',
			'changeClass',
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
