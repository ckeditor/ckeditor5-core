/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global document */

import ComponentFactory from 'ckeditor5-ui/src/componentfactory';
import FocusTracker from 'ckeditor5-utils/src/focustracker';
import ClassicTestEditorUI from 'ckeditor5-core/tests/_utils/classictesteditorui';
import KeystrokeHandler from 'ckeditor5-utils/src/keystrokehandler';
import View from 'ckeditor5-ui/src/view';

describe( 'ClassicTestEditorUI', () => {
	let editor, view, ui;

	beforeEach( () => {
		editor = {};
		view = new View();
		view.element = document.createElement( 'a' );
		ui = new ClassicTestEditorUI( editor, view );
	} );

	describe( 'constructor()', () => {
		it( 'sets #editor', () => {
			expect( ui.editor ).to.equal( editor );
		} );

		it( 'sets #view', () => {
			expect( ui.view ).to.equal( view );
		} );

		it( 'creates #componentFactory factory', () => {
			expect( ui.componentFactory ).to.be.instanceOf( ComponentFactory );
		} );

		it( 'creates #focusTracker', () => {
			expect( ui.focusTracker ).to.be.instanceOf( FocusTracker );
		} );

		it( 'creates #keystrokes', () => {
			expect( ui.keystrokes ).to.be.instanceOf( KeystrokeHandler );
		} );
	} );

	describe( 'init()', () => {
		it( 'returns a promise', () => {
			expect( ui.init() ).to.be.instanceof( Promise );
		} );

		it( 'initializes the #view', () => {
			const spy = sinon.spy( view, 'init' );

			return ui.init().then( () => {
				sinon.assert.calledOnce( spy );
			} );
		} );

		it( 'activates #keystrokes on view#element', () => {
			const spy = sinon.spy( ui.keystrokes, 'listenTo' );

			return ui.init().then( () => {
				sinon.assert.calledWith( spy, view.element );
			} );
		} );
	} );

	describe( 'destroy()', () => {
		it( 'returns a promise', () => {
			return ui.init().then( () => {
				expect( ui.destroy() ).to.be.instanceof( Promise );
			} );
		} );

		it( 'destroys the #view', () => {
			const spy = sinon.spy( view, 'destroy' );

			return ui.init()
				.then( () => ui.destroy() )
				.then( () => {
					sinon.assert.calledOnce( spy );
				} );
		} );

		it( 'destroys #keystrokes', () => {
			const spy = sinon.spy( ui.keystrokes, 'destroy' );

			return ui.destroy().then( () => {
				sinon.assert.calledOnce( spy );
			} );
		} );
	} );
} );
