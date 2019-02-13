/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, document, window */

/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Strikethrough from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Font from '@ckeditor/ckeditor5-font/src/font';
import List from '@ckeditor/ckeditor5-list/src/list';

import { upcastElementToAttribute, upcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/upcast-converters';
import { downcastAttributeToElement, downcastElementToElement } from '@ckeditor/ckeditor5-engine/src/conversion/downcast-converters';
import { normalizeOptions } from '@ckeditor/ckeditor5-font/src/fontfamily/utils';

class SpecialConverters extends Plugin {
	init() {
		const schema = this.editor.model.schema;
		const conversion = this.editor.conversion;

		// this._handleDivsOptionA( schema, conversion );
		this._handleDivsOptionB( schema, conversion );

		this._handleAllFontFamilyValues( conversion );

		this._handleAllFontSizeValues( conversion );
	}

	// Option A: Handle div with a specific attributes.
	//
	// This specific div:								<div class="my-special-section" data-poc="false">
	// Will be converted to a model element called:		<specialSection>
	//
	// It's a good option when the number of different types of HTML markup is limited and
	// you can assign special meanings to those structures. Then, converting them to a more
	// semantical model elements gives you a great control over how they behave and what markup
	// is produced by the editor.getData() method.
	_handleDivsOptionA( schema, conversion ) {
		// Define special-section block in the schema.
		schema.register( 'specialSection', {
			allowWhere: '$block',
			allowContentOf: [ '$root', '$block' ]
		} );

		// Add two-way (view-to-model and model-to-view) converter for special-section.
		conversion.elementToElement( {
			model: 'specialSection',
			view: {
				name: 'div',
				classes: 'my-special-section',
				// If the "data-poc" flag is not needed the whole `attributes` block can be dropped.
				// After removing it the model-to-view converter will render <div class="my-special-section"></div>
				attributes: {
					'data-poc': 'false'
				}
			}
		} );
	}

	// Option B: Handle any <div> with any set of attributes
	//
	// This is "catch-all" div converter. It will convert all attributes of that div too.
	_handleDivsOptionB( schema, conversion ) {
		schema.register( 'div', {
			allowWhere: '$block',
			allowContentOf: [ '$root' ],
			// The `attributesMap` attribute will hold every attribute from HTML.
			allowAttributes: [ 'attributesMap' ]
		} );

		// View-to-model converter signifies all attributes into one model's attribute:
		conversion.for( 'upcast' ).add( upcastElementToElement( {
			view: 'div',
			model: ( viewElement, modelWriter ) => {
				const attributes = JSON.stringify( [ ...viewElement.getAttributes() ] );

				return modelWriter.createElement( 'div', { attributesMap: attributes } );
			}
		} ) );

		// Downcast converter for element - will convert model div with attribute `attributesMap` to proper view element
		// with all attributes.
		conversion.for( 'downcast' ).add( downcastElementToElement( {
			model: 'div',
			view: 'div'
		} ) );

		// Model-to-view converter that handles changes of the attribute maps
		conversion.for( 'downcast' ).add( dispatcher => {
			dispatcher.on( 'attribute:attributesMap', ( evt, data, conversionApi ) => {
				const viewWriter = conversionApi.writer;

				const viewDiv = conversionApi.mapper.toViewElement( data.item );

				// Remove all attributes:
				for ( const attributeDef of [ ...viewDiv.getAttributes() ] ) {
					const key = attributeDef[ 0 ];
					viewWriter.removeAttribute( key, viewDiv );
				}

				// Set new attributes:
				for ( const attributeDef of JSON.parse( data.attributeNewValue ) ) {
					const key = attributeDef[ 0 ];
					const value = attributeDef[ 1 ];

					viewWriter.setAttribute( key, value, viewDiv );
				}
			}, { priority: 'high' } );
		} );
	}

	// Add converters for font family which will catch spans with all possible font-family styles.
	//
	// By default the font family features accept only fony-family styles matching the exact options
	// specified in config.fontFamily.options. The converters defined in this method override the default behaviour.
	//
	// However, we still use the values specified in config.fontFamily.options to display items in the "Font family" dropdown.
	// Threfore, if we have at least a partial match of the font-family style defined in the config, then we want to
	// select that specific item in the dropdown when the caret is inside such style. That's why the below converter
	// does a bit of magic with font names normalization and magic. If we didn't care about selecting the right options
	// in the dropdown, it'd become much simpler.
	_handleAllFontFamilyValues( conversion ) {
		const fontFamilyOptions = normalizeOptions( this.editor.config.get( 'fontFamily.options' ) );

		// Add special catch-all converter for font-family feature.
		// The font-family feature expects that multi-word font family names are defined in CSS as: 'Font Family Name'.
		// Also the number of font names and their order is important, so below are different font-names:
		//
		// 1. 'Lucida Sans Unicode', Lucida Grande, sans-serif       // This CSS is generated by the editor.
		// 2. 'Lucida Sans Unicode', sans-serif                      // fewer font names.
		// 3. "Lucida Sans Unicode", Lucida Grande, sans-serif       // Different quotes.
		// 4. 'Lucida Sans Unicode', sans-serif, Lucida Grande       // Different order.
		//
		// This is due to the fact that by default CKEditor 5 expects font names to be defined the editor.
		// The below converter extends this behavior and tries to match font name from input HTML to
		// the font family names defined in the configuration.
		conversion.for( 'upcast' ).add( upcastElementToAttribute( {
			view: {
				name: 'span',
				styles: {
					'font-family': /[\s\S]+/
				}
			},
			model: {
				key: 'fontFamily',
				value: viewElement => {
					const fontFamilyCSS = viewElement.getStyle( 'font-family' );

					const fontFamilyNames = fontFamilyCSS.split( ',' ).map( normalizeFontName );

					const fontOption = fontFamilyOptions
						.filter( config => !!config.model ) // Filter-out "default" option.
						// Find any option that has one of the font name defined.
						.find( config => fontFamilyNames.includes( config.model ) );

					// If corresponding font option was found use the model key to store it as an attribute in the model.
					// Return the original font-family value to preserve it in the content.
					return fontOption ? fontOption.model : fontFamilyCSS;
				}
			},

			// Override default font-family converter:
			converterPriority: 'high'
		} ) );

		conversion.for( 'downcast' ).add( downcastAttributeToElement( {
			view: ( modelAttributeValue, viewWriter ) => {
				if ( modelAttributeValue ) {
					const configOption = fontFamilyOptions.find( option => option.model === modelAttributeValue );

					// Use style definition from the configured option or use model attribute value.
					const styleValue = configOption ? configOption.view.styles[ 'font-family' ] : modelAttributeValue;

					return viewWriter.createAttributeElement( 'span', {
						style: 'font-family:' + styleValue
					} );
				}
			},
			model: 'fontFamily',

			// Override default font-family converter:
			converterPriority: 'high'
		} ) );
	}

	// Similar to _handleAllFontFamilyValues() but for font-size.
	_handleAllFontSizeValues( conversion ) {
		// Add special catch-all converter for font-size feature.
		conversion.for( 'upcast' ).add( upcastElementToAttribute( {
			view: {
				name: 'span',
				styles: {
					'font-size': /[\s\S]+/
				}
			},
			model: {
				key: 'fontSize',
				value: viewElement => {
					const value = parseFloat( viewElement.getStyle( 'font-size' ) ).toFixed( 0 );

					// It might be needed to further convert the value to meet business requirements.
					// In the sample the font-size is configured to handle only the sizes:
					// 12, 14, 'default', 18, 20, 22, 24, 26, 28, 30
					// Other sizes will be converted to the model but the UI might not be aware of them.

					// The font-size feature expects numeric values to be Number not String.
					return parseInt( value );
				}
			},
			converterPriority: 'high'
		} ) );

		// Add special converter for font-size feature to convert all (even not configured) model attribute values.
		conversion.for( 'downcast' ).add( downcastAttributeToElement( {
			model: {
				key: 'fontSize'
			},
			view: ( modelValue, viewWriter ) => {
				return viewWriter.createAttributeElement( 'span', {
					style: `font-size:${ modelValue }px`
				} );
			},
			converterPriority: 'high'
		} ) );
	}
}

// Normalize font names as any of below are valid CSS font names:
// 1. Comic Sans MS
// 2. "Comic Sans MS"
// 3. 'Comic Sans MS'
// Any font name will be normalized to the (1) form.
function normalizeFontName( fontName ) {
	return fontName
		.trim() // Remove whitespace from both ends of a string.
		.replace( /(,'")/g, '' ); // Remove quotes from font name (for multi word font names).
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Essentials, Heading, Bold, Italic, Strikethrough, Font, List, SpecialConverters ],
		toolbar: [
			'heading',
			'|',
			'bold',
			'italic',
			'strikethrough',
			'|',
			'fontSize',
			'fontFamily',
			'|',
			'undo',
			'redo'
		],
		fontSize: {
			options: [ 12, 14, 'default', 18, 20, 22, 24, 26, 28, 30 ]
		},
		fontFamily: {
			options: [
				'default',
				'Comic Sans MS, cursive',
				'Arial, Helvetica, sans-serif',
				'Georgia, serif',
				'Lucida Sans Unicode, Lucida Grande, sans-serif',
				'Tahoma, Geneva, sans-serif',
				'Times New Roman, Times, serif',
				'Trebuchet MS, Helvetica, sans-serif',
				'Verdana, Geneva, sans-serif'
			]
		},
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
