/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import testUtils from '../tests/_utils/utils';
import Editor from '../src/editor/editor';
import PluginCollection from '../src/plugincollection';
import Plugin from '../src/plugin';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import log from '@ckeditor/ckeditor5-utils/src/log';

let editor, availablePlugins;
let PluginA, PluginB, PluginC, PluginD, PluginE, PluginF, PluginG, PluginH, PluginI, PluginJ, PluginK, PluginX;
class TestError extends Error {}
class ChildPlugin extends Plugin {}
class GrandPlugin extends ChildPlugin {}

testUtils.createSinonSandbox();

before( () => {
	PluginA = createPlugin( 'A' );
	PluginB = createPlugin( 'B' );
	PluginC = createPlugin( 'C' );
	PluginD = createPlugin( 'D' );
	PluginE = createPlugin( 'E' );
	PluginF = createPlugin( 'F' );
	PluginG = createPlugin( 'G', GrandPlugin );
	PluginH = createPlugin( 'H' );
	PluginI = createPlugin( 'I' );
	PluginJ = createPlugin( 'J' );
	PluginK = createPlugin( 'K' );
	PluginX = class extends Plugin {
		constructor( editor ) {
			super( editor );

			throw new TestError( 'Some error inside a plugin' );
		}
	};

	PluginC.requires = [ PluginB ];
	PluginD.requires = [ PluginA, PluginC ];
	PluginF.requires = [ PluginE ];
	PluginE.requires = [ PluginF ];
	PluginH.requires = [ PluginI ];
	PluginJ.requires = [ 'K' ];
	PluginK.requires = [ PluginA ];

	editor = new Editor();
} );

describe( 'PluginCollection', () => {
	beforeEach( () => {
		availablePlugins = [
			PluginA,
			PluginB,
			PluginC,
			PluginD,
			PluginE,
			PluginF,
			PluginG,
			PluginH,
			PluginI,
			PluginJ,
			PluginK,
			PluginX
		];
	} );

	describe( 'load()', () => {
		it( 'should not fail when trying to load 0 plugins (empty array)', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [] )
				.then( () => {
					expect( getPlugins( plugins ) ).to.be.empty;
				} );
		} );

		it( 'should add collection items for loaded plugins', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginA, PluginB ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginA ) ).to.be.an.instanceof( PluginA );
					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
				} );
		} );

		it( 'should add collection items for loaded plugins using plugin names', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ 'A', 'B' ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( 'A' ) ).to.be.an.instanceof( PluginA );
					expect( plugins.get( 'B' ) ).to.be.an.instanceof( PluginB );
				} );
		} );

		it( 'should load dependency plugins', () => {
			const plugins = new PluginCollection( editor, availablePlugins );
			const spy = sinon.spy( plugins, '_add' );

			return plugins.load( [ PluginA, PluginC ] )
				.then( loadedPlugins => {
					expect( getPlugins( plugins ).length ).to.equal( 3 );

					expect( getPluginNames( getPluginsFromSpy( spy ) ) )
						.to.deep.equal( [ 'A', 'B', 'C' ], 'order by plugins._add()' );
					expect( getPluginNames( loadedPlugins ) )
						.to.deep.equal( [ 'A', 'B', 'C' ], 'order by returned value' );
				} );
		} );

		it( 'should load dependency plugins defined by plugin names', () => {
			const plugins = new PluginCollection( editor, availablePlugins );
			const spy = sinon.spy( plugins, '_add' );

			return plugins.load( [ 'J' ] )
				.then( loadedPlugins => {
					expect( getPlugins( plugins ).length ).to.equal( 3 );

					expect( getPluginNames( getPluginsFromSpy( spy ) ) )
						.to.deep.equal( [ 'A', 'K', 'J' ], 'order by plugins._add()' );
					expect( getPluginNames( loadedPlugins ) )
						.to.deep.equal( [ 'A', 'K', 'J' ], 'order by returned value' );
				} );
		} );

		it( 'should be ok when dependencies are loaded first', () => {
			const plugins = new PluginCollection( editor, availablePlugins );
			const spy = sinon.spy( plugins, '_add' );

			return plugins.load( [ PluginA, PluginB, PluginC ] )
				.then( loadedPlugins => {
					expect( getPlugins( plugins ).length ).to.equal( 3 );

					expect( getPluginNames( getPluginsFromSpy( spy ) ) )
						.to.deep.equal( [ 'A', 'B', 'C' ], 'order by plugins._add()' );
					expect( getPluginNames( loadedPlugins ) )
						.to.deep.equal( [ 'A', 'B', 'C' ], 'order by returned value' );
				} );
		} );

		it( 'should load deep dependency plugins', () => {
			const plugins = new PluginCollection( editor, availablePlugins );
			const spy = sinon.spy( plugins, '_add' );

			return plugins.load( [ PluginD ] )
				.then( loadedPlugins => {
					expect( getPlugins( plugins ).length ).to.equal( 4 );

					// The order must have dependencies first.
					expect( getPluginNames( getPluginsFromSpy( spy ) ) )
						.to.deep.equal( [ 'A', 'B', 'C', 'D' ], 'order by plugins._add()' );
					expect( getPluginNames( loadedPlugins ) )
						.to.deep.equal( [ 'A', 'B', 'C', 'D' ], 'order by returned value' );
				} );
		} );

		it( 'should handle cross dependency plugins', () => {
			const plugins = new PluginCollection( editor, availablePlugins );
			const spy = sinon.spy( plugins, '_add' );

			return plugins.load( [ PluginA, PluginE ] )
				.then( loadedPlugins => {
					expect( getPlugins( plugins ).length ).to.equal( 3 );

					// The order must have dependencies first.
					expect( getPluginNames( getPluginsFromSpy( spy ) ) )
						.to.deep.equal( [ 'A', 'F', 'E' ], 'order by plugins._add()' );
					expect( getPluginNames( loadedPlugins ) )
						.to.deep.equal( [ 'A', 'F', 'E' ], 'order by returned value' );
				} );
		} );

		it( 'should load grand child classes', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginG ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 1 );
				} );
		} );

		it( 'should load plugin which does not extend the base Plugin class', () => {
			class Y { }

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ Y ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 1 );
				} );
		} );

		it( 'should load plugin which is a simple function', () => {
			function pluginAsFunction( editor ) {
				this.editor = editor;
			}

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ pluginAsFunction ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 1 );
				} );
		} );

		it( 'should set the `editor` property on loaded plugins', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			function pluginAsFunction( editor ) {
				this.editor = editor;
			}

			class Y {
				constructor( editor ) {
					this.editor = editor;
				}
			}

			return plugins.load( [ PluginA, PluginB, pluginAsFunction, Y ] )
				.then( () => {
					expect( plugins.get( PluginA ).editor ).to.equal( editor );
					expect( plugins.get( PluginB ).editor ).to.equal( editor );
					expect( plugins.get( pluginAsFunction ).editor ).to.equal( editor );
					expect( plugins.get( Y ).editor ).to.equal( editor );
				} );
		} );

		it( 'should reject on broken plugins (forward the error thrown in a plugin)', () => {
			const logSpy = testUtils.sinon.stub( log, 'error' );

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginA, PluginX, PluginB ] )
				// Throw here, so if by any chance plugins.load() was resolved correctly catch() will be stil executed.
				.then( () => {
					throw new Error( 'Test error: this promise should not be resolved successfully' );
				} )
				.catch( err => {
					expect( err ).to.be.an.instanceof( TestError );
					expect( err ).to.have.property( 'message', 'Some error inside a plugin' );

					sinon.assert.calledOnce( logSpy );
					expect( logSpy.args[ 0 ][ 0 ] ).to.match( /^plugincollection-load:/ );
				} );
		} );

		it( 'should reject when loading non-existent plugin', () => {
			const logSpy = testUtils.sinon.stub( log, 'error' );

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ 'NonExistentPlugin' ] )
				// Throw here, so if by any chance plugins.load() was resolved correctly catch() will be stil executed.
				.then( () => {
					throw new Error( 'Test error: this promise should not be resolved successfully' );
				} )
				.catch( err => {
					expect( err ).to.be.an.instanceof( CKEditorError );
					expect( err.message ).to.match( /^plugincollection-plugin-not-found/ );

					sinon.assert.calledOnce( logSpy );
					expect( logSpy.args[ 0 ][ 0 ] ).to.match( /^plugincollection-plugin-not-found:/ );
				} );
		} );

		it( 'should load chosen plugins (plugins and removePlugins are constructors)', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginA, PluginB, PluginC ], [ PluginA ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
					expect( plugins.get( PluginC ) ).to.be.an.instanceof( PluginC );
				} );
		} );

		it( 'should load chosen plugins (plugins are constructors, removePlugins are names)', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginA, PluginB, PluginC ], [ 'A' ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
					expect( plugins.get( PluginC ) ).to.be.an.instanceof( PluginC );
				} );
		} );

		it( 'should load chosen plugins (plugins and removePlugins are names)', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ 'A', 'B', 'C' ], [ 'A' ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
					expect( plugins.get( PluginC ) ).to.be.an.instanceof( PluginC );
				} );
		} );

		it( 'should load chosen plugins (plugins are names, removePlugins are constructors)', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ 'A', 'B', 'C' ], [ PluginA ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
					expect( plugins.get( PluginC ) ).to.be.an.instanceof( PluginC );
				} );
		} );

		it( 'should load chosen plugins (plugins are names, removePlugins contains an anonymous plugin)', () => {
			class AnonymousPlugin {}

			const plugins = new PluginCollection( editor, [ AnonymousPlugin ].concat( availablePlugins ) );

			return plugins.load( [ AnonymousPlugin, 'A', 'B' ], [ AnonymousPlugin ] )
				.then( () => {
					expect( getPlugins( plugins ).length ).to.equal( 2 );

					expect( plugins.get( PluginA ) ).to.be.an.instanceof( PluginA );
					expect( plugins.get( PluginB ) ).to.be.an.instanceof( PluginB );
				} );
		} );

		it( 'should reject when loaded plugin requires not allowed plugins', () => {
			const logSpy = testUtils.sinon.stub( log, 'error' );
			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ PluginA, PluginB, PluginC, PluginD ], [ PluginA, PluginB ] )
				// Throw here, so if by any chance plugins.load() was resolved correctly catch() will be stil executed.
				.then( () => {
					throw new Error( 'Test error: this promise should not be resolved successfully' );
				} )
				.catch( err => {
					expect( err ).to.be.an.instanceof( CKEditorError );
					expect( err.message ).to.match( /^plugincollection-required/ );

					expect( logSpy.calledTwice ).to.equal( true );
				} );
		} );
	} );

	describe( 'get()', () => {
		it( 'retrieves plugin by its constructor', () => {
			class SomePlugin extends Plugin {}

			availablePlugins.push( SomePlugin );

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ SomePlugin ] )
				.then( () => {
					expect( plugins.get( SomePlugin ) ).to.be.instanceOf( SomePlugin );
				} );
		} );

		it( 'retrieves plugin by its name and constructor', () => {
			class SomePlugin extends Plugin {}
			SomePlugin.pluginName = 'foo/bar';

			availablePlugins.push( SomePlugin );

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ SomePlugin ] )
				.then( () => {
					expect( plugins.get( 'foo/bar' ) ).to.be.instanceOf( SomePlugin );
					expect( plugins.get( SomePlugin ) ).to.be.instanceOf( SomePlugin );
				} );
		} );
	} );

	describe( 'iterator', () => {
		it( 'exists', () => {
			const plugins = new PluginCollection( editor, availablePlugins );

			expect( plugins ).to.have.property( Symbol.iterator );
		} );

		it( 'returns only plugins by constructors', () => {
			class SomePlugin1 extends Plugin {}
			class SomePlugin2 extends Plugin {}
			SomePlugin2.pluginName = 'foo/bar';

			availablePlugins.push( SomePlugin1 );
			availablePlugins.push( SomePlugin2 );

			const plugins = new PluginCollection( editor, availablePlugins );

			return plugins.load( [ SomePlugin1, SomePlugin2 ] )
				.then( () => {
					const pluginConstructors = Array.from( plugins )
						.map( entry => entry[ 0 ] );

					expect( pluginConstructors ).to.have.members( [ SomePlugin1, SomePlugin2 ] );
				} );
		} );
	} );
} );

function createPlugin( name ) {
	const P = class extends Plugin {
		constructor( editor ) {
			super( editor );
			this.pluginName = name;
		}
	};

	P.pluginName = name;

	return P;
}

function getPlugins( pluginCollection ) {
	return Array.from( pluginCollection )
		.map( entry => entry[ 1 ] ); // Get instances.
}

function getPluginsFromSpy( addSpy ) {
	return addSpy.args
		.map( arg => arg[ 0 ] )
		// Entries may be kept twice in the plugins map - once as a pluginName => plugin, once as pluginClass => plugin.
		// Return only pluginClass => plugin entries as these will always represent all plugins.
		.filter( plugin => typeof plugin == 'function' );
}

function getPluginNames( plugins ) {
	return plugins.map( plugin => plugin.pluginName );
}
