/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ComponentFactory from '@ckeditor/ckeditor5-ui/src/componentfactory';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/contextualballoon';
import BalloonPanelView from '@ckeditor/ckeditor5-ui/src/panel/balloon/balloonpanelview';
import ClassicTestEditorUI from '../../tests/_utils/classictesteditorui';
import View from '@ckeditor/ckeditor5-ui/src/view';

describe( 'ClassicTestEditorUI', () => {
	let editor, view, ui;

	beforeEach( () => {
		editor = {};
		view = new View();
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

		it( 'sets #balloon', () => {
			expect( ui.balloon ).to.instanceOf( ContextualBalloon );
			expect( ui.balloon.view ).to.instanceOf( BalloonPanelView );
		} );

		it( 'creates #focusTracker', () => {
			expect( ui.focusTracker ).to.be.instanceOf( FocusTracker );
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
	} );
} );
