/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document, window, Vue, VueColor, Clipboard */

export default class ColorPicker {
	constructor() {
		this._stylesContainer = document.querySelector( '.picker-styles' );
		this._createUi();
		this._setUpCopyButton();
	}

	_createUi() {
		let focusedColor;

		this._app = new Vue( {
			el: '#app',
			components: {
				'chrome-picker': VueColor.Chrome
			},
			data: {
				colors: this._getColorStyles(),
				pickerColor: {
					hsl: { h: 0, s: 0, l: 0, a: 1 }
				}
			},
			methods: {
				onColorInputFocused( color ) {
					this.pickerColor = { hsl: parseHsla( color.value ) };

					if ( focusedColor ) {
						focusedColor.isFocused = false;
					}

					focusedColor = color;
					focusedColor.isFocused = true;
				},

				onPickerValueChange() {
					if ( focusedColor ) {
						focusedColor.value = hslaToString( this.pickerColor.hsl );
					}
				}
			},
			mounted() {
				// Focus the first input.
				this.$refs.colorInputs[ 0 ].focus();
			},
			watch: {
				colors: {
					deep: true,
					handler: newColorStyleGroups => {
						const changedColors = [];

						for ( const group in newColorStyleGroups ) {
							changedColors.push( ...newColorStyleGroups[ group ].filter( color => {
								if ( color.value != color.defaultValue ) {
									return color;
								}
							} ) );
						}

						this._updateStyles( changedColors );
					}
				}
			}
		} );

		this._updateStyles( [] );
	}

	_setUpCopyButton() {
		this._clipboard = new Clipboard( '.copyButton', {
			text: () => {
				return this._getStyles();
			}
		} );
	}

	_getColorStyles() {
		const styles = window.getComputedStyle( document.documentElement );
		const colorStyles = {};

		for ( const stylesSheet of document.styleSheets ) {
			for ( const rule of stylesSheet.rules ) {
				if ( !rule.style ) {
					continue;
				}

				for ( const style of rule.style ) {
					if ( style.match( '--ck-color' ) ) {
						const group = style.split( '-' )[ 4 ];
						const value = styles.getPropertyValue( style ).trim();

						if ( !colorStyles[ group ] ) {
							colorStyles[ group ] = [];
						}

						colorStyles[ group ].push( {
							name: style,
							shortName: stripPrefix( style ),
							defaultValue: value,
							value
						} );
					}
				}
			}
		}

		return colorStyles;
	}

	_updateStyles( changedColors ) {
		let changedColorsString = ':root {\n';

		for ( const color of changedColors ) {
			changedColorsString += `	${ color.name }: ${ color.value };\n`;
		}

		changedColorsString += '}';

		this._stylesContainer.innerHTML = changedColorsString;
	}

	_getStyles() {
		return this._stylesContainer.innerHTML;
	}
}

function stripPrefix( name ) {
	return name.split( '-' ).slice( 5 ).join( '-' );
}

function parseHsla( color ) {
	if ( color == 'transparent' ) {
		return {
			h: 0,
			s: 0,
			l: 0,
			a: 0
		};
	}

	const parsed = color.match( /hsl(?:a)?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*(.+)\s*)?\)/ );

	return {
		h: Number( parsed[ 1 ] ),
		s: parsed[ 2 ] / 100,
		l: parsed[ 3 ] / 100,
		a: Number( parsed[ 4 ] ) || 1
	};
}

function hslaToString( { h, s, l, a } ) {
	h = Math.round( h );
	s = Math.round( s * 100 );
	l = Math.round( l * 100 );
	a = Math.round( a * 100 ) / 100;

	if ( a != 1 ) {
		return `hsla(${ h }, ${ s }%, ${ l }%, ${ a })`;
	} else {
		return `hsl(${ h }, ${ s }%, ${ l }%)`;
	}
}
