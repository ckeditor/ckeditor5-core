/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global console, window */

import global from '@ckeditor/ckeditor5-utils/src/dom/global';

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import Clipboard from '@ckeditor/ckeditor5-clipboard/src/clipboard';
import ShiftEnter from '@ckeditor/ckeditor5-enter/src/shiftenter';
import Table from '@ckeditor/ckeditor5-table/src/table';

/**
 * This is a custom placeholder plugin that overrides the converter for inline widget.
 *
 * Instead of <placeholder> this plugin will create a span:
 *
 * <span class="my-custom-inline-widget">[[type]]</span>
 *
 * @param editor
 */
function customPlaceholder( editor ) {
	editor.conversion.for( 'downcast' ).elementToElement( {
		model: 'placeholder',
		view: ( modelElement, viewWriter ) => {
			const viewElement = viewWriter.createContainerElement( 'span' );
			viewWriter.addClass( 'my-custom-inline-widget', viewElement );

			const viewText = viewWriter.createText( '[[' + modelElement.getAttribute( 'type' ) + ']]' );

			viewWriter.insert( viewWriter.createPositionAt( viewElement, 0 ), viewText );

			return viewElement;
		},
		converterPriority: 'high'
	} );
}

class InlineWidget extends Plugin {
	constructor( editor ) {
		super( editor );

		editor.model.schema.register( 'placeholder', {
			allowWhere: '$text',
			isObject: true,
			isInline: true,
			allowAttributes: [ 'type' ]
		} );

		editor.conversion.for( 'editingDowncast' ).add( dispatcher => dispatcher.on( 'insert:placeholder', ( evt, data, conversionApi ) => {
			let viewPlaceholder;

			if ( conversionApi.consumable.consume( data.item, 'insert' ) ) {
				// Not yest consumed - create element.
				viewPlaceholder = createPlaceholderView( data.item, conversionApi.writer );
			} else {
				// Already consumed - use existing element.
				viewPlaceholder = conversionApi.mapper.toViewElement( data.item );
			}

			const elementToInsert = toWidget( viewPlaceholder, conversionApi.writer );

			const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );

			conversionApi.mapper.bindElements( data.item, elementToInsert );
			conversionApi.writer.insert( viewPosition, elementToInsert );
		} ) );

		editor.conversion.for( 'dataDowncast' ).add( dispatcher => dispatcher.on( 'insert:placeholder', ( evt, data, conversionApi ) => {
			if ( !conversionApi.consumable.consume( data.item, 'insert' ) ) {
				return;
			}

			const viewWriter = conversionApi.writer;

			const elementToInsert = createPlaceholderView( data.item, viewWriter );

			const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );

			conversionApi.mapper.bindElements( data.item, elementToInsert );
			conversionApi.writer.insert( viewPosition, elementToInsert );
		} ) );

		editor.conversion.for( 'upcast' ).elementToElement( {
			view: 'placeholder',
			model: ( viewElement, modelWriter ) => {
				let type = 'general';

				if ( viewElement.childCount ) {
					const text = viewElement.getChild( 0 );

					if ( text.is( 'text' ) ) {
						type = text.data.slice( 1, -1 );
					}
				}

				return modelWriter.createElement( 'placeholder', { type } );
			}
		} );

		editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement( editor.model, viewElement => viewElement.name == 'placeholder' )
		);

		this._createToolbarButton();

		function createPlaceholderView( modelItem, viewWriter ) {
			const widgetElement = viewWriter.createContainerElement( 'placeholder' );
			const viewText = viewWriter.createText( '{' + modelItem.getAttribute( 'type' ) + '}' );

			viewWriter.insert( viewWriter.createPositionAt( widgetElement, 0 ), viewText );

			return widgetElement;
		}
	}

	_createToolbarButton() {
		const editor = this.editor;
		const t = editor.t;

		editor.ui.componentFactory.add( 'placeholder', locale => {
			const buttonView = new ButtonView( locale );

			buttonView.set( {
				label: t( 'Insert placeholder' ),
				tooltip: true,
				withText: true
			} );

			this.listenTo( buttonView, 'execute', () => {
				const model = editor.model;

				model.change( writer => {
					const placeholder = writer.createElement( 'placeholder', { type: 'placeholder' } );

					model.insertContent( placeholder );

					writer.setSelection( placeholder, 'on' );
				} );
			} );

			return buttonView;
		} );
	}
}

ClassicEditor
	.create( global.document.querySelector( '#editor' ), {
		plugins: [ Enter, Typing, Paragraph, Heading, Bold, Undo, Clipboard, Widget, ShiftEnter, InlineWidget, Table, customPlaceholder ],
		toolbar: [ 'heading', '|', 'bold', '|', 'placeholder', '|', 'insertTable', '|', 'undo', 'redo' ]
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
