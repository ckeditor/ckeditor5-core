/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

/* globals React, ReactDOM, CKEditorInspector */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import ArticlePluginSet from '../_utils/articlepluginset';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import Command from '@ckeditor/ckeditor5-core/src/command';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import CKEditor from '@ckeditor/ckeditor5-react';

const e = React.createElement;

class Products extends Plugin {
	static get requires() {
		return [ ProductsEditing, ProductsUI ];
	}
}

class ProductsUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;

		editor.ui.componentFactory.add( 'productPreview', locale => {
			const command = editor.commands.get( 'insertProduct' );
			const buttonView = new ButtonView( locale );

			buttonView.set( {
				label: t( 'Insert Product' ),
				withText: true,
				tooltip: true
			} );

			buttonView.bind( 'isOn', 'isEnabled' ).to( command, 'value', 'isEnabled' );

			this.listenTo( buttonView, 'execute', () => editor.execute( 'insertProduct' ) );

			return buttonView;
		} );
	}
}

class ProductsEditing extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._defineSchema();
		this._defineConverters();

		this.editor.commands.add( 'insertProduct', new InsertProductPreviewCommand( this.editor ) );
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'ProductPreview', {
			isObject: true,
			allowWhere: '$block',
			allowAttributes: [ 'id' ]
		} );
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for( 'upcast' ).elementToElement( {
			view: {
				name: 'section',
				classes: 'product'
			},
			model: ( viewElement, modelWriter ) => {
				return modelWriter.createElement( 'ProductPreview', {
					id: parseInt( viewElement.getAttribute( 'data-id' ) )
				} );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'ProductPreview',
			view: ( modelElement, viewWriter ) => {
				return viewWriter.createContainerElement( 'section', {
					class: 'product',
					'data-id': modelElement.getAttribute( 'id' )
				} );
			}
		} );

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'ProductPreview',
			view: ( modelElement, viewWriter ) => {
				const id = modelElement.getAttribute( 'id' );
				const section = viewWriter.createContainerElement( 'section', {
					class: 'product',
					'data-id': id
				} );

				const reactWrapper = viewWriter.createUIElement( 'div', {
					class: 'product__react-wrapper'
				}, function( domDocument ) {
					const domElement = this.toDomElement( domDocument );

					ReactDOM.render( App.createProductPreview( id ), domElement );

					return domElement;
				} );

				viewWriter.insert( viewWriter.createPositionAt( section, 0 ), reactWrapper );

				return toWidget( section, viewWriter, { label: 'simple box widget' } );
			}
		} );
	}
}

export default class InsertProductPreviewCommand extends Command {
	execute( id ) {
		this.editor.model.change( writer => {
			this.editor.model.insertContent( writer.createElement( 'ProductPreview', { id } ) );
		} );
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		const allowedIn = model.schema.findAllowedParent( selection.getFirstPosition(), 'ProductPreview' );

		this.isEnabled = allowedIn !== null;
	}
}

const productDefinitions = {
	1: {
		name: 'Colors of summer in Poland',
		price: '$1500'
	},
	2: {
		name: 'Mediterranean Sun on Malta',
		price: '$1899'
	},
	3: {
		name: 'Tastes of Asia',
		price: '$2599'
	}
};

class App extends React.Component {
	constructor( props ) {
		super( props );

		this.state = {
			editorData:
				'<h3>Check our last minute deals!</h3>' +
				'<section class="product" data-id="2"></section>',
			editor: null
		};

		this.handleEditorDataChange = this.handleEditorDataChange.bind( this );
	}

	handleEditorDataChange( evt, editor ) {
		this.setState( {
			editorData: editor.getData()
		} );
	}

	render() {
		return e( 'div', { className: 'app__wrapper' },
			e( 'div', { className: 'app__editor' },
				e( 'h2', {}, 'Product offer editor' ),
				e( CKEditor, {
					editor: ClassicEditor,
					data: this.state.editorData,
					config: {
						plugins: [
							ArticlePluginSet,
							Products
						],
						toolbar: [
							'heading', '|',
							'bold', 'italic', 'link', 'blockQuote', 'insertTable', 'mediaEmbed', 'undo', 'redo'
						]
					},
					onChange: this.handleEditorDataChange,
					onInit: editor => {
						this.setState( {
							editor
						} );

						CKEditorInspector.attach( editor );
					}
				} ),
				e( 'h3', {}, 'Editor data' ),
				e( 'textarea', { value: this.state.editorData, readOnly: true } )
			),
			e( ProductList, {
				productDefinitions,
				editor: this.state.editor
			} )
		);
	}

	static createProductPreview( id, editor ) {
		return e( ProductPreview, Object.assign( {}, productDefinitions[ id ], { editor, id } ) );
	}
}

class ProductList extends React.Component {
	render() {
		const productElements = [];

		for ( const id in this.props.productDefinitions ) {
			productElements.push(
				e( 'li', {
					key: `id-${ Math.random() }`
				}, App.createProductPreview( id, this.props.editor ) )
			);
		}

		return e( 'div', { className: 'app__product-list' },
			e( 'h2', {}, 'Products' ),
			e( 'ul', {}, productElements )
		);
	}
}

class ProductPreview extends React.Component {
	render() {
		return e( 'div', {
			className: 'product-preview',
			style: {
				'--product-image': `url(product${ this.props.id }.jpg)`,
			},
			onClick: () => {
				if ( this.props.editor ) {
					this.props.editor.execute( 'insertProduct', this.props.id );
					this.props.editor.editing.view.focus();
				}
			}
		},
		e( 'span', { className: 'product-preview__name' }, this.props.name ),
		e( 'span', { className: 'product-preview__price' }, `from ${ this.props.price }` )
		);
	}
}

ReactDOM.render( e( App ), document.querySelector( '.app' ) );
