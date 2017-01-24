/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module core/plugin
 */

import ObservableMixin from '@ckeditor/ckeditor5-utils/src/observablemixin';
import mix from '@ckeditor/ckeditor5-utils/src/mix';

/**
 * The base class for CKEditor plugin classes.
 *
 * @mixes module:utils/observablemixin~ObservaleMixin
 */
export default class Plugin {
	/**
	 * Creates a new Plugin instance. This is the first step of a plugin initialization.
	 * See also {@link #init} and {@link #afterInit}.
	 *
	 * A plugin is always instantiated after its {@link module:core/plugin~Plugin.requires dependencies} and the
	 * {@link #init} and {@link #afterInit} methods are called in the same order.
	 *
	 * Usually, you'll want to put your plugin's initialization code in the {@link #init} method.
	 * The constructor can be understood as "before init" and used in special cases, just like
	 * {@link #afterInit} servers for the special "after init" scenarios (e.g. code which depends on other
	 * plugins, but which doesn't {@link module:core/plugin~Plugin.requires explicitly require} them).
	 *
	 * @param {module:core/editor/editor~Editor} editor
	 */
	constructor( editor ) {
		/**
		 * The editor instance.
		 *
		 * @readonly
		 * @member {module:core/editor/editor~Editor} module:core/plugin~Plugin#editor
		 */
		this.editor = editor;
	}

	/**
	 * An array of plugins required by this plugin.
	 *
	 * To keep a plugin class definition tight it's recommended to define this property as a static getter:
	 *
	 *		import Image from './image.js';
	 *
	 *		export default class ImageCaption extends Plugin {
     *			static get requires() {
     *				return [ Image ];
     *			}
	 *		}
	 *
	 * @static
	 * @member {Array.<Function>|undefined} module:core/plugin~Plugin.requires
	 */

	/**
	 * Optional name of the plugin. If set, the plugin will be available in
	 * {@link module:core/plugincollection~PluginCollection#get} by its
	 * name and its constructor. If not, then only by its constructor.
	 *
	 * The name should reflect the package name + path to that module. E.g. `ckeditor5-image/src/image.js` plugin
	 * should be named `image/image` (the `ckeditor5-` prefix is stripped during compilation).
	 *
	 * To keep a plugin class definition tight it's recommended to define this property as a static getter:
	 *
	 *		export default class ImageCaption {
     *			static get pluginName() {
     *				return 'image/imagecaption';
     *			}
	 *		}
	 *
	 * @static
	 * @member {String|undefined} module:core/plugin~Plugin.pluginName
	 */

	/**
	 * The second stage (after plugin {@link #constructor}) of plugin initialization.
	 * Unlike the plugin constructor this method can perform asynchronous.
	 *
	 * A plugin's `init()` method is called after its {@link module:core/plugin~Plugin.requires dependencies} are initialized,
	 * so in the same order as constructors of these plugins.
	 *
	 * @returns {null|Promise}
	 */
	init() {}

	/**
	 * The third (and last) stage of plugin initialization. See also {@link #constructor} and {@link #init}.
	 *
	 * @returns {null|Promise}
	 */
	afterInit() {}

	/**
	 * Destroys the plugin.
	 *
	 * @returns {null|Promise}
	 */
	destroy() {}
}

mix( Plugin, ObservableMixin );
