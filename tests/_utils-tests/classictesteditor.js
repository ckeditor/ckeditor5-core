/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import StandardEditor from '../../src/editor/standardeditor';
import ClassicTestEditor from '../../tests/_utils/classictesteditor';

import Plugin from '../../src/plugin';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';

import ClassicTestEditorUI from '../../tests/_utils/classictesteditorui';
import BoxedEditorUIView from '@ckeditor/ckeditor5-ui/src/editorui/boxed/boxededitoruiview';

import { getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import testUtils from '../../tests/_utils/utils';

testUtils.createSinonSandbox();

describe( 'ClassicTestEditor', () => {
	let editorElement;

	beforeEach( () => {
		editorElement = document.createElement( 'div' );
		document.body.appendChild( editorElement );
	} );

	describe( 'constructor()', () => {
		it( 'creates an instance of editor', () => {
			const editor = new ClassicTestEditor( editorElement, { foo: 1 } );

			expect( editor ).to.be.instanceof( StandardEditor );
			expect( editor.config.get( 'foo' ) ).to.equal( 1 );
			expect( editor.element ).to.equal( editorElement );
			expect( editor.ui ).to.be.instanceOf( ClassicTestEditorUI );
			expect( editor.ui.view ).to.be.instanceOf( BoxedEditorUIView );
		} );

		it( 'creates model and view roots', () => {
			const editor = new ClassicTestEditor( { foo: 1 } );

			expect( editor.document.getRoot() ).to.have.property( 'name', '$root' );
			expect( editor.editing.view.getRoot() ).to.have.property( 'name', 'div' );
			expect( editor.data.processor ).to.be.instanceof( HtmlDataProcessor );
		} );
	} );

	describe( 'create', () => {
		it( 'creates an instance of editor', () => {
			return ClassicTestEditor.create( editorElement, { foo: 1 } )
				.then( editor => {
					expect( editor ).to.be.instanceof( ClassicTestEditor );

					expect( editor.config.get( 'foo' ) ).to.equal( 1 );
					expect( editor ).to.have.property( 'element', editorElement );
				} );
		} );

		it( 'creates and initilizes the UI', () => {
			return ClassicTestEditor.create( editorElement, { foo: 1 } )
				.then( editor => {
					expect( editor.ui ).to.be.instanceOf( ClassicTestEditorUI );
					expect( editor.ui.view ).to.be.instanceOf( BoxedEditorUIView );
				} );
		} );

		it( 'loads data from the editor element', () => {
			editorElement.innerHTML = 'foo';

			class PluginTextInRoot extends Plugin {
				init() {
					this.editor.document.schema.allow( { name: '$text', inside: '$root' } );
				}
			}

			return ClassicTestEditor.create( editorElement, { plugins: [ PluginTextInRoot ] } )
				.then( editor => {
					expect( getData( editor.document, { withoutSelection: true } ) ).to.equal( 'foo' );
				} );
		} );

		it( 'fires all events in the right order', () => {
			const fired = [];

			function spy( evt ) {
				fired.push( evt.name );
			}

			class EventWatcher extends Plugin {
				init() {
					this.editor.on( 'pluginsReady', spy );
					this.editor.on( 'uiReady', spy );
					this.editor.on( 'dataReady', spy );
					this.editor.on( 'ready', spy );
				}
			}

			return ClassicTestEditor.create( editorElement, {
					plugins: [ EventWatcher ]
				} )
				.then( () => {
					expect( fired ).to.deep.equal( [ 'pluginsReady', 'uiReady', 'dataReady', 'ready' ] );
				} );
		} );
	} );

	describe( 'destroy', () => {
		it( 'destroys UI and calls super.destroy()', () => {
			return ClassicTestEditor.create( editorElement, { foo: 1 } )
				.then( editor => {
					const superSpy = testUtils.sinon.spy( StandardEditor.prototype, 'destroy' );
					const uiSpy = sinon.spy( editor.ui, 'destroy' );

					return editor.destroy()
						.then( () => {
							expect( superSpy.calledOnce ).to.be.true;
							expect( uiSpy.calledOnce ).to.be.true;
						} );
				} );
		} );
	} );
} );
