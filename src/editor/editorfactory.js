/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import getDataFromElement from '@ckeditor/ckeditor5-utils/src/dom/getdatafromelement';
import attachToForm from './utils/attachtoform';
import secureSourceElement from './utils/securesourceelement';
import setDataInElement from '@ckeditor/ckeditor5-utils/src/dom/setdatainelement';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import { isElement } from 'lodash-es';

export default class EditorFactory {
	create( EditorClass, sourceElementOrData = '', config = {} ) {
		const editor = new EditorClass( sourceElementOrData, config );

		const args = [ editor, sourceElementOrData, config ];

		return Promise.resolve()
			.then( () => this.checkInitialData( ...args ) )
			.then( () => this.initModel( ...args ) )
			.then( () => this.initSourceElement( ...args ) )
			.then( () => this.initPlugins( ...args ) )
			.then( () => this.initUI( ...args ) )
			.then( () => this.initData( ...args ) )
			.then( () => this.fireReady( ...args ) )
			.then( () => editor );
	}

	destroy( editor ) {
		if ( editor.sourceElement ) {
			setDataInElement( editor.sourceElement, editor.getData() );
		}

		editor.ui.destroy();

		return Promise.resolve();
	}

	checkInitialData( editor, sourceElementOrData, config ) {
		if ( !isElement( sourceElementOrData ) && config.initialData ) {
			// Documented in core/editor/editorconfig.jdoc.
			throw new CKEditorError(
				'editor-create-initial-data: ' +
				'The config.initialData option cannot be used together with initial data passed in Editor.create().',
				null
			);
		}
	}

	initModel( editor ) {
		editor.model.document.createRoot();
	}

	initSourceElement( editor, sourceElementOrData ) {
		if ( isElement( sourceElementOrData ) ) {
			editor.sourceElement = sourceElementOrData;

			secureSourceElement( editor );

			if ( editor.updateSourceElement ) {
				attachToForm( editor );
			}
		}
	}

	initPlugins( editor ) {
		return editor.initPlugins();
	}

	initUI( editor ) {
		return editor.ui.init();
	}

	initData( editor, sourceElementOrData, config ) {
		const initialData = config.initialData || getInitialData( sourceElementOrData );

		// If no plugin has defined the data processor, go with the default.
		if ( !editor.data.processor ) {
			editor.data.processor = new HtmlDataProcessor( editor.data.viewDocument );
		}

		return editor.data.init( initialData );
	}

	fireReady( editor ) {
		editor.fire( 'ready' );
	}
}

function getInitialData( sourceElementOrData ) {
	return isElement( sourceElementOrData ) ? getDataFromElement( sourceElementOrData ) : sourceElementOrData;
}
