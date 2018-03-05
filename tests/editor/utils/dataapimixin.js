/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import DataApiMixin from '../../../src/editor/utils/dataapimixin';
import Editor from '../../../src/editor/editor';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import mix from '@ckeditor/ckeditor5-utils/src/mix';
import { getData, setData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

describe( 'DataApiMixin', () => {
	let editor;

	beforeEach( () => {
		class CustomEditor extends Editor {}
		mix( CustomEditor, DataApiMixin );

		editor = new CustomEditor();
		editor.data.processor = new HtmlDataProcessor();
		editor.model.document.createRoot( '$root', 'main' );
		editor.model.document.createRoot( '$root', 'secondRoot' );
		editor.model.schema.extend( '$text', { allowIn: '$root' } );
	} );

	afterEach( () => {
		editor.destroy();
	} );

	describe( 'setData()', () => {
		it( 'should be added to editor interface', () => {
			expect( editor ).have.property( 'setData' ).to.be.a( 'function' );
		} );

		it( 'should set data of the first root', () => {
			editor.setData( 'foo' );

			expect( getData( editor.model, { rootName: 'main', withoutSelection: true } ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'getData()', () => {
		it( 'should be added to editor interface', () => {
			expect( editor ).have.property( 'getData' ).to.be.a( 'function' );
		} );

		it( 'should get data of the first root', () => {
			setData( editor.model, 'foo' );

			expect( editor.getData() ).to.equal( 'foo' );
		} );
	} );
} );
