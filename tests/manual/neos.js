/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console, window, document, setTimeout */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';

import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import MediaEmbed from '@ckeditor/ckeditor5-media-embed/src/mediaembed';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Table from '@ckeditor/ckeditor5-table/src/table';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

class Neos extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._setSchema();
		this._setConverters();
		this._overrideDataController();
		this._observeNodeChanges();
		this._fixRoot();
	}

	_setSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'neosHeadline', {
			allowIn: '$root',
			allowContentOf: '$root',
			allowAttributes: [ 'id' ]
		} );

		schema.register( 'neosText', {
			allowIn: '$root',
			allowContentOf: '$root',
			allowAttributes: [ 'id' ]
		} );

		schema.register( 'neosCustom', {
			allowIn: '$root',
			allowContentOf: '$root',
			allowAttributes: [ 'id', 'contentId' ],
			isObject: true
		} );

		schema.addChildCheck( ( context, childDefinition ) => {
			if ( childDefinition.name.startsWith( 'neos' ) ) {
				return context.endsWith( '$root' ) || context.endsWith( '$clipboardHolder' );
			}
		} );
	}

	_setConverters() {
		const conversion = this.editor.conversion;

		// neosHeadline ---------------

		conversion.elementToElement( {
			model: 'neosHeadline',
			view: {
				name: 'div',
				classes: 'neos-headline'
			}
		} );

		conversion.for( 'upcast' ).attributeToAttribute( {
			model: {
				key: 'id',
				value: viewElement => Number( viewElement.getAttribute( 'id' ) )
			},
			view: {
				key: 'id',
				name: 'div',
				classes: 'neos-headline'
			}
		} );

		conversion.for( 'downcast' ).attributeToAttribute( {
			model: {
				name: 'neosHeadline',
				key: 'id'
			},
			view: 'id'
		} );

		// neosText -------------------

		conversion.elementToElement( {
			model: 'neosText',
			view: {
				name: 'div',
				classes: 'neos-text'
			}
		} );

		conversion.for( 'upcast' ).attributeToAttribute( {
			model: {
				key: 'id',
				value: viewElement => Number( viewElement.getAttribute( 'id' ) )
			},
			view: {
				key: 'id',
				name: 'div',
				classes: 'neos-text'
			}
		} );

		conversion.for( 'downcast' ).attributeToAttribute( {
			model: {
				name: 'neosText',
				key: 'id'
			},
			view: 'id'
		} );

		// neosCustom -----------------

		conversion.for( 'upcast' ).elementToElement( {
			model: 'neosCustom',
			view: {
				name: 'div',
				classes: 'neos-custom'
			}
		} );

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'neosCustom',
			view: ( modelItem, writer ) => {
				const container = writer.createContainerElement( 'div', { class: 'neos-custom' } );
				const uiContainer = writer.createUIElement( 'div', null, function( domDocument ) {
					const domElement = this.toDomElement( domDocument );

					domElement.textContent = 'loading...';

					fetchAndRender( domElement, modelItem.getAttribute( 'contentId' ) );

					return domElement;
				} );

				writer.insert( writer.createPositionAt( container, 'end' ), uiContainer );

				return toWidget( container, writer, { label: 'neos custom' } );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'neosCustom',
			view: ( modelItem, writer ) => {
				return writer.createContainerElement( 'div', {
					class: 'neos-custom',
					id: modelItem.getAttribute( 'id' ),
					'data-content-id': modelItem.getAttribute( 'contentId' )
				} );
			}
		} );

		conversion.for( 'upcast' ).elementToElement( {
			model: 'neosCustom',
			view: {
				name: 'div',
				classes: 'neos-custom'
			}
		} );

		conversion.for( 'upcast' ).attributeToAttribute( {
			model: {
				key: 'id',
				value: viewElement => Number( viewElement.getAttribute( 'id' ) )
			},
			view: {
				key: 'id',
				name: 'div',
				classes: 'neos-custom'
			}
		} );

		conversion.for( 'upcast' ).attributeToAttribute( {
			model: {
				key: 'contentId',
				value: viewElement => Number( viewElement.getAttribute( 'data-content-id' ) )
			},
			view: {
				key: 'data-content-id',
				name: 'div',
				classes: 'neos-custom'
			}
		} );
	}

	_overrideDataController() {
		const editor = this.editor;

		editor.data.init = function( allRootsData ) {
			if ( typeof allRootsData == 'string' ) {
				throw new Error( 'Wrong data format' );
			}

			const data = allRootsData.$root;

			editor.model.enqueueChange( 'transparent', writer => {
				const modelRoot = this.model.document.getRoot();
				const dataDocFrag = writer.createDocumentFragment();

				writer.setSelection( null );
				writer.removeSelectionAttribute( this.model.document.selection.getAttributeKeys() );

				writer.remove( writer.createRangeIn( modelRoot ) );

				for ( const dataNode of data ) {
					const node = dataNodeToEditorNode( dataNode, writer, editor.data );

					writer.append( node, dataDocFrag );
				}

				writer.insert( dataDocFrag, modelRoot, 0 );
			} );
		};

		editor.data.get = function() {
			const data = [];

			for ( const element of editor.model.document.getRoot().getChildren() ) {
				data.push( editorNodeToDataNode( element, editor.data ) );
			}

			return data;
		};
	}

	// Keeps track of neos nodes.
	// Makes sure ids are unique.
	// Notifies you about removed/added nodes.
	_observeNodeChanges() {
		const neosNodeElements = [];
		const editor = this.editor;
		const doc = editor.model.document;
		const nodeTypes = [ 'neosText', 'neosHeadline', 'neosCustom' ];
		let lastId = -1;

		doc.registerPostFixer( writer => {
			// TODO It'd be much better to use the diff() function to translate
			// changes in the model to changes in the neosNodeElements.
			for ( const change of doc.differ.getChanges( { includeChangesInGraveyard: true } ) ) {
				if ( nodeTypes.includes( change.name ) && change.type == 'insert' ) {
					const changedElement = change.position.nodeAfter;
					const id = changedElement.getAttribute( 'id' );
					const wasInserted = changedElement.parent.rootName == 'main';

					if ( wasInserted ) {
						if ( neosNodeElements.includes( changedElement ) ) {
							continue;
						}

						if ( !id ) {
							writer.setAttribute( 'id', ++lastId, changedElement );

							console.log( 'Duplicated node id. Creating new node:', changedElement.getAttribute( 'id' ) );
						} else if ( neosNodeElements.map( el => el.getAttribute( 'id' ) ).includes( id ) ) {
							writer.setAttribute( 'id', ++lastId, changedElement );

							console.log( 'Duplicated node id. Creating new node:', changedElement.getAttribute( 'id' ) );
						}

						neosNodeElements.push( changedElement );
						lastId = Math.max( lastId, id );
					} else {
						const index = neosNodeElements.indexOf( changedElement );

						neosNodeElements.slice( index, 1 );
					}

					console.log( 'Node change:', wasInserted ? 'inserted' : 'removed', changedElement.getAttribute( 'id' ) );
				}
			}
		} );

		window.neosNodeElements = neosNodeElements;
	}

	// Wraps root content in neos elements.
	// Merges subsequent neosText elements (TODO).
	_fixRoot() {
		const editor = this.editor;
		const doc = editor.model.document;
		const nodeTypes = [ 'neosText', 'neosHeadline', 'neosCustom' ];

		doc.registerPostFixer( writer => {
			if ( !didRootContentChange() ) {
				return;
			}

			for ( const node of doc.getRoot().getChildren() ) {
				if ( !nodeTypes.includes( node.name ) ) {
					console.log( 'Wrapping incorrect root child:', node.name );

					writer.wrap( writer.createRangeOn( node ), 'neosText' );
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
}

function dataNodeToEditorNode( dataNode, writer, dataController ) {
	if ( dataNode.nodeType == 'Neos.Demo:Content.Headline' ) {
		const container = writer.createElement( 'neosHeadline', { id: dataNode.id } );

		const contentFragment = dataController.parse( dataNode.content, container );

		writer.append( contentFragment, container );

		return container;
	}

	if ( dataNode.nodeType == 'Neos.Demo:Content.Text' ) {
		const container = writer.createElement( 'neosText', { id: dataNode.id } );

		const contentFragment = dataController.parse( dataNode.content, container );

		writer.append( contentFragment, container );

		return container;
	}

	if ( dataNode.nodeType == 'Neos.Demo:Content.Custom' ) {
		const container = writer.createElement( 'neosCustom', {
			id: dataNode.id,
			contentId: dataNode.contentId
		} );

		return container;
	}

	throw new Error( `Unknown nodeType: ${ dataNode.nodeType }.` );
}

function editorNodeToDataNode( element, dataController ) {
	if ( element.name == 'neosHeadline' ) {
		return {
			nodeType: 'Neos.Demo:Content.Headline',
			id: element.getAttribute( 'id' ),
			content: dataController.stringify( element )
		};
	}

	if ( element.name == 'neosText' ) {
		return {
			nodeType: 'Neos.Demo:Content.Text',
			id: element.getAttribute( 'id' ),
			content: dataController.stringify( element )
		};
	}

	if ( element.name == 'neosCustom' ) {
		return {
			nodeType: 'Neos.Demo:Content.Text',
			id: element.getAttribute( 'id' ),
			contentId: element.getAttribute( 'contentId' )
		};
	}

	throw new Error( `Unknown model element: ${ element.name }.` );
}

function fetchAndRender( domElement, nodeId ) {
	setTimeout( () => {
		domElement.textContent = `<Neos.Demo:Content.Custom>${ nodeId }</Neos.Demo:Content.Custom>`;
	}, Math.random() * 2000 );
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [
			Essentials,
			Autoformat,
			BlockQuote,
			Bold,
			Heading,
			Italic,
			Link,
			List,
			MediaEmbed,
			Paragraph,
			Table,
			TableToolbar,
			Neos
		],
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
		},
		initialData: {
			'$root': [
				{
					nodeType: 'Neos.Demo:Content.Headline',
					id: 1,
					template: '<div><div data-neos-editable></div></div>',
					content: '<h2>Heading</h2>'
				},
				{
					nodeType: 'Neos.Demo:Content.SuperHeadline',
					id: 1,
					template: '<section><div data-neos-editable=main></div><div data-neos-editable=sub></div></section>',
					content: {
						main: '<h2>Heading</h2>',
						sub: '<h3>Heading</h3>'
					}
				},
				{
					nodeType: 'Neos.Demo:Content.Text',
					id: 2,
					content: '<p>Text</p><p>Text</p><ul><li>List</li></ul><h3>Heading</h3><p>Text</p>'
				},
				{
					nodeType: 'Neos.Demo:Content.Custom',
					contentId: 1,
					id: 3,
				},
				{
					nodeType: 'Neos.Demo:Content.Text',
					id: 4,
					content: '<p>Text</p>'
				},
				{
					nodeType: 'Neos.Demo:Content.Custom',
					contentId: 2,
					id: 5
				},
				{
					nodeType: 'Neos.Demo:Content.Text',
					id: 6,
					content: '<p>Text</p>'
				}
			]
		}
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
