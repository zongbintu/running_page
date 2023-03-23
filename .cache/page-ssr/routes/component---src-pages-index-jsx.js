exports.id = 230;
exports.ids = [230];
exports.modules = {

/***/ 4147:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./year_2012.svg": [
		7329,
		329
	],
	"./year_2013.svg": [
		8558,
		558
	],
	"./year_2014.svg": [
		8075,
		75
	],
	"./year_2015.svg": [
		8151,
		151
	],
	"./year_2016.svg": [
		9466,
		466
	],
	"./year_2017.svg": [
		2158,
		158
	],
	"./year_2018.svg": [
		7277,
		277
	],
	"./year_2019.svg": [
		7262,
		262
	],
	"./year_2020.svg": [
		760,
		760
	],
	"./year_2021.svg": [
		128,
		128
	],
	"./year_2022.svg": [
		6509,
		509
	],
	"./year_2023.svg": [
		7996,
		996
	]
};
function webpackAsyncContext(req) {
	if(!__webpack_require__.o(map, req)) {
		return Promise.resolve().then(() => {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(() => {
		return __webpack_require__.t(id, 7 | 16);
	});
}
webpackAsyncContext.keys = () => (Object.keys(map));
webpackAsyncContext.id = 4147;
module.exports = webpackAsyncContext;

/***/ }),

/***/ 9167:
/***/ ((module) => {

/**
 * Create a new [Mapbox GL JS plugin](https://www.mapbox.com/blog/build-mapbox-gl-js-plugins/) that
 * modifies the layers of the map style to use the `text-field` that matches the browser language.
 * As of Mapbox GL Language v1.0.0, this plugin no longer supports token values (e.g. `{name}`). v1.0+ expects the `text-field`
 * property of a style to use an [expression](https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/) of the form `['get', 'name_en']` or `['get', 'name']`; these expressions can be nested. Note that `get` expressions used as inputs to other expressions may not be handled by this plugin. For example:
 * ```
 * ["match",
 *   ["get", "name"],
 *   "California",
 *   "Golden State",
 *   ["coalesce",
 *     ["get", "name_en"],
 *     ["get", "name"]
 *   ]
 * ]
 * ```
 * Only styles based on [Mapbox v8 styles](https://docs.mapbox.com/help/troubleshooting/streets-v8-migration-guide/) are supported.
 *
 * @constructor
 * @param {object} options - Options to configure the plugin.
 * @param {string[]} [options.supportedLanguages] - List of supported languages
 * @param {Function} [options.languageTransform] - Custom style transformation to apply
 * @param {RegExp} [options.languageField=/^name_/] - RegExp to match if a text-field is a language field
 * @param {Function} [options.getLanguageField] - Given a language choose the field in the vector tiles
 * @param {string} [options.languageSource] - Name of the source that contains the different languages.
 * @param {string} [options.defaultLanguage] - Name of the default language to initialize style after loading.
 * @param {string[]} [options.excludedLayerIds] - Name of the layers that should be excluded from translation.
 */
function MapboxLanguage(options) {
  options = Object.assign({}, options);
  if (!(this instanceof MapboxLanguage)) {
    throw new Error('MapboxLanguage needs to be called with the new keyword');
  }

  this.setLanguage = this.setLanguage.bind(this);
  this._initialStyleUpdate = this._initialStyleUpdate.bind(this);

  this._defaultLanguage = options.defaultLanguage;
  this._isLanguageField = options.languageField || /^name_/;
  this._getLanguageField = options.getLanguageField || function nameField(language) {
    return language === 'mul' ? 'name' : `name_${language}`;
  };
  this._languageSource = options.languageSource || null;
  this._languageTransform = options.languageTransform;
  this._excludedLayerIds = options.excludedLayerIds || [];
  this.supportedLanguages = options.supportedLanguages || ['ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'mul', 'pt', 'ru', 'vi', 'zh-Hans', 'zh-Hant'];
}

const isTokenField = /^\{name/;
function isFlatExpressionField(isLangField, property) {
  const isGetExpression = Array.isArray(property) && property[0] === 'get';
  if (isGetExpression && isTokenField.test(property[1])) {
    console.warn('This plugin no longer supports the use of token syntax (e.g. {name}). Please use a get expression. See https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/ for more details.');
  }

  return isGetExpression && isLangField.test(property[1]);
}

function adaptNestedExpressionField(isLangField, property, languageFieldName) {
  if (Array.isArray(property)) {
    for (let i = 1; i < property.length; i++) {
      if (Array.isArray(property[i])) {
        if (isFlatExpressionField(isLangField, property[i])) {
          property[i][1] = languageFieldName;
        }
        adaptNestedExpressionField(isLangField, property[i], languageFieldName);
      }
    }
  }
}

function adaptPropertyLanguage(isLangField, property, languageFieldName) {
  if (isFlatExpressionField(isLangField, property)) {
    property[1] = languageFieldName;
  }

  adaptNestedExpressionField(isLangField, property, languageFieldName);

  // handle special case of bare ['get', 'name'] expression by wrapping it in a coalesce statement
  if (property[0] === 'get' && property[1] === 'name') {
    const defaultProp = property.slice();
    const adaptedProp = ['get', languageFieldName];
    property = ['coalesce', adaptedProp, defaultProp];
  }

  return property;
}

function changeLayerTextProperty(isLangField, layer, languageFieldName, excludedLayerIds) {
  if (layer.layout && layer.layout['text-field'] && excludedLayerIds.indexOf(layer.id) === -1) {
    return Object.assign({}, layer, {
      layout: Object.assign({}, layer.layout, {
        'text-field': adaptPropertyLanguage(isLangField, layer.layout['text-field'], languageFieldName)
      })
    });
  }
  return layer;
}

function findStreetsSource(style) {
  const sources = Object.keys(style.sources).filter((sourceName) => {
    const url = style.sources[sourceName].url;
    // the source URL can reference the source version or the style version
    // this check and the error forces users to migrate to styles using source version 8
    return url && url.indexOf('mapbox.mapbox-streets-v8') > -1 || /mapbox-streets-v[1-9][1-9]/.test(url);
  });
  if (!sources.length) throw new Error('If using MapboxLanguage with a Mapbox style, the style must be based on vector tile version 8, e.g. "streets-v11"');
  return sources[0];
}

/**
 * Explicitly change the language for a style.
 * @param {object} style - Mapbox GL style to modify
 * @param {string} language - The language iso code
 * @returns {object} the modified style
 */
MapboxLanguage.prototype.setLanguage = function (style, language) {
  if (this.supportedLanguages.indexOf(language) < 0) throw new Error(`Language ${  language  } is not supported`);
  const streetsSource = this._languageSource || findStreetsSource(style);
  if (!streetsSource) return style;

  const field = this._getLanguageField(language);
  const isLangField = this._isLanguageField;
  const excludedLayerIds = this._excludedLayerIds;
  const changedLayers = style.layers.map((layer) => {
    if (layer.source === streetsSource) return changeLayerTextProperty(isLangField, layer, field, excludedLayerIds);
    return layer;
  });

  const languageStyle = Object.assign({}, style, {
    layers: changedLayers
  });

  return this._languageTransform ? this._languageTransform(languageStyle, language) : languageStyle;
};

MapboxLanguage.prototype._initialStyleUpdate = function () {
  const style = this._map.getStyle();
  const language = this._defaultLanguage || browserLanguage(this.supportedLanguages);

  this._map.setStyle(this.setLanguage(style, language));
};

function browserLanguage(supportedLanguages) {
  const language = navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage);
  const parts = language && language.split('-');
  let languageCode = language;
  if (parts.length > 1) {
    languageCode = parts[0];
  }
  if (supportedLanguages.indexOf(languageCode) > -1) {
    return languageCode;
  }
  return null;
}

MapboxLanguage.prototype.onAdd = function (map) {
  this._map = map;
  this._map.on('style.load', this._initialStyleUpdate);
  this._container = document.createElement('div');
  return this._container;
};

MapboxLanguage.prototype.onRemove = function () {
  this._map.off('style.load', this._initialStyleUpdate);
  this._map = undefined;
};

if ( true && typeof module.exports !== 'undefined') {
  module.exports = MapboxLanguage;
} else {
  window.MapboxLanguage = MapboxLanguage;
}


/***/ }),

/***/ 4311:
/***/ ((module) => {

"use strict";


/**
 * Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 *
 * Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
 * by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)
 *
 * @module polyline
 */

var polyline = {};

function py2_round(value) {
    // Google's polyline algorithm uses the same rounding strategy as Python 2, which is different from JS for negative values
    return Math.floor(Math.abs(value) + 0.5) * (value >= 0 ? 1 : -1);
}

function encode(current, previous, factor) {
    current = py2_round(current * factor);
    previous = py2_round(previous * factor);
    var coordinate = current - previous;
    coordinate <<= 1;
    if (current - previous < 0) {
        coordinate = ~coordinate;
    }
    var output = '';
    while (coordinate >= 0x20) {
        output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
        coordinate >>= 5;
    }
    output += String.fromCharCode(coordinate + 63);
    return output;
}

/**
 * Decodes to a [latitude, longitude] coordinates array.
 *
 * This is adapted from the implementation in Project-OSRM.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Array}
 *
 * @see https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
 */
polyline.decode = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, Number.isInteger(precision) ? precision : 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};

/**
 * Encodes the given [latitude, longitude] coordinates array.
 *
 * @param {Array.<Array.<Number>>} coordinates
 * @param {Number} precision
 * @returns {String}
 */
polyline.encode = function(coordinates, precision) {
    if (!coordinates.length) { return ''; }

    var factor = Math.pow(10, Number.isInteger(precision) ? precision : 5),
        output = encode(coordinates[0][0], 0, factor) + encode(coordinates[0][1], 0, factor);

    for (var i = 1; i < coordinates.length; i++) {
        var a = coordinates[i], b = coordinates[i - 1];
        output += encode(a[0], b[0], factor);
        output += encode(a[1], b[1], factor);
    }

    return output;
};

function flipped(coords) {
    var flipped = [];
    for (var i = 0; i < coords.length; i++) {
        var coord = coords[i].slice();
        flipped.push([coord[1], coord[0]]);
    }
    return flipped;
}

/**
 * Encodes a GeoJSON LineString feature/geometry.
 *
 * @param {Object} geojson
 * @param {Number} precision
 * @returns {String}
 */
polyline.fromGeoJSON = function(geojson, precision) {
    if (geojson && geojson.type === 'Feature') {
        geojson = geojson.geometry;
    }
    if (!geojson || geojson.type !== 'LineString') {
        throw new Error('Input must be a GeoJSON LineString');
    }
    return polyline.encode(flipped(geojson.coordinates), precision);
};

/**
 * Decodes to a GeoJSON LineString geometry.
 *
 * @param {String} str
 * @param {Number} precision
 * @returns {Object}
 */
polyline.toGeoJSON = function(str, precision) {
    var coords = polyline.decode(str, precision);
    return {
        type: 'LineString',
        coordinates: flipped(coords)
    };
};

if ( true && module.exports) {
    module.exports = polyline;
}


/***/ }),

/***/ 5224:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (/* binding */ components_Layout)
});

// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(5697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
// EXTERNAL MODULE: external "D:\\dev\\project\\github\\tt\\running_page\\node_modules\\react\\index.js"
var external_D_dev_project_github_tt_running_page_node_modules_react_index_js_ = __webpack_require__(3691);
var external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default = /*#__PURE__*/__webpack_require__.n(external_D_dev_project_github_tt_running_page_node_modules_react_index_js_);
// EXTERNAL MODULE: ./node_modules/react-helmet/es/Helmet.js
var Helmet = __webpack_require__(4593);
// EXTERNAL MODULE: ./.cache/gatsby-browser-entry.js + 6 modules
var gatsby_browser_entry = __webpack_require__(4718);
// EXTERNAL MODULE: ./src/hooks/useSiteMetadata.js
var useSiteMetadata = __webpack_require__(2712);
;// CONCATENATED MODULE: ./src/components/Header/index.jsx
const Header=()=>{const{logo,siteUrl,navLinks}=(0,useSiteMetadata/* default */.Z)();return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("nav",{className:"db flex justify-between w-100 ph5-l",style:{marginTop:'3rem'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"dib w-25 v-mid"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(gatsby_browser_entry.Link,{to:siteUrl,className:"link dim"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("picture",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("img",{className:"dib w3 h3 br-100",alt:"logo",src:logo})))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"dib w-75 v-mid tr"},navLinks.map((n,i)=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("a",{key:i,href:n.url,className:"light-gray link dim f6 f5-l mr3 mr4-l"},n.name)))));};/* harmony default export */ const components_Header = (Header);
;// CONCATENATED MODULE: ./src/components/Layout/style.module.scss
// Exports
/* harmony default export */ const style_module = ({
	"body": "style-module--body--a1572"
});

;// CONCATENATED MODULE: ./src/components/Layout/index.jsx
const Layout=({children})=>{const{siteTitle,description}=(0,useSiteMetadata/* default */.Z)();return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(Helmet.Helmet,{bodyAttributes:{class:style_module.body}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("html",{lang:"en"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("title",null,siteTitle),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("meta",{name:"description",content:description}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("meta",{name:"keywords",content:"running"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("meta",{name:"viewport",content:"width=device-width, initial-scale=1, shrink-to-fit=no"})),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Header,{title:siteTitle}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"pa3 pa5-l"},children));};Layout.propTypes={children:(prop_types_default()).node.isRequired};/* harmony default export */ const components_Layout = (Layout);

/***/ }),

/***/ 2712:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var gatsby__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4718);
const useSiteMetadata=()=>{const{site}=(0,gatsby__WEBPACK_IMPORTED_MODULE_0__.useStaticQuery)("666401299");return site.siteMetadata;};/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (useSiteMetadata);

/***/ }),

/***/ 7837:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ pages)
});

// EXTERNAL MODULE: external "D:\\dev\\project\\github\\tt\\running_page\\node_modules\\react\\index.js"
var external_D_dev_project_github_tt_running_page_node_modules_react_index_js_ = __webpack_require__(3691);
var external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default = /*#__PURE__*/__webpack_require__.n(external_D_dev_project_github_tt_running_page_node_modules_react_index_js_);
;// CONCATENATED MODULE: ./node_modules/@vercel/analytics/dist/react/index.js
// src/react.tsx


// src/queue.ts
var initQueue = () => {
  if (window.va)
    return;
  window.va = function a(...params) {
    (window.vaq = window.vaq || []).push(params);
  };
};

// src/utils.ts
function isBrowser() {
  return typeof window !== "undefined";
}
function isDevelopment() {
  if (typeof process === "undefined")
    return false;
  return  false || "production" === "test";
}
function getMode(mode = "auto") {
  if (mode === "auto") {
    return isDevelopment() ? "development" : "production";
  }
  return mode;
}

// src/generic.ts
var inject = (props = {
  debug: true
}) => {
  var _a;
  if (!isBrowser())
    return;
  const mode = getMode(props.mode);
  initQueue();
  if (props.beforeSend) {
    (_a = window.va) == null ? void 0 : _a.call(window, "beforeSend", props.beforeSend);
  }
  const src = mode === "development" ? "https://cdn.vercel-insights.com/v1/script.debug.js" : "/_vercel/insights/script.js";
  if (document.head.querySelector(`script[src*="${src}"]`))
    return;
  const script = document.createElement("script");
  script.src = src;
  script.defer = true;
  if (mode === "development" && props.debug === false) {
    script.setAttribute("data-debug", "false");
  }
  document.head.appendChild(script);
};

// src/react.tsx
function Analytics({
  beforeSend,
  debug = true,
  mode = "auto"
}) {
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(() => {
    inject({ beforeSend, debug, mode });
  }, [beforeSend, debug, mode]);
  return null;
}

//# sourceMappingURL=index.js.map
// EXTERNAL MODULE: ./src/components/Layout/index.jsx + 2 modules
var Layout = __webpack_require__(5224);
// EXTERNAL MODULE: ./node_modules/@mapbox/polyline/src/polyline.js
var polyline = __webpack_require__(4311);
;// CONCATENATED MODULE: ./node_modules/gcoord/dist/gcoord.esm.js
/* @preserve
 * gcoord 0.3.2, geographic coordinate library
 * Copyright (c) 2021 Jiulong Hu <me@hujiulong.com>
 */

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var sin$1 = Math.sin, cos$1 = Math.cos, sqrt$1 = Math.sqrt, abs$1 = Math.abs, PI$1 = Math.PI;
var a = 6378245;
var ee = 0.006693421622965823;
// roughly check whether coordinates are in China.
function isInChinaBbox(lon, lat) {
    return lon >= 72.004 && lon <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}
function transformLat(x, y) {
    var ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * sqrt$1(abs$1(x));
    ret += ((20 * sin$1(6 * x * PI$1) + 20 * sin$1(2 * x * PI$1)) * 2) / 3;
    ret += ((20 * sin$1(y * PI$1) + 40 * sin$1((y / 3) * PI$1)) * 2) / 3;
    ret += ((160 * sin$1((y / 12) * PI$1) + 320 * sin$1((y * PI$1) / 30)) * 2) / 3;
    return ret;
}
function transformLon(x, y) {
    var ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * sqrt$1(abs$1(x));
    ret += ((20 * sin$1(6 * x * PI$1) + 20 * sin$1(2 * x * PI$1)) * 2) / 3;
    ret += ((20 * sin$1(x * PI$1) + 40 * sin$1((x / 3) * PI$1)) * 2) / 3;
    ret += ((150 * sin$1((x / 12) * PI$1) + 300 * sin$1((x / 30) * PI$1)) * 2) / 3;
    return ret;
}
function delta(lon, lat) {
    var dLon = transformLon(lon - 105, lat - 35);
    var dLat = transformLat(lon - 105, lat - 35);
    var radLat = (lat / 180) * PI$1;
    var magic = sin$1(radLat);
    magic = 1 - ee * magic * magic;
    var sqrtMagic = sqrt$1(magic);
    dLon = (dLon * 180) / ((a / sqrtMagic) * cos$1(radLat) * PI$1);
    dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * PI$1);
    return [dLon, dLat];
}
function WGS84ToGCJ02(coord) {
    var lon = coord[0], lat = coord[1];
    if (!isInChinaBbox(lon, lat))
        return [lon, lat];
    var d = delta(lon, lat);
    return [lon + d[0], lat + d[1]];
}
function GCJ02ToWGS84(coord) {
    var lon = coord[0], lat = coord[1];
    if (!isInChinaBbox(lon, lat))
        return [lon, lat];
    var _a = [lon, lat], wgsLon = _a[0], wgsLat = _a[1];
    var tempPoint = WGS84ToGCJ02([wgsLon, wgsLat]);
    var dx = tempPoint[0] - lon;
    var dy = tempPoint[1] - lat;
    while (abs$1(dx) > 1e-6 || abs$1(dy) > 1e-6) {
        wgsLon -= dx;
        wgsLat -= dy;
        tempPoint = WGS84ToGCJ02([wgsLon, wgsLat]);
        dx = tempPoint[0] - lon;
        dy = tempPoint[1] - lat;
    }
    return [wgsLon, wgsLat];
}

var sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, sqrt = Math.sqrt, PI = Math.PI;
var baiduFactor = (PI * 3000.0) / 180.0;
function BD09ToGCJ02(coord) {
    var lon = coord[0], lat = coord[1];
    var x = lon - 0.0065;
    var y = lat - 0.006;
    var z = sqrt(x * x + y * y) - 0.00002 * sin(y * baiduFactor);
    var theta = atan2(y, x) - 0.000003 * cos(x * baiduFactor);
    var newLon = z * cos(theta);
    var newLat = z * sin(theta);
    return [newLon, newLat];
}
function GCJ02ToBD09(coord) {
    var lon = coord[0], lat = coord[1];
    var x = lon;
    var y = lat;
    var z = sqrt(x * x + y * y) + 0.00002 * sin(y * baiduFactor);
    var theta = atan2(y, x) + 0.000003 * cos(x * baiduFactor);
    var newLon = z * cos(theta) + 0.0065;
    var newLat = z * sin(theta) + 0.006;
    return [newLon, newLat];
}

// https://github.com/Turfjs/turf/blob/master/packages/turf-projection/index.ts
var R2D = 180 / Math.PI;
var D2R = Math.PI / 180;
var A = 6378137.0;
var MAXEXTENT = 20037508.342789244;
function ESPG3857ToWGS84(xy) {
    return [
        (xy[0] * R2D) / A,
        (Math.PI * 0.5 - 2.0 * Math.atan(Math.exp(-xy[1] / A))) * R2D,
    ];
}
function WGS84ToEPSG3857(lonLat) {
    // compensate longitudes passing the 180th meridian
    // from https://github.com/proj4js/proj4js/blob/master/lib/common/adjust_lon.js
    var adjusted = Math.abs(lonLat[0]) <= 180
        ? lonLat[0]
        : lonLat[0] - (lonLat[0] < 0 ? -1 : 1) * 360;
    var xy = [
        A * adjusted * D2R,
        A * Math.log(Math.tan(Math.PI * 0.25 + 0.5 * lonLat[1] * D2R)),
    ];
    // if xy value is beyond maxextent (e.g. poles), return maxextent
    if (xy[0] > MAXEXTENT)
        xy[0] = MAXEXTENT;
    if (xy[0] < -MAXEXTENT)
        xy[0] = -MAXEXTENT;
    if (xy[1] > MAXEXTENT)
        xy[1] = MAXEXTENT;
    if (xy[1] < -MAXEXTENT)
        xy[1] = -MAXEXTENT;
    return xy;
}

var abs = Math.abs;
var MCBAND = [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0];
var LLBAND = [75, 60, 45, 30, 15, 0];
var MC2LL = [
    [
        1.410526172116255e-8,
        0.00000898305509648872,
        -1.9939833816331,
        200.9824383106796,
        -187.2403703815547,
        91.6087516669843,
        -23.38765649603339,
        2.57121317296198,
        -0.03801003308653,
        17337981.2,
    ],
    [
        -7.435856389565537e-9,
        0.000008983055097726239,
        -0.78625201886289,
        96.32687599759846,
        -1.85204757529826,
        -59.36935905485877,
        47.40033549296737,
        -16.50741931063887,
        2.28786674699375,
        10260144.86,
    ],
    [
        -3.030883460898826e-8,
        0.00000898305509983578,
        0.30071316287616,
        59.74293618442277,
        7.357984074871,
        -25.38371002664745,
        13.45380521110908,
        -3.29883767235584,
        0.32710905363475,
        6856817.37,
    ],
    [
        -1.981981304930552e-8,
        0.000008983055099779535,
        0.03278182852591,
        40.31678527705744,
        0.65659298677277,
        -4.44255534477492,
        0.85341911805263,
        0.12923347998204,
        -0.04625736007561,
        4482777.06,
    ],
    [
        3.09191371068437e-9,
        0.000008983055096812155,
        0.00006995724062,
        23.10934304144901,
        -0.00023663490511,
        -0.6321817810242,
        -0.00663494467273,
        0.03430082397953,
        -0.00466043876332,
        2555164.4,
    ],
    [
        2.890871144776878e-9,
        0.000008983055095805407,
        -3.068298e-8,
        7.47137025468032,
        -0.00000353937994,
        -0.02145144861037,
        -0.00001234426596,
        0.00010322952773,
        -0.00000323890364,
        826088.5,
    ],
];
var LL2MC = [
    [
        -0.0015702102444,
        111320.7020616939,
        1704480524535203,
        -10338987376042340,
        26112667856603880,
        -35149669176653700,
        26595700718403920,
        -10725012454188240,
        1800819912950474,
        82.5,
    ],
    [
        0.0008277824516172526,
        111320.7020463578,
        647795574.6671607,
        -4082003173.641316,
        10774905663.51142,
        -15171875531.51559,
        12053065338.62167,
        -5124939663.577472,
        913311935.9512032,
        67.5,
    ],
    [
        0.00337398766765,
        111320.7020202162,
        4481351.045890365,
        -23393751.19931662,
        79682215.47186455,
        -115964993.2797253,
        97236711.15602145,
        -43661946.33752821,
        8477230.501135234,
        52.5,
    ],
    [
        0.00220636496208,
        111320.7020209128,
        51751.86112841131,
        3796837.749470245,
        992013.7397791013,
        -1221952.21711287,
        1340652.697009075,
        -620943.6990984312,
        144416.9293806241,
        37.5,
    ],
    [
        -0.0003441963504368392,
        111320.7020576856,
        278.2353980772752,
        2485758.690035394,
        6070.750963243378,
        54821.18345352118,
        9540.606633304236,
        -2710.55326746645,
        1405.483844121726,
        22.5,
    ],
    [
        -0.0003218135878613132,
        111320.7020701615,
        0.00369383431289,
        823725.6402795718,
        0.46104986909093,
        2351.343141331292,
        1.58060784298199,
        8.77738589078284,
        0.37238884252424,
        7.45,
    ],
];
function transform$1(x, y, factors) {
    var cc = abs(y) / factors[9];
    var xt = factors[0] + factors[1] * abs(x);
    var yt = factors[2] +
        factors[3] * cc +
        factors[4] * Math.pow(cc, 2) +
        factors[5] * Math.pow(cc, 3) +
        factors[6] * Math.pow(cc, 4) +
        factors[7] * Math.pow(cc, 5) +
        factors[8] * Math.pow(cc, 6);
    xt *= x < 0 ? -1 : 1;
    yt *= y < 0 ? -1 : 1;
    return [xt, yt];
}
function BD09toBD09MC(coord) {
    var lng = coord[0], lat = coord[1];
    var factors = [];
    for (var i = 0; i < LLBAND.length; i++) {
        if (abs(lat) > LLBAND[i]) {
            factors = LL2MC[i];
            break;
        }
    }
    return transform$1(lng, lat, factors);
}
function BD09MCtoBD09(coord) {
    var x = coord[0], y = coord[1];
    var factors = [];
    for (var i = 0; i < MCBAND.length; i++) {
        if (y >= MCBAND[i]) {
            factors = MC2LL[i];
            break;
        }
    }
    return transform$1(x, y, factors);
}

function gcoord_esm_assert(condition, msg) {
    if (!condition)
        throw new Error(msg);
}
/**
 * isArray
 *
 * @param {*} input variable to validate
 * @returns {boolean} true/false
 */
function isArray(input) {
    return !!input && Object.prototype.toString.call(input) === '[object Array]';
}
/**
 * isNumber
 *
 * @param {*} num Number to validate
 * @returns {boolean} true/false
 * @example
 * isNumber(123)
 * //=true
 * isNumber('foo')
 * //=false
 */
function isNumber(input) {
    return !isNaN(Number(input)) && input !== null && !isArray(input);
}
/**
 * compose
 *
 * @param {function[]} functions
 * @returns {function}
 */
function compose() {
    var funcs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        funcs[_i] = arguments[_i];
    }
    var start = funcs.length - 1;
    /* eslint-disable func-names */
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var i = start;
        var result = funcs[start].apply(null, args);
        while (i--)
            result = funcs[i].call(null, result);
        return result;
    };
}
/**
 * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
 * https://github.com/Turfjs/turf/blob/master/packages/turf-meta/index.mjs
 *
 * @name coordEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, multiFeatureIndex)
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {void}
 * @example
 * let features = featureCollection([
 *   point([26, 37], {"foo": "bar"}),
 *   point([36, 53], {"hello": "world"})
 * ]);
 *
 * coordEach(features, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 * });
 */
/* eslint-disable no-param-reassign */
function coordEach(geojson, callback, excludeWrapCoord) {
    if (excludeWrapCoord === void 0) { excludeWrapCoord = false; }
    // Handles null Geometry -- Skips this GeoJSON
    if (geojson === null)
        return;
    /* eslint-disable-next-line */
    var j, k, l, geometry, stopG, coords, geometryMaybeCollection, wrapShrink = 0, coordIndex = 0, isGeometryCollection;
    var type = geojson.type;
    var isFeatureCollection = type === 'FeatureCollection';
    var isFeature = type === 'Feature';
    var stop = isFeatureCollection
        ? geojson.features.length
        : 1;
    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
        geometryMaybeCollection = isFeatureCollection
            ? geojson.features[featureIndex].geometry
            : isFeature
                ? geojson.geometry
                : geojson;
        isGeometryCollection = geometryMaybeCollection
            ? geometryMaybeCollection.type === 'GeometryCollection'
            : false;
        stopG = isGeometryCollection
            ? geometryMaybeCollection.geometries.length
            : 1;
        for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
            var multiFeatureIndex = 0;
            var geometryIndex = 0;
            geometry = isGeometryCollection
                ? geometryMaybeCollection.geometries[geomIndex]
                : geometryMaybeCollection;
            // Handles null Geometry -- Skips this geometry
            if (geometry === null)
                continue;
            var geomType = geometry.type;
            wrapShrink =
                excludeWrapCoord &&
                    (geomType === 'Polygon' || geomType === 'MultiPolygon')
                    ? 1
                    : 0;
            switch (geomType) {
                case null:
                    break;
                case 'Point':
                    coords = geometry.coordinates;
                    if (callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false)
                        return false;
                    coordIndex++;
                    multiFeatureIndex++;
                    break;
                case 'LineString':
                case 'MultiPoint':
                    coords = geometry.coordinates;
                    for (j = 0; j < coords.length; j++) {
                        if (callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false)
                            return false;
                        coordIndex++;
                        if (geomType === 'MultiPoint')
                            multiFeatureIndex++;
                    }
                    if (geomType === 'LineString')
                        multiFeatureIndex++;
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    coords = geometry.coordinates;
                    for (j = 0; j < coords.length; j++) {
                        for (k = 0; k < coords[j].length - wrapShrink; k++) {
                            if (callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false)
                                return false;
                            coordIndex++;
                        }
                        if (geomType === 'MultiLineString')
                            multiFeatureIndex++;
                        if (geomType === 'Polygon')
                            geometryIndex++;
                    }
                    if (geomType === 'Polygon')
                        multiFeatureIndex++;
                    break;
                case 'MultiPolygon':
                    coords = geometry.coordinates;
                    for (j = 0; j < coords.length; j++) {
                        geometryIndex = 0;
                        for (k = 0; k < coords[j].length; k++) {
                            for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                                if (callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false)
                                    return false;
                                coordIndex++;
                            }
                            geometryIndex++;
                        }
                        multiFeatureIndex++;
                    }
                    break;
                case 'GeometryCollection':
                    for (j = 0; j < geometry.geometries.length; j++) {
                        if (coordEach(geometry.geometries[j], callback, excludeWrapCoord) === false)
                            return false;
                    }
                    break;
                default:
                    throw new Error('Unknown Geometry Type');
            }
        }
    }
}

var _a, _b, _c, _d, _e;
var CRSTypes;
(function (CRSTypes) {
    // WGS84
    CRSTypes["WGS84"] = "WGS84";
    CRSTypes["WGS1984"] = "WGS84";
    CRSTypes["EPSG4326"] = "WGS84";
    // GCJ02
    CRSTypes["GCJ02"] = "GCJ02";
    CRSTypes["AMap"] = "GCJ02";
    // BD09
    CRSTypes["BD09"] = "BD09";
    CRSTypes["BD09LL"] = "BD09";
    CRSTypes["Baidu"] = "BD09";
    CRSTypes["BMap"] = "BD09";
    // BD09MC
    CRSTypes["BD09MC"] = "BD09MC";
    CRSTypes["BD09Meter"] = "BD09MC";
    // EPSG3857
    CRSTypes["EPSG3857"] = "EPSG3857";
    CRSTypes["EPSG900913"] = "EPSG3857";
    CRSTypes["EPSG102100"] = "EPSG3857";
    CRSTypes["WebMercator"] = "EPSG3857";
    CRSTypes["WM"] = "EPSG3857";
})(CRSTypes || (CRSTypes = {}));
var WGS84 = {
    to: (_a = {},
        _a[CRSTypes.GCJ02] = WGS84ToGCJ02,
        _a[CRSTypes.BD09] = compose(GCJ02ToBD09, WGS84ToGCJ02),
        _a[CRSTypes.BD09MC] = compose(BD09toBD09MC, GCJ02ToBD09, WGS84ToGCJ02),
        _a[CRSTypes.EPSG3857] = WGS84ToEPSG3857,
        _a),
};
var GCJ02 = {
    to: (_b = {},
        _b[CRSTypes.WGS84] = GCJ02ToWGS84,
        _b[CRSTypes.BD09] = GCJ02ToBD09,
        _b[CRSTypes.BD09MC] = compose(BD09toBD09MC, GCJ02ToBD09),
        _b[CRSTypes.EPSG3857] = compose(WGS84ToEPSG3857, GCJ02ToWGS84),
        _b),
};
var BD09 = {
    to: (_c = {},
        _c[CRSTypes.WGS84] = compose(GCJ02ToWGS84, BD09ToGCJ02),
        _c[CRSTypes.GCJ02] = BD09ToGCJ02,
        _c[CRSTypes.EPSG3857] = compose(WGS84ToEPSG3857, GCJ02ToWGS84, BD09ToGCJ02),
        _c[CRSTypes.BD09MC] = BD09toBD09MC,
        _c),
};
var EPSG3857 = {
    to: (_d = {},
        _d[CRSTypes.WGS84] = ESPG3857ToWGS84,
        _d[CRSTypes.GCJ02] = compose(WGS84ToGCJ02, ESPG3857ToWGS84),
        _d[CRSTypes.BD09] = compose(GCJ02ToBD09, WGS84ToGCJ02, ESPG3857ToWGS84),
        _d[CRSTypes.BD09MC] = compose(BD09toBD09MC, GCJ02ToBD09, WGS84ToGCJ02, ESPG3857ToWGS84),
        _d),
};
var BD09MC = {
    to: (_e = {},
        _e[CRSTypes.WGS84] = compose(GCJ02ToWGS84, BD09ToGCJ02, BD09MCtoBD09),
        _e[CRSTypes.GCJ02] = compose(BD09ToGCJ02, BD09MCtoBD09),
        _e[CRSTypes.EPSG3857] = compose(WGS84ToEPSG3857, GCJ02ToWGS84, BD09ToGCJ02, BD09MCtoBD09),
        _e[CRSTypes.BD09] = BD09MCtoBD09,
        _e),
};
var crsMap = {
    WGS84: WGS84,
    GCJ02: GCJ02,
    BD09: BD09,
    EPSG3857: EPSG3857,
    BD09MC: BD09MC,
};

/**
 * transform
 *
 * @param {geojson|position|string} input
 * @returns {geojson|position} output
 */
/* eslint-disable no-param-reassign */
function transform(input, crsFrom, crsTo) {
    gcoord_esm_assert(!!input, 'The args[0] input coordinate is required');
    gcoord_esm_assert(!!crsFrom, 'The args[1] original coordinate system is required');
    gcoord_esm_assert(!!crsTo, 'The args[2] target coordinate system is required');
    if (crsFrom === crsTo)
        return input;
    var from = crsMap[crsFrom];
    gcoord_esm_assert(!!from, "Invalid original coordinate system: " + crsFrom);
    var to = from.to[crsTo];
    gcoord_esm_assert(!!to, "Invalid target coordinate system: " + crsTo);
    var type = typeof input;
    gcoord_esm_assert(type === 'string' || type === 'object', "Invalid input coordinate type: " + type);
    if (type === 'string') {
        try {
            input = JSON.parse(input);
        }
        catch (e) {
            throw new Error("Invalid input coordinate: " + input);
        }
    }
    var isPosition = false;
    if (isArray(input)) {
        gcoord_esm_assert(input.length >= 2, "Invalid input coordinate: " + input);
        gcoord_esm_assert(isNumber(input[0]) && isNumber(input[1]), "Invalid input coordinate: " + input);
        input = input.map(Number);
        isPosition = true;
    }
    var convert = to;
    if (isPosition)
        return convert(input);
    // GeoJSON类型直接转换输入
    coordEach(input, function (coord) {
        var _a;
        _a = convert(coord), coord[0] = _a[0], coord[1] = _a[1];
    });
    return input;
}

var exported = __assign(__assign({}, CRSTypes), { // 兼容原来gcoord.WGS84的使用方式
    CRSTypes: CRSTypes,
    transform: transform });

/* harmony default export */ const gcoord_esm = (exported);
//# sourceMappingURL=gcoord.esm.js.map

;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/arrayLikeToArray.js
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }
  return arr2;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/arrayWithoutHoles.js

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/iterableToArray.js
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/unsupportedIterableToArray.js

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/nonIterableSpread.js
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/toConsumableArray.js




function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(5697);
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/arrayWithHoles.js
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/iterableToArrayLimit.js
function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;
  var _s, _e;
  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);
      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }
  return _arr;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/nonIterableRest.js
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/slicedToArray.js




function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}
;// CONCATENATED MODULE: ./node_modules/gl-matrix/esm/common.js
/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
var RANDOM = Math.random;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */

function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}
var degree = Math.PI / 180;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */

function toRadian(a) {
  return a * degree;
}
/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */

function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};
;// CONCATENATED MODULE: ./node_modules/gl-matrix/esm/vec4.js

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {ReadonlyVec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */

function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */

function fromValues(x, y, z, w) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the source vector
 * @returns {vec4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */

function set(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
/**
 * Math.ceil the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to ceil
 * @returns {vec4} out
 */

function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
/**
 * Math.floor the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to floor
 * @returns {vec4} out
 */

function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
/**
 * Math.round the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to round
 * @returns {vec4} out
 */

function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  out[3] = Math.round(a[3]);
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */

function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} distance between a and b
 */

function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} squared distance between a and b
 */

function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Calculates the length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate length of
 * @returns {Number} length of a
 */

function vec4_length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to negate
 * @returns {vec4} out
 */

function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to invert
 * @returns {vec4} out
 */

function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Calculates the dot product of two vec4's
 *
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
/**
 * Returns the cross-product of three vectors in a 4-dimensional space
 *
 * @param {ReadonlyVec4} result the receiving vector
 * @param {ReadonlyVec4} U the first vector
 * @param {ReadonlyVec4} V the second vector
 * @param {ReadonlyVec4} W the third vector
 * @returns {vec4} result
 */

function cross(out, u, v, w) {
  var A = v[0] * w[1] - v[1] * w[0],
      B = v[0] * w[2] - v[2] * w[0],
      C = v[0] * w[3] - v[3] * w[0],
      D = v[1] * w[2] - v[2] * w[1],
      E = v[1] * w[3] - v[3] * w[1],
      F = v[2] * w[3] - v[3] * w[2];
  var G = u[0];
  var H = u[1];
  var I = u[2];
  var J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec4} out
 */

function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  var aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */

function random(out, scale) {
  scale = scale || 1.0; // Marsaglia, George. Choosing a Point from the Surface of a
  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
  // http://projecteuclid.org/euclid.aoms/1177692644;

  var v1, v2, v3, v4;
  var s1, s2;

  do {
    v1 = glMatrix.RANDOM() * 2 - 1;
    v2 = glMatrix.RANDOM() * 2 - 1;
    s1 = v1 * v1 + v2 * v2;
  } while (s1 >= 1);

  do {
    v3 = glMatrix.RANDOM() * 2 - 1;
    v4 = glMatrix.RANDOM() * 2 - 1;
    s2 = v3 * v3 + v4 * v4;
  } while (s2 >= 1);

  var d = Math.sqrt((1 - s1) / s2);
  out[0] = scale * v1;
  out[1] = scale * v2;
  out[2] = scale * v3 * d;
  out[3] = scale * v4 * d;
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec4} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec4} out
 */

function transformQuat(out, a, q) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3]; // calculate quat * vec

  var ix = qw * x + qy * z - qz * y;
  var iy = qw * y + qz * x - qx * z;
  var iz = qw * z + qx * y - qy * x;
  var iw = -qx * x - qy * y - qz * z; // calculate result * inverse quat

  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to zero
 *
 * @param {vec4} out the receiving vector
 * @returns {vec4} out
 */

function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec4} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function str(a) {
  return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec4} a The first vector.
 * @param {ReadonlyVec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function vec4_equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */

var sub = (/* unused pure expression or super */ null && (subtract));
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = (/* unused pure expression or super */ null && (multiply));
/**
 * Alias for {@link vec4.divide}
 * @function
 */

var div = (/* unused pure expression or super */ null && (divide));
/**
 * Alias for {@link vec4.distance}
 * @function
 */

var dist = (/* unused pure expression or super */ null && (distance));
/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */

var sqrDist = (/* unused pure expression or super */ null && (squaredDistance));
/**
 * Alias for {@link vec4.length}
 * @function
 */

var len = (/* unused pure expression or super */ null && (vec4_length));
/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */

var sqrLen = (/* unused pure expression or super */ null && (squaredLength));
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/math-utils.js

function createMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function transformVector(matrix, vector) {
  const result = transformMat4([], vector, matrix);
  scale(result, result, 1 / result[3]);
  return result;
}
function mod(value, divisor) {
  const modulus = value % divisor;
  return modulus < 0 ? divisor + modulus : modulus;
}
function math_utils_lerp(start, end, step) {
  return step * end + (1 - step) * start;
}
function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

function ieLog2(x) {
  return Math.log(x) * Math.LOG2E;
}

const log2 = Math.log2 || ieLog2;
//# sourceMappingURL=math-utils.js.map
;// CONCATENATED MODULE: ./node_modules/gl-matrix/esm/mat4.js

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function mat4_create() {
  var out = new glMatrix.ARRAY_TYPE(16);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function mat4_clone(a) {
  var out = new glMatrix.ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function mat4_copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */

function mat4_fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new glMatrix.ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */

function mat4_set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function mat4_multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function mat4_scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < glMatrix.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Scaling vector
 * @returns {mat4} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function fromRotation(out, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;

  if (len < glMatrix.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c; // Perform rotation-specific matrix multiplication

  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */

function fromRotationTranslation(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 from a dual quat.
 *
 * @param {mat4} out Matrix
 * @param {ReadonlyQuat2} a Dual Quaternion
 * @returns {mat4} mat4 receiving operation result
 */

function fromQuat2(out, a) {
  var translation = new glMatrix.ARRAY_TYPE(3);
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw; //Only scale if it makes sense

  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }

  fromRotationTranslation(out, a, translation);
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new glMatrix.ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @param {ReadonlyVec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */

function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyQuat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */

function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveNO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Alias for {@link mat4.perspectiveNO}
 * @function
 */

var perspective = perspectiveNO;
/**
 * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
 * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */

function perspectiveZO(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = far * nf;
    out[14] = far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -near;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function perspectiveFromFieldOfView(out, fov, near, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  out[4] = 0.0;
  out[5] = yScale;
  out[6] = 0.0;
  out[7] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near - far);
  out[11] = -1.0;
  out[12] = 0.0;
  out[13] = 0.0;
  out[14] = far * near / (near - far);
  out[15] = 0.0;
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.orthoNO}
 * @function
 */

var ortho = (/* unused pure expression or super */ null && (orthoNO));
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
 * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoZO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = near * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < glMatrix.EPSILON && Math.abs(eyey - centery) < glMatrix.EPSILON && Math.abs(eyez - centerz) < glMatrix.EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
/**
 * Returns a string representation of a mat4
 *
 * @param {ReadonlyMat4} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */

function mat4_str(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
/**
 * Returns Frobenius norm of a mat4
 *
 * @param {ReadonlyMat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */

function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
}
/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function mat4_add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function mat4_subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */

function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */

function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  out[9] = a[9] + b[9] * scale;
  out[10] = a[10] + b[10] * scale;
  out[11] = a[11] + b[11] * scale;
  out[12] = a[12] + b[12] * scale;
  out[13] = a[13] + b[13] * scale;
  out[14] = a[14] + b[14] * scale;
  out[15] = a[15] + b[15] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function mat4_exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {ReadonlyMat4} a The first matrix.
 * @param {ReadonlyMat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */

function mat4_equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var a8 = a[8],
      a9 = a[9],
      a10 = a[10],
      a11 = a[11];
  var a12 = a[12],
      a13 = a[13],
      a14 = a[14],
      a15 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  var b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  var b8 = b[8],
      b9 = b[9],
      b10 = b[10],
      b11 = b[11];
  var b12 = b[12],
      b13 = b[13],
      b14 = b[14],
      b15 = b[15];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15));
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */

var mat4_mul = (/* unused pure expression or super */ null && (mat4_multiply));
/**
 * Alias for {@link mat4.subtract}
 * @function
 */

var mat4_sub = (/* unused pure expression or super */ null && (mat4_subtract));
;// CONCATENATED MODULE: ./node_modules/gl-matrix/esm/vec2.js

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function vec2_create() {
  var out = new ARRAY_TYPE(2);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {ReadonlyVec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */

function vec2_clone(a) {
  var out = new glMatrix.ARRAY_TYPE(2);
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */

function vec2_fromValues(x, y) {
  var out = new glMatrix.ARRAY_TYPE(2);
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the source vector
 * @returns {vec2} out
 */

function vec2_copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */

function vec2_set(out, x, y) {
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}
/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
/**
 * Math.ceil the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to ceil
 * @returns {vec2} out
 */

function vec2_ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
/**
 * Math.floor the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to floor
 * @returns {vec2} out
 */

function vec2_floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec2} out
 */

function vec2_max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
/**
 * Math.round the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to round
 * @returns {vec2} out
 */

function vec2_round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  return out;
}
/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */

function vec2_scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}
/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */

function vec2_scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} distance between a and b
 */

function vec2_distance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} squared distance between a and b
 */

function vec2_squaredDistance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return x * x + y * y;
}
/**
 * Calculates the length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate length of
 * @returns {Number} length of a
 */

function vec2_length(a) {
  var x = a[0],
      y = a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared length of a vec2
 *
 * @param {ReadonlyVec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function vec2_squaredLength(a) {
  var x = a[0],
      y = a[1];
  return x * x + y * y;
}
/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to negate
 * @returns {vec2} out
 */

function vec2_negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to invert
 * @returns {vec2} out
 */

function vec2_inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}
/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a vector to normalize
 * @returns {vec2} out
 */

function vec2_normalize(out, a) {
  var x = a[0],
      y = a[1];
  var len = x * x + y * y;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  return out;
}
/**
 * Calculates the dot product of two vec2's
 *
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {Number} dot product of a and b
 */

function vec2_dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}
/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @returns {vec3} out
 */

function vec2_cross(out, a, b) {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the first operand
 * @param {ReadonlyVec2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec2} out
 */

function vec2_lerp(out, a, b, t) {
  var ax = a[0],
      ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */

function vec2_random(out, scale) {
  scale = scale || 1.0;
  var r = glMatrix.RANDOM() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}
/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat2d} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat2d(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat3} m matrix to transform with
 * @returns {vec2} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {ReadonlyVec2} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec2} out
 */

function vec2_transformMat4(out, a, m) {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
/**
 * Rotate a 2D vector
 * @param {vec2} out The receiving vec2
 * @param {ReadonlyVec2} a The vec2 point to rotate
 * @param {ReadonlyVec2} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec2} out
 */

function vec2_rotate(out, a, b, rad) {
  //Translate point to the origin
  var p0 = a[0] - b[0],
      p1 = a[1] - b[1],
      sinC = Math.sin(rad),
      cosC = Math.cos(rad); //perform rotation and translate to correct position

  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
/**
 * Get the angle between two 2D vectors
 * @param {ReadonlyVec2} a The first operand
 * @param {ReadonlyVec2} b The second operand
 * @returns {Number} The angle in radians
 */

function angle(a, b) {
  var x1 = a[0],
      y1 = a[1],
      x2 = b[0],
      y2 = b[1],
      // mag is the product of the magnitudes of a and b
  mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2),
      // mag &&.. short circuits if mag == 0
  cosine = mag && (x1 * x2 + y1 * y2) / mag; // Math.min(Math.max(cosine, -1), 1) clamps the cosine between -1 and 1

  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec2 to zero
 *
 * @param {vec2} out the receiving vector
 * @returns {vec2} out
 */

function vec2_zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec2} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function vec2_str(a) {
  return "vec2(" + a[0] + ", " + a[1] + ")";
}
/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function vec2_exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec2} a The first vector.
 * @param {ReadonlyVec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function vec2_equals(a, b) {
  var a0 = a[0],
      a1 = a[1];
  var b0 = b[0],
      b1 = b[1];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1));
}
/**
 * Alias for {@link vec2.length}
 * @function
 */

var vec2_len = (/* unused pure expression or super */ null && (vec2_length));
/**
 * Alias for {@link vec2.subtract}
 * @function
 */

var vec2_sub = vec2_subtract;
/**
 * Alias for {@link vec2.multiply}
 * @function
 */

var vec2_mul = (/* unused pure expression or super */ null && (vec2_multiply));
/**
 * Alias for {@link vec2.divide}
 * @function
 */

var vec2_div = (/* unused pure expression or super */ null && (vec2_divide));
/**
 * Alias for {@link vec2.distance}
 * @function
 */

var vec2_dist = (/* unused pure expression or super */ null && (vec2_distance));
/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */

var vec2_sqrDist = (/* unused pure expression or super */ null && (vec2_squaredDistance));
/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */

var vec2_sqrLen = (/* unused pure expression or super */ null && (vec2_squaredLength));
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var vec2_forEach = function () {
  var vec = vec2_create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();
;// CONCATENATED MODULE: ./node_modules/gl-matrix/esm/vec3.js

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function vec3_create() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {ReadonlyVec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */

function vec3_clone(a) {
  var out = new glMatrix.ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function vec3_length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function vec3_fromValues(x, y, z) {
  var out = new glMatrix.ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the source vector
 * @returns {vec3} out
 */

function vec3_copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */

function vec3_set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to ceil
 * @returns {vec3} out
 */

function vec3_ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to floor
 * @returns {vec3} out
 */

function vec3_floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to round
 * @returns {vec3} out
 */

function vec3_round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function vec3_scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */

function vec3_scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} distance between a and b
 */

function vec3_distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} squared distance between a and b
 */

function vec3_squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

function vec3_squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to negate
 * @returns {vec3} out
 */

function vec3_negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to invert
 * @returns {vec3} out
 */

function vec3_inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function vec3_normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function vec3_dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function vec3_cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function vec3_lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {ReadonlyVec3} c the third operand
 * @param {ReadonlyVec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */

function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */

function vec3_random(out, scale) {
  scale = scale || 1.0;
  var r = glMatrix.RANDOM() * 2.0 * Math.PI;
  var z = glMatrix.RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function vec3_transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function vec3_transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyQuat} q quaternion to transform with
 * @returns {vec3} out
 */

function vec3_transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function vec3_rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function vec3_rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function vec3_rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {ReadonlyVec3} a The first operand
 * @param {ReadonlyVec3} b The second operand
 * @returns {Number} The angle in radians
 */

function vec3_angle(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && vec3_dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */

function vec3_zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {ReadonlyVec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

function vec3_str(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function vec3_exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {ReadonlyVec3} a The first vector.
 * @param {ReadonlyVec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

function vec3_equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var vec3_sub = (/* unused pure expression or super */ null && (vec3_subtract));
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var vec3_mul = vec3_multiply;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

var vec3_div = (/* unused pure expression or super */ null && (vec3_divide));
/**
 * Alias for {@link vec3.distance}
 * @function
 */

var vec3_dist = (/* unused pure expression or super */ null && (vec3_distance));
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

var vec3_sqrDist = (/* unused pure expression or super */ null && (vec3_squaredDistance));
/**
 * Alias for {@link vec3.length}
 * @function
 */

var vec3_len = (/* unused pure expression or super */ null && (vec3_length));
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

var vec3_sqrLen = (/* unused pure expression or super */ null && (vec3_squaredLength));
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

var vec3_forEach = function () {
  var vec = vec3_create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/assert.js
function assert_assert(condition, message) {
  if (!condition) {
    throw new Error(message || '@math.gl/web-mercator: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/web-mercator-utils.js





const web_mercator_utils_PI = Math.PI;
const PI_4 = web_mercator_utils_PI / 4;
const DEGREES_TO_RADIANS = web_mercator_utils_PI / 180;
const RADIANS_TO_DEGREES = 180 / web_mercator_utils_PI;
const TILE_SIZE = 512;
const EARTH_CIRCUMFERENCE = 40.03e6;
const MAX_LATITUDE = 85.051129;
const DEFAULT_ALTITUDE = 1.5;
function zoomToScale(zoom) {
  return Math.pow(2, zoom);
}
function scaleToZoom(scale) {
  return log2(scale);
}
function lngLatToWorld(lngLat) {
  const [lng, lat] = lngLat;
  assert_assert(Number.isFinite(lng));
  assert_assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, 'invalid latitude');
  const lambda2 = lng * DEGREES_TO_RADIANS;
  const phi2 = lat * DEGREES_TO_RADIANS;
  const x = TILE_SIZE * (lambda2 + web_mercator_utils_PI) / (2 * web_mercator_utils_PI);
  const y = TILE_SIZE * (web_mercator_utils_PI + Math.log(Math.tan(PI_4 + phi2 * 0.5))) / (2 * web_mercator_utils_PI);
  return [x, y];
}
function worldToLngLat(xy) {
  const [x, y] = xy;
  const lambda2 = x / TILE_SIZE * (2 * web_mercator_utils_PI) - web_mercator_utils_PI;
  const phi2 = 2 * (Math.atan(Math.exp(y / TILE_SIZE * (2 * web_mercator_utils_PI) - web_mercator_utils_PI)) - PI_4);
  return [lambda2 * RADIANS_TO_DEGREES, phi2 * RADIANS_TO_DEGREES];
}
function getMeterZoom(options) {
  const {
    latitude
  } = options;
  assert(Number.isFinite(latitude));
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return scaleToZoom(EARTH_CIRCUMFERENCE * latCosine) - 9;
}
function unitsPerMeter(latitude) {
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return TILE_SIZE / EARTH_CIRCUMFERENCE / latCosine;
}
function getDistanceScales(options) {
  const {
    latitude,
    longitude,
    highPrecision = false
  } = options;
  assert_assert(Number.isFinite(latitude) && Number.isFinite(longitude));
  const worldSize = TILE_SIZE;
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  const unitsPerDegreeX = worldSize / 360;
  const unitsPerDegreeY = unitsPerDegreeX / latCosine;
  const altUnitsPerMeter = worldSize / EARTH_CIRCUMFERENCE / latCosine;
  const result = {
    unitsPerMeter: [altUnitsPerMeter, altUnitsPerMeter, altUnitsPerMeter],
    metersPerUnit: [1 / altUnitsPerMeter, 1 / altUnitsPerMeter, 1 / altUnitsPerMeter],
    unitsPerDegree: [unitsPerDegreeX, unitsPerDegreeY, altUnitsPerMeter],
    degreesPerUnit: [1 / unitsPerDegreeX, 1 / unitsPerDegreeY, 1 / altUnitsPerMeter]
  };

  if (highPrecision) {
    const latCosine2 = DEGREES_TO_RADIANS * Math.tan(latitude * DEGREES_TO_RADIANS) / latCosine;
    const unitsPerDegreeY2 = unitsPerDegreeX * latCosine2 / 2;
    const altUnitsPerDegree2 = worldSize / EARTH_CIRCUMFERENCE * latCosine2;
    const altUnitsPerMeter2 = altUnitsPerDegree2 / unitsPerDegreeY * altUnitsPerMeter;
    result.unitsPerDegree2 = [0, unitsPerDegreeY2, altUnitsPerDegree2];
    result.unitsPerMeter2 = [altUnitsPerMeter2, 0, altUnitsPerMeter2];
  }

  return result;
}
function addMetersToLngLat(lngLatZ, xyz) {
  const [longitude, latitude, z0] = lngLatZ;
  const [x, y, z] = xyz;
  const {
    unitsPerMeter,
    unitsPerMeter2
  } = getDistanceScales({
    longitude,
    latitude,
    highPrecision: true
  });
  const worldspace = lngLatToWorld(lngLatZ);
  worldspace[0] += x * (unitsPerMeter[0] + unitsPerMeter2[0] * y);
  worldspace[1] += y * (unitsPerMeter[1] + unitsPerMeter2[1] * y);
  const newLngLat = worldToLngLat(worldspace);
  const newZ = (z0 || 0) + (z || 0);
  return Number.isFinite(z0) || Number.isFinite(z) ? [newLngLat[0], newLngLat[1], newZ] : newLngLat;
}
function getViewMatrix(options) {
  const {
    height,
    pitch,
    bearing,
    altitude,
    scale,
    center
  } = options;
  const vm = createMat4();
  translate(vm, vm, [0, 0, -altitude]);
  rotateX(vm, vm, -pitch * DEGREES_TO_RADIANS);
  rotateZ(vm, vm, bearing * DEGREES_TO_RADIANS);
  const relativeScale = scale / height;
  mat4_scale(vm, vm, [relativeScale, relativeScale, relativeScale]);

  if (center) {
    translate(vm, vm, vec3_negate([], center));
  }

  return vm;
}
function getProjectionParameters(options) {
  const {
    width,
    height,
    altitude,
    pitch = 0,
    offset,
    center,
    scale,
    nearZMultiplier = 1,
    farZMultiplier = 1
  } = options;
  let {
    fovy = altitudeToFovy(DEFAULT_ALTITUDE)
  } = options;

  if (altitude !== undefined) {
    fovy = altitudeToFovy(altitude);
  }

  const fovRadians = fovy * DEGREES_TO_RADIANS;
  const pitchRadians = pitch * DEGREES_TO_RADIANS;
  const focalDistance = fovyToAltitude(fovy);
  let cameraToSeaLevelDistance = focalDistance;

  if (center) {
    cameraToSeaLevelDistance += center[2] * scale / Math.cos(pitchRadians) / height;
  }

  const fovAboveCenter = fovRadians * (0.5 + (offset ? offset[1] : 0) / height);
  const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(clamp(Math.PI / 2 - pitchRadians - fovAboveCenter, 0.01, Math.PI - 0.01));
  const furthestDistance = Math.sin(pitchRadians) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
  const horizonDistance = cameraToSeaLevelDistance * 10;
  const farZ = Math.min(furthestDistance * farZMultiplier, horizonDistance);
  return {
    fov: fovRadians,
    aspect: width / height,
    focalDistance,
    near: nearZMultiplier,
    far: farZ
  };
}
function getProjectionMatrix(options) {
  const {
    fov,
    aspect,
    near,
    far
  } = getProjectionParameters(options);
  const projectionMatrix = perspective([], fov, aspect, near, far);
  return projectionMatrix;
}
function altitudeToFovy(altitude) {
  return 2 * Math.atan(0.5 / altitude) * RADIANS_TO_DEGREES;
}
function fovyToAltitude(fovy) {
  return 0.5 / Math.tan(0.5 * fovy * DEGREES_TO_RADIANS);
}
function worldToPixels(xyz, pixelProjectionMatrix) {
  const [x, y, z = 0] = xyz;
  assert_assert(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
  return transformVector(pixelProjectionMatrix, [x, y, z, 1]);
}
function pixelsToWorld(xyz, pixelUnprojectionMatrix, targetZ = 0) {
  const [x, y, z] = xyz;
  assert_assert(Number.isFinite(x) && Number.isFinite(y), 'invalid pixel coordinate');

  if (Number.isFinite(z)) {
    const coord = transformVector(pixelUnprojectionMatrix, [x, y, z, 1]);
    return coord;
  }

  const coord0 = transformVector(pixelUnprojectionMatrix, [x, y, 0, 1]);
  const coord1 = transformVector(pixelUnprojectionMatrix, [x, y, 1, 1]);
  const z0 = coord0[2];
  const z1 = coord1[2];
  const t = z0 === z1 ? 0 : ((targetZ || 0) - z0) / (z1 - z0);
  return vec2_lerp([], coord0, coord1, t);
}
//# sourceMappingURL=web-mercator-utils.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/fit-bounds.js



function fitBounds(options) {
  const {
    width,
    height,
    bounds,
    minExtent = 0,
    maxZoom = 24,
    offset = [0, 0]
  } = options;
  const [[west, south], [east, north]] = bounds;
  const padding = getPaddingObject(options.padding);
  const nw = lngLatToWorld([west, clamp(north, -MAX_LATITUDE, MAX_LATITUDE)]);
  const se = lngLatToWorld([east, clamp(south, -MAX_LATITUDE, MAX_LATITUDE)]);
  const size = [Math.max(Math.abs(se[0] - nw[0]), minExtent), Math.max(Math.abs(se[1] - nw[1]), minExtent)];
  const targetSize = [width - padding.left - padding.right - Math.abs(offset[0]) * 2, height - padding.top - padding.bottom - Math.abs(offset[1]) * 2];
  assert_assert(targetSize[0] > 0 && targetSize[1] > 0);
  const scaleX = targetSize[0] / size[0];
  const scaleY = targetSize[1] / size[1];
  const offsetX = (padding.right - padding.left) / 2 / scaleX;
  const offsetY = (padding.top - padding.bottom) / 2 / scaleY;
  const center = [(se[0] + nw[0]) / 2 + offsetX, (se[1] + nw[1]) / 2 + offsetY];
  const centerLngLat = worldToLngLat(center);
  const zoom = Math.min(maxZoom, log2(Math.abs(Math.min(scaleX, scaleY))));
  assert_assert(Number.isFinite(zoom));
  return {
    longitude: centerLngLat[0],
    latitude: centerLngLat[1],
    zoom
  };
}

function getPaddingObject(padding = 0) {
  if (typeof padding === 'number') {
    return {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding
    };
  }

  assert_assert(Number.isFinite(padding.top) && Number.isFinite(padding.bottom) && Number.isFinite(padding.left) && Number.isFinite(padding.right));
  return padding;
}
//# sourceMappingURL=fit-bounds.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/get-bounds.js



const get_bounds_DEGREES_TO_RADIANS = Math.PI / 180;
function getBounds(viewport, z = 0) {
  const {
    width,
    height,
    unproject
  } = viewport;
  const unprojectOps = {
    targetZ: z
  };
  const bottomLeft = unproject([0, height], unprojectOps);
  const bottomRight = unproject([width, height], unprojectOps);
  let topLeft;
  let topRight;
  const halfFov = viewport.fovy ? 0.5 * viewport.fovy * get_bounds_DEGREES_TO_RADIANS : Math.atan(0.5 / viewport.altitude);
  const angleToGround = (90 - viewport.pitch) * get_bounds_DEGREES_TO_RADIANS;

  if (halfFov > angleToGround - 0.01) {
    topLeft = unprojectOnFarPlane(viewport, 0, z);
    topRight = unprojectOnFarPlane(viewport, width, z);
  } else {
    topLeft = unproject([0, 0], unprojectOps);
    topRight = unproject([width, 0], unprojectOps);
  }

  return [bottomLeft, bottomRight, topRight, topLeft];
}

function unprojectOnFarPlane(viewport, x, targetZ) {
  const {
    pixelUnprojectionMatrix
  } = viewport;
  const coord0 = transformVector(pixelUnprojectionMatrix, [x, 0, 1, 1]);
  const coord1 = transformVector(pixelUnprojectionMatrix, [x, viewport.height, 1, 1]);
  const z = targetZ * viewport.distanceScales.unitsPerMeter[2];
  const t = (z - coord0[2]) / (coord1[2] - coord0[2]);
  const coord = vec2_lerp([], coord0, coord1, t);
  const result = worldToLngLat(coord);
  result.push(targetZ);
  return result;
}
//# sourceMappingURL=get-bounds.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/web-mercator-viewport.js








class WebMercatorViewport {
  constructor(props = {
    width: 1,
    height: 1
  }) {
    _defineProperty(this, "latitude", void 0);

    _defineProperty(this, "longitude", void 0);

    _defineProperty(this, "zoom", void 0);

    _defineProperty(this, "pitch", void 0);

    _defineProperty(this, "bearing", void 0);

    _defineProperty(this, "altitude", void 0);

    _defineProperty(this, "fovy", void 0);

    _defineProperty(this, "meterOffset", void 0);

    _defineProperty(this, "center", void 0);

    _defineProperty(this, "width", void 0);

    _defineProperty(this, "height", void 0);

    _defineProperty(this, "scale", void 0);

    _defineProperty(this, "distanceScales", void 0);

    _defineProperty(this, "viewMatrix", void 0);

    _defineProperty(this, "projectionMatrix", void 0);

    _defineProperty(this, "viewProjectionMatrix", void 0);

    _defineProperty(this, "pixelProjectionMatrix", void 0);

    _defineProperty(this, "pixelUnprojectionMatrix", void 0);

    _defineProperty(this, "equals", viewport => {
      if (!(viewport instanceof WebMercatorViewport)) {
        return false;
      }

      return viewport.width === this.width && viewport.height === this.height && mat4_equals(viewport.projectionMatrix, this.projectionMatrix) && mat4_equals(viewport.viewMatrix, this.viewMatrix);
    });

    _defineProperty(this, "project", (lngLatZ, options = {}) => {
      const {
        topLeft = true
      } = options;
      const worldPosition = this.projectPosition(lngLatZ);
      const coord = worldToPixels(worldPosition, this.pixelProjectionMatrix);
      const [x, y] = coord;
      const y2 = topLeft ? y : this.height - y;
      return lngLatZ.length === 2 ? [x, y2] : [x, y2, coord[2]];
    });

    _defineProperty(this, "unproject", (xyz, options = {}) => {
      const {
        topLeft = true,
        targetZ = undefined
      } = options;
      const [x, y, z] = xyz;
      const y2 = topLeft ? y : this.height - y;
      const targetZWorld = targetZ && targetZ * this.distanceScales.unitsPerMeter[2];
      const coord = pixelsToWorld([x, y2, z], this.pixelUnprojectionMatrix, targetZWorld);
      const [X, Y, Z] = this.unprojectPosition(coord);

      if (Number.isFinite(z)) {
        return [X, Y, Z];
      }

      return Number.isFinite(targetZ) ? [X, Y, targetZ] : [X, Y];
    });

    _defineProperty(this, "projectPosition", xyz => {
      const [X, Y] = lngLatToWorld(xyz);
      const Z = (xyz[2] || 0) * this.distanceScales.unitsPerMeter[2];
      return [X, Y, Z];
    });

    _defineProperty(this, "unprojectPosition", xyz => {
      const [X, Y] = worldToLngLat(xyz);
      const Z = (xyz[2] || 0) * this.distanceScales.metersPerUnit[2];
      return [X, Y, Z];
    });

    let {
      width,
      height,
      altitude = null,
      fovy = null
    } = props;
    const {
      latitude = 0,
      longitude = 0,
      zoom = 0,
      pitch = 0,
      bearing = 0,
      position = null,
      nearZMultiplier = 0.02,
      farZMultiplier = 1.01
    } = props;
    width = width || 1;
    height = height || 1;

    if (fovy === null && altitude === null) {
      altitude = DEFAULT_ALTITUDE;
      fovy = altitudeToFovy(altitude);
    } else if (fovy === null) {
      fovy = altitudeToFovy(altitude);
    } else if (altitude === null) {
      altitude = fovyToAltitude(fovy);
    }

    const scale = zoomToScale(zoom);
    altitude = Math.max(0.75, altitude);
    const distanceScales = getDistanceScales({
      longitude,
      latitude
    });
    const center = lngLatToWorld([longitude, latitude]);
    center.push(0);

    if (position) {
      vec3_add(center, center, vec3_mul([], position, distanceScales.unitsPerMeter));
    }

    this.projectionMatrix = getProjectionMatrix({
      width,
      height,
      scale,
      center,
      pitch,
      fovy,
      nearZMultiplier,
      farZMultiplier
    });
    this.viewMatrix = getViewMatrix({
      height,
      scale,
      center,
      pitch,
      bearing,
      altitude
    });
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.latitude = latitude;
    this.longitude = longitude;
    this.zoom = zoom;
    this.pitch = pitch;
    this.bearing = bearing;
    this.altitude = altitude;
    this.fovy = fovy;
    this.center = center;
    this.meterOffset = position || [0, 0, 0];
    this.distanceScales = distanceScales;

    this._initMatrices();

    Object.freeze(this);
  }

  _initMatrices() {
    const {
      width,
      height,
      projectionMatrix,
      viewMatrix
    } = this;
    const vpm = createMat4();
    mat4_multiply(vpm, vpm, projectionMatrix);
    mat4_multiply(vpm, vpm, viewMatrix);
    this.viewProjectionMatrix = vpm;
    const m = createMat4();
    mat4_scale(m, m, [width / 2, -height / 2, 1]);
    translate(m, m, [1, -1, 0]);
    mat4_multiply(m, m, vpm);
    const mInverse = invert(createMat4(), m);

    if (!mInverse) {
      throw new Error('Pixel project matrix not invertible');
    }

    this.pixelProjectionMatrix = m;
    this.pixelUnprojectionMatrix = mInverse;
  }

  projectFlat(lngLat) {
    return lngLatToWorld(lngLat);
  }

  unprojectFlat(xy) {
    return worldToLngLat(xy);
  }

  getMapCenterByLngLatPosition({
    lngLat,
    pos
  }) {
    const fromLocation = pixelsToWorld(pos, this.pixelUnprojectionMatrix);
    const toLocation = lngLatToWorld(lngLat);
    const translate = vec2_add([], toLocation, vec2_negate([], fromLocation));
    const newCenter = vec2_add([], this.center, translate);
    return worldToLngLat(newCenter);
  }

  fitBounds(bounds, options = {}) {
    const {
      width,
      height
    } = this;
    const {
      longitude,
      latitude,
      zoom
    } = fitBounds(Object.assign({
      width,
      height,
      bounds
    }, options));
    return new WebMercatorViewport({
      width,
      height,
      longitude,
      latitude,
      zoom
    });
  }

  getBounds(options) {
    const corners = this.getBoundingRegion(options);
    const west = Math.min(...corners.map(p => p[0]));
    const east = Math.max(...corners.map(p => p[0]));
    const south = Math.min(...corners.map(p => p[1]));
    const north = Math.max(...corners.map(p => p[1]));
    return [[west, south], [east, north]];
  }

  getBoundingRegion(options = {}) {
    return getBounds(this, options.z || 0);
  }

  getLocationAtPoint({
    lngLat,
    pos
  }) {
    return this.getMapCenterByLngLatPosition({
      lngLat,
      pos
    });
  }

}
//# sourceMappingURL=web-mercator-viewport.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/normalize-viewport-props.js


const normalize_viewport_props_TILE_SIZE = 512;
function normalizeViewportProps(props) {
  const {
    width,
    height,
    pitch = 0
  } = props;
  let {
    longitude,
    latitude,
    zoom,
    bearing = 0
  } = props;

  if (longitude < -180 || longitude > 180) {
    longitude = mod(longitude + 180, 360) - 180;
  }

  if (bearing < -180 || bearing > 180) {
    bearing = mod(bearing + 180, 360) - 180;
  }

  const minZoom = log2(height / normalize_viewport_props_TILE_SIZE);

  if (zoom <= minZoom) {
    zoom = minZoom;
    latitude = 0;
  } else {
    const halfHeightPixels = height / 2 / Math.pow(2, zoom);
    const minLatitude = worldToLngLat([0, halfHeightPixels])[1];

    if (latitude < minLatitude) {
      latitude = minLatitude;
    } else {
      const maxLatitude = worldToLngLat([0, normalize_viewport_props_TILE_SIZE - halfHeightPixels])[1];

      if (latitude > maxLatitude) {
        latitude = maxLatitude;
      }
    }
  }

  return {
    width,
    height,
    longitude,
    latitude,
    zoom,
    pitch,
    bearing
  };
}
//# sourceMappingURL=normalize-viewport-props.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/fly-to-viewport.js



const fly_to_viewport_EPSILON = 0.01;
const VIEWPORT_TRANSITION_PROPS = ['longitude', 'latitude', 'zoom'];
const DEFAULT_OPTS = {
  curve: 1.414,
  speed: 1.2
};
function flyToViewport(startProps, endProps, t, options) {
  const {
    startZoom,
    startCenterXY,
    uDelta,
    w0,
    u1,
    S,
    rho,
    rho2,
    r0
  } = getFlyToTransitionParams(startProps, endProps, options);

  if (u1 < fly_to_viewport_EPSILON) {
    const viewport = {};

    for (const key of VIEWPORT_TRANSITION_PROPS) {
      const startValue = startProps[key];
      const endValue = endProps[key];
      viewport[key] = math_utils_lerp(startValue, endValue, t);
    }

    return viewport;
  }

  const s = t * S;
  const w = Math.cosh(r0) / Math.cosh(r0 + rho * s);
  const u = w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2) / u1;
  const scaleIncrement = 1 / w;
  const newZoom = startZoom + scaleToZoom(scaleIncrement);
  const newCenterWorld = vec2_scale([], uDelta, u);
  vec2_add(newCenterWorld, newCenterWorld, startCenterXY);
  const newCenter = worldToLngLat(newCenterWorld);
  return {
    longitude: newCenter[0],
    latitude: newCenter[1],
    zoom: newZoom
  };
}
function getFlyToDuration(startProps, endProps, options) {
  const opts = { ...DEFAULT_OPTS,
    ...options
  };
  const {
    screenSpeed,
    speed,
    maxDuration
  } = opts;
  const {
    S,
    rho
  } = getFlyToTransitionParams(startProps, endProps, opts);
  const length = 1000 * S;
  let duration;

  if (Number.isFinite(screenSpeed)) {
    duration = length / (screenSpeed / rho);
  } else {
    duration = length / speed;
  }

  return Number.isFinite(maxDuration) && duration > maxDuration ? 0 : duration;
}

function getFlyToTransitionParams(startProps, endProps, opts) {
  opts = Object.assign({}, DEFAULT_OPTS, opts);
  const rho = opts.curve;
  const startZoom = startProps.zoom;
  const startCenter = [startProps.longitude, startProps.latitude];
  const startScale = zoomToScale(startZoom);
  const endZoom = endProps.zoom;
  const endCenter = [endProps.longitude, endProps.latitude];
  const scale = zoomToScale(endZoom - startZoom);
  const startCenterXY = lngLatToWorld(startCenter);
  const endCenterXY = lngLatToWorld(endCenter);
  const uDelta = vec2_sub([], endCenterXY, startCenterXY);
  const w0 = Math.max(startProps.width, startProps.height);
  const w1 = w0 / scale;
  const u1 = vec2_length(uDelta) * startScale;

  const _u1 = Math.max(u1, fly_to_viewport_EPSILON);

  const rho2 = rho * rho;
  const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * _u1 * _u1) / (2 * w0 * rho2 * _u1);
  const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * _u1 * _u1) / (2 * w1 * rho2 * _u1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return {
    startZoom,
    startCenterXY,
    uDelta,
    w0,
    u1,
    S,
    rho,
    rho2,
    r0,
    r1
  };
}
//# sourceMappingURL=fly-to-viewport.js.map
;// CONCATENATED MODULE: ./node_modules/@math.gl/web-mercator/dist/esm/index.js







//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/viewport-mercator-project/module.js



;// CONCATENATED MODULE: ./node_modules/resize-observer-polyfill/dist/ResizeObserver.es.js
/**
 * A collection of shims that provide minimal functionality of the ES6 collections.
 *
 * These implementations are not meant to be used outside of the ResizeObserver
 * modules as they cover only a limited range of use cases.
 */
/* eslint-disable require-jsdoc, valid-jsdoc */
var MapShim = (function () {
    if (typeof Map !== 'undefined') {
        return Map;
    }
    /**
     * Returns index in provided array that matches the specified key.
     *
     * @param {Array<Array>} arr
     * @param {*} key
     * @returns {number}
     */
    function getIndex(arr, key) {
        var result = -1;
        arr.some(function (entry, index) {
            if (entry[0] === key) {
                result = index;
                return true;
            }
            return false;
        });
        return result;
    }
    return /** @class */ (function () {
        function class_1() {
            this.__entries__ = [];
        }
        Object.defineProperty(class_1.prototype, "size", {
            /**
             * @returns {boolean}
             */
            get: function () {
                return this.__entries__.length;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * @param {*} key
         * @returns {*}
         */
        class_1.prototype.get = function (key) {
            var index = getIndex(this.__entries__, key);
            var entry = this.__entries__[index];
            return entry && entry[1];
        };
        /**
         * @param {*} key
         * @param {*} value
         * @returns {void}
         */
        class_1.prototype.set = function (key, value) {
            var index = getIndex(this.__entries__, key);
            if (~index) {
                this.__entries__[index][1] = value;
            }
            else {
                this.__entries__.push([key, value]);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.delete = function (key) {
            var entries = this.__entries__;
            var index = getIndex(entries, key);
            if (~index) {
                entries.splice(index, 1);
            }
        };
        /**
         * @param {*} key
         * @returns {void}
         */
        class_1.prototype.has = function (key) {
            return !!~getIndex(this.__entries__, key);
        };
        /**
         * @returns {void}
         */
        class_1.prototype.clear = function () {
            this.__entries__.splice(0);
        };
        /**
         * @param {Function} callback
         * @param {*} [ctx=null]
         * @returns {void}
         */
        class_1.prototype.forEach = function (callback, ctx) {
            if (ctx === void 0) { ctx = null; }
            for (var _i = 0, _a = this.__entries__; _i < _a.length; _i++) {
                var entry = _a[_i];
                callback.call(ctx, entry[1], entry[0]);
            }
        };
        return class_1;
    }());
})();

/**
 * Detects whether window and document objects are available in current environment.
 */
var ResizeObserver_es_isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && window.document === document;

// Returns global object of a current environment.
var global$1 = (function () {
    if (typeof global !== 'undefined' && global.Math === Math) {
        return global;
    }
    if (typeof self !== 'undefined' && self.Math === Math) {
        return self;
    }
    if (typeof window !== 'undefined' && window.Math === Math) {
        return window;
    }
    // eslint-disable-next-line no-new-func
    return Function('return this')();
})();

/**
 * A shim for the requestAnimationFrame which falls back to the setTimeout if
 * first one is not supported.
 *
 * @returns {number} Requests' identifier.
 */
var requestAnimationFrame$1 = (function () {
    if (typeof requestAnimationFrame === 'function') {
        // It's required to use a bounded function because IE sometimes throws
        // an "Invalid calling object" error if rAF is invoked without the global
        // object on the left hand side.
        return requestAnimationFrame.bind(global$1);
    }
    return function (callback) { return setTimeout(function () { return callback(Date.now()); }, 1000 / 60); };
})();

// Defines minimum timeout before adding a trailing call.
var trailingTimeout = 2;
/**
 * Creates a wrapper function which ensures that provided callback will be
 * invoked only once during the specified delay period.
 *
 * @param {Function} callback - Function to be invoked after the delay period.
 * @param {number} delay - Delay after which to invoke callback.
 * @returns {Function}
 */
function throttle (callback, delay) {
    var leadingCall = false, trailingCall = false, lastCallTime = 0;
    /**
     * Invokes the original callback function and schedules new invocation if
     * the "proxy" was called during current request.
     *
     * @returns {void}
     */
    function resolvePending() {
        if (leadingCall) {
            leadingCall = false;
            callback();
        }
        if (trailingCall) {
            proxy();
        }
    }
    /**
     * Callback invoked after the specified delay. It will further postpone
     * invocation of the original function delegating it to the
     * requestAnimationFrame.
     *
     * @returns {void}
     */
    function timeoutCallback() {
        requestAnimationFrame$1(resolvePending);
    }
    /**
     * Schedules invocation of the original function.
     *
     * @returns {void}
     */
    function proxy() {
        var timeStamp = Date.now();
        if (leadingCall) {
            // Reject immediately following calls.
            if (timeStamp - lastCallTime < trailingTimeout) {
                return;
            }
            // Schedule new call to be in invoked when the pending one is resolved.
            // This is important for "transitions" which never actually start
            // immediately so there is a chance that we might miss one if change
            // happens amids the pending invocation.
            trailingCall = true;
        }
        else {
            leadingCall = true;
            trailingCall = false;
            setTimeout(timeoutCallback, delay);
        }
        lastCallTime = timeStamp;
    }
    return proxy;
}

// Minimum delay before invoking the update of observers.
var REFRESH_DELAY = 20;
// A list of substrings of CSS properties used to find transition events that
// might affect dimensions of observed elements.
var transitionKeys = ['top', 'right', 'bottom', 'left', 'width', 'height', 'size', 'weight'];
// Check if MutationObserver is available.
var mutationObserverSupported = typeof MutationObserver !== 'undefined';
/**
 * Singleton controller class which handles updates of ResizeObserver instances.
 */
var ResizeObserverController = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserverController.
     *
     * @private
     */
    function ResizeObserverController() {
        /**
         * Indicates whether DOM listeners have been added.
         *
         * @private {boolean}
         */
        this.connected_ = false;
        /**
         * Tells that controller has subscribed for Mutation Events.
         *
         * @private {boolean}
         */
        this.mutationEventsAdded_ = false;
        /**
         * Keeps reference to the instance of MutationObserver.
         *
         * @private {MutationObserver}
         */
        this.mutationsObserver_ = null;
        /**
         * A list of connected observers.
         *
         * @private {Array<ResizeObserverSPI>}
         */
        this.observers_ = [];
        this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
        this.refresh = throttle(this.refresh.bind(this), REFRESH_DELAY);
    }
    /**
     * Adds observer to observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be added.
     * @returns {void}
     */
    ResizeObserverController.prototype.addObserver = function (observer) {
        if (!~this.observers_.indexOf(observer)) {
            this.observers_.push(observer);
        }
        // Add listeners if they haven't been added yet.
        if (!this.connected_) {
            this.connect_();
        }
    };
    /**
     * Removes observer from observers list.
     *
     * @param {ResizeObserverSPI} observer - Observer to be removed.
     * @returns {void}
     */
    ResizeObserverController.prototype.removeObserver = function (observer) {
        var observers = this.observers_;
        var index = observers.indexOf(observer);
        // Remove observer if it's present in registry.
        if (~index) {
            observers.splice(index, 1);
        }
        // Remove listeners if controller has no connected observers.
        if (!observers.length && this.connected_) {
            this.disconnect_();
        }
    };
    /**
     * Invokes the update of observers. It will continue running updates insofar
     * it detects changes.
     *
     * @returns {void}
     */
    ResizeObserverController.prototype.refresh = function () {
        var changesDetected = this.updateObservers_();
        // Continue running updates if changes have been detected as there might
        // be future ones caused by CSS transitions.
        if (changesDetected) {
            this.refresh();
        }
    };
    /**
     * Updates every observer from observers list and notifies them of queued
     * entries.
     *
     * @private
     * @returns {boolean} Returns "true" if any observer has detected changes in
     *      dimensions of it's elements.
     */
    ResizeObserverController.prototype.updateObservers_ = function () {
        // Collect observers that have active observations.
        var activeObservers = this.observers_.filter(function (observer) {
            return observer.gatherActive(), observer.hasActive();
        });
        // Deliver notifications in a separate cycle in order to avoid any
        // collisions between observers, e.g. when multiple instances of
        // ResizeObserver are tracking the same element and the callback of one
        // of them changes content dimensions of the observed target. Sometimes
        // this may result in notifications being blocked for the rest of observers.
        activeObservers.forEach(function (observer) { return observer.broadcastActive(); });
        return activeObservers.length > 0;
    };
    /**
     * Initializes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.connect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already added.
        if (!ResizeObserver_es_isBrowser || this.connected_) {
            return;
        }
        // Subscription to the "Transitionend" event is used as a workaround for
        // delayed transitions. This way it's possible to capture at least the
        // final state of an element.
        document.addEventListener('transitionend', this.onTransitionEnd_);
        window.addEventListener('resize', this.refresh);
        if (mutationObserverSupported) {
            this.mutationsObserver_ = new MutationObserver(this.refresh);
            this.mutationsObserver_.observe(document, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        else {
            document.addEventListener('DOMSubtreeModified', this.refresh);
            this.mutationEventsAdded_ = true;
        }
        this.connected_ = true;
    };
    /**
     * Removes DOM listeners.
     *
     * @private
     * @returns {void}
     */
    ResizeObserverController.prototype.disconnect_ = function () {
        // Do nothing if running in a non-browser environment or if listeners
        // have been already removed.
        if (!ResizeObserver_es_isBrowser || !this.connected_) {
            return;
        }
        document.removeEventListener('transitionend', this.onTransitionEnd_);
        window.removeEventListener('resize', this.refresh);
        if (this.mutationsObserver_) {
            this.mutationsObserver_.disconnect();
        }
        if (this.mutationEventsAdded_) {
            document.removeEventListener('DOMSubtreeModified', this.refresh);
        }
        this.mutationsObserver_ = null;
        this.mutationEventsAdded_ = false;
        this.connected_ = false;
    };
    /**
     * "Transitionend" event handler.
     *
     * @private
     * @param {TransitionEvent} event
     * @returns {void}
     */
    ResizeObserverController.prototype.onTransitionEnd_ = function (_a) {
        var _b = _a.propertyName, propertyName = _b === void 0 ? '' : _b;
        // Detect whether transition may affect dimensions of an element.
        var isReflowProperty = transitionKeys.some(function (key) {
            return !!~propertyName.indexOf(key);
        });
        if (isReflowProperty) {
            this.refresh();
        }
    };
    /**
     * Returns instance of the ResizeObserverController.
     *
     * @returns {ResizeObserverController}
     */
    ResizeObserverController.getInstance = function () {
        if (!this.instance_) {
            this.instance_ = new ResizeObserverController();
        }
        return this.instance_;
    };
    /**
     * Holds reference to the controller's instance.
     *
     * @private {ResizeObserverController}
     */
    ResizeObserverController.instance_ = null;
    return ResizeObserverController;
}());

/**
 * Defines non-writable/enumerable properties of the provided target object.
 *
 * @param {Object} target - Object for which to define properties.
 * @param {Object} props - Properties to be defined.
 * @returns {Object} Target object.
 */
var defineConfigurable = (function (target, props) {
    for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
        var key = _a[_i];
        Object.defineProperty(target, key, {
            value: props[key],
            enumerable: false,
            writable: false,
            configurable: true
        });
    }
    return target;
});

/**
 * Returns the global object associated with provided element.
 *
 * @param {Object} target
 * @returns {Object}
 */
var getWindowOf = (function (target) {
    // Assume that the element is an instance of Node, which means that it
    // has the "ownerDocument" property from which we can retrieve a
    // corresponding global object.
    var ownerGlobal = target && target.ownerDocument && target.ownerDocument.defaultView;
    // Return the local global object if it's not possible extract one from
    // provided element.
    return ownerGlobal || global$1;
});

// Placeholder of an empty content rectangle.
var emptyRect = createRectInit(0, 0, 0, 0);
/**
 * Converts provided string to a number.
 *
 * @param {number|string} value
 * @returns {number}
 */
function toFloat(value) {
    return parseFloat(value) || 0;
}
/**
 * Extracts borders size from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @param {...string} positions - Borders positions (top, right, ...)
 * @returns {number}
 */
function getBordersSize(styles) {
    var positions = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        positions[_i - 1] = arguments[_i];
    }
    return positions.reduce(function (size, position) {
        var value = styles['border-' + position + '-width'];
        return size + toFloat(value);
    }, 0);
}
/**
 * Extracts paddings sizes from provided styles.
 *
 * @param {CSSStyleDeclaration} styles
 * @returns {Object} Paddings box.
 */
function getPaddings(styles) {
    var positions = ['top', 'right', 'bottom', 'left'];
    var paddings = {};
    for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
        var position = positions_1[_i];
        var value = styles['padding-' + position];
        paddings[position] = toFloat(value);
    }
    return paddings;
}
/**
 * Calculates content rectangle of provided SVG element.
 *
 * @param {SVGGraphicsElement} target - Element content rectangle of which needs
 *      to be calculated.
 * @returns {DOMRectInit}
 */
function getSVGContentRect(target) {
    var bbox = target.getBBox();
    return createRectInit(0, 0, bbox.width, bbox.height);
}
/**
 * Calculates content rectangle of provided HTMLElement.
 *
 * @param {HTMLElement} target - Element for which to calculate the content rectangle.
 * @returns {DOMRectInit}
 */
function getHTMLElementContentRect(target) {
    // Client width & height properties can't be
    // used exclusively as they provide rounded values.
    var clientWidth = target.clientWidth, clientHeight = target.clientHeight;
    // By this condition we can catch all non-replaced inline, hidden and
    // detached elements. Though elements with width & height properties less
    // than 0.5 will be discarded as well.
    //
    // Without it we would need to implement separate methods for each of
    // those cases and it's not possible to perform a precise and performance
    // effective test for hidden elements. E.g. even jQuery's ':visible' filter
    // gives wrong results for elements with width & height less than 0.5.
    if (!clientWidth && !clientHeight) {
        return emptyRect;
    }
    var styles = getWindowOf(target).getComputedStyle(target);
    var paddings = getPaddings(styles);
    var horizPad = paddings.left + paddings.right;
    var vertPad = paddings.top + paddings.bottom;
    // Computed styles of width & height are being used because they are the
    // only dimensions available to JS that contain non-rounded values. It could
    // be possible to utilize the getBoundingClientRect if only it's data wasn't
    // affected by CSS transformations let alone paddings, borders and scroll bars.
    var width = toFloat(styles.width), height = toFloat(styles.height);
    // Width & height include paddings and borders when the 'border-box' box
    // model is applied (except for IE).
    if (styles.boxSizing === 'border-box') {
        // Following conditions are required to handle Internet Explorer which
        // doesn't include paddings and borders to computed CSS dimensions.
        //
        // We can say that if CSS dimensions + paddings are equal to the "client"
        // properties then it's either IE, and thus we don't need to subtract
        // anything, or an element merely doesn't have paddings/borders styles.
        if (Math.round(width + horizPad) !== clientWidth) {
            width -= getBordersSize(styles, 'left', 'right') + horizPad;
        }
        if (Math.round(height + vertPad) !== clientHeight) {
            height -= getBordersSize(styles, 'top', 'bottom') + vertPad;
        }
    }
    // Following steps can't be applied to the document's root element as its
    // client[Width/Height] properties represent viewport area of the window.
    // Besides, it's as well not necessary as the <html> itself neither has
    // rendered scroll bars nor it can be clipped.
    if (!isDocumentElement(target)) {
        // In some browsers (only in Firefox, actually) CSS width & height
        // include scroll bars size which can be removed at this step as scroll
        // bars are the only difference between rounded dimensions + paddings
        // and "client" properties, though that is not always true in Chrome.
        var vertScrollbar = Math.round(width + horizPad) - clientWidth;
        var horizScrollbar = Math.round(height + vertPad) - clientHeight;
        // Chrome has a rather weird rounding of "client" properties.
        // E.g. for an element with content width of 314.2px it sometimes gives
        // the client width of 315px and for the width of 314.7px it may give
        // 314px. And it doesn't happen all the time. So just ignore this delta
        // as a non-relevant.
        if (Math.abs(vertScrollbar) !== 1) {
            width -= vertScrollbar;
        }
        if (Math.abs(horizScrollbar) !== 1) {
            height -= horizScrollbar;
        }
    }
    return createRectInit(paddings.left, paddings.top, width, height);
}
/**
 * Checks whether provided element is an instance of the SVGGraphicsElement.
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
var isSVGGraphicsElement = (function () {
    // Some browsers, namely IE and Edge, don't have the SVGGraphicsElement
    // interface.
    if (typeof SVGGraphicsElement !== 'undefined') {
        return function (target) { return target instanceof getWindowOf(target).SVGGraphicsElement; };
    }
    // If it's so, then check that element is at least an instance of the
    // SVGElement and that it has the "getBBox" method.
    // eslint-disable-next-line no-extra-parens
    return function (target) { return (target instanceof getWindowOf(target).SVGElement &&
        typeof target.getBBox === 'function'); };
})();
/**
 * Checks whether provided element is a document element (<html>).
 *
 * @param {Element} target - Element to be checked.
 * @returns {boolean}
 */
function isDocumentElement(target) {
    return target === getWindowOf(target).document.documentElement;
}
/**
 * Calculates an appropriate content rectangle for provided html or svg element.
 *
 * @param {Element} target - Element content rectangle of which needs to be calculated.
 * @returns {DOMRectInit}
 */
function getContentRect(target) {
    if (!ResizeObserver_es_isBrowser) {
        return emptyRect;
    }
    if (isSVGGraphicsElement(target)) {
        return getSVGContentRect(target);
    }
    return getHTMLElementContentRect(target);
}
/**
 * Creates rectangle with an interface of the DOMRectReadOnly.
 * Spec: https://drafts.fxtf.org/geometry/#domrectreadonly
 *
 * @param {DOMRectInit} rectInit - Object with rectangle's x/y coordinates and dimensions.
 * @returns {DOMRectReadOnly}
 */
function createReadOnlyRect(_a) {
    var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
    // If DOMRectReadOnly is available use it as a prototype for the rectangle.
    var Constr = typeof DOMRectReadOnly !== 'undefined' ? DOMRectReadOnly : Object;
    var rect = Object.create(Constr.prototype);
    // Rectangle's properties are not writable and non-enumerable.
    defineConfigurable(rect, {
        x: x, y: y, width: width, height: height,
        top: y,
        right: x + width,
        bottom: height + y,
        left: x
    });
    return rect;
}
/**
 * Creates DOMRectInit object based on the provided dimensions and the x/y coordinates.
 * Spec: https://drafts.fxtf.org/geometry/#dictdef-domrectinit
 *
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} width - Rectangle's width.
 * @param {number} height - Rectangle's height.
 * @returns {DOMRectInit}
 */
function createRectInit(x, y, width, height) {
    return { x: x, y: y, width: width, height: height };
}

/**
 * Class that is responsible for computations of the content rectangle of
 * provided DOM element and for keeping track of it's changes.
 */
var ResizeObservation = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObservation.
     *
     * @param {Element} target - Element to be observed.
     */
    function ResizeObservation(target) {
        /**
         * Broadcasted width of content rectangle.
         *
         * @type {number}
         */
        this.broadcastWidth = 0;
        /**
         * Broadcasted height of content rectangle.
         *
         * @type {number}
         */
        this.broadcastHeight = 0;
        /**
         * Reference to the last observed content rectangle.
         *
         * @private {DOMRectInit}
         */
        this.contentRect_ = createRectInit(0, 0, 0, 0);
        this.target = target;
    }
    /**
     * Updates content rectangle and tells whether it's width or height properties
     * have changed since the last broadcast.
     *
     * @returns {boolean}
     */
    ResizeObservation.prototype.isActive = function () {
        var rect = getContentRect(this.target);
        this.contentRect_ = rect;
        return (rect.width !== this.broadcastWidth ||
            rect.height !== this.broadcastHeight);
    };
    /**
     * Updates 'broadcastWidth' and 'broadcastHeight' properties with a data
     * from the corresponding properties of the last observed content rectangle.
     *
     * @returns {DOMRectInit} Last observed content rectangle.
     */
    ResizeObservation.prototype.broadcastRect = function () {
        var rect = this.contentRect_;
        this.broadcastWidth = rect.width;
        this.broadcastHeight = rect.height;
        return rect;
    };
    return ResizeObservation;
}());

var ResizeObserverEntry = /** @class */ (function () {
    /**
     * Creates an instance of ResizeObserverEntry.
     *
     * @param {Element} target - Element that is being observed.
     * @param {DOMRectInit} rectInit - Data of the element's content rectangle.
     */
    function ResizeObserverEntry(target, rectInit) {
        var contentRect = createReadOnlyRect(rectInit);
        // According to the specification following properties are not writable
        // and are also not enumerable in the native implementation.
        //
        // Property accessors are not being used as they'd require to define a
        // private WeakMap storage which may cause memory leaks in browsers that
        // don't support this type of collections.
        defineConfigurable(this, { target: target, contentRect: contentRect });
    }
    return ResizeObserverEntry;
}());

var ResizeObserverSPI = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback function that is invoked
     *      when one of the observed elements changes it's content dimensions.
     * @param {ResizeObserverController} controller - Controller instance which
     *      is responsible for the updates of observer.
     * @param {ResizeObserver} callbackCtx - Reference to the public
     *      ResizeObserver instance which will be passed to callback function.
     */
    function ResizeObserverSPI(callback, controller, callbackCtx) {
        /**
         * Collection of resize observations that have detected changes in dimensions
         * of elements.
         *
         * @private {Array<ResizeObservation>}
         */
        this.activeObservations_ = [];
        /**
         * Registry of the ResizeObservation instances.
         *
         * @private {Map<Element, ResizeObservation>}
         */
        this.observations_ = new MapShim();
        if (typeof callback !== 'function') {
            throw new TypeError('The callback provided as parameter 1 is not a function.');
        }
        this.callback_ = callback;
        this.controller_ = controller;
        this.callbackCtx_ = callbackCtx;
    }
    /**
     * Starts observing provided element.
     *
     * @param {Element} target - Element to be observed.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.observe = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is already being observed.
        if (observations.has(target)) {
            return;
        }
        observations.set(target, new ResizeObservation(target));
        this.controller_.addObserver(this);
        // Force the update of observations.
        this.controller_.refresh();
    };
    /**
     * Stops observing provided element.
     *
     * @param {Element} target - Element to stop observing.
     * @returns {void}
     */
    ResizeObserverSPI.prototype.unobserve = function (target) {
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        // Do nothing if current environment doesn't have the Element interface.
        if (typeof Element === 'undefined' || !(Element instanceof Object)) {
            return;
        }
        if (!(target instanceof getWindowOf(target).Element)) {
            throw new TypeError('parameter 1 is not of type "Element".');
        }
        var observations = this.observations_;
        // Do nothing if element is not being observed.
        if (!observations.has(target)) {
            return;
        }
        observations.delete(target);
        if (!observations.size) {
            this.controller_.removeObserver(this);
        }
    };
    /**
     * Stops observing all elements.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.disconnect = function () {
        this.clearActive();
        this.observations_.clear();
        this.controller_.removeObserver(this);
    };
    /**
     * Collects observation instances the associated element of which has changed
     * it's content rectangle.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.gatherActive = function () {
        var _this = this;
        this.clearActive();
        this.observations_.forEach(function (observation) {
            if (observation.isActive()) {
                _this.activeObservations_.push(observation);
            }
        });
    };
    /**
     * Invokes initial callback function with a list of ResizeObserverEntry
     * instances collected from active resize observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.broadcastActive = function () {
        // Do nothing if observer doesn't have active observations.
        if (!this.hasActive()) {
            return;
        }
        var ctx = this.callbackCtx_;
        // Create ResizeObserverEntry instance for every active observation.
        var entries = this.activeObservations_.map(function (observation) {
            return new ResizeObserverEntry(observation.target, observation.broadcastRect());
        });
        this.callback_.call(ctx, entries, ctx);
        this.clearActive();
    };
    /**
     * Clears the collection of active observations.
     *
     * @returns {void}
     */
    ResizeObserverSPI.prototype.clearActive = function () {
        this.activeObservations_.splice(0);
    };
    /**
     * Tells whether observer has active observations.
     *
     * @returns {boolean}
     */
    ResizeObserverSPI.prototype.hasActive = function () {
        return this.activeObservations_.length > 0;
    };
    return ResizeObserverSPI;
}());

// Registry of internal observers. If WeakMap is not available use current shim
// for the Map collection as it has all required methods and because WeakMap
// can't be fully polyfilled anyway.
var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : new MapShim();
/**
 * ResizeObserver API. Encapsulates the ResizeObserver SPI implementation
 * exposing only those methods and properties that are defined in the spec.
 */
var ResizeObserver = /** @class */ (function () {
    /**
     * Creates a new instance of ResizeObserver.
     *
     * @param {ResizeObserverCallback} callback - Callback that is invoked when
     *      dimensions of the observed elements change.
     */
    function ResizeObserver(callback) {
        if (!(this instanceof ResizeObserver)) {
            throw new TypeError('Cannot call a class as a function.');
        }
        if (!arguments.length) {
            throw new TypeError('1 argument required, but only 0 present.');
        }
        var controller = ResizeObserverController.getInstance();
        var observer = new ResizeObserverSPI(callback, controller, this);
        observers.set(this, observer);
    }
    return ResizeObserver;
}());
// Expose public methods of ResizeObserver.
[
    'observe',
    'unobserve',
    'disconnect'
].forEach(function (method) {
    ResizeObserver.prototype[method] = function () {
        var _a;
        return (_a = observers.get(this))[method].apply(_a, arguments);
    };
});

var index = (function () {
    // Export existing implementation if available.
    if (typeof global$1.ResizeObserver !== 'undefined') {
        return global$1.ResizeObserver;
    }
    return ResizeObserver;
})();

/* harmony default export */ const ResizeObserver_es = (index);

;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/classCallCheck.js
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/createClass.js
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/globals.js
var window_ = typeof window !== 'undefined' ? window : global;
var global_ = typeof global !== 'undefined' ? global : window;
var document_ = typeof document !== 'undefined' ? document : {};

//# sourceMappingURL=globals.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/style-utils.js


function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = style_utils_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function style_utils_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return style_utils_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return style_utils_arrayLikeToArray(o, minLen); }

function style_utils_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var refProps = ['type', 'source', 'source-layer', 'minzoom', 'maxzoom', 'filter', 'layout'];
function normalizeStyle(style) {
  if (!style) {
    return null;
  }

  if (typeof style === 'string') {
    return style;
  }

  if (style.toJS) {
    style = style.toJS();
  }

  var layerIndex = {};

  var _iterator = _createForOfIteratorHelper(style.layers),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var layer = _step.value;
      layerIndex[layer.id] = layer;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var layers = style.layers.map(function (layer) {
    var layerRef = layerIndex[layer.ref];
    var normalizedLayer = null;

    if ('interactive' in layer) {
      normalizedLayer = _objectSpread({}, layer);
      delete normalizedLayer.interactive;
    }

    if (layerRef) {
      normalizedLayer = normalizedLayer || _objectSpread({}, layer);
      delete normalizedLayer.ref;

      var _iterator2 = _createForOfIteratorHelper(refProps),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var propName = _step2.value;

          if (propName in layerRef) {
            normalizedLayer[propName] = layerRef[propName];
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }

    return normalizedLayer || layer;
  });
  return _objectSpread(_objectSpread({}, style), {}, {
    layers: layers
  });
}
//# sourceMappingURL=style-utils.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/mapbox/mapbox.js







function noop() {}

function defaultOnError(event) {
  if (event) {
    console.error(event.error);
  }
}

var propTypes = {
  container: prop_types.object,
  gl: prop_types.object,
  mapboxApiAccessToken: prop_types.string,
  mapboxApiUrl: prop_types.string,
  attributionControl: prop_types.bool,
  preserveDrawingBuffer: prop_types.bool,
  reuseMaps: prop_types.bool,
  transformRequest: prop_types.func,
  mapOptions: prop_types.object,
  mapStyle: prop_types.oneOfType([prop_types.string, prop_types.object]),
  preventStyleDiffing: prop_types.bool,
  visible: prop_types.bool,
  asyncRender: prop_types.bool,
  onLoad: prop_types.func,
  onError: prop_types.func,
  width: prop_types.number,
  height: prop_types.number,
  viewState: prop_types.object,
  longitude: prop_types.number,
  latitude: prop_types.number,
  zoom: prop_types.number,
  bearing: prop_types.number,
  pitch: prop_types.number,
  altitude: prop_types.number
};
var defaultProps = {
  container: document_.body,
  mapboxApiAccessToken: getAccessToken(),
  mapboxApiUrl: 'https://api.mapbox.com',
  preserveDrawingBuffer: false,
  attributionControl: true,
  reuseMaps: false,
  mapOptions: {},
  mapStyle: 'mapbox://styles/mapbox/light-v8',
  preventStyleDiffing: false,
  visible: true,
  asyncRender: false,
  onLoad: noop,
  onError: defaultOnError,
  width: 0,
  height: 0,
  longitude: 0,
  latitude: 0,
  zoom: 0,
  bearing: 0,
  pitch: 0,
  altitude: 1.5
};
function getAccessToken() {
  var accessToken = null;

  if (typeof window !== 'undefined' && window.location) {
    var match = window.location.search.match(/access_token=([^&\/]*)/);
    accessToken = match && match[1];
  }

  if (!accessToken && typeof process !== 'undefined') {
    accessToken = accessToken || ({}).MapboxAccessToken || ({}).REACT_APP_MAPBOX_ACCESS_TOKEN;
  }

  return accessToken || 'no-token';
}

function checkPropTypes(props) {
  var component = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'component';

  if (props.debug) {
    prop_types.checkPropTypes(propTypes, props, 'prop', component);
  }
}

var Mapbox = function () {
  function Mapbox(props) {
    var _this = this;

    _classCallCheck(this, Mapbox);

    _defineProperty(this, "props", defaultProps);

    _defineProperty(this, "width", 0);

    _defineProperty(this, "height", 0);

    _defineProperty(this, "_fireLoadEvent", function () {
      _this.props.onLoad({
        type: 'load',
        target: _this._map
      });
    });

    _defineProperty(this, "_handleError", function (event) {
      _this.props.onError(event);
    });

    if (!props.mapboxgl) {
      throw new Error('Mapbox not available');
    }

    this.mapboxgl = props.mapboxgl;

    if (!Mapbox.initialized) {
      Mapbox.initialized = true;

      this._checkStyleSheet(this.mapboxgl.version);
    }

    this._initialize(props);
  }

  _createClass(Mapbox, [{
    key: "finalize",
    value: function finalize() {
      this._destroy();

      return this;
    }
  }, {
    key: "setProps",
    value: function setProps(props) {
      this._update(this.props, props);

      return this;
    }
  }, {
    key: "redraw",
    value: function redraw() {
      var map = this._map;

      if (map.style) {
        if (map._frame) {
          map._frame.cancel();

          map._frame = null;
        }

        map._render();
      }
    }
  }, {
    key: "getMap",
    value: function getMap() {
      return this._map;
    }
  }, {
    key: "_reuse",
    value: function _reuse(props) {
      this._map = Mapbox.savedMap;

      var oldContainer = this._map.getContainer();

      var newContainer = props.container;
      newContainer.classList.add('mapboxgl-map');

      while (oldContainer.childNodes.length > 0) {
        newContainer.appendChild(oldContainer.childNodes[0]);
      }

      this._map._container = newContainer;
      Mapbox.savedMap = null;

      if (props.mapStyle) {
        this._map.setStyle(normalizeStyle(props.mapStyle), {
          diff: false
        });
      }

      if (this._map.isStyleLoaded()) {
        this._fireLoadEvent();
      } else {
        this._map.once('styledata', this._fireLoadEvent);
      }
    }
  }, {
    key: "_create",
    value: function _create(props) {
      if (props.reuseMaps && Mapbox.savedMap) {
        this._reuse(props);
      } else {
        if (props.gl) {
          var getContext = HTMLCanvasElement.prototype.getContext;

          HTMLCanvasElement.prototype.getContext = function () {
            HTMLCanvasElement.prototype.getContext = getContext;
            return props.gl;
          };
        }

        var mapOptions = {
          container: props.container,
          center: [0, 0],
          zoom: 8,
          pitch: 0,
          bearing: 0,
          maxZoom: 24,
          style: normalizeStyle(props.mapStyle),
          interactive: false,
          trackResize: false,
          attributionControl: props.attributionControl,
          preserveDrawingBuffer: props.preserveDrawingBuffer
        };

        if (props.transformRequest) {
          mapOptions.transformRequest = props.transformRequest;
        }

        this._map = new this.mapboxgl.Map(Object.assign({}, mapOptions, props.mapOptions));

        this._map.once('load', this._fireLoadEvent);

        this._map.on('error', this._handleError);
      }

      return this;
    }
  }, {
    key: "_destroy",
    value: function _destroy() {
      if (!this._map) {
        return;
      }

      if (this.props.reuseMaps && !Mapbox.savedMap) {
        Mapbox.savedMap = this._map;

        this._map.off('load', this._fireLoadEvent);

        this._map.off('error', this._handleError);

        this._map.off('styledata', this._fireLoadEvent);
      } else {
        this._map.remove();
      }

      this._map = null;
    }
  }, {
    key: "_initialize",
    value: function _initialize(props) {
      var _this2 = this;

      props = Object.assign({}, defaultProps, props);
      checkPropTypes(props, 'Mapbox');
      this.mapboxgl.accessToken = props.mapboxApiAccessToken || defaultProps.mapboxApiAccessToken;
      this.mapboxgl.baseApiUrl = props.mapboxApiUrl;

      this._create(props);

      var _props = props,
          container = _props.container;
      Object.defineProperty(container, 'offsetWidth', {
        configurable: true,
        get: function get() {
          return _this2.width;
        }
      });
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        get: function get() {
          return _this2.width;
        }
      });
      Object.defineProperty(container, 'offsetHeight', {
        configurable: true,
        get: function get() {
          return _this2.height;
        }
      });
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        get: function get() {
          return _this2.height;
        }
      });

      var canvas = this._map.getCanvas();

      if (canvas) {
        canvas.style.outline = 'none';
      }

      this._updateMapViewport({}, props);

      this._updateMapSize({}, props);

      this.props = props;
    }
  }, {
    key: "_update",
    value: function _update(oldProps, newProps) {
      if (!this._map) {
        return;
      }

      newProps = Object.assign({}, this.props, newProps);
      checkPropTypes(newProps, 'Mapbox');

      var viewportChanged = this._updateMapViewport(oldProps, newProps);

      var sizeChanged = this._updateMapSize(oldProps, newProps);

      this._updateMapStyle(oldProps, newProps);

      if (!newProps.asyncRender && (viewportChanged || sizeChanged)) {
        this.redraw();
      }

      this.props = newProps;
    }
  }, {
    key: "_updateMapStyle",
    value: function _updateMapStyle(oldProps, newProps) {
      var styleChanged = oldProps.mapStyle !== newProps.mapStyle;

      if (styleChanged) {
        this._map.setStyle(normalizeStyle(newProps.mapStyle), {
          diff: !newProps.preventStyleDiffing
        });
      }
    }
  }, {
    key: "_updateMapSize",
    value: function _updateMapSize(oldProps, newProps) {
      var sizeChanged = oldProps.width !== newProps.width || oldProps.height !== newProps.height;

      if (sizeChanged) {
        this.width = newProps.width;
        this.height = newProps.height;

        this._map.resize();
      }

      return sizeChanged;
    }
  }, {
    key: "_updateMapViewport",
    value: function _updateMapViewport(oldProps, newProps) {
      var oldViewState = this._getViewState(oldProps);

      var newViewState = this._getViewState(newProps);

      var viewportChanged = newViewState.latitude !== oldViewState.latitude || newViewState.longitude !== oldViewState.longitude || newViewState.zoom !== oldViewState.zoom || newViewState.pitch !== oldViewState.pitch || newViewState.bearing !== oldViewState.bearing || newViewState.altitude !== oldViewState.altitude;

      if (viewportChanged) {
        this._map.jumpTo(this._viewStateToMapboxProps(newViewState));

        if (newViewState.altitude !== oldViewState.altitude) {
          this._map.transform.altitude = newViewState.altitude;
        }
      }

      return viewportChanged;
    }
  }, {
    key: "_getViewState",
    value: function _getViewState(props) {
      var _ref = props.viewState || props,
          longitude = _ref.longitude,
          latitude = _ref.latitude,
          zoom = _ref.zoom,
          _ref$pitch = _ref.pitch,
          pitch = _ref$pitch === void 0 ? 0 : _ref$pitch,
          _ref$bearing = _ref.bearing,
          bearing = _ref$bearing === void 0 ? 0 : _ref$bearing,
          _ref$altitude = _ref.altitude,
          altitude = _ref$altitude === void 0 ? 1.5 : _ref$altitude;

      return {
        longitude: longitude,
        latitude: latitude,
        zoom: zoom,
        pitch: pitch,
        bearing: bearing,
        altitude: altitude
      };
    }
  }, {
    key: "_checkStyleSheet",
    value: function _checkStyleSheet() {
      var mapboxVersion = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '0.47.0';

      if (typeof document_ === 'undefined') {
        return;
      }

      try {
        var testElement = document_.createElement('div');
        testElement.className = 'mapboxgl-map';
        testElement.style.display = 'none';
        document_.body.appendChild(testElement);
        var isCssLoaded = window.getComputedStyle(testElement).position !== 'static';

        if (!isCssLoaded) {
          var link = document_.createElement('link');
          link.setAttribute('rel', 'stylesheet');
          link.setAttribute('type', 'text/css');
          link.setAttribute('href', "https://api.tiles.mapbox.com/mapbox-gl-js/v".concat(mapboxVersion, "/mapbox-gl.css"));
          document_.head.appendChild(link);
        }
      } catch (error) {}
    }
  }, {
    key: "_viewStateToMapboxProps",
    value: function _viewStateToMapboxProps(viewState) {
      return {
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch
      };
    }
  }]);

  return Mapbox;
}();

_defineProperty(Mapbox, "initialized", false);

_defineProperty(Mapbox, "propTypes", propTypes);

_defineProperty(Mapbox, "defaultProps", defaultProps);

_defineProperty(Mapbox, "savedMap", null);


//# sourceMappingURL=mapbox.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/mapboxgl.js
/* harmony default export */ const mapboxgl = (null);
//# sourceMappingURL=mapboxgl.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/math-utils.js
var math_utils_EPSILON = 1e-7;

function math_utils_isArray(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value);
}

function math_utils_equals(a, b) {
  if (a === b) {
    return true;
  }

  if (math_utils_isArray(a) && math_utils_isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (var i = 0; i < a.length; ++i) {
      if (!math_utils_equals(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }

  return Math.abs(a - b) <= math_utils_EPSILON;
}
function math_utils_clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function utils_math_utils_lerp(a, b, t) {
  if (math_utils_isArray(a)) {
    return a.map(function (ai, i) {
      return utils_math_utils_lerp(ai, b[i], t);
    });
  }

  return t * b + (1 - t) * a;
}
//# sourceMappingURL=math-utils.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/assert.js
function utils_assert_assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'react-map-gl: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/map-state.js





function map_state_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function map_state_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { map_state_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { map_state_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }




var MAPBOX_LIMITS = {
  minZoom: 0,
  maxZoom: 24,
  minPitch: 0,
  maxPitch: 60
};
var DEFAULT_STATE = {
  pitch: 0,
  bearing: 0,
  altitude: 1.5
};
var PITCH_MOUSE_THRESHOLD = 5;
var PITCH_ACCEL = 1.2;

var MapState = function () {
  function MapState(_ref) {
    var width = _ref.width,
        height = _ref.height,
        latitude = _ref.latitude,
        longitude = _ref.longitude,
        zoom = _ref.zoom,
        _ref$bearing = _ref.bearing,
        bearing = _ref$bearing === void 0 ? DEFAULT_STATE.bearing : _ref$bearing,
        _ref$pitch = _ref.pitch,
        pitch = _ref$pitch === void 0 ? DEFAULT_STATE.pitch : _ref$pitch,
        _ref$altitude = _ref.altitude,
        altitude = _ref$altitude === void 0 ? DEFAULT_STATE.altitude : _ref$altitude,
        _ref$maxZoom = _ref.maxZoom,
        maxZoom = _ref$maxZoom === void 0 ? MAPBOX_LIMITS.maxZoom : _ref$maxZoom,
        _ref$minZoom = _ref.minZoom,
        minZoom = _ref$minZoom === void 0 ? MAPBOX_LIMITS.minZoom : _ref$minZoom,
        _ref$maxPitch = _ref.maxPitch,
        maxPitch = _ref$maxPitch === void 0 ? MAPBOX_LIMITS.maxPitch : _ref$maxPitch,
        _ref$minPitch = _ref.minPitch,
        minPitch = _ref$minPitch === void 0 ? MAPBOX_LIMITS.minPitch : _ref$minPitch,
        transitionDuration = _ref.transitionDuration,
        transitionEasing = _ref.transitionEasing,
        transitionInterpolator = _ref.transitionInterpolator,
        transitionInterruption = _ref.transitionInterruption,
        startPanLngLat = _ref.startPanLngLat,
        startZoomLngLat = _ref.startZoomLngLat,
        startRotatePos = _ref.startRotatePos,
        startBearing = _ref.startBearing,
        startPitch = _ref.startPitch,
        startZoom = _ref.startZoom;

    _classCallCheck(this, MapState);

    utils_assert_assert(Number.isFinite(width), '`width` must be supplied');
    utils_assert_assert(Number.isFinite(height), '`height` must be supplied');
    utils_assert_assert(Number.isFinite(longitude), '`longitude` must be supplied');
    utils_assert_assert(Number.isFinite(latitude), '`latitude` must be supplied');
    utils_assert_assert(Number.isFinite(zoom), '`zoom` must be supplied');
    this._viewportProps = this._applyConstraints({
      width: width,
      height: height,
      latitude: latitude,
      longitude: longitude,
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
      altitude: altitude,
      maxZoom: maxZoom,
      minZoom: minZoom,
      maxPitch: maxPitch,
      minPitch: minPitch,
      transitionDuration: transitionDuration,
      transitionEasing: transitionEasing,
      transitionInterpolator: transitionInterpolator,
      transitionInterruption: transitionInterruption
    });
    this._state = {
      startPanLngLat: startPanLngLat,
      startZoomLngLat: startZoomLngLat,
      startRotatePos: startRotatePos,
      startBearing: startBearing,
      startPitch: startPitch,
      startZoom: startZoom
    };
  }

  _createClass(MapState, [{
    key: "getViewportProps",
    value: function getViewportProps() {
      return this._viewportProps;
    }
  }, {
    key: "getState",
    value: function getState() {
      return this._state;
    }
  }, {
    key: "panStart",
    value: function panStart(_ref2) {
      var pos = _ref2.pos;
      return this._getUpdatedMapState({
        startPanLngLat: this._unproject(pos)
      });
    }
  }, {
    key: "pan",
    value: function pan(_ref3) {
      var pos = _ref3.pos,
          startPos = _ref3.startPos;

      var startPanLngLat = this._state.startPanLngLat || this._unproject(startPos);

      if (!startPanLngLat) {
        return this;
      }

      var _this$_calculateNewLn = this._calculateNewLngLat({
        startPanLngLat: startPanLngLat,
        pos: pos
      }),
          _this$_calculateNewLn2 = _slicedToArray(_this$_calculateNewLn, 2),
          longitude = _this$_calculateNewLn2[0],
          latitude = _this$_calculateNewLn2[1];

      return this._getUpdatedMapState({
        longitude: longitude,
        latitude: latitude
      });
    }
  }, {
    key: "panEnd",
    value: function panEnd() {
      return this._getUpdatedMapState({
        startPanLngLat: null
      });
    }
  }, {
    key: "rotateStart",
    value: function rotateStart(_ref4) {
      var pos = _ref4.pos;
      return this._getUpdatedMapState({
        startRotatePos: pos,
        startBearing: this._viewportProps.bearing,
        startPitch: this._viewportProps.pitch
      });
    }
  }, {
    key: "rotate",
    value: function rotate(_ref5) {
      var pos = _ref5.pos,
          _ref5$deltaAngleX = _ref5.deltaAngleX,
          deltaAngleX = _ref5$deltaAngleX === void 0 ? 0 : _ref5$deltaAngleX,
          _ref5$deltaAngleY = _ref5.deltaAngleY,
          deltaAngleY = _ref5$deltaAngleY === void 0 ? 0 : _ref5$deltaAngleY;
      var _this$_state = this._state,
          startRotatePos = _this$_state.startRotatePos,
          startBearing = _this$_state.startBearing,
          startPitch = _this$_state.startPitch;

      if (!Number.isFinite(startBearing) || !Number.isFinite(startPitch)) {
        return this;
      }

      var newRotation;

      if (pos) {
        newRotation = this._calculateNewPitchAndBearing(map_state_objectSpread(map_state_objectSpread({}, this._getRotationParams(pos, startRotatePos)), {}, {
          startBearing: startBearing,
          startPitch: startPitch
        }));
      } else {
        newRotation = {
          bearing: startBearing + deltaAngleX,
          pitch: startPitch + deltaAngleY
        };
      }

      return this._getUpdatedMapState(newRotation);
    }
  }, {
    key: "rotateEnd",
    value: function rotateEnd() {
      return this._getUpdatedMapState({
        startBearing: null,
        startPitch: null
      });
    }
  }, {
    key: "zoomStart",
    value: function zoomStart(_ref6) {
      var pos = _ref6.pos;
      return this._getUpdatedMapState({
        startZoomLngLat: this._unproject(pos),
        startZoom: this._viewportProps.zoom
      });
    }
  }, {
    key: "zoom",
    value: function zoom(_ref7) {
      var pos = _ref7.pos,
          startPos = _ref7.startPos,
          scale = _ref7.scale;
      utils_assert_assert(scale > 0, '`scale` must be a positive number');
      var _this$_state2 = this._state,
          startZoom = _this$_state2.startZoom,
          startZoomLngLat = _this$_state2.startZoomLngLat;

      if (!Number.isFinite(startZoom)) {
        startZoom = this._viewportProps.zoom;
        startZoomLngLat = this._unproject(startPos) || this._unproject(pos);
      }

      utils_assert_assert(startZoomLngLat, '`startZoomLngLat` prop is required ' + 'for zoom behavior to calculate where to position the map.');

      var zoom = this._calculateNewZoom({
        scale: scale,
        startZoom: startZoom || 0
      });

      var zoomedViewport = new WebMercatorViewport(Object.assign({}, this._viewportProps, {
        zoom: zoom
      }));

      var _zoomedViewport$getMa = zoomedViewport.getMapCenterByLngLatPosition({
        lngLat: startZoomLngLat,
        pos: pos
      }),
          _zoomedViewport$getMa2 = _slicedToArray(_zoomedViewport$getMa, 2),
          longitude = _zoomedViewport$getMa2[0],
          latitude = _zoomedViewport$getMa2[1];

      return this._getUpdatedMapState({
        zoom: zoom,
        longitude: longitude,
        latitude: latitude
      });
    }
  }, {
    key: "zoomEnd",
    value: function zoomEnd() {
      return this._getUpdatedMapState({
        startZoomLngLat: null,
        startZoom: null
      });
    }
  }, {
    key: "_getUpdatedMapState",
    value: function _getUpdatedMapState(newProps) {
      return new MapState(Object.assign({}, this._viewportProps, this._state, newProps));
    }
  }, {
    key: "_applyConstraints",
    value: function _applyConstraints(props) {
      var maxZoom = props.maxZoom,
          minZoom = props.minZoom,
          zoom = props.zoom;
      props.zoom = math_utils_clamp(zoom, minZoom, maxZoom);
      var maxPitch = props.maxPitch,
          minPitch = props.minPitch,
          pitch = props.pitch;
      props.pitch = math_utils_clamp(pitch, minPitch, maxPitch);
      Object.assign(props, normalizeViewportProps(props));
      return props;
    }
  }, {
    key: "_unproject",
    value: function _unproject(pos) {
      var viewport = new WebMercatorViewport(this._viewportProps);
      return pos && viewport.unproject(pos);
    }
  }, {
    key: "_calculateNewLngLat",
    value: function _calculateNewLngLat(_ref8) {
      var startPanLngLat = _ref8.startPanLngLat,
          pos = _ref8.pos;
      var viewport = new WebMercatorViewport(this._viewportProps);
      return viewport.getMapCenterByLngLatPosition({
        lngLat: startPanLngLat,
        pos: pos
      });
    }
  }, {
    key: "_calculateNewZoom",
    value: function _calculateNewZoom(_ref9) {
      var scale = _ref9.scale,
          startZoom = _ref9.startZoom;
      var _this$_viewportProps = this._viewportProps,
          maxZoom = _this$_viewportProps.maxZoom,
          minZoom = _this$_viewportProps.minZoom;
      var zoom = startZoom + Math.log2(scale);
      return math_utils_clamp(zoom, minZoom, maxZoom);
    }
  }, {
    key: "_calculateNewPitchAndBearing",
    value: function _calculateNewPitchAndBearing(_ref10) {
      var deltaScaleX = _ref10.deltaScaleX,
          deltaScaleY = _ref10.deltaScaleY,
          startBearing = _ref10.startBearing,
          startPitch = _ref10.startPitch;
      deltaScaleY = math_utils_clamp(deltaScaleY, -1, 1);
      var _this$_viewportProps2 = this._viewportProps,
          minPitch = _this$_viewportProps2.minPitch,
          maxPitch = _this$_viewportProps2.maxPitch;
      var bearing = startBearing + 180 * deltaScaleX;
      var pitch = startPitch;

      if (deltaScaleY > 0) {
        pitch = startPitch + deltaScaleY * (maxPitch - startPitch);
      } else if (deltaScaleY < 0) {
        pitch = startPitch - deltaScaleY * (minPitch - startPitch);
      }

      return {
        pitch: pitch,
        bearing: bearing
      };
    }
  }, {
    key: "_getRotationParams",
    value: function _getRotationParams(pos, startPos) {
      var deltaX = pos[0] - startPos[0];
      var deltaY = pos[1] - startPos[1];
      var centerY = pos[1];
      var startY = startPos[1];
      var _this$_viewportProps3 = this._viewportProps,
          width = _this$_viewportProps3.width,
          height = _this$_viewportProps3.height;
      var deltaScaleX = deltaX / width;
      var deltaScaleY = 0;

      if (deltaY > 0) {
        if (Math.abs(height - startY) > PITCH_MOUSE_THRESHOLD) {
          deltaScaleY = deltaY / (startY - height) * PITCH_ACCEL;
        }
      } else if (deltaY < 0) {
        if (startY > PITCH_MOUSE_THRESHOLD) {
          deltaScaleY = 1 - centerY / startY;
        }
      }

      deltaScaleY = Math.min(1, Math.max(-1, deltaScaleY));
      return {
        deltaScaleX: deltaScaleX,
        deltaScaleY: deltaScaleY
      };
    }
  }]);

  return MapState;
}();


//# sourceMappingURL=map-state.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/map-constraints.js


function decapitalize(s) {
  return s[0].toLowerCase() + s.slice(1);
}

function checkVisibilityConstraints(props) {
  var constraints = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MAPBOX_LIMITS;

  for (var constraintName in constraints) {
    var type = constraintName.slice(0, 3);
    var propName = decapitalize(constraintName.slice(3));

    if (type === 'min' && props[propName] < constraints[constraintName]) {
      return false;
    }

    if (type === 'max' && props[propName] > constraints[constraintName]) {
      return false;
    }
  }

  return true;
}
//# sourceMappingURL=map-constraints.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/map-context.js



function map_context_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function map_context_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { map_context_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { map_context_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }



var MapContext = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createContext)({
  viewport: null,
  map: null,
  container: null,
  onViewportChange: null,
  onViewStateChange: null,
  eventManager: null
});
var MapContextProvider = MapContext.Provider;

function WrappedProvider(_ref) {
  var value = _ref.value,
      children = _ref.children;

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      map = _useState2[0],
      setMap = _useState2[1];

  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(MapContext);
  value = map_context_objectSpread(map_context_objectSpread({
    setMap: setMap
  }, context), {}, {
    map: context && context.map || map
  }, value);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(MapContextProvider, {
    value: value
  }, children);
}

MapContext.Provider = WrappedProvider;
/* harmony default export */ const map_context = (MapContext);
//# sourceMappingURL=map-context.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/use-isomorphic-layout-effect.js

var useIsomorphicLayoutEffect = typeof window !== 'undefined' ? external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useLayoutEffect : external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect;
/* harmony default export */ const use_isomorphic_layout_effect = (useIsomorphicLayoutEffect);
//# sourceMappingURL=use-isomorphic-layout-effect.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/static-map.js



function static_map_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function static_map_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { static_map_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { static_map_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }












var TOKEN_DOC_URL = 'https://visgl.github.io/react-map-gl/docs/get-started/mapbox-tokens';
var NO_TOKEN_WARNING = 'A valid API access token is required to use Mapbox data';

function static_map_noop() {}

function getViewport(_ref) {
  var props = _ref.props,
      width = _ref.width,
      height = _ref.height;
  return new WebMercatorViewport(static_map_objectSpread(static_map_objectSpread(static_map_objectSpread({}, props), props.viewState), {}, {
    width: width,
    height: height
  }));
}
var UNAUTHORIZED_ERROR_CODE = 401;
var CONTAINER_STYLE = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  overflow: 'hidden'
};
var static_map_propTypes = Object.assign({}, Mapbox.propTypes, {
  width: prop_types.oneOfType([prop_types.number, prop_types.string]),
  height: prop_types.oneOfType([prop_types.number, prop_types.string]),
  onResize: prop_types.func,
  disableTokenWarning: prop_types.bool,
  visible: prop_types.bool,
  className: prop_types.string,
  style: prop_types.object,
  visibilityConstraints: prop_types.object
});
var static_map_defaultProps = Object.assign({}, Mapbox.defaultProps, {
  disableTokenWarning: false,
  visible: true,
  onResize: static_map_noop,
  className: '',
  style: null,
  visibilityConstraints: MAPBOX_LIMITS
});

function NoTokenWarning() {
  var style = {
    position: 'absolute',
    left: 0,
    top: 0
  };
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "warning",
    id: "no-token-warning",
    style: style
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("h3", {
    key: "header"
  }, NO_TOKEN_WARNING), external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "text"
  }, "For information on setting up your basemap, read"), external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("a", {
    key: "link",
    href: TOKEN_DOC_URL
  }, "Note on Map Tokens"));
}

function getRefHandles(mapboxRef) {
  return {
    getMap: function getMap() {
      return mapboxRef.current && mapboxRef.current.getMap();
    },
    queryRenderedFeatures: function queryRenderedFeatures(geometry) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var map = mapboxRef.current && mapboxRef.current.getMap();
      return map && map.queryRenderedFeatures(geometry, options);
    }
  };
}

var StaticMap = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.forwardRef)(function (props, ref) {
  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(true),
      _useState2 = _slicedToArray(_useState, 2),
      accessTokenValid = _useState2[0],
      setTokenState = _useState2[1];

  var _useState3 = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)({
    width: 0,
    height: 0
  }),
      _useState4 = _slicedToArray(_useState3, 2),
      size = _useState4[0],
      setSize = _useState4[1];

  var mapboxRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var mapDivRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var containerRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var overlayRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(map_context);
  use_isomorphic_layout_effect(function () {
    if (!StaticMap.supported()) {
      return undefined;
    }

    var mapbox = new Mapbox(static_map_objectSpread(static_map_objectSpread(static_map_objectSpread({}, props), size), {}, {
      mapboxgl: mapboxgl,
      container: mapDivRef.current,
      onError: function onError(evt) {
        var statusCode = evt.error && evt.error.status || evt.status;

        if (statusCode === UNAUTHORIZED_ERROR_CODE && accessTokenValid) {
          console.error(NO_TOKEN_WARNING);
          setTokenState(false);
        }

        props.onError(evt);
      }
    }));
    mapboxRef.current = mapbox;

    if (context && context.setMap) {
      context.setMap(mapbox.getMap());
    }

    var resizeObserver = new ResizeObserver_es(function (entries) {
      if (entries[0].contentRect) {
        var _entries$0$contentRec = entries[0].contentRect,
            _width = _entries$0$contentRec.width,
            _height = _entries$0$contentRec.height;
        setSize({
          width: _width,
          height: _height
        });
        props.onResize({
          width: _width,
          height: _height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return function () {
      mapbox.finalize();
      mapboxRef.current = null;
      resizeObserver.disconnect();
    };
  }, []);
  use_isomorphic_layout_effect(function () {
    if (mapboxRef.current) {
      mapboxRef.current.setProps(static_map_objectSpread(static_map_objectSpread({}, props), size));
    }
  });
  var map = mapboxRef.current && mapboxRef.current.getMap();
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useImperativeHandle)(ref, function () {
    return getRefHandles(mapboxRef);
  }, []);
  var preventScroll = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useCallback)(function (_ref2) {
    var target = _ref2.target;

    if (target === overlayRef.current) {
      target.scrollTo(0, 0);
    }
  }, []);
  var overlays = map && external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(MapContextProvider, {
    value: static_map_objectSpread(static_map_objectSpread({}, context), {}, {
      viewport: context.viewport || getViewport(static_map_objectSpread({
        map: map,
        props: props
      }, size)),
      map: map,
      container: context.container || containerRef.current
    })
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "map-overlays",
    className: "overlays",
    ref: overlayRef,
    style: CONTAINER_STYLE,
    onScroll: preventScroll
  }, props.children));
  var className = props.className,
      width = props.width,
      height = props.height,
      style = props.style,
      visibilityConstraints = props.visibilityConstraints;
  var mapContainerStyle = Object.assign({
    position: 'relative'
  }, style, {
    width: width,
    height: height
  });
  var visible = props.visible && checkVisibilityConstraints(props.viewState || props, visibilityConstraints);
  var mapStyle = Object.assign({}, CONTAINER_STYLE, {
    visibility: visible ? 'inherit' : 'hidden'
  });
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "map-container",
    ref: containerRef,
    style: mapContainerStyle
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "map-mapbox",
    ref: mapDivRef,
    style: mapStyle,
    className: className
  }), overlays, !accessTokenValid && !props.disableTokenWarning && external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(NoTokenWarning, null));
});

StaticMap.supported = function () {
  return mapboxgl && mapboxgl.supported();
};

StaticMap.propTypes = static_map_propTypes;
StaticMap.defaultProps = static_map_defaultProps;
/* harmony default export */ const static_map = (StaticMap);
//# sourceMappingURL=static-map.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition/transition-interpolator.js




function transition_interpolator_createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = transition_interpolator_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function transition_interpolator_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return transition_interpolator_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return transition_interpolator_arrayLikeToArray(o, minLen); }

function transition_interpolator_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }




var TransitionInterpolator = function () {
  function TransitionInterpolator() {
    _classCallCheck(this, TransitionInterpolator);

    _defineProperty(this, "propNames", []);
  }

  _createClass(TransitionInterpolator, [{
    key: "arePropsEqual",
    value: function arePropsEqual(currentProps, nextProps) {
      var _iterator = transition_interpolator_createForOfIteratorHelper(this.propNames || []),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var key = _step.value;

          if (!math_utils_equals(currentProps[key], nextProps[key])) {
            return false;
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return true;
    }
  }, {
    key: "initializeProps",
    value: function initializeProps(startProps, endProps) {
      return {
        start: startProps,
        end: endProps
      };
    }
  }, {
    key: "interpolateProps",
    value: function interpolateProps(startProps, endProps, t) {
      utils_assert_assert(false, 'interpolateProps is not implemented');
    }
  }, {
    key: "getDuration",
    value: function getDuration(startProps, endProps) {
      return endProps.transitionDuration;
    }
  }]);

  return TransitionInterpolator;
}();


//# sourceMappingURL=transition-interpolator.js.map
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/inherits.js

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(subClass, "prototype", {
    writable: false
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/possibleConstructorReturn.js


function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }
  return _assertThisInitialized(self);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/getPrototypeOf.js
function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition/transition-utils.js
var WRAPPED_ANGULAR_PROPS = {
  longitude: 1,
  bearing: 1
};
function transition_utils_mod(value, divisor) {
  var modulus = value % divisor;
  return modulus < 0 ? divisor + modulus : modulus;
}
function isValid(prop) {
  return Number.isFinite(prop) || Array.isArray(prop);
}

function isWrappedAngularProp(propName) {
  return propName in WRAPPED_ANGULAR_PROPS;
}

function getEndValueByShortestPath(propName, startValue, endValue) {
  if (isWrappedAngularProp(propName) && Math.abs(endValue - startValue) > 180) {
    endValue = endValue < 0 ? endValue + 360 : endValue - 360;
  }

  return endValue;
}
//# sourceMappingURL=transition-utils.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition/viewport-fly-to-interpolator.js








function viewport_fly_to_interpolator_createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = viewport_fly_to_interpolator_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function viewport_fly_to_interpolator_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return viewport_fly_to_interpolator_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return viewport_fly_to_interpolator_arrayLikeToArray(o, minLen); }

function viewport_fly_to_interpolator_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }






var viewport_fly_to_interpolator_VIEWPORT_TRANSITION_PROPS = ['longitude', 'latitude', 'zoom', 'bearing', 'pitch'];
var REQUIRED_PROPS = ['latitude', 'longitude', 'zoom', 'width', 'height'];
var LINEARLY_INTERPOLATED_PROPS = ['bearing', 'pitch'];
var viewport_fly_to_interpolator_DEFAULT_OPTS = {
  speed: 1.2,
  curve: 1.414
};

var ViewportFlyToInterpolator = function (_TransitionInterpolat) {
  _inherits(ViewportFlyToInterpolator, _TransitionInterpolat);

  var _super = _createSuper(ViewportFlyToInterpolator);

  function ViewportFlyToInterpolator() {
    var _this;

    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ViewportFlyToInterpolator);

    _this = _super.call(this);

    _defineProperty(_assertThisInitialized(_this), "propNames", viewport_fly_to_interpolator_VIEWPORT_TRANSITION_PROPS);

    _this.props = Object.assign({}, viewport_fly_to_interpolator_DEFAULT_OPTS, props);
    return _this;
  }

  _createClass(ViewportFlyToInterpolator, [{
    key: "initializeProps",
    value: function initializeProps(startProps, endProps) {
      var startViewportProps = {};
      var endViewportProps = {};

      var _iterator = viewport_fly_to_interpolator_createForOfIteratorHelper(REQUIRED_PROPS),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var key = _step.value;
          var startValue = startProps[key];
          var endValue = endProps[key];
          utils_assert_assert(isValid(startValue) && isValid(endValue), "".concat(key, " must be supplied for transition"));
          startViewportProps[key] = startValue;
          endViewportProps[key] = getEndValueByShortestPath(key, startValue, endValue);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      var _iterator2 = viewport_fly_to_interpolator_createForOfIteratorHelper(LINEARLY_INTERPOLATED_PROPS),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var _key = _step2.value;

          var _startValue = startProps[_key] || 0;

          var _endValue = endProps[_key] || 0;

          startViewportProps[_key] = _startValue;
          endViewportProps[_key] = getEndValueByShortestPath(_key, _startValue, _endValue);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return {
        start: startViewportProps,
        end: endViewportProps
      };
    }
  }, {
    key: "interpolateProps",
    value: function interpolateProps(startProps, endProps, t) {
      var viewport = flyToViewport(startProps, endProps, t, this.props);

      var _iterator3 = viewport_fly_to_interpolator_createForOfIteratorHelper(LINEARLY_INTERPOLATED_PROPS),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var key = _step3.value;
          viewport[key] = utils_math_utils_lerp(startProps[key], endProps[key], t);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      return viewport;
    }
  }, {
    key: "getDuration",
    value: function getDuration(startProps, endProps) {
      var transitionDuration = endProps.transitionDuration;

      if (transitionDuration === 'auto') {
        transitionDuration = getFlyToDuration(startProps, endProps, this.props);
      }

      return transitionDuration;
    }
  }]);

  return ViewportFlyToInterpolator;
}(TransitionInterpolator);


//# sourceMappingURL=viewport-fly-to-interpolator.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition/linear-interpolator.js







function linear_interpolator_createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = linear_interpolator_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function linear_interpolator_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return linear_interpolator_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return linear_interpolator_arrayLikeToArray(o, minLen); }

function linear_interpolator_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function linear_interpolator_createSuper(Derived) { var hasNativeReflectConstruct = linear_interpolator_isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function linear_interpolator_isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }






var linear_interpolator_VIEWPORT_TRANSITION_PROPS = ['longitude', 'latitude', 'zoom', 'bearing', 'pitch'];

var LinearInterpolator = function (_TransitionInterpolat) {
  _inherits(LinearInterpolator, _TransitionInterpolat);

  var _super = linear_interpolator_createSuper(LinearInterpolator);

  function LinearInterpolator() {
    var _this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, LinearInterpolator);

    _this = _super.call(this);

    if (Array.isArray(opts)) {
      opts = {
        transitionProps: opts
      };
    }

    _this.propNames = opts.transitionProps || linear_interpolator_VIEWPORT_TRANSITION_PROPS;

    if (opts.around) {
      _this.around = opts.around;
    }

    return _this;
  }

  _createClass(LinearInterpolator, [{
    key: "initializeProps",
    value: function initializeProps(startProps, endProps) {
      var startViewportProps = {};
      var endViewportProps = {};

      if (this.around) {
        startViewportProps.around = this.around;
        var aroundLngLat = new WebMercatorViewport(startProps).unproject(this.around);
        Object.assign(endViewportProps, endProps, {
          around: new WebMercatorViewport(endProps).project(aroundLngLat),
          aroundLngLat: aroundLngLat
        });
      }

      var _iterator = linear_interpolator_createForOfIteratorHelper(this.propNames),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var key = _step.value;
          var startValue = startProps[key];
          var endValue = endProps[key];
          utils_assert_assert(isValid(startValue) && isValid(endValue), "".concat(key, " must be supplied for transition"));
          startViewportProps[key] = startValue;
          endViewportProps[key] = getEndValueByShortestPath(key, startValue, endValue);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return {
        start: startViewportProps,
        end: endViewportProps
      };
    }
  }, {
    key: "interpolateProps",
    value: function interpolateProps(startProps, endProps, t) {
      var viewport = {};

      var _iterator2 = linear_interpolator_createForOfIteratorHelper(this.propNames),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var key = _step2.value;
          viewport[key] = utils_math_utils_lerp(startProps[key], endProps[key], t);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      if (endProps.around) {
        var _WebMercatorViewport$ = new WebMercatorViewport(Object.assign({}, endProps, viewport)).getMapCenterByLngLatPosition({
          lngLat: endProps.aroundLngLat,
          pos: utils_math_utils_lerp(startProps.around, endProps.around, t)
        }),
            _WebMercatorViewport$2 = _slicedToArray(_WebMercatorViewport$, 2),
            longitude = _WebMercatorViewport$2[0],
            latitude = _WebMercatorViewport$2[1];

        viewport.longitude = longitude;
        viewport.latitude = latitude;
      }

      return viewport;
    }
  }]);

  return LinearInterpolator;
}(TransitionInterpolator);


//# sourceMappingURL=linear-interpolator.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition/index.js



//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/transition-manager.js







var transition_manager_noop = function noop() {};

function cropEasingFunction(easing, x0) {
  var y0 = easing(x0);
  return function (t) {
    return 1 / (1 - y0) * (easing(t * (1 - x0) + x0) - y0);
  };
}
var TRANSITION_EVENTS = {
  BREAK: 1,
  SNAP_TO_END: 2,
  IGNORE: 3,
  UPDATE: 4
};
var DEFAULT_PROPS = {
  transitionDuration: 0,
  transitionEasing: function transitionEasing(t) {
    return t;
  },
  transitionInterpolator: new LinearInterpolator(),
  transitionInterruption: TRANSITION_EVENTS.BREAK,
  onTransitionStart: transition_manager_noop,
  onTransitionInterrupt: transition_manager_noop,
  onTransitionEnd: transition_manager_noop
};

var TransitionManager = function () {
  function TransitionManager() {
    var _this = this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, TransitionManager);

    _defineProperty(this, "_animationFrame", null);

    _defineProperty(this, "_onTransitionFrame", function () {
      _this._animationFrame = requestAnimationFrame(_this._onTransitionFrame);

      _this._updateViewport();
    });

    this.props = null;
    this.onViewportChange = opts.onViewportChange || transition_manager_noop;
    this.onStateChange = opts.onStateChange || transition_manager_noop;
    this.time = opts.getTime || Date.now;
  }

  _createClass(TransitionManager, [{
    key: "getViewportInTransition",
    value: function getViewportInTransition() {
      return this._animationFrame ? this.state.propsInTransition : null;
    }
  }, {
    key: "processViewportChange",
    value: function processViewportChange(nextProps) {
      var currentProps = this.props;
      this.props = nextProps;

      if (!currentProps || this._shouldIgnoreViewportChange(currentProps, nextProps)) {
        return false;
      }

      if (this._isTransitionEnabled(nextProps)) {
        var startProps = Object.assign({}, currentProps);
        var endProps = Object.assign({}, nextProps);

        if (this._isTransitionInProgress()) {
          currentProps.onTransitionInterrupt();

          if (this.state.interruption === TRANSITION_EVENTS.SNAP_TO_END) {
            Object.assign(startProps, this.state.endProps);
          } else {
            Object.assign(startProps, this.state.propsInTransition);
          }

          if (this.state.interruption === TRANSITION_EVENTS.UPDATE) {
            var currentTime = this.time();
            var x0 = (currentTime - this.state.startTime) / this.state.duration;
            endProps.transitionDuration = this.state.duration - (currentTime - this.state.startTime);
            endProps.transitionEasing = cropEasingFunction(this.state.easing, x0);
            endProps.transitionInterpolator = startProps.transitionInterpolator;
          }
        }

        endProps.onTransitionStart();

        this._triggerTransition(startProps, endProps);

        return true;
      }

      if (this._isTransitionInProgress()) {
        currentProps.onTransitionInterrupt();

        this._endTransition();
      }

      return false;
    }
  }, {
    key: "_isTransitionInProgress",
    value: function _isTransitionInProgress() {
      return Boolean(this._animationFrame);
    }
  }, {
    key: "_isTransitionEnabled",
    value: function _isTransitionEnabled(props) {
      var transitionDuration = props.transitionDuration,
          transitionInterpolator = props.transitionInterpolator;
      return (transitionDuration > 0 || transitionDuration === 'auto') && Boolean(transitionInterpolator);
    }
  }, {
    key: "_isUpdateDueToCurrentTransition",
    value: function _isUpdateDueToCurrentTransition(props) {
      if (this.state.propsInTransition) {
        return this.state.interpolator.arePropsEqual(props, this.state.propsInTransition);
      }

      return false;
    }
  }, {
    key: "_shouldIgnoreViewportChange",
    value: function _shouldIgnoreViewportChange(currentProps, nextProps) {
      if (!currentProps) {
        return true;
      }

      if (this._isTransitionInProgress()) {
        return this.state.interruption === TRANSITION_EVENTS.IGNORE || this._isUpdateDueToCurrentTransition(nextProps);
      }

      if (this._isTransitionEnabled(nextProps)) {
        return nextProps.transitionInterpolator.arePropsEqual(currentProps, nextProps);
      }

      return true;
    }
  }, {
    key: "_triggerTransition",
    value: function _triggerTransition(startProps, endProps) {
      utils_assert_assert(this._isTransitionEnabled(endProps));

      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
      }

      var transitionInterpolator = endProps.transitionInterpolator;
      var duration = transitionInterpolator.getDuration ? transitionInterpolator.getDuration(startProps, endProps) : endProps.transitionDuration;

      if (duration === 0) {
        return;
      }

      var initialProps = endProps.transitionInterpolator.initializeProps(startProps, endProps);
      var interactionState = {
        inTransition: true,
        isZooming: startProps.zoom !== endProps.zoom,
        isPanning: startProps.longitude !== endProps.longitude || startProps.latitude !== endProps.latitude,
        isRotating: startProps.bearing !== endProps.bearing || startProps.pitch !== endProps.pitch
      };
      this.state = {
        duration: duration,
        easing: endProps.transitionEasing,
        interpolator: endProps.transitionInterpolator,
        interruption: endProps.transitionInterruption,
        startTime: this.time(),
        startProps: initialProps.start,
        endProps: initialProps.end,
        animation: null,
        propsInTransition: {}
      };

      this._onTransitionFrame();

      this.onStateChange(interactionState);
    }
  }, {
    key: "_endTransition",
    value: function _endTransition() {
      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
      }

      this.onStateChange({
        inTransition: false,
        isZooming: false,
        isPanning: false,
        isRotating: false
      });
    }
  }, {
    key: "_updateViewport",
    value: function _updateViewport() {
      var currentTime = this.time();
      var _this$state = this.state,
          startTime = _this$state.startTime,
          duration = _this$state.duration,
          easing = _this$state.easing,
          interpolator = _this$state.interpolator,
          startProps = _this$state.startProps,
          endProps = _this$state.endProps;
      var shouldEnd = false;
      var t = (currentTime - startTime) / duration;

      if (t >= 1) {
        t = 1;
        shouldEnd = true;
      }

      t = easing(t);
      var viewport = interpolator.interpolateProps(startProps, endProps, t);
      var mapState = new MapState(Object.assign({}, this.props, viewport));
      this.state.propsInTransition = mapState.getViewportProps();
      this.onViewportChange(this.state.propsInTransition, this.props);

      if (shouldEnd) {
        this._endTransition();

        this.props.onTransitionEnd();
      }
    }
  }]);

  return TransitionManager;
}();

_defineProperty(TransitionManager, "defaultProps", DEFAULT_PROPS);


//# sourceMappingURL=transition-manager.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/utils/hammer.js
// Hammer.Manager mock for use in environments without `document` / `window`.
class HammerManagerMock {
    constructor() {
        this.get = () => null;
        this.set = () => this;
        this.on = () => this;
        this.off = () => this;
        this.destroy = () => this;
        this.emit = () => this;
    }
}
const Manager = HammerManagerMock;
/* harmony default export */ const hammer = (null);
//# sourceMappingURL=hammer.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/inputs/input.js
class Input {
    constructor(element, callback, options) {
        this.element = element;
        this.callback = callback;
        this.options = { enable: true, ...options };
    }
}
//# sourceMappingURL=input.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/constants.js

// This module contains constants that must be conditionally required
// due to `window`/`document` references downstream.
const RECOGNIZERS = hammer
    ? [
        [hammer.Pan, { event: 'tripan', pointers: 3, threshold: 0, enable: false }],
        [hammer.Rotate, { enable: false }],
        [hammer.Pinch, { enable: false }],
        [hammer.Swipe, { enable: false }],
        [hammer.Pan, { threshold: 0, enable: false }],
        [hammer.Press, { enable: false }],
        [hammer.Tap, { event: 'doubletap', taps: 2, enable: false }],
        // TODO - rename to 'tap' and 'singletap' in the next major release
        [hammer.Tap, { event: 'anytap', enable: false }],
        [hammer.Tap, { enable: false }]
    ]
    : null;
// Recognize the following gestures even if a given recognizer succeeds
const RECOGNIZER_COMPATIBLE_MAP = {
    tripan: ['rotate', 'pinch', 'pan'],
    rotate: ['pinch'],
    pinch: ['pan'],
    pan: ['press', 'doubletap', 'anytap', 'tap'],
    doubletap: ['anytap'],
    anytap: ['tap']
};
// Recognize the folling gestures only if a given recognizer fails
const RECOGNIZER_FALLBACK_MAP = {
    doubletap: ['tap']
};
/**
 * Only one set of basic input events will be fired by Hammer.js:
 * either pointer, touch, or mouse, depending on system support.
 * In order to enable an application to be agnostic of system support,
 * alias basic input events into "classes" of events: down, move, and up.
 * See `_onBasicInput()` for usage of these aliases.
 */
const BASIC_EVENT_ALIASES = {
    pointerdown: 'pointerdown',
    pointermove: 'pointermove',
    pointerup: 'pointerup',
    touchstart: 'pointerdown',
    touchmove: 'pointermove',
    touchend: 'pointerup',
    mousedown: 'pointerdown',
    mousemove: 'pointermove',
    mouseup: 'pointerup'
};
const INPUT_EVENT_TYPES = {
    KEY_EVENTS: ['keydown', 'keyup'],
    MOUSE_EVENTS: ['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout', 'mouseleave'],
    WHEEL_EVENTS: [
        // Chrome, Safari
        'wheel',
        // IE
        'mousewheel'
    ]
};
/**
 * "Gestural" events are those that have semantic meaning beyond the basic input event,
 * e.g. a click or tap is a sequence of `down` and `up` events with no `move` event in between.
 * Hammer.js handles these with its Recognizer system;
 * this block maps event names to the Recognizers required to detect the events.
 */
const EVENT_RECOGNIZER_MAP = {
    tap: 'tap',
    anytap: 'anytap',
    doubletap: 'doubletap',
    press: 'press',
    pinch: 'pinch',
    pinchin: 'pinch',
    pinchout: 'pinch',
    pinchstart: 'pinch',
    pinchmove: 'pinch',
    pinchend: 'pinch',
    pinchcancel: 'pinch',
    rotate: 'rotate',
    rotatestart: 'rotate',
    rotatemove: 'rotate',
    rotateend: 'rotate',
    rotatecancel: 'rotate',
    tripan: 'tripan',
    tripanstart: 'tripan',
    tripanmove: 'tripan',
    tripanup: 'tripan',
    tripandown: 'tripan',
    tripanleft: 'tripan',
    tripanright: 'tripan',
    tripanend: 'tripan',
    tripancancel: 'tripan',
    pan: 'pan',
    panstart: 'pan',
    panmove: 'pan',
    panup: 'pan',
    pandown: 'pan',
    panleft: 'pan',
    panright: 'pan',
    panend: 'pan',
    pancancel: 'pan',
    swipe: 'swipe',
    swipeleft: 'swipe',
    swiperight: 'swipe',
    swipeup: 'swipe',
    swipedown: 'swipe'
};
/**
 * Map gestural events typically provided by browsers
 * that are not reported in 'hammer.input' events
 * to corresponding Hammer.js gestures.
 */
const GESTURE_EVENT_ALIASES = {
    click: 'tap',
    anyclick: 'anytap',
    dblclick: 'doubletap',
    mousedown: 'pointerdown',
    mousemove: 'pointermove',
    mouseup: 'pointerup',
    mouseover: 'pointerover',
    mouseout: 'pointerout',
    mouseleave: 'pointerleave'
};
//# sourceMappingURL=constants.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/utils/globals.js
// Purpose: include this in your module to avoids adding dependencies on
// micro modules like 'global'
/* global window, global, document, navigator */
const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
const globals_window_ = typeof window !== 'undefined' ? window : global;
const globals_global_ = typeof global !== 'undefined' ? global : window;
const globals_document_ = typeof document !== 'undefined' ? document : {};

/*
 * Detect whether passive option is supported by the current browser.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   #Safely_detecting_option_support
 */
let passiveSupported = false;
/* eslint-disable accessor-pairs, no-empty */
try {
    const options = {
        // This function will be called when the browser
        // attempts to access the passive property.
        get passive() {
            passiveSupported = true;
            return true;
        }
    };
    globals_window_.addEventListener('test', null, options);
    globals_window_.removeEventListener('test', null);
}
catch (err) {
    passiveSupported = false;
}

//# sourceMappingURL=globals.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/inputs/wheel-input.js



const firefox = userAgent.indexOf('firefox') !== -1;
const { WHEEL_EVENTS } = INPUT_EVENT_TYPES;
const EVENT_TYPE = 'wheel';
// Constants for normalizing input delta
const WHEEL_DELTA_MAGIC_SCALER = 4.000244140625;
const WHEEL_DELTA_PER_LINE = 40;
// Slow down zoom if shift key is held for more precise zooming
const SHIFT_MULTIPLIER = 0.25;
class WheelInput extends Input {
    constructor(element, callback, options) {
        super(element, callback, options);
        /* eslint-disable complexity, max-statements */
        this.handleEvent = (event) => {
            if (!this.options.enable) {
                return;
            }
            let value = event.deltaY;
            if (globals_window_.WheelEvent) {
                // Firefox doubles the values on retina screens...
                if (firefox && event.deltaMode === globals_window_.WheelEvent.DOM_DELTA_PIXEL) {
                    value /= globals_window_.devicePixelRatio;
                }
                if (event.deltaMode === globals_window_.WheelEvent.DOM_DELTA_LINE) {
                    value *= WHEEL_DELTA_PER_LINE;
                }
            }
            if (value !== 0 && value % WHEEL_DELTA_MAGIC_SCALER === 0) {
                // This one is definitely a mouse wheel event.
                // Normalize this value to match trackpad.
                value = Math.floor(value / WHEEL_DELTA_MAGIC_SCALER);
            }
            if (event.shiftKey && value) {
                value = value * SHIFT_MULTIPLIER;
            }
            this.callback({
                type: EVENT_TYPE,
                center: {
                    x: event.clientX,
                    y: event.clientY
                },
                delta: -value,
                srcEvent: event,
                pointerType: 'mouse',
                target: event.target
            });
        };
        this.events = (this.options.events || []).concat(WHEEL_EVENTS);
        this.events.forEach(event => element.addEventListener(event, this.handleEvent, passiveSupported ? { passive: false } : false));
    }
    destroy() {
        this.events.forEach(event => this.element.removeEventListener(event, this.handleEvent));
    }
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType, enabled) {
        if (eventType === EVENT_TYPE) {
            this.options.enable = enabled;
        }
    }
}
//# sourceMappingURL=wheel-input.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/inputs/move-input.js


const { MOUSE_EVENTS } = INPUT_EVENT_TYPES;
const MOVE_EVENT_TYPE = 'pointermove';
const OVER_EVENT_TYPE = 'pointerover';
const OUT_EVENT_TYPE = 'pointerout';
const ENTER_EVENT_TYPE = 'pointerenter';
const LEAVE_EVENT_TYPE = 'pointerleave';
/**
 * Hammer.js swallows 'move' events (for pointer/touch/mouse)
 * when the pointer is not down. This class sets up a handler
 * specifically for these events to work around this limitation.
 * Note that this could be extended to more intelligently handle
 * move events across input types, e.g. storing multiple simultaneous
 * pointer/touch events, calculating speed/direction, etc.
 */
class MoveInput extends Input {
    constructor(element, callback, options) {
        super(element, callback, options);
        this.handleEvent = (event) => {
            this.handleOverEvent(event);
            this.handleOutEvent(event);
            this.handleEnterEvent(event);
            this.handleLeaveEvent(event);
            this.handleMoveEvent(event);
        };
        this.pressed = false;
        const { enable } = this.options;
        this.enableMoveEvent = enable;
        this.enableLeaveEvent = enable;
        this.enableEnterEvent = enable;
        this.enableOutEvent = enable;
        this.enableOverEvent = enable;
        this.events = (this.options.events || []).concat(MOUSE_EVENTS);
        this.events.forEach(event => element.addEventListener(event, this.handleEvent));
    }
    destroy() {
        this.events.forEach(event => this.element.removeEventListener(event, this.handleEvent));
    }
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType, enabled) {
        if (eventType === MOVE_EVENT_TYPE) {
            this.enableMoveEvent = enabled;
        }
        if (eventType === OVER_EVENT_TYPE) {
            this.enableOverEvent = enabled;
        }
        if (eventType === OUT_EVENT_TYPE) {
            this.enableOutEvent = enabled;
        }
        if (eventType === ENTER_EVENT_TYPE) {
            this.enableEnterEvent = enabled;
        }
        if (eventType === LEAVE_EVENT_TYPE) {
            this.enableLeaveEvent = enabled;
        }
    }
    handleOverEvent(event) {
        if (this.enableOverEvent) {
            if (event.type === 'mouseover') {
                this._emit(OVER_EVENT_TYPE, event);
            }
        }
    }
    handleOutEvent(event) {
        if (this.enableOutEvent) {
            if (event.type === 'mouseout') {
                this._emit(OUT_EVENT_TYPE, event);
            }
        }
    }
    handleEnterEvent(event) {
        if (this.enableEnterEvent) {
            if (event.type === 'mouseenter') {
                this._emit(ENTER_EVENT_TYPE, event);
            }
        }
    }
    handleLeaveEvent(event) {
        if (this.enableLeaveEvent) {
            if (event.type === 'mouseleave') {
                this._emit(LEAVE_EVENT_TYPE, event);
            }
        }
    }
    handleMoveEvent(event) {
        if (this.enableMoveEvent) {
            switch (event.type) {
                case 'mousedown':
                    if (event.button >= 0) {
                        // Button is down
                        this.pressed = true;
                    }
                    break;
                case 'mousemove':
                    // Move events use `which` to track the button being pressed
                    if (event.which === 0) {
                        // Button is not down
                        this.pressed = false;
                    }
                    if (!this.pressed) {
                        // Drag events are emitted by hammer already
                        // we just need to emit the move event on hover
                        this._emit(MOVE_EVENT_TYPE, event);
                    }
                    break;
                case 'mouseup':
                    this.pressed = false;
                    break;
                default:
            }
        }
    }
    _emit(type, event) {
        this.callback({
            type,
            center: {
                x: event.clientX,
                y: event.clientY
            },
            srcEvent: event,
            pointerType: 'mouse',
            target: event.target
        });
    }
}
//# sourceMappingURL=move-input.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/inputs/key-input.js


const { KEY_EVENTS } = INPUT_EVENT_TYPES;
const DOWN_EVENT_TYPE = 'keydown';
const UP_EVENT_TYPE = 'keyup';
class KeyInput extends Input {
    constructor(element, callback, options) {
        super(element, callback, options);
        this.handleEvent = (event) => {
            // Ignore if focused on text input
            const targetElement = (event.target || event.srcElement);
            if ((targetElement.tagName === 'INPUT' && targetElement.type === 'text') ||
                targetElement.tagName === 'TEXTAREA') {
                return;
            }
            if (this.enableDownEvent && event.type === 'keydown') {
                this.callback({
                    type: DOWN_EVENT_TYPE,
                    srcEvent: event,
                    key: event.key,
                    target: event.target
                });
            }
            if (this.enableUpEvent && event.type === 'keyup') {
                this.callback({
                    type: UP_EVENT_TYPE,
                    srcEvent: event,
                    key: event.key,
                    target: event.target
                });
            }
        };
        this.enableDownEvent = this.options.enable;
        this.enableUpEvent = this.options.enable;
        this.events = (this.options.events || []).concat(KEY_EVENTS);
        element.tabIndex = this.options.tabIndex || 0;
        element.style.outline = 'none';
        this.events.forEach(event => element.addEventListener(event, this.handleEvent));
    }
    destroy() {
        this.events.forEach(event => this.element.removeEventListener(event, this.handleEvent));
    }
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType, enabled) {
        if (eventType === DOWN_EVENT_TYPE) {
            this.enableDownEvent = enabled;
        }
        if (eventType === UP_EVENT_TYPE) {
            this.enableUpEvent = enabled;
        }
    }
}
//# sourceMappingURL=key-input.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/inputs/contextmenu-input.js

const contextmenu_input_EVENT_TYPE = 'contextmenu';
class ContextmenuInput extends Input {
    constructor(element, callback, options) {
        super(element, callback, options);
        this.handleEvent = (event) => {
            if (!this.options.enable) {
                return;
            }
            this.callback({
                type: contextmenu_input_EVENT_TYPE,
                center: {
                    x: event.clientX,
                    y: event.clientY
                },
                srcEvent: event,
                pointerType: 'mouse',
                target: event.target
            });
        };
        element.addEventListener('contextmenu', this.handleEvent);
    }
    destroy() {
        this.element.removeEventListener('contextmenu', this.handleEvent);
    }
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType, enabled) {
        if (eventType === contextmenu_input_EVENT_TYPE) {
            this.options.enable = enabled;
        }
    }
}
//# sourceMappingURL=contextmenu-input.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/utils/event-utils.js
/* Constants */
const DOWN_EVENT = 1;
const MOVE_EVENT = 2;
const UP_EVENT = 4;
const event_utils_MOUSE_EVENTS = {
    pointerdown: DOWN_EVENT,
    pointermove: MOVE_EVENT,
    pointerup: UP_EVENT,
    mousedown: DOWN_EVENT,
    mousemove: MOVE_EVENT,
    mouseup: UP_EVENT
};
// MouseEvent.which https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/which
const MOUSE_EVENT_WHICH_LEFT = 1;
const MOUSE_EVENT_WHICH_MIDDLE = 2;
const MOUSE_EVENT_WHICH_RIGHT = 3;
// MouseEvent.button https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const MOUSE_EVENT_BUTTON_LEFT = 0;
const MOUSE_EVENT_BUTTON_MIDDLE = 1;
const MOUSE_EVENT_BUTTON_RIGHT = 2;
// MouseEvent.buttons https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
const MOUSE_EVENT_BUTTONS_LEFT_MASK = 1;
const MOUSE_EVENT_BUTTONS_RIGHT_MASK = 2;
const MOUSE_EVENT_BUTTONS_MIDDLE_MASK = 4;
/**
 * Extract the involved mouse button
 */
function whichButtons(event) {
    const eventType = event_utils_MOUSE_EVENTS[event.srcEvent.type];
    if (!eventType) {
        // Not a mouse evet
        return null;
    }
    const { buttons, button, which } = event.srcEvent;
    let leftButton = false;
    let middleButton = false;
    let rightButton = false;
    if (
    // button is up, need to find out which one was pressed before
    eventType === UP_EVENT ||
        // moving but does not support `buttons` API
        (eventType === MOVE_EVENT && !Number.isFinite(buttons))) {
        leftButton = which === MOUSE_EVENT_WHICH_LEFT;
        middleButton = which === MOUSE_EVENT_WHICH_MIDDLE;
        rightButton = which === MOUSE_EVENT_WHICH_RIGHT;
    }
    else if (eventType === MOVE_EVENT) {
        leftButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_LEFT_MASK);
        middleButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_MIDDLE_MASK);
        rightButton = Boolean(buttons & MOUSE_EVENT_BUTTONS_RIGHT_MASK);
    }
    else if (eventType === DOWN_EVENT) {
        leftButton = button === MOUSE_EVENT_BUTTON_LEFT;
        middleButton = button === MOUSE_EVENT_BUTTON_MIDDLE;
        rightButton = button === MOUSE_EVENT_BUTTON_RIGHT;
    }
    return { leftButton, middleButton, rightButton };
}
/**
 * Calculate event position relative to the root element
 */
function getOffsetPosition(event, rootElement) {
    const center = event.center;
    // `center` is a hammer.js event property
    if (!center) {
        // Not a gestural event
        return null;
    }
    const rect = rootElement.getBoundingClientRect();
    // Fix scale for map affected by a CSS transform.
    // See https://stackoverflow.com/a/26893663/3528533
    const scaleX = rect.width / rootElement.offsetWidth || 1;
    const scaleY = rect.height / rootElement.offsetHeight || 1;
    // Calculate center relative to the root element
    const offsetCenter = {
        x: (center.x - rect.left - rootElement.clientLeft) / scaleX,
        y: (center.y - rect.top - rootElement.clientTop) / scaleY
    };
    return { center, offsetCenter };
}
//# sourceMappingURL=event-utils.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/utils/event-registrar.js

const DEFAULT_OPTIONS = {
    srcElement: 'root',
    priority: 0
};
class EventRegistrar {
    constructor(eventManager) {
        /**
         * Handles hammerjs event
         */
        this.handleEvent = (event) => {
            if (this.isEmpty()) {
                return;
            }
            const mjolnirEvent = this._normalizeEvent(event);
            let target = event.srcEvent.target;
            while (target && target !== mjolnirEvent.rootElement) {
                this._emit(mjolnirEvent, target);
                if (mjolnirEvent.handled) {
                    return;
                }
                target = target.parentNode;
            }
            this._emit(mjolnirEvent, 'root');
        };
        this.eventManager = eventManager;
        this.handlers = [];
        // Element -> handler map
        this.handlersByElement = new Map();
        this._active = false;
    }
    // Returns true if there are no non-passive handlers
    isEmpty() {
        return !this._active;
    }
    add(type, handler, options, once = false, passive = false) {
        const { handlers, handlersByElement } = this;
        let opts = DEFAULT_OPTIONS;
        if (typeof options === 'string' || (options && options.addEventListener)) {
            // is DOM element, backward compatibility
            // @ts-ignore
            opts = { ...DEFAULT_OPTIONS, srcElement: options };
        }
        else if (options) {
            opts = { ...DEFAULT_OPTIONS, ...options };
        }
        let entries = handlersByElement.get(opts.srcElement);
        if (!entries) {
            entries = [];
            handlersByElement.set(opts.srcElement, entries);
        }
        const entry = {
            type,
            handler,
            srcElement: opts.srcElement,
            priority: opts.priority
        };
        if (once) {
            entry.once = true;
        }
        if (passive) {
            entry.passive = true;
        }
        handlers.push(entry);
        this._active = this._active || !entry.passive;
        // Sort handlers by descending priority
        // Handlers with the same priority are excuted in the order of registration
        let insertPosition = entries.length - 1;
        while (insertPosition >= 0) {
            if (entries[insertPosition].priority >= entry.priority) {
                break;
            }
            insertPosition--;
        }
        entries.splice(insertPosition + 1, 0, entry);
    }
    remove(type, handler) {
        const { handlers, handlersByElement } = this;
        for (let i = handlers.length - 1; i >= 0; i--) {
            const entry = handlers[i];
            if (entry.type === type && entry.handler === handler) {
                handlers.splice(i, 1);
                const entries = handlersByElement.get(entry.srcElement);
                entries.splice(entries.indexOf(entry), 1);
                if (entries.length === 0) {
                    handlersByElement.delete(entry.srcElement);
                }
            }
        }
        this._active = handlers.some(entry => !entry.passive);
    }
    /**
     * Invoke handlers on a particular element
     */
    _emit(event, srcElement) {
        const entries = this.handlersByElement.get(srcElement);
        if (entries) {
            let immediatePropagationStopped = false;
            // Prevents the current event from bubbling up
            const stopPropagation = () => {
                event.handled = true;
            };
            // Prevent any remaining listeners from being called
            const stopImmediatePropagation = () => {
                event.handled = true;
                immediatePropagationStopped = true;
            };
            const entriesToRemove = [];
            for (let i = 0; i < entries.length; i++) {
                const { type, handler, once } = entries[i];
                handler({
                    ...event,
                    // @ts-ignore
                    type,
                    stopPropagation,
                    stopImmediatePropagation
                });
                if (once) {
                    entriesToRemove.push(entries[i]);
                }
                if (immediatePropagationStopped) {
                    break;
                }
            }
            for (let i = 0; i < entriesToRemove.length; i++) {
                const { type, handler } = entriesToRemove[i];
                this.remove(type, handler);
            }
        }
    }
    /**
     * Normalizes hammerjs and custom events to have predictable fields.
     */
    _normalizeEvent(event) {
        const rootElement = this.eventManager.getElement();
        return {
            ...event,
            ...whichButtons(event),
            ...getOffsetPosition(event, rootElement),
            preventDefault: () => {
                event.srcEvent.preventDefault();
            },
            stopImmediatePropagation: null,
            stopPropagation: null,
            handled: false,
            rootElement
        };
    }
}
//# sourceMappingURL=event-registrar.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/event-manager.js







const event_manager_DEFAULT_OPTIONS = {
    // event handlers
    events: null,
    // custom recognizers
    recognizers: null,
    recognizerOptions: {},
    // Manager class
    Manager: Manager,
    // allow browser default touch action
    // https://github.com/uber/react-map-gl/issues/506
    touchAction: 'none',
    tabIndex: 0
};
// Unified API for subscribing to events about both
// basic input events (e.g. 'mousemove', 'touchstart', 'wheel')
// and gestural input (e.g. 'click', 'tap', 'panstart').
// Delegates gesture related event registration and handling to Hammer.js.
class EventManager {
    constructor(element = null, options) {
        /**
         * Handle basic events using the 'hammer.input' Hammer.js API:
         * Before running Recognizers, Hammer emits a 'hammer.input' event
         * with the basic event info. This function emits all basic events
         * aliased to the "class" of event received.
         * See constants.BASIC_EVENT_CLASSES basic event class definitions.
         */
        this._onBasicInput = (event) => {
            const { srcEvent } = event;
            const alias = BASIC_EVENT_ALIASES[srcEvent.type];
            if (alias) {
                // fire all events aliased to srcEvent.type
                this.manager.emit(alias, event);
            }
        };
        /**
         * Handle events not supported by Hammer.js,
         * and pipe back out through same (Hammer) channel used by other events.
         */
        this._onOtherEvent = (event) => {
            // console.log('onotherevent', event.type, event)
            this.manager.emit(event.type, event);
        };
        this.options = { ...event_manager_DEFAULT_OPTIONS, ...options };
        this.events = new Map();
        this.setElement(element);
        // Register all passed events.
        const { events } = this.options;
        if (events) {
            this.on(events);
        }
    }
    getElement() {
        return this.element;
    }
    setElement(element) {
        if (this.element) {
            // unregister all events
            this.destroy();
        }
        this.element = element;
        if (!element) {
            return;
        }
        const { options } = this;
        const ManagerClass = options.Manager;
        this.manager = new ManagerClass(element, {
            touchAction: options.touchAction,
            recognizers: options.recognizers || RECOGNIZERS
        }).on('hammer.input', this._onBasicInput);
        if (!options.recognizers) {
            // Set default recognize withs
            // http://hammerjs.github.io/recognize-with/
            Object.keys(RECOGNIZER_COMPATIBLE_MAP).forEach(name => {
                const recognizer = this.manager.get(name);
                if (recognizer) {
                    RECOGNIZER_COMPATIBLE_MAP[name].forEach(otherName => {
                        recognizer.recognizeWith(otherName);
                    });
                }
            });
        }
        // Set recognizer options
        for (const recognizerName in options.recognizerOptions) {
            const recognizer = this.manager.get(recognizerName);
            if (recognizer) {
                const recognizerOption = options.recognizerOptions[recognizerName];
                // `enable` is managed by the event registrations
                delete recognizerOption.enable;
                recognizer.set(recognizerOption);
            }
        }
        // Handle events not handled by Hammer.js:
        // - mouse wheel
        // - pointer/touch/mouse move
        this.wheelInput = new WheelInput(element, this._onOtherEvent, {
            enable: false
        });
        this.moveInput = new MoveInput(element, this._onOtherEvent, {
            enable: false
        });
        this.keyInput = new KeyInput(element, this._onOtherEvent, {
            enable: false,
            tabIndex: options.tabIndex
        });
        this.contextmenuInput = new ContextmenuInput(element, this._onOtherEvent, {
            enable: false
        });
        // Register all existing events
        for (const [eventAlias, eventRegistrar] of this.events) {
            if (!eventRegistrar.isEmpty()) {
                // Enable recognizer for this event.
                this._toggleRecognizer(eventRegistrar.recognizerName, true);
                this.manager.on(eventAlias, eventRegistrar.handleEvent);
            }
        }
    }
    // Tear down internal event management implementations.
    destroy() {
        if (this.element) {
            // wheelInput etc. are created in setElement() and therefore
            // cannot exist if there is no element
            this.wheelInput.destroy();
            this.moveInput.destroy();
            this.keyInput.destroy();
            this.contextmenuInput.destroy();
            this.manager.destroy();
            this.wheelInput = null;
            this.moveInput = null;
            this.keyInput = null;
            this.contextmenuInput = null;
            this.manager = null;
            this.element = null;
        }
    }
    /** Register an event handler function to be called on `event` */
    on(event, handler, opts) {
        this._addEventHandler(event, handler, opts, false);
    }
    once(event, handler, opts) {
        this._addEventHandler(event, handler, opts, true);
    }
    watch(event, handler, opts) {
        this._addEventHandler(event, handler, opts, false, true);
    }
    off(event, handler) {
        this._removeEventHandler(event, handler);
    }
    /*
     * Enable/disable recognizer for the given event
     */
    _toggleRecognizer(name, enabled) {
        const { manager } = this;
        if (!manager) {
            return;
        }
        const recognizer = manager.get(name);
        // @ts-ignore
        if (recognizer && recognizer.options.enable !== enabled) {
            recognizer.set({ enable: enabled });
            const fallbackRecognizers = RECOGNIZER_FALLBACK_MAP[name];
            if (fallbackRecognizers && !this.options.recognizers) {
                // Set default require failures
                // http://hammerjs.github.io/require-failure/
                fallbackRecognizers.forEach(otherName => {
                    const otherRecognizer = manager.get(otherName);
                    if (enabled) {
                        // Wait for this recognizer to fail
                        otherRecognizer.requireFailure(name);
                        /**
                         * This seems to be a bug in hammerjs:
                         * requireFailure() adds both ways
                         * dropRequireFailure() only drops one way
                         * https://github.com/hammerjs/hammer.js/blob/master/src/recognizerjs/
                           recognizer-constructor.js#L136
                         */
                        recognizer.dropRequireFailure(otherName);
                    }
                    else {
                        // Do not wait for this recognizer to fail
                        otherRecognizer.dropRequireFailure(name);
                    }
                });
            }
        }
        this.wheelInput.enableEventType(name, enabled);
        this.moveInput.enableEventType(name, enabled);
        this.keyInput.enableEventType(name, enabled);
        this.contextmenuInput.enableEventType(name, enabled);
    }
    /**
     * Process the event registration for a single event + handler.
     */
    _addEventHandler(event, handler, opts, once, passive) {
        if (typeof event !== 'string') {
            // @ts-ignore
            opts = handler;
            // If `event` is a map, call `on()` for each entry.
            for (const eventName in event) {
                this._addEventHandler(eventName, event[eventName], opts, once, passive);
            }
            return;
        }
        const { manager, events } = this;
        // Alias to a recognized gesture as necessary.
        const eventAlias = GESTURE_EVENT_ALIASES[event] || event;
        let eventRegistrar = events.get(eventAlias);
        if (!eventRegistrar) {
            eventRegistrar = new EventRegistrar(this);
            events.set(eventAlias, eventRegistrar);
            // Enable recognizer for this event.
            eventRegistrar.recognizerName = EVENT_RECOGNIZER_MAP[eventAlias] || eventAlias;
            // Listen to the event
            if (manager) {
                manager.on(eventAlias, eventRegistrar.handleEvent);
            }
        }
        eventRegistrar.add(event, handler, opts, once, passive);
        if (!eventRegistrar.isEmpty()) {
            this._toggleRecognizer(eventRegistrar.recognizerName, true);
        }
    }
    /**
     * Process the event deregistration for a single event + handler.
     */
    _removeEventHandler(event, handler) {
        if (typeof event !== 'string') {
            // If `event` is a map, call `off()` for each entry.
            for (const eventName in event) {
                this._removeEventHandler(eventName, event[eventName]);
            }
            return;
        }
        const { events } = this;
        // Alias to a recognized gesture as necessary.
        const eventAlias = GESTURE_EVENT_ALIASES[event] || event;
        const eventRegistrar = events.get(eventAlias);
        if (!eventRegistrar) {
            return;
        }
        eventRegistrar.remove(event, handler);
        if (eventRegistrar.isEmpty()) {
            const { recognizerName } = eventRegistrar;
            // Disable recognizer if no more handlers are attached to its events
            let isRecognizerUsed = false;
            for (const eh of events.values()) {
                if (eh.recognizerName === recognizerName && !eh.isEmpty()) {
                    isRecognizerUsed = true;
                    break;
                }
            }
            if (!isRecognizerUsed) {
                this._toggleRecognizer(recognizerName, false);
            }
        }
    }
}
//# sourceMappingURL=event-manager.js.map
;// CONCATENATED MODULE: ./node_modules/mjolnir.js/dist/esm/index.js

//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/map-controller.js




function map_controller_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function map_controller_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { map_controller_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { map_controller_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }




var NO_TRANSITION_PROPS = {
  transitionDuration: 0
};
var LINEAR_TRANSITION_PROPS = {
  transitionDuration: 300,
  transitionEasing: function transitionEasing(t) {
    return t;
  },
  transitionInterpolator: new LinearInterpolator(),
  transitionInterruption: TRANSITION_EVENTS.BREAK
};
var DEFAULT_INERTIA = 300;

var INERTIA_EASING = function INERTIA_EASING(t) {
  return 1 - (1 - t) * (1 - t);
};

var EVENT_TYPES = {
  WHEEL: ['wheel'],
  PAN: ['panstart', 'panmove', 'panend'],
  PINCH: ['pinchstart', 'pinchmove', 'pinchend'],
  TRIPLE_PAN: ['tripanstart', 'tripanmove', 'tripanend'],
  DOUBLE_TAP: ['doubletap'],
  KEYBOARD: ['keydown']
};

var MapController = function () {
  function MapController() {
    var _this = this;

    _classCallCheck(this, MapController);

    _defineProperty(this, "events", []);

    _defineProperty(this, "scrollZoom", true);

    _defineProperty(this, "dragPan", true);

    _defineProperty(this, "dragRotate", true);

    _defineProperty(this, "doubleClickZoom", true);

    _defineProperty(this, "touchZoom", true);

    _defineProperty(this, "touchRotate", false);

    _defineProperty(this, "keyboard", true);

    _defineProperty(this, "_interactionState", {
      isDragging: false
    });

    _defineProperty(this, "_events", {});

    _defineProperty(this, "_setInteractionState", function (newState) {
      Object.assign(_this._interactionState, newState);

      if (_this.onStateChange) {
        _this.onStateChange(_this._interactionState);
      }
    });

    _defineProperty(this, "_onTransition", function (newViewport, oldViewport) {
      _this.onViewportChange(newViewport, _this._interactionState, oldViewport);
    });

    this.handleEvent = this.handleEvent.bind(this);
    this._transitionManager = new TransitionManager({
      onViewportChange: this._onTransition,
      onStateChange: this._setInteractionState
    });
  }

  _createClass(MapController, [{
    key: "handleEvent",
    value: function handleEvent(event) {
      this.mapState = this.getMapState();
      var eventStartBlocked = this._eventStartBlocked;

      switch (event.type) {
        case 'panstart':
          return eventStartBlocked ? false : this._onPanStart(event);

        case 'panmove':
          return this._onPan(event);

        case 'panend':
          return this._onPanEnd(event);

        case 'pinchstart':
          return eventStartBlocked ? false : this._onPinchStart(event);

        case 'pinchmove':
          return this._onPinch(event);

        case 'pinchend':
          return this._onPinchEnd(event);

        case 'tripanstart':
          return eventStartBlocked ? false : this._onTriplePanStart(event);

        case 'tripanmove':
          return this._onTriplePan(event);

        case 'tripanend':
          return this._onTriplePanEnd(event);

        case 'doubletap':
          return this._onDoubleTap(event);

        case 'wheel':
          return this._onWheel(event);

        case 'keydown':
          return this._onKeyDown(event);

        default:
          return false;
      }
    }
  }, {
    key: "getCenter",
    value: function getCenter(event) {
      var _event$offsetCenter = event.offsetCenter,
          x = _event$offsetCenter.x,
          y = _event$offsetCenter.y;
      return [x, y];
    }
  }, {
    key: "isFunctionKeyPressed",
    value: function isFunctionKeyPressed(event) {
      var srcEvent = event.srcEvent;
      return Boolean(srcEvent.metaKey || srcEvent.altKey || srcEvent.ctrlKey || srcEvent.shiftKey);
    }
  }, {
    key: "blockEvents",
    value: function blockEvents(timeout) {
      var _this2 = this;

      var timer = setTimeout(function () {
        if (_this2._eventStartBlocked === timer) {
          _this2._eventStartBlocked = null;
        }
      }, timeout);
      this._eventStartBlocked = timer;
    }
  }, {
    key: "updateViewport",
    value: function updateViewport(newMapState, extraProps, interactionState) {
      var oldViewport = this.mapState instanceof MapState ? this.mapState.getViewportProps() : this.mapState;

      var newViewport = map_controller_objectSpread(map_controller_objectSpread({}, newMapState.getViewportProps()), extraProps);

      var viewStateChanged = Object.keys(newViewport).some(function (key) {
        return oldViewport[key] !== newViewport[key];
      });
      this._state = newMapState.getState();

      this._setInteractionState(interactionState);

      if (viewStateChanged) {
        this.onViewportChange(newViewport, this._interactionState, oldViewport);
      }
    }
  }, {
    key: "getMapState",
    value: function getMapState(overrides) {
      return new MapState(map_controller_objectSpread(map_controller_objectSpread(map_controller_objectSpread({}, this.mapStateProps), this._state), overrides));
    }
  }, {
    key: "isDragging",
    value: function isDragging() {
      return this._interactionState.isDragging;
    }
  }, {
    key: "setOptions",
    value: function setOptions(options) {
      var onViewportChange = options.onViewportChange,
          onStateChange = options.onStateChange,
          _options$eventManager = options.eventManager,
          eventManager = _options$eventManager === void 0 ? this.eventManager : _options$eventManager,
          _options$isInteractiv = options.isInteractive,
          isInteractive = _options$isInteractiv === void 0 ? true : _options$isInteractiv,
          _options$scrollZoom = options.scrollZoom,
          scrollZoom = _options$scrollZoom === void 0 ? this.scrollZoom : _options$scrollZoom,
          _options$dragPan = options.dragPan,
          dragPan = _options$dragPan === void 0 ? this.dragPan : _options$dragPan,
          _options$dragRotate = options.dragRotate,
          dragRotate = _options$dragRotate === void 0 ? this.dragRotate : _options$dragRotate,
          _options$doubleClickZ = options.doubleClickZoom,
          doubleClickZoom = _options$doubleClickZ === void 0 ? this.doubleClickZoom : _options$doubleClickZ,
          _options$touchZoom = options.touchZoom,
          touchZoom = _options$touchZoom === void 0 ? this.touchZoom : _options$touchZoom,
          _options$touchRotate = options.touchRotate,
          touchRotate = _options$touchRotate === void 0 ? this.touchRotate : _options$touchRotate,
          _options$keyboard = options.keyboard,
          keyboard = _options$keyboard === void 0 ? this.keyboard : _options$keyboard;
      this.onViewportChange = onViewportChange;
      this.onStateChange = onStateChange;
      var prevOptions = this.mapStateProps || {};
      var dimensionChanged = prevOptions.height !== options.height || prevOptions.width !== options.width;
      this.mapStateProps = options;

      if (dimensionChanged) {
        this.mapState = prevOptions;
        this.updateViewport(new MapState(options));
      }

      this._transitionManager.processViewportChange(options);

      if (this.eventManager !== eventManager) {
        this.eventManager = eventManager;
        this._events = {};
        this.toggleEvents(this.events, true);
      }

      this.toggleEvents(EVENT_TYPES.WHEEL, isInteractive && Boolean(scrollZoom));
      this.toggleEvents(EVENT_TYPES.PAN, isInteractive && Boolean(dragPan || dragRotate));
      this.toggleEvents(EVENT_TYPES.PINCH, isInteractive && Boolean(touchZoom || touchRotate));
      this.toggleEvents(EVENT_TYPES.TRIPLE_PAN, isInteractive && Boolean(touchRotate));
      this.toggleEvents(EVENT_TYPES.DOUBLE_TAP, isInteractive && Boolean(doubleClickZoom));
      this.toggleEvents(EVENT_TYPES.KEYBOARD, isInteractive && Boolean(keyboard));
      this.scrollZoom = scrollZoom;
      this.dragPan = dragPan;
      this.dragRotate = dragRotate;
      this.doubleClickZoom = doubleClickZoom;
      this.touchZoom = touchZoom;
      this.touchRotate = touchRotate;
      this.keyboard = keyboard;
    }
  }, {
    key: "toggleEvents",
    value: function toggleEvents(eventNames, enabled) {
      var _this3 = this;

      if (this.eventManager) {
        eventNames.forEach(function (eventName) {
          if (_this3._events[eventName] !== enabled) {
            _this3._events[eventName] = enabled;

            if (enabled) {
              _this3.eventManager.on(eventName, _this3.handleEvent);
            } else {
              _this3.eventManager.off(eventName, _this3.handleEvent);
            }
          }
        });
      }
    }
  }, {
    key: "_onPanStart",
    value: function _onPanStart(event) {
      var pos = this.getCenter(event);
      this._panRotate = this.isFunctionKeyPressed(event) || event.rightButton;
      var newMapState = this._panRotate ? this.mapState.rotateStart({
        pos: pos
      }) : this.mapState.panStart({
        pos: pos
      });
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isDragging: true
      });
      return true;
    }
  }, {
    key: "_onPan",
    value: function _onPan(event) {
      if (!this.isDragging()) {
        return false;
      }

      return this._panRotate ? this._onPanRotate(event) : this._onPanMove(event);
    }
  }, {
    key: "_onPanEnd",
    value: function _onPanEnd(event) {
      if (!this.isDragging()) {
        return false;
      }

      return this._panRotate ? this._onPanRotateEnd(event) : this._onPanMoveEnd(event);
    }
  }, {
    key: "_onPanMove",
    value: function _onPanMove(event) {
      if (!this.dragPan) {
        return false;
      }

      var pos = this.getCenter(event);
      var newMapState = this.mapState.pan({
        pos: pos
      });
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isPanning: true
      });
      return true;
    }
  }, {
    key: "_onPanMoveEnd",
    value: function _onPanMoveEnd(event) {
      if (this.dragPan) {
        var _this$dragPan$inertia = this.dragPan.inertia,
            inertia = _this$dragPan$inertia === void 0 ? DEFAULT_INERTIA : _this$dragPan$inertia;

        if (inertia && event.velocity) {
          var pos = this.getCenter(event);
          var endPos = [pos[0] + event.velocityX * inertia / 2, pos[1] + event.velocityY * inertia / 2];
          var newControllerState = this.mapState.pan({
            pos: endPos
          }).panEnd();
          this.updateViewport(newControllerState, map_controller_objectSpread(map_controller_objectSpread({}, LINEAR_TRANSITION_PROPS), {}, {
            transitionDuration: inertia,
            transitionEasing: INERTIA_EASING
          }), {
            isDragging: false,
            isPanning: true
          });
          return true;
        }
      }

      var newMapState = this.mapState.panEnd();
      this.updateViewport(newMapState, null, {
        isDragging: false,
        isPanning: false
      });
      return true;
    }
  }, {
    key: "_onPanRotate",
    value: function _onPanRotate(event) {
      if (!this.dragRotate) {
        return false;
      }

      var pos = this.getCenter(event);
      var newMapState = this.mapState.rotate({
        pos: pos
      });
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isRotating: true
      });
      return true;
    }
  }, {
    key: "_onPanRotateEnd",
    value: function _onPanRotateEnd(event) {
      if (this.dragRotate) {
        var _this$dragRotate$iner = this.dragRotate.inertia,
            inertia = _this$dragRotate$iner === void 0 ? DEFAULT_INERTIA : _this$dragRotate$iner;

        if (inertia && event.velocity) {
          var pos = this.getCenter(event);
          var endPos = [pos[0] + event.velocityX * inertia / 2, pos[1] + event.velocityY * inertia / 2];
          var newControllerState = this.mapState.rotate({
            pos: endPos
          }).rotateEnd();
          this.updateViewport(newControllerState, map_controller_objectSpread(map_controller_objectSpread({}, LINEAR_TRANSITION_PROPS), {}, {
            transitionDuration: inertia,
            transitionEasing: INERTIA_EASING
          }), {
            isDragging: false,
            isRotating: true
          });
          return true;
        }
      }

      var newMapState = this.mapState.panEnd();
      this.updateViewport(newMapState, null, {
        isDragging: false,
        isRotating: false
      });
      return true;
    }
  }, {
    key: "_onWheel",
    value: function _onWheel(event) {
      if (!this.scrollZoom) {
        return false;
      }

      var _this$scrollZoom = this.scrollZoom,
          _this$scrollZoom$spee = _this$scrollZoom.speed,
          speed = _this$scrollZoom$spee === void 0 ? 0.01 : _this$scrollZoom$spee,
          _this$scrollZoom$smoo = _this$scrollZoom.smooth,
          smooth = _this$scrollZoom$smoo === void 0 ? false : _this$scrollZoom$smoo;
      event.preventDefault();
      var pos = this.getCenter(event);
      var delta = event.delta;
      var scale = 2 / (1 + Math.exp(-Math.abs(delta * speed)));

      if (delta < 0 && scale !== 0) {
        scale = 1 / scale;
      }

      var newMapState = this.mapState.zoom({
        pos: pos,
        scale: scale
      });

      if (newMapState.getViewportProps().zoom === this.mapStateProps.zoom) {
        return false;
      }

      this.updateViewport(newMapState, map_controller_objectSpread(map_controller_objectSpread({}, LINEAR_TRANSITION_PROPS), {}, {
        transitionInterpolator: new LinearInterpolator({
          around: pos
        }),
        transitionDuration: smooth ? 250 : 1
      }), {
        isPanning: true,
        isZooming: true
      });
      return true;
    }
  }, {
    key: "_onPinchStart",
    value: function _onPinchStart(event) {
      var pos = this.getCenter(event);
      var newMapState = this.mapState.zoomStart({
        pos: pos
      }).rotateStart({
        pos: pos
      });
      this._startPinchRotation = event.rotation;
      this._lastPinchEvent = event;
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isDragging: true
      });
      return true;
    }
  }, {
    key: "_onPinch",
    value: function _onPinch(event) {
      if (!this.isDragging()) {
        return false;
      }

      if (!this.touchZoom && !this.touchRotate) {
        return false;
      }

      var newMapState = this.mapState;

      if (this.touchZoom) {
        var scale = event.scale;
        var pos = this.getCenter(event);
        newMapState = newMapState.zoom({
          pos: pos,
          scale: scale
        });
      }

      if (this.touchRotate) {
        var rotation = event.rotation;
        newMapState = newMapState.rotate({
          deltaAngleX: this._startPinchRotation - rotation
        });
      }

      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isDragging: true,
        isPanning: Boolean(this.touchZoom),
        isZooming: Boolean(this.touchZoom),
        isRotating: Boolean(this.touchRotate)
      });
      this._lastPinchEvent = event;
      return true;
    }
  }, {
    key: "_onPinchEnd",
    value: function _onPinchEnd(event) {
      if (!this.isDragging()) {
        return false;
      }

      if (this.touchZoom) {
        var _this$touchZoom$inert = this.touchZoom.inertia,
            inertia = _this$touchZoom$inert === void 0 ? DEFAULT_INERTIA : _this$touchZoom$inert;
        var _lastPinchEvent = this._lastPinchEvent;

        if (inertia && _lastPinchEvent && event.scale !== _lastPinchEvent.scale) {
          var pos = this.getCenter(event);

          var _newMapState = this.mapState.rotateEnd();

          var z = Math.log2(event.scale);

          var velocityZ = (z - Math.log2(_lastPinchEvent.scale)) / (event.deltaTime - _lastPinchEvent.deltaTime);

          var endScale = Math.pow(2, z + velocityZ * inertia / 2);
          _newMapState = _newMapState.zoom({
            pos: pos,
            scale: endScale
          }).zoomEnd();
          this.updateViewport(_newMapState, map_controller_objectSpread(map_controller_objectSpread({}, LINEAR_TRANSITION_PROPS), {}, {
            transitionInterpolator: new LinearInterpolator({
              around: pos
            }),
            transitionDuration: inertia,
            transitionEasing: INERTIA_EASING
          }), {
            isDragging: false,
            isPanning: Boolean(this.touchZoom),
            isZooming: Boolean(this.touchZoom),
            isRotating: false
          });
          this.blockEvents(inertia);
          return true;
        }
      }

      var newMapState = this.mapState.zoomEnd().rotateEnd();
      this._state.startPinchRotation = 0;
      this.updateViewport(newMapState, null, {
        isDragging: false,
        isPanning: false,
        isZooming: false,
        isRotating: false
      });
      this._startPinchRotation = null;
      this._lastPinchEvent = null;
      return true;
    }
  }, {
    key: "_onTriplePanStart",
    value: function _onTriplePanStart(event) {
      var pos = this.getCenter(event);
      var newMapState = this.mapState.rotateStart({
        pos: pos
      });
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isDragging: true
      });
      return true;
    }
  }, {
    key: "_onTriplePan",
    value: function _onTriplePan(event) {
      if (!this.isDragging()) {
        return false;
      }

      if (!this.touchRotate) {
        return false;
      }

      var pos = this.getCenter(event);
      pos[0] -= event.deltaX;
      var newMapState = this.mapState.rotate({
        pos: pos
      });
      this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
        isRotating: true
      });
      return true;
    }
  }, {
    key: "_onTriplePanEnd",
    value: function _onTriplePanEnd(event) {
      if (!this.isDragging()) {
        return false;
      }

      if (this.touchRotate) {
        var _this$touchRotate$ine = this.touchRotate.inertia,
            inertia = _this$touchRotate$ine === void 0 ? DEFAULT_INERTIA : _this$touchRotate$ine;

        if (inertia && event.velocityY) {
          var pos = this.getCenter(event);
          var endPos = [pos[0], pos[1] += event.velocityY * inertia / 2];

          var _newMapState2 = this.mapState.rotate({
            pos: endPos
          });

          this.updateViewport(_newMapState2, map_controller_objectSpread(map_controller_objectSpread({}, LINEAR_TRANSITION_PROPS), {}, {
            transitionDuration: inertia,
            transitionEasing: INERTIA_EASING
          }), {
            isDragging: false,
            isRotating: true
          });
          this.blockEvents(inertia);
          return false;
        }
      }

      var newMapState = this.mapState.rotateEnd();
      this.updateViewport(newMapState, null, {
        isDragging: false,
        isRotating: false
      });
      return true;
    }
  }, {
    key: "_onDoubleTap",
    value: function _onDoubleTap(event) {
      if (!this.doubleClickZoom) {
        return false;
      }

      var pos = this.getCenter(event);
      var isZoomOut = this.isFunctionKeyPressed(event);
      var newMapState = this.mapState.zoom({
        pos: pos,
        scale: isZoomOut ? 0.5 : 2
      });
      this.updateViewport(newMapState, Object.assign({}, LINEAR_TRANSITION_PROPS, {
        transitionInterpolator: new LinearInterpolator({
          around: pos
        })
      }), {
        isZooming: true
      });
      return true;
    }
  }, {
    key: "_onKeyDown",
    value: function _onKeyDown(event) {
      if (!this.keyboard) {
        return false;
      }

      var funcKey = this.isFunctionKeyPressed(event);
      var _this$keyboard = this.keyboard,
          _this$keyboard$zoomSp = _this$keyboard.zoomSpeed,
          zoomSpeed = _this$keyboard$zoomSp === void 0 ? 2 : _this$keyboard$zoomSp,
          _this$keyboard$moveSp = _this$keyboard.moveSpeed,
          moveSpeed = _this$keyboard$moveSp === void 0 ? 100 : _this$keyboard$moveSp,
          _this$keyboard$rotate = _this$keyboard.rotateSpeedX,
          rotateSpeedX = _this$keyboard$rotate === void 0 ? 15 : _this$keyboard$rotate,
          _this$keyboard$rotate2 = _this$keyboard.rotateSpeedY,
          rotateSpeedY = _this$keyboard$rotate2 === void 0 ? 10 : _this$keyboard$rotate2;
      var mapStateProps = this.mapStateProps;
      var newMapState;

      switch (event.srcEvent.keyCode) {
        case 189:
          if (funcKey) {
            newMapState = this.getMapState({
              zoom: mapStateProps.zoom - Math.log2(zoomSpeed) - 1
            });
          } else {
            newMapState = this.getMapState({
              zoom: mapStateProps.zoom - Math.log2(zoomSpeed)
            });
          }

          break;

        case 187:
          if (funcKey) {
            newMapState = this.getMapState({
              zoom: mapStateProps.zoom + Math.log2(zoomSpeed) + 1
            });
          } else {
            newMapState = this.getMapState({
              zoom: mapStateProps.zoom + Math.log2(zoomSpeed)
            });
          }

          break;

        case 37:
          if (funcKey) {
            newMapState = this.getMapState({
              bearing: mapStateProps.bearing - rotateSpeedX
            });
          } else {
            newMapState = this.mapState.pan({
              pos: [moveSpeed, 0],
              startPos: [0, 0]
            });
          }

          break;

        case 39:
          if (funcKey) {
            newMapState = this.getMapState({
              bearing: mapStateProps.bearing + rotateSpeedX
            });
          } else {
            newMapState = this.mapState.pan({
              pos: [-moveSpeed, 0],
              startPos: [0, 0]
            });
          }

          break;

        case 38:
          if (funcKey) {
            newMapState = this.getMapState({
              pitch: mapStateProps.pitch + rotateSpeedY
            });
          } else {
            newMapState = this.mapState.pan({
              pos: [0, moveSpeed],
              startPos: [0, 0]
            });
          }

          break;

        case 40:
          if (funcKey) {
            newMapState = this.getMapState({
              pitch: mapStateProps.pitch - rotateSpeedY
            });
          } else {
            newMapState = this.mapState.pan({
              pos: [0, -moveSpeed],
              startPos: [0, 0]
            });
          }

          break;

        default:
          return false;
      }

      return this.updateViewport(newMapState, LINEAR_TRANSITION_PROPS);
    }
  }]);

  return MapController;
}();


//# sourceMappingURL=map-controller.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/interactive-map.js




function interactive_map_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function interactive_map_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { interactive_map_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { interactive_map_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }











var interactive_map_propTypes = Object.assign({}, static_map.propTypes, {
  maxZoom: prop_types.number,
  minZoom: prop_types.number,
  maxPitch: prop_types.number,
  minPitch: prop_types.number,
  onViewStateChange: prop_types.func,
  onViewportChange: prop_types.func,
  onInteractionStateChange: prop_types.func,
  transitionDuration: prop_types.oneOfType([prop_types.number, prop_types.string]),
  transitionInterpolator: prop_types.object,
  transitionInterruption: prop_types.number,
  transitionEasing: prop_types.func,
  onTransitionStart: prop_types.func,
  onTransitionInterrupt: prop_types.func,
  onTransitionEnd: prop_types.func,
  scrollZoom: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  dragPan: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  dragRotate: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  doubleClickZoom: prop_types.bool,
  touchZoom: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  touchRotate: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  keyboard: prop_types.oneOfType([prop_types.bool, prop_types.object]),
  onHover: prop_types.func,
  onClick: prop_types.func,
  onDblClick: prop_types.func,
  onContextMenu: prop_types.func,
  onMouseDown: prop_types.func,
  onMouseMove: prop_types.func,
  onMouseUp: prop_types.func,
  onTouchStart: prop_types.func,
  onTouchMove: prop_types.func,
  onTouchEnd: prop_types.func,
  onMouseEnter: prop_types.func,
  onMouseLeave: prop_types.func,
  onMouseOut: prop_types.func,
  onWheel: prop_types.func,
  touchAction: prop_types.string,
  eventRecognizerOptions: prop_types.object,
  clickRadius: prop_types.number,
  interactiveLayerIds: prop_types.array,
  getCursor: prop_types.func,
  controller: prop_types.instanceOf(MapController)
});

var getDefaultCursor = function getDefaultCursor(_ref) {
  var isDragging = _ref.isDragging,
      isHovering = _ref.isHovering;
  return isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab';
};

var interactive_map_defaultProps = Object.assign({}, static_map.defaultProps, MAPBOX_LIMITS, TransitionManager.defaultProps, {
  onViewStateChange: null,
  onViewportChange: null,
  onClick: null,
  onNativeClick: null,
  onHover: null,
  onContextMenu: function onContextMenu(event) {
    return event.preventDefault();
  },
  scrollZoom: true,
  dragPan: true,
  dragRotate: true,
  doubleClickZoom: true,
  touchZoom: true,
  touchRotate: false,
  keyboard: true,
  touchAction: 'none',
  eventRecognizerOptions: {},
  clickRadius: 0,
  getCursor: getDefaultCursor
});

function normalizeEvent(event) {
  if (event.lngLat || !event.offsetCenter) {
    return event;
  }

  var _event$offsetCenter = event.offsetCenter,
      x = _event$offsetCenter.x,
      y = _event$offsetCenter.y;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return event;
  }

  var pos = [x, y];
  event.point = pos;
  event.lngLat = this.viewport.unproject(pos);
  return event;
}

function getFeatures(pos) {
  var map = this.map;

  if (!map || !pos) {
    return null;
  }

  var queryParams = {};
  var size = this.props.clickRadius;

  if (this.props.interactiveLayerIds) {
    queryParams.layers = this.props.interactiveLayerIds;
  }

  try {
    return map.queryRenderedFeatures(size ? [[pos[0] - size, pos[1] + size], [pos[0] + size, pos[1] - size]] : pos, queryParams);
  } catch (_unused) {
    return null;
  }
}

function onEvent(callbackName, event) {
  var func = this.props[callbackName];

  if (func) {
    func(normalizeEvent.call(this, event));
  }
}

function onPointerDown(event) {
  onEvent.call(this, event.pointerType === 'touch' ? 'onTouchStart' : 'onMouseDown', event);
}

function onPointerUp(event) {
  onEvent.call(this, event.pointerType === 'touch' ? 'onTouchEnd' : 'onMouseUp', event);
}

function onPointerMove(event) {
  onEvent.call(this, event.pointerType === 'touch' ? 'onTouchMove' : 'onMouseMove', event);

  if (!this.state.isDragging) {
    var _this$props = this.props,
        onHover = _this$props.onHover,
        interactiveLayerIds = _this$props.interactiveLayerIds;
    var features;
    event = normalizeEvent.call(this, event);

    if (interactiveLayerIds || onHover) {
      features = getFeatures.call(this, event.point);
    }

    var isHovering = Boolean(interactiveLayerIds && features && features.length > 0);
    var isEntering = isHovering && !this.state.isHovering;
    var isExiting = !isHovering && this.state.isHovering;

    if (onHover || isEntering) {
      event.features = features;

      if (onHover) {
        onHover(event);
      }
    }

    if (isEntering) {
      onEvent.call(this, 'onMouseEnter', event);
    }

    if (isExiting) {
      onEvent.call(this, 'onMouseLeave', event);
    }

    if (isEntering || isExiting) {
      this.setState({
        isHovering: isHovering
      });
    }
  }
}

function onPointerClick(event) {
  var _this$props2 = this.props,
      onClick = _this$props2.onClick,
      onNativeClick = _this$props2.onNativeClick,
      onDblClick = _this$props2.onDblClick,
      doubleClickZoom = _this$props2.doubleClickZoom;
  var callbacks = [];
  var isDoubleClickEnabled = onDblClick || doubleClickZoom;

  switch (event.type) {
    case 'anyclick':
      callbacks.push(onNativeClick);

      if (!isDoubleClickEnabled) {
        callbacks.push(onClick);
      }

      break;

    case 'click':
      if (isDoubleClickEnabled) {
        callbacks.push(onClick);
      }

      break;

    default:
  }

  callbacks = callbacks.filter(Boolean);

  if (callbacks.length) {
    event = normalizeEvent.call(this, event);
    event.features = getFeatures.call(this, event.point);
    callbacks.forEach(function (cb) {
      return cb(event);
    });
  }
}

function interactive_map_getRefHandles(staticMapRef) {
  return {
    getMap: staticMapRef.current && staticMapRef.current.getMap,
    queryRenderedFeatures: staticMapRef.current && staticMapRef.current.queryRenderedFeatures
  };
}

var InteractiveMap = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.forwardRef)(function (props, ref) {
  var parentContext = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(map_context);
  var controller = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return props.controller || new MapController();
  }, []);
  var eventManager = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return new EventManager(null, {
      touchAction: props.touchAction,
      recognizerOptions: props.eventRecognizerOptions
    });
  }, []);
  var eventCanvasRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var staticMapRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);

  var _thisRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)({
    width: 0,
    height: 0,
    state: {
      isHovering: false,
      isDragging: false
    }
  });

  var thisRef = _thisRef.current;
  thisRef.props = props;
  thisRef.map = staticMapRef.current && staticMapRef.current.getMap();

  thisRef.setState = function (newState) {
    thisRef.state = interactive_map_objectSpread(interactive_map_objectSpread({}, thisRef.state), newState);
    eventCanvasRef.current.style.cursor = props.getCursor(thisRef.state);
  };

  var inRender = true;
  var viewportUpdateRequested;
  var stateUpdateRequested;

  var handleViewportChange = function handleViewportChange(viewState, interactionState, oldViewState) {
    if (inRender) {
      viewportUpdateRequested = [viewState, interactionState, oldViewState];
      return;
    }

    var _thisRef$props = thisRef.props,
        onViewStateChange = _thisRef$props.onViewStateChange,
        onViewportChange = _thisRef$props.onViewportChange;

    if (onViewStateChange) {
      onViewStateChange({
        viewState: viewState,
        interactionState: interactionState,
        oldViewState: oldViewState
      });
    }

    if (onViewportChange) {
      onViewportChange(viewState, interactionState, oldViewState);
    }
  };

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useImperativeHandle)(ref, function () {
    return interactive_map_getRefHandles(staticMapRef);
  }, []);
  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return interactive_map_objectSpread(interactive_map_objectSpread({}, parentContext), {}, {
      eventManager: eventManager,
      container: parentContext.container || eventCanvasRef.current
    });
  }, [parentContext, eventCanvasRef.current]);
  context.onViewportChange = handleViewportChange;
  context.viewport = parentContext.viewport || getViewport(thisRef);
  thisRef.viewport = context.viewport;

  var handleInteractionStateChange = function handleInteractionStateChange(interactionState) {
    var _interactionState$isD = interactionState.isDragging,
        isDragging = _interactionState$isD === void 0 ? false : _interactionState$isD;

    if (isDragging !== thisRef.state.isDragging) {
      thisRef.setState({
        isDragging: isDragging
      });
    }

    if (inRender) {
      stateUpdateRequested = interactionState;
      return;
    }

    var onInteractionStateChange = thisRef.props.onInteractionStateChange;

    if (onInteractionStateChange) {
      onInteractionStateChange(interactionState);
    }
  };

  var updateControllerOpts = function updateControllerOpts() {
    if (thisRef.width && thisRef.height) {
      controller.setOptions(interactive_map_objectSpread(interactive_map_objectSpread(interactive_map_objectSpread({}, thisRef.props), thisRef.props.viewState), {}, {
        isInteractive: Boolean(thisRef.props.onViewStateChange || thisRef.props.onViewportChange),
        onViewportChange: handleViewportChange,
        onStateChange: handleInteractionStateChange,
        eventManager: eventManager,
        width: thisRef.width,
        height: thisRef.height
      }));
    }
  };

  var onResize = function onResize(_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    thisRef.width = width;
    thisRef.height = height;
    updateControllerOpts();
    thisRef.props.onResize({
      width: width,
      height: height
    });
  };

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    eventManager.setElement(eventCanvasRef.current);
    eventManager.on({
      pointerdown: onPointerDown.bind(thisRef),
      pointermove: onPointerMove.bind(thisRef),
      pointerup: onPointerUp.bind(thisRef),
      pointerleave: onEvent.bind(thisRef, 'onMouseOut'),
      click: onPointerClick.bind(thisRef),
      anyclick: onPointerClick.bind(thisRef),
      dblclick: onEvent.bind(thisRef, 'onDblClick'),
      wheel: onEvent.bind(thisRef, 'onWheel'),
      contextmenu: onEvent.bind(thisRef, 'onContextMenu')
    });
    return function () {
      eventManager.destroy();
    };
  }, []);
  use_isomorphic_layout_effect(function () {
    if (viewportUpdateRequested) {
      handleViewportChange.apply(void 0, _toConsumableArray(viewportUpdateRequested));
    }

    if (stateUpdateRequested) {
      handleInteractionStateChange(stateUpdateRequested);
    }
  });
  updateControllerOpts();
  var width = props.width,
      height = props.height,
      style = props.style,
      getCursor = props.getCursor;
  var eventCanvasStyle = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return interactive_map_objectSpread(interactive_map_objectSpread({
      position: 'relative'
    }, style), {}, {
      width: width,
      height: height,
      cursor: getCursor(thisRef.state)
    });
  }, [style, width, height, getCursor, thisRef.state]);

  if (!viewportUpdateRequested || !thisRef._child) {
    thisRef._child = external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(MapContextProvider, {
      value: context
    }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
      key: "event-canvas",
      ref: eventCanvasRef,
      style: eventCanvasStyle
    }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(static_map, _extends({}, props, {
      width: "100%",
      height: "100%",
      style: null,
      onResize: onResize,
      ref: staticMapRef
    }))));
  }

  inRender = false;
  return thisRef._child;
});
InteractiveMap.supported = static_map.supported;
InteractiveMap.propTypes = interactive_map_propTypes;
InteractiveMap.defaultProps = interactive_map_defaultProps;
/* harmony default export */ const interactive_map = (InteractiveMap);
//# sourceMappingURL=interactive-map.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/deep-equal.js

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    for (var i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }

    return true;
  } else if (Array.isArray(b)) {
    return false;
  }

  if (_typeof(a) === 'object' && _typeof(b) === 'object') {
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (var _i = 0, _aKeys = aKeys; _i < _aKeys.length; _i++) {
      var key = _aKeys[_i];

      if (!b.hasOwnProperty(key)) {
        return false;
      }

      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
//# sourceMappingURL=deep-equal.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/source.js



function source_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function source_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { source_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { source_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }








var source_propTypes = {
  type: prop_types.string.isRequired,
  id: prop_types.string
};
var sourceCounter = 0;

function createSource(map, id, props) {
  if (map.style && map.style._loaded) {
    var options = source_objectSpread({}, props);

    delete options.id;
    delete options.children;
    map.addSource(id, options);
    return map.getSource(id);
  }

  return null;
}

function updateSource(source, props, prevProps) {
  utils_assert_assert(props.id === prevProps.id, 'source id changed');
  utils_assert_assert(props.type === prevProps.type, 'source type changed');
  var changedKey = '';
  var changedKeyCount = 0;

  for (var key in props) {
    if (key !== 'children' && key !== 'id' && !deepEqual(prevProps[key], props[key])) {
      changedKey = key;
      changedKeyCount++;
    }
  }

  if (!changedKeyCount) {
    return;
  }

  var type = props.type;

  if (type === 'geojson') {
    source.setData(props.data);
  } else if (type === 'image') {
    source.updateImage({
      url: props.url,
      coordinates: props.coordinates
    });
  } else if ((type === 'canvas' || type === 'video') && changedKeyCount === 1 && changedKey === 'coordinates') {
    source.setCoordinates(props.coordinates);
  } else if (type === 'vector' && source.setUrl) {
    switch (changedKey) {
      case 'url':
        source.setUrl(props.url);
        break;

      case 'tiles':
        source.setTiles(props.tiles);
        break;

      default:
    }
  } else {
    console.warn("Unable to update <Source> prop: ".concat(changedKey));
  }
}

function Source(props) {
  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(map_context);
  var propsRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)({
    id: props.id,
    type: props.type
  });

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(0),
      _useState2 = _slicedToArray(_useState, 2),
      setStyleLoaded = _useState2[1];

  var id = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return props.id || "jsx-source-".concat(sourceCounter++);
  }, []);
  var map = context.map;
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (map) {
      var forceUpdate = function forceUpdate() {
        return setStyleLoaded(function (version) {
          return version + 1;
        });
      };

      map.on('styledata', forceUpdate);
      return function () {
        map.off('styledata', forceUpdate);
        requestAnimationFrame(function () {
          if (map.style && map.style._loaded && map.getSource(id)) {
            map.removeSource(id);
          }
        });
      };
    }

    return undefined;
  }, [map, id]);
  var source = map && map.style && map.getSource(id);

  if (source) {
    updateSource(source, props, propsRef.current);
  } else {
    source = createSource(map, id, props);
  }

  propsRef.current = props;
  return source && external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.Children.map(props.children, function (child) {
    return child && (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.cloneElement)(child, {
      source: id
    });
  }) || null;
}

Source.propTypes = source_propTypes;
/* harmony default export */ const source = (Source);
//# sourceMappingURL=source.js.map
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/layer.js




function layer_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function layer_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { layer_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { layer_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }






var LAYER_TYPES = ['fill', 'line', 'symbol', 'circle', 'fill-extrusion', 'raster', 'background', 'heatmap', 'hillshade'];
var layer_propTypes = {
  type: prop_types.oneOf(LAYER_TYPES).isRequired,
  id: prop_types.string,
  source: prop_types.string,
  beforeId: prop_types.string
};

function diffLayerStyles(map, id, props, prevProps) {
  var _props$layout = props.layout,
      layout = _props$layout === void 0 ? {} : _props$layout,
      _props$paint = props.paint,
      paint = _props$paint === void 0 ? {} : _props$paint,
      filter = props.filter,
      minzoom = props.minzoom,
      maxzoom = props.maxzoom,
      beforeId = props.beforeId,
      otherProps = _objectWithoutProperties(props, ["layout", "paint", "filter", "minzoom", "maxzoom", "beforeId"]);

  if (beforeId !== prevProps.beforeId) {
    map.moveLayer(id, beforeId);
  }

  if (layout !== prevProps.layout) {
    var prevLayout = prevProps.layout || {};

    for (var key in layout) {
      if (!deepEqual(layout[key], prevLayout[key])) {
        map.setLayoutProperty(id, key, layout[key]);
      }
    }

    for (var _key in prevLayout) {
      if (!layout.hasOwnProperty(_key)) {
        map.setLayoutProperty(id, _key, undefined);
      }
    }
  }

  if (paint !== prevProps.paint) {
    var prevPaint = prevProps.paint || {};

    for (var _key2 in paint) {
      if (!deepEqual(paint[_key2], prevPaint[_key2])) {
        map.setPaintProperty(id, _key2, paint[_key2]);
      }
    }

    for (var _key3 in prevPaint) {
      if (!paint.hasOwnProperty(_key3)) {
        map.setPaintProperty(id, _key3, undefined);
      }
    }
  }

  if (!deepEqual(filter, prevProps.filter)) {
    map.setFilter(id, filter);
  }

  if (minzoom !== prevProps.minzoom || maxzoom !== prevProps.maxzoom) {
    map.setLayerZoomRange(id, minzoom, maxzoom);
  }

  for (var _key4 in otherProps) {
    if (!deepEqual(otherProps[_key4], prevProps[_key4])) {
      map.setLayerProperty(id, _key4, otherProps[_key4]);
    }
  }
}

function createLayer(map, id, props) {
  if (map.style && map.style._loaded) {
    var options = layer_objectSpread(layer_objectSpread({}, props), {}, {
      id: id
    });

    delete options.beforeId;
    map.addLayer(options, props.beforeId);
  }
}

function updateLayer(map, id, props, prevProps) {
  utils_assert_assert(props.id === prevProps.id, 'layer id changed');
  utils_assert_assert(props.type === prevProps.type, 'layer type changed');

  try {
    diffLayerStyles(map, id, props, prevProps);
  } catch (error) {
    console.warn(error);
  }
}

var layerCounter = 0;

function Layer(props) {
  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(map_context);
  var propsRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)({
    id: props.id,
    type: props.type
  });

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(0),
      _useState2 = _slicedToArray(_useState, 2),
      setStyleLoaded = _useState2[1];

  var id = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return props.id || "jsx-layer-".concat(layerCounter++);
  }, []);
  var map = context.map;
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (map) {
      var forceUpdate = function forceUpdate() {
        return setStyleLoaded(function (version) {
          return version + 1;
        });
      };

      map.on('styledata', forceUpdate);
      return function () {
        map.off('styledata', forceUpdate);

        if (map.style && map.style._loaded) {
          map.removeLayer(id);
        }
      };
    }

    return undefined;
  }, [map]);
  var layer = map && map.style && map.getLayer(id);

  if (layer) {
    updateLayer(map, id, props, propsRef.current);
  } else {
    createLayer(map, id, props);
  }

  propsRef.current = props;
  return null;
}

Layer.propTypes = layer_propTypes;
/* harmony default export */ const components_layer = (Layer);
//# sourceMappingURL=layer.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/use-map-control.js



var mapControlDefaultProps = {
  captureScroll: false,
  captureDrag: true,
  captureClick: true,
  captureDoubleClick: true,
  capturePointerMove: false
};
var mapControlPropTypes = {
  captureScroll: prop_types.bool,
  captureDrag: prop_types.bool,
  captureClick: prop_types.bool,
  captureDoubleClick: prop_types.bool,
  capturePointerMove: prop_types.bool
};

function onMount(thisRef) {
  var ref = thisRef.containerRef.current;
  var eventManager = thisRef.context.eventManager;

  if (!ref || !eventManager) {
    return undefined;
  }

  var events = {
    wheel: function wheel(evt) {
      var props = thisRef.props;

      if (props.captureScroll) {
        evt.stopPropagation();
      }

      if (props.onScroll) {
        props.onScroll(evt, thisRef);
      }
    },
    panstart: function panstart(evt) {
      var props = thisRef.props;

      if (props.captureDrag) {
        evt.stopPropagation();
      }

      if (props.onDragStart) {
        props.onDragStart(evt, thisRef);
      }
    },
    anyclick: function anyclick(evt) {
      var props = thisRef.props;

      if (props.captureClick) {
        evt.stopPropagation();
      }

      if (props.onNativeClick) {
        props.onNativeClick(evt, thisRef);
      }
    },
    click: function click(evt) {
      var props = thisRef.props;

      if (props.captureClick) {
        evt.stopPropagation();
      }

      if (props.onClick) {
        props.onClick(evt, thisRef);
      }
    },
    dblclick: function dblclick(evt) {
      var props = thisRef.props;

      if (props.captureDoubleClick) {
        evt.stopPropagation();
      }

      if (props.onDoubleClick) {
        props.onDoubleClick(evt, thisRef);
      }
    },
    pointermove: function pointermove(evt) {
      var props = thisRef.props;

      if (props.capturePointerMove) {
        evt.stopPropagation();
      }

      if (props.onPointerMove) {
        props.onPointerMove(evt, thisRef);
      }
    }
  };
  eventManager.watch(events, ref);
  return function () {
    eventManager.off(events);
  };
}

function useMapControl() {
  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var context = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useContext)(map_context);
  var containerRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);

  var _thisRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)({
    props: props,
    state: {},
    context: context,
    containerRef: containerRef
  });

  var thisRef = _thisRef.current;
  thisRef.props = props;
  thisRef.context = context;
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    return onMount(thisRef);
  }, [context.eventManager]);
  return thisRef;
}
//# sourceMappingURL=use-map-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/base-control.js









function base_control_createSuper(Derived) { var hasNativeReflectConstruct = base_control_isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function base_control_isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }





function Control(props) {
  var instance = props.instance;

  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  instance._context = context;
  instance._containerRef = containerRef;
  return instance._render();
}

var BaseControl = function (_PureComponent) {
  _inherits(BaseControl, _PureComponent);

  var _super = base_control_createSuper(BaseControl);

  function BaseControl() {
    var _this;

    _classCallCheck(this, BaseControl);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));

    _defineProperty(_assertThisInitialized(_this), "_context", {});

    _defineProperty(_assertThisInitialized(_this), "_containerRef", (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createRef)());

    _defineProperty(_assertThisInitialized(_this), "_onScroll", function (evt) {});

    _defineProperty(_assertThisInitialized(_this), "_onDragStart", function (evt) {});

    _defineProperty(_assertThisInitialized(_this), "_onDblClick", function (evt) {});

    _defineProperty(_assertThisInitialized(_this), "_onClick", function (evt) {});

    _defineProperty(_assertThisInitialized(_this), "_onPointerMove", function (evt) {});

    return _this;
  }

  _createClass(BaseControl, [{
    key: "_render",
    value: function _render() {
      throw new Error('_render() not implemented');
    }
  }, {
    key: "render",
    value: function render() {
      return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement(Control, _extends({
        instance: this
      }, this.props, {
        onScroll: this._onScroll,
        onDragStart: this._onDragStart,
        onDblClick: this._onDblClick,
        onClick: this._onClick,
        onPointerMove: this._onPointerMove
      }));
    }
  }]);

  return BaseControl;
}(external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.PureComponent);

_defineProperty(BaseControl, "propTypes", mapControlPropTypes);

_defineProperty(BaseControl, "defaultProps", mapControlDefaultProps);


//# sourceMappingURL=base-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/draggable-control.js



function draggable_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function draggable_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { draggable_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { draggable_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }




var draggableControlPropTypes = Object.assign({}, mapControlPropTypes, {
  draggable: prop_types.bool,
  onDrag: prop_types.func,
  onDragEnd: prop_types.func,
  onDragStart: prop_types.func,
  offsetLeft: prop_types.number,
  offsetTop: prop_types.number
});
var draggableControlDefaultProps = Object.assign({}, mapControlDefaultProps, {
  draggable: false,
  offsetLeft: 0,
  offsetTop: 0
});

function getDragEventPosition(event) {
  var _event$offsetCenter = event.offsetCenter,
      x = _event$offsetCenter.x,
      y = _event$offsetCenter.y;
  return [x, y];
}

function getDragEventOffset(event, container) {
  var _event$center = event.center,
      x = _event$center.x,
      y = _event$center.y;

  if (container) {
    var rect = container.getBoundingClientRect();
    return [rect.left - x, rect.top - y];
  }

  return null;
}

function getDragLngLat(dragPos, dragOffset, props, context) {
  var x = dragPos[0] + dragOffset[0] - props.offsetLeft;
  var y = dragPos[1] + dragOffset[1] - props.offsetTop;
  return context.viewport.unproject([x, y]);
}

function onDragStart(event, _ref) {
  var props = _ref.props,
      callbacks = _ref.callbacks,
      state = _ref.state,
      context = _ref.context,
      containerRef = _ref.containerRef;
  var draggable = props.draggable;

  if (!draggable) {
    return;
  }

  event.stopPropagation();
  var dragPos = getDragEventPosition(event);
  var dragOffset = getDragEventOffset(event, containerRef.current);
  state.setDragPos(dragPos);
  state.setDragOffset(dragOffset);

  if (callbacks.onDragStart && dragOffset) {
    var callbackEvent = Object.assign({}, event);
    callbackEvent.lngLat = getDragLngLat(dragPos, dragOffset, props, context);
    callbacks.onDragStart(callbackEvent);
  }
}

function onDrag(event, _ref2) {
  var props = _ref2.props,
      callbacks = _ref2.callbacks,
      state = _ref2.state,
      context = _ref2.context;
  event.stopPropagation();
  var dragPos = getDragEventPosition(event);
  state.setDragPos(dragPos);
  var dragOffset = state.dragOffset;

  if (callbacks.onDrag && dragOffset) {
    var callbackEvent = Object.assign({}, event);
    callbackEvent.lngLat = getDragLngLat(dragPos, dragOffset, props, context);
    callbacks.onDrag(callbackEvent);
  }
}

function onDragEnd(event, _ref3) {
  var props = _ref3.props,
      callbacks = _ref3.callbacks,
      state = _ref3.state,
      context = _ref3.context;
  event.stopPropagation();
  var dragPos = state.dragPos,
      dragOffset = state.dragOffset;
  state.setDragPos(null);
  state.setDragOffset(null);

  if (callbacks.onDragEnd && dragPos && dragOffset) {
    var callbackEvent = Object.assign({}, event);
    callbackEvent.lngLat = getDragLngLat(dragPos, dragOffset, props, context);
    callbacks.onDragEnd(callbackEvent);
  }
}

function onDragCancel(event, _ref4) {
  var state = _ref4.state;
  event.stopPropagation();
  state.setDragPos(null);
  state.setDragOffset(null);
}

function registerEvents(thisRef) {
  var eventManager = thisRef.context.eventManager;

  if (!eventManager || !thisRef.state.dragPos) {
    return undefined;
  }

  var events = {
    panmove: function panmove(evt) {
      return onDrag(evt, thisRef);
    },
    panend: function panend(evt) {
      return onDragEnd(evt, thisRef);
    },
    pancancel: function pancancel(evt) {
      return onDragCancel(evt, thisRef);
    }
  };
  eventManager.watch(events);
  return function () {
    eventManager.off(events);
  };
}

function useDraggableControl(props) {
  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      dragPos = _useState2[0],
      setDragPos = _useState2[1];

  var _useState3 = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState4 = _slicedToArray(_useState3, 2),
      dragOffset = _useState4[0],
      setDragOffset = _useState4[1];

  var thisRef = useMapControl(draggable_control_objectSpread(draggable_control_objectSpread({}, props), {}, {
    onDragStart: onDragStart
  }));
  thisRef.callbacks = props;
  thisRef.state.dragPos = dragPos;
  thisRef.state.setDragPos = setDragPos;
  thisRef.state.dragOffset = dragOffset;
  thisRef.state.setDragOffset = setDragOffset;
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    return registerEvents(thisRef);
  }, [thisRef.context.eventManager, Boolean(dragPos)]);
  return thisRef;
}
//# sourceMappingURL=draggable-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/crisp-pixel.js
var pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio || 1;
var crispPixel = function crispPixel(size) {
  return Math.round(size * pixelRatio) / pixelRatio;
};
var crispPercentage = function crispPercentage(el, percentage) {
  var dimension = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'x';

  if (el === null) {
    return percentage;
  }

  var origSize = dimension === 'x' ? el.offsetWidth : el.offsetHeight;
  return crispPixel(percentage / 100 * origSize) / origSize * 100;
};
//# sourceMappingURL=crisp-pixel.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/marker.js



function marker_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function marker_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { marker_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { marker_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }






var marker_propTypes = Object.assign({}, draggableControlPropTypes, {
  className: prop_types.string,
  longitude: prop_types.number.isRequired,
  latitude: prop_types.number.isRequired,
  style: prop_types.object
});
var marker_defaultProps = Object.assign({}, draggableControlDefaultProps, {
  className: ''
});

function getPosition(_ref) {
  var props = _ref.props,
      state = _ref.state,
      context = _ref.context;
  var longitude = props.longitude,
      latitude = props.latitude,
      offsetLeft = props.offsetLeft,
      offsetTop = props.offsetTop;
  var dragPos = state.dragPos,
      dragOffset = state.dragOffset;

  if (dragPos && dragOffset) {
    return [dragPos[0] + dragOffset[0], dragPos[1] + dragOffset[1]];
  }

  var _context$viewport$pro = context.viewport.project([longitude, latitude]),
      _context$viewport$pro2 = _slicedToArray(_context$viewport$pro, 2),
      x = _context$viewport$pro2[0],
      y = _context$viewport$pro2[1];

  x += offsetLeft;
  y += offsetTop;
  return [x, y];
}

function Marker(props) {
  var thisRef = useDraggableControl(props);
  var state = thisRef.state,
      containerRef = thisRef.containerRef;
  var children = props.children,
      className = props.className,
      draggable = props.draggable,
      style = props.style;
  var dragPos = state.dragPos;

  var _getPosition = getPosition(thisRef),
      _getPosition2 = _slicedToArray(_getPosition, 2),
      x = _getPosition2[0],
      y = _getPosition2[1];

  var transform = "translate(".concat(crispPixel(x), "px, ").concat(crispPixel(y), "px)");
  var cursor = draggable ? dragPos ? 'grabbing' : 'grab' : 'auto';
  var control = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    var containerStyle = marker_objectSpread({
      position: 'absolute',
      left: 0,
      top: 0,
      transform: transform,
      cursor: cursor
    }, style);

    return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
      className: "mapboxgl-marker ".concat(className),
      ref: thisRef.containerRef,
      style: containerStyle
    }, children);
  }, [children, className]);
  var container = containerRef.current;

  if (container) {
    container.style.transform = transform;
    container.style.cursor = cursor;
  }

  return control;
}

Marker.defaultProps = marker_defaultProps;
Marker.propTypes = marker_propTypes;
/* harmony default export */ const marker = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(Marker));
//# sourceMappingURL=marker.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/dynamic-position.js
var ANCHOR_POSITION = {
  top: {
    x: 0.5,
    y: 0
  },
  'top-left': {
    x: 0,
    y: 0
  },
  'top-right': {
    x: 1,
    y: 0
  },
  bottom: {
    x: 0.5,
    y: 1
  },
  'bottom-left': {
    x: 0,
    y: 1
  },
  'bottom-right': {
    x: 1,
    y: 1
  },
  left: {
    x: 0,
    y: 0.5
  },
  right: {
    x: 1,
    y: 0.5
  }
};
var ANCHOR_TYPES = Object.keys(ANCHOR_POSITION);
function getDynamicPosition(_ref) {
  var x = _ref.x,
      y = _ref.y,
      width = _ref.width,
      height = _ref.height,
      selfWidth = _ref.selfWidth,
      selfHeight = _ref.selfHeight,
      anchor = _ref.anchor,
      _ref$padding = _ref.padding,
      padding = _ref$padding === void 0 ? 0 : _ref$padding;
  var _ANCHOR_POSITION$anch = ANCHOR_POSITION[anchor],
      anchorX = _ANCHOR_POSITION$anch.x,
      anchorY = _ANCHOR_POSITION$anch.y;
  var top = y - anchorY * selfHeight;
  var bottom = top + selfHeight;
  var cutoffY = Math.max(0, padding - top) + Math.max(0, bottom - height + padding);

  if (cutoffY > 0) {
    var bestAnchorY = anchorY;
    var minCutoff = cutoffY;

    for (anchorY = 0; anchorY <= 1; anchorY += 0.5) {
      top = y - anchorY * selfHeight;
      bottom = top + selfHeight;
      cutoffY = Math.max(0, padding - top) + Math.max(0, bottom - height + padding);

      if (cutoffY < minCutoff) {
        minCutoff = cutoffY;
        bestAnchorY = anchorY;
      }
    }

    anchorY = bestAnchorY;
  }

  var xStep = 0.5;

  if (anchorY === 0.5) {
    anchorX = Math.floor(anchorX);
    xStep = 1;
  }

  var left = x - anchorX * selfWidth;
  var right = left + selfWidth;
  var cutoffX = Math.max(0, padding - left) + Math.max(0, right - width + padding);

  if (cutoffX > 0) {
    var bestAnchorX = anchorX;
    var _minCutoff = cutoffX;

    for (anchorX = 0; anchorX <= 1; anchorX += xStep) {
      left = x - anchorX * selfWidth;
      right = left + selfWidth;
      cutoffX = Math.max(0, padding - left) + Math.max(0, right - width + padding);

      if (cutoffX < _minCutoff) {
        _minCutoff = cutoffX;
        bestAnchorX = anchorX;
      }
    }

    anchorX = bestAnchorX;
  }

  return ANCHOR_TYPES.find(function (positionType) {
    var anchorPosition = ANCHOR_POSITION[positionType];
    return anchorPosition.x === anchorX && anchorPosition.y === anchorY;
  }) || anchor;
}
//# sourceMappingURL=dynamic-position.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/popup.js







var popup_propTypes = Object.assign({}, mapControlPropTypes, {
  className: prop_types.string,
  longitude: prop_types.number.isRequired,
  latitude: prop_types.number.isRequired,
  altitude: prop_types.number,
  offsetLeft: prop_types.number,
  offsetTop: prop_types.number,
  tipSize: prop_types.number,
  closeButton: prop_types.bool,
  closeOnClick: prop_types.bool,
  anchor: prop_types.oneOf(Object.keys(ANCHOR_POSITION)),
  dynamicPosition: prop_types.bool,
  sortByDepth: prop_types.bool,
  onClose: prop_types.func
});
var popup_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  altitude: 0,
  offsetLeft: 0,
  offsetTop: 0,
  tipSize: 10,
  anchor: 'bottom',
  dynamicPosition: true,
  sortByDepth: false,
  closeButton: true,
  closeOnClick: true,
  onClose: function onClose() {}
});

function popup_getPosition(props, viewport, el, _ref) {
  var _ref2 = _slicedToArray(_ref, 2),
      x = _ref2[0],
      y = _ref2[1];

  var anchor = props.anchor,
      dynamicPosition = props.dynamicPosition,
      tipSize = props.tipSize;

  if (el) {
    return dynamicPosition ? getDynamicPosition({
      x: x,
      y: y,
      anchor: anchor,
      padding: tipSize,
      width: viewport.width,
      height: viewport.height,
      selfWidth: el.clientWidth,
      selfHeight: el.clientHeight
    }) : anchor;
  }

  return anchor;
}

function getContainerStyle(props, viewport, el, _ref3, positionType) {
  var _ref4 = _slicedToArray(_ref3, 3),
      x = _ref4[0],
      y = _ref4[1],
      z = _ref4[2];

  var offsetLeft = props.offsetLeft,
      offsetTop = props.offsetTop,
      sortByDepth = props.sortByDepth;
  var anchorPosition = ANCHOR_POSITION[positionType];
  var left = x + offsetLeft;
  var top = y + offsetTop;
  var xPercentage = crispPercentage(el, -anchorPosition.x * 100);
  var yPercentage = crispPercentage(el, -anchorPosition.y * 100, 'y');
  var style = {
    position: 'absolute',
    transform: "\n      translate(".concat(xPercentage, "%, ").concat(yPercentage, "%)\n      translate(").concat(crispPixel(left), "px, ").concat(crispPixel(top), "px)\n    "),
    display: undefined,
    zIndex: undefined
  };

  if (!sortByDepth) {
    return style;
  }

  if (z > 1 || z < -1 || x < 0 || x > viewport.width || y < 0 || y > viewport.height) {
    style.display = 'none';
  } else {
    style.zIndex = Math.floor((1 - z) / 2 * 100000);
  }

  return style;
}

function Popup(props) {
  var contentRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);
  var thisRef = useMapControl(props);
  var context = thisRef.context,
      containerRef = thisRef.containerRef;

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(false),
      _useState2 = _slicedToArray(_useState, 2),
      setLoaded = _useState2[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    setLoaded(true);
  }, [contentRef.current]);
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (context.eventManager && props.closeOnClick) {
      var clickCallback = function clickCallback() {
        return thisRef.props.onClose();
      };

      context.eventManager.on('anyclick', clickCallback);
      return function () {
        context.eventManager.off('anyclick', clickCallback);
      };
    }

    return undefined;
  }, [context.eventManager, props.closeOnClick]);
  var viewport = context.viewport;
  var className = props.className,
      longitude = props.longitude,
      latitude = props.latitude,
      altitude = props.altitude,
      tipSize = props.tipSize,
      closeButton = props.closeButton,
      children = props.children;
  var position = viewport.project([longitude, latitude, altitude]);
  var positionType = popup_getPosition(props, viewport, contentRef.current, position);
  var containerStyle = getContainerStyle(props, viewport, containerRef.current, position, positionType);
  var onClickCloseButton = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useCallback)(function (evt) {
    thisRef.props.onClose();
    var eventManager = thisRef.context.eventManager;

    if (eventManager) {
      eventManager.once('click', function (e) {
        return e.stopPropagation();
      }, evt.target);
    }
  }, []);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    className: "mapboxgl-popup mapboxgl-popup-anchor-".concat(positionType, " ").concat(className),
    style: containerStyle,
    ref: containerRef
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "tip",
    className: "mapboxgl-popup-tip",
    style: {
      borderWidth: tipSize
    }
  }), external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "content",
    ref: contentRef,
    className: "mapboxgl-popup-content"
  }, closeButton && external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("button", {
    key: "close-button",
    className: "mapboxgl-popup-close-button",
    type: "button",
    onClick: onClickCloseButton
  }, "\xD7"), children));
}

Popup.propTypes = popup_propTypes;
Popup.defaultProps = popup_defaultProps;
/* harmony default export */ const popup = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(Popup));
//# sourceMappingURL=popup.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/attribution-control.js



function attribution_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function attribution_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { attribution_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { attribution_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }






var attribution_control_propTypes = Object.assign({}, mapControlPropTypes, {
  toggleLabel: prop_types.string,
  className: prop_types.string,
  style: prop_types.object,
  compact: prop_types.bool,
  customAttribution: prop_types.oneOfType([prop_types.string, prop_types.arrayOf(prop_types.string)])
});
var attribution_control_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  toggleLabel: 'Toggle Attribution'
});

function setupAttributioncontrol(opts, map, container, attributionContainer) {
  var control = new mapboxgl.AttributionControl(opts);
  control._map = map;
  control._container = container;
  control._innerContainer = attributionContainer;

  control._updateAttributions();

  control._updateEditLink();

  map.on('styledata', control._updateData);
  map.on('sourcedata', control._updateData);
  return control;
}

function removeAttributionControl(control) {
  control._map.off('styledata', control._updateData);

  control._map.off('sourcedata', control._updateData);
}

function AttributionControl(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var innerContainerRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(false),
      _useState2 = _slicedToArray(_useState, 2),
      showCompact = _useState2[0],
      setShowCompact = _useState2[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    var control;

    if (context.map) {
      control = setupAttributioncontrol({
        customAttribution: props.customAttribution
      }, context.map, containerRef.current, innerContainerRef.current);
    }

    return function () {
      return control && removeAttributionControl(control);
    };
  }, [context.map]);
  var compact = props.compact === undefined ? context.viewport.width <= 640 : props.compact;
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (!compact && showCompact) {
      setShowCompact(false);
    }
  }, [compact]);
  var toggleAttribution = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useCallback)(function () {
    return setShowCompact(function (value) {
      return !value;
    });
  }, []);
  var style = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return attribution_control_objectSpread({
      position: 'absolute'
    }, props.style);
  }, [props.style]);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    style: style,
    className: props.className
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    ref: containerRef,
    "aria-pressed": showCompact,
    className: "mapboxgl-ctrl mapboxgl-ctrl-attrib ".concat(compact ? 'mapboxgl-compact' : '', " ").concat(showCompact ? 'mapboxgl-compact-show' : '')
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("button", {
    type: "button",
    className: "mapboxgl-ctrl-attrib-button",
    title: props.toggleLabel,
    onClick: toggleAttribution
  }), external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    ref: innerContainerRef,
    className: "mapboxgl-ctrl-attrib-inner",
    role: "list"
  })));
}

AttributionControl.propTypes = attribution_control_propTypes;
AttributionControl.defaultProps = attribution_control_defaultProps;
/* harmony default export */ const attribution_control = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(AttributionControl));
//# sourceMappingURL=attribution-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/fullscreen-control.js



function fullscreen_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function fullscreen_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { fullscreen_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { fullscreen_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }







var fullscreen_control_propTypes = Object.assign({}, mapControlPropTypes, {
  className: prop_types.string,
  style: prop_types.object,
  container: prop_types.object,
  label: prop_types.string
});
var fullscreen_control_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  container: null,
  label: 'Toggle fullscreen'
});

function FullscreenControl(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(false),
      _useState2 = _slicedToArray(_useState, 2),
      isFullscreen = _useState2[0],
      setIsFullscreen = _useState2[1];

  var _useState3 = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(false),
      _useState4 = _slicedToArray(_useState3, 2),
      showButton = _useState4[0],
      setShowButton = _useState4[1];

  var _useState5 = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState6 = _slicedToArray(_useState5, 2),
      mapboxFullscreenControl = _useState6[0],
      createMapboxFullscreenControl = _useState6[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    var control = new mapboxgl.FullscreenControl();
    createMapboxFullscreenControl(control);
    setShowButton(control._checkFullscreenSupport());

    var onFullscreenChange = function onFullscreenChange() {
      var nextState = !control._fullscreen;
      control._fullscreen = nextState;
      setIsFullscreen(nextState);
    };

    document_.addEventListener(control._fullscreenchange, onFullscreenChange);
    return function () {
      document_.removeEventListener(control._fullscreenchange, onFullscreenChange);
    };
  }, []);

  var onClickFullscreen = function onClickFullscreen() {
    if (mapboxFullscreenControl) {
      mapboxFullscreenControl._container = props.container || context.container;

      mapboxFullscreenControl._onClickFullscreen();
    }
  };

  var style = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return fullscreen_control_objectSpread({
      position: 'absolute'
    }, props.style);
  }, [props.style]);

  if (!showButton) {
    return null;
  }

  var className = props.className,
      label = props.label;
  var type = isFullscreen ? 'shrink' : 'fullscreen';
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    style: style,
    className: className
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    className: "mapboxgl-ctrl mapboxgl-ctrl-group",
    ref: containerRef
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("button", {
    key: type,
    className: "mapboxgl-ctrl-icon mapboxgl-ctrl-".concat(type),
    type: "button",
    title: label,
    onClick: onClickFullscreen
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("span", {
    className: "mapboxgl-ctrl-icon",
    "aria-hidden": "true"
  }))));
}

FullscreenControl.propTypes = fullscreen_control_propTypes;
FullscreenControl.defaultProps = fullscreen_control_defaultProps;
/* harmony default export */ const fullscreen_control = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(FullscreenControl));
//# sourceMappingURL=fullscreen-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/geolocate-utils.js
var supported;
function isGeolocationSupported() {
  if (supported !== undefined) {
    return Promise.resolve(supported);
  }

  if (window.navigator.permissions !== undefined) {
    return window.navigator.permissions.query({
      name: 'geolocation'
    }).then(function (p) {
      supported = p.state !== 'denied';
      return supported;
    });
  }

  supported = Boolean(window.navigator.geolocation);
  return Promise.resolve(supported);
}
//# sourceMappingURL=geolocate-utils.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/geolocate-control.js



function geolocate_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function geolocate_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { geolocate_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { geolocate_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }











var geolocate_control_noop = function noop() {};

var geolocate_control_propTypes = Object.assign({}, mapControlPropTypes, {
  className: prop_types.string,
  style: prop_types.object,
  label: prop_types.string,
  disabledLabel: prop_types.string,
  auto: prop_types.bool,
  positionOptions: prop_types.object,
  fitBoundsOptions: prop_types.object,
  trackUserLocation: prop_types.bool,
  showUserLocation: prop_types.bool,
  showAccuracyCircle: prop_types.bool,
  showUserHeading: prop_types.bool,
  onViewStateChange: prop_types.func,
  onViewportChange: prop_types.func,
  onGeolocate: prop_types.func
});
var geolocate_control_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  label: 'Find My Location',
  disabledLabel: 'Location Not Available',
  auto: false,
  positionOptions: {
    enableHighAccuracy: false,
    timeout: 6000
  },
  fitBoundsOptions: {
    maxZoom: 15
  },
  trackUserLocation: false,
  showUserLocation: true,
  showUserHeading: false,
  showAccuracyCircle: true,
  onGeolocate: function onGeolocate() {}
});

function geolocate_control_getBounds(position) {
  var center = new mapboxgl.LngLat(position.coords.longitude, position.coords.latitude);
  var radius = position.coords.accuracy;
  var bounds = center.toBounds(radius);
  return [[bounds._ne.lng, bounds._ne.lat], [bounds._sw.lng, bounds._sw.lat]];
}

function setupMapboxGeolocateControl(context, props, geolocateButton) {
  var control = new mapboxgl.GeolocateControl(props);
  control._container = document_.createElement('div');
  control._map = {
    on: function on() {},
    _getUIString: function _getUIString() {
      return '';
    }
  };

  control._setupUI(true);

  control._map = context.map;
  control._geolocateButton = geolocateButton;
  var eventManager = context.eventManager;

  if (control.options.trackUserLocation && eventManager) {
    eventManager.on('panstart', function () {
      if (control._watchState === 'ACTIVE_LOCK') {
        control._watchState = 'BACKGROUND';
        geolocateButton.classList.add('mapboxgl-ctrl-geolocate-background');
        geolocateButton.classList.remove('mapboxgl-ctrl-geolocate-active');
      }
    });
  }

  control.on('geolocate', props.onGeolocate);
  return control;
}

function updateCamera(position, _ref) {
  var context = _ref.context,
      props = _ref.props;
  var bounds = geolocate_control_getBounds(position);

  var _context$viewport$fit = context.viewport.fitBounds(bounds, props.fitBoundsOptions),
      longitude = _context$viewport$fit.longitude,
      latitude = _context$viewport$fit.latitude,
      zoom = _context$viewport$fit.zoom;

  var newViewState = Object.assign({}, context.viewport, {
    longitude: longitude,
    latitude: latitude,
    zoom: zoom
  });
  var mapState = new MapState(newViewState);
  var viewState = Object.assign({}, mapState.getViewportProps(), LINEAR_TRANSITION_PROPS);
  var onViewportChange = props.onViewportChange || context.onViewportChange || geolocate_control_noop;
  var onViewStateChange = props.onViewStateChange || context.onViewStateChange || geolocate_control_noop;
  onViewStateChange({
    viewState: viewState
  });
  onViewportChange(viewState);
}

function GeolocateControl(props) {
  var thisRef = useMapControl(props);
  var context = thisRef.context,
      containerRef = thisRef.containerRef;
  var geolocateButtonRef = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)(null);

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      mapboxGeolocateControl = _useState2[0],
      createMapboxGeolocateControl = _useState2[1];

  var _useState3 = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(false),
      _useState4 = _slicedToArray(_useState3, 2),
      supportsGeolocation = _useState4[0],
      setSupportsGeolocation = _useState4[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    var control;

    if (context.map) {
      isGeolocationSupported().then(function (result) {
        setSupportsGeolocation(result);

        if (geolocateButtonRef.current) {
          control = setupMapboxGeolocateControl(context, props, geolocateButtonRef.current);

          control._updateCamera = function (position) {
            return updateCamera(position, thisRef);
          };

          createMapboxGeolocateControl(control);
        }
      });
    }

    return function () {
      if (control) {
        control._clearWatch();
      }
    };
  }, [context.map]);
  var triggerGeolocate = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useCallback)(function () {
    if (mapboxGeolocateControl) {
      mapboxGeolocateControl.options = thisRef.props;
      mapboxGeolocateControl.trigger();
    }
  }, [mapboxGeolocateControl]);
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (props.auto) {
      triggerGeolocate();
    }
  }, [mapboxGeolocateControl, props.auto]);
  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (mapboxGeolocateControl) {
      mapboxGeolocateControl._onZoom();
    }
  }, [context.viewport.zoom]);
  var className = props.className,
      label = props.label,
      disabledLabel = props.disabledLabel,
      trackUserLocation = props.trackUserLocation;
  var style = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return geolocate_control_objectSpread({
      position: 'absolute'
    }, props.style);
  }, [props.style]);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    style: style,
    className: className
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    key: "geolocate-control",
    className: "mapboxgl-ctrl mapboxgl-ctrl-group",
    ref: containerRef
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("button", {
    key: "geolocate",
    className: "mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate",
    ref: geolocateButtonRef,
    disabled: !supportsGeolocation,
    "aria-pressed": !trackUserLocation,
    type: "button",
    title: supportsGeolocation ? label : disabledLabel,
    "aria-label": supportsGeolocation ? label : disabledLabel,
    onClick: triggerGeolocate
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("span", {
    className: "mapboxgl-ctrl-icon",
    "aria-hidden": "true"
  }))));
}

GeolocateControl.propTypes = geolocate_control_propTypes;
GeolocateControl.defaultProps = geolocate_control_defaultProps;
/* harmony default export */ const geolocate_control = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(GeolocateControl));
//# sourceMappingURL=geolocate-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/version.js
function compareVersions(version1, version2) {
  var v1 = (version1 || '').split('.').map(Number);
  var v2 = (version2 || '').split('.').map(Number);

  for (var i = 0; i < 3; i++) {
    var part1 = v1[i] || 0;
    var part2 = v2[i] || 0;

    if (part1 < part2) {
      return -1;
    }

    if (part1 > part2) {
      return 1;
    }
  }

  return 0;
}
//# sourceMappingURL=version.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/navigation-control.js


function navigation_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function navigation_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { navigation_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { navigation_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }









var navigation_control_noop = function noop() {};

var navigation_control_propTypes = Object.assign({}, mapControlPropTypes, {
  className: prop_types.string,
  style: prop_types.object,
  onViewStateChange: prop_types.func,
  onViewportChange: prop_types.func,
  showCompass: prop_types.bool,
  showZoom: prop_types.bool,
  zoomInLabel: prop_types.string,
  zoomOutLabel: prop_types.string,
  compassLabel: prop_types.string
});
var navigation_control_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  showCompass: true,
  showZoom: true,
  zoomInLabel: 'Zoom In',
  zoomOutLabel: 'Zoom Out',
  compassLabel: 'Reset North'
});
var VERSION_LEGACY = 1;
var VERSION_1_6 = 2;

function getUIVersion(mapboxVersion) {
  return compareVersions(mapboxVersion, '1.6.0') >= 0 ? VERSION_1_6 : VERSION_LEGACY;
}

function updateViewport(context, props, opts) {
  var viewport = context.viewport;
  var mapState = new MapState(Object.assign({}, viewport, opts));
  var viewState = Object.assign({}, mapState.getViewportProps(), LINEAR_TRANSITION_PROPS);
  var onViewportChange = props.onViewportChange || context.onViewportChange || navigation_control_noop;
  var onViewStateChange = props.onViewStateChange || context.onViewStateChange || navigation_control_noop;
  onViewStateChange({
    viewState: viewState
  });
  onViewportChange(viewState);
}

function renderButton(type, label, callback, children) {
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("button", {
    key: type,
    className: "mapboxgl-ctrl-icon mapboxgl-ctrl-".concat(type),
    type: "button",
    title: label,
    onClick: callback
  }, children || external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("span", {
    className: "mapboxgl-ctrl-icon",
    "aria-hidden": "true"
  }));
}

function renderCompass(context) {
  var uiVersion = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return context.map ? getUIVersion(context.map.version) : VERSION_1_6;
  }, [context.map]);
  var bearing = context.viewport.bearing;
  var style = {
    transform: "rotate(".concat(-bearing, "deg)")
  };
  return uiVersion === VERSION_1_6 ? external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("span", {
    className: "mapboxgl-ctrl-icon",
    "aria-hidden": "true",
    style: style
  }) : external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("span", {
    className: "mapboxgl-ctrl-compass-arrow",
    style: style
  });
}

function NavigationControl(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var onZoomIn = function onZoomIn() {
    updateViewport(context, props, {
      zoom: context.viewport.zoom + 1
    });
  };

  var onZoomOut = function onZoomOut() {
    updateViewport(context, props, {
      zoom: context.viewport.zoom - 1
    });
  };

  var onResetNorth = function onResetNorth() {
    updateViewport(context, props, {
      bearing: 0,
      pitch: 0
    });
  };

  var className = props.className,
      showCompass = props.showCompass,
      showZoom = props.showZoom,
      zoomInLabel = props.zoomInLabel,
      zoomOutLabel = props.zoomOutLabel,
      compassLabel = props.compassLabel;
  var style = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return navigation_control_objectSpread({
      position: 'absolute'
    }, props.style);
  }, [props.style]);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    style: style,
    className: className
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    className: "mapboxgl-ctrl mapboxgl-ctrl-group",
    ref: containerRef
  }, showZoom && renderButton('zoom-in', zoomInLabel, onZoomIn), showZoom && renderButton('zoom-out', zoomOutLabel, onZoomOut), showCompass && renderButton('compass', compassLabel, onResetNorth, renderCompass(context))));
}

NavigationControl.propTypes = navigation_control_propTypes;
NavigationControl.defaultProps = navigation_control_defaultProps;
/* harmony default export */ const navigation_control = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(NavigationControl));
//# sourceMappingURL=navigation-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/components/scale-control.js



function scale_control_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function scale_control_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { scale_control_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { scale_control_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }






var scale_control_propTypes = Object.assign({}, mapControlPropTypes, {
  className: prop_types.string,
  style: prop_types.object,
  maxWidth: prop_types.number,
  unit: prop_types.oneOf(['imperial', 'metric', 'nautical'])
});
var scale_control_defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  maxWidth: 100,
  unit: 'metric'
});

function ScaleControl(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      mapboxScaleControl = _useState2[0],
      createMapboxScaleControl = _useState2[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    if (context.map) {
      var control = new mapboxgl.ScaleControl();
      control._map = context.map;
      control._container = containerRef.current;
      createMapboxScaleControl(control);
    }
  }, [context.map]);

  if (mapboxScaleControl) {
    mapboxScaleControl.options = props;

    mapboxScaleControl._onMove();
  }

  var style = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useMemo)(function () {
    return scale_control_objectSpread({
      position: 'absolute'
    }, props.style);
  }, [props.style]);
  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    style: style,
    className: props.className
  }, external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    ref: containerRef,
    className: "mapboxgl-ctrl mapboxgl-ctrl-scale"
  }));
}

ScaleControl.propTypes = scale_control_propTypes;
ScaleControl.defaultProps = scale_control_defaultProps;
/* harmony default export */ const scale_control = (external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.memo(ScaleControl));
//# sourceMappingURL=scale-control.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/overlays/canvas-overlay.js





var canvas_overlay_pixelRatio = typeof window !== 'undefined' && window.devicePixelRatio || 1;
var canvas_overlay_propTypes = Object.assign({}, mapControlPropTypes, {
  redraw: prop_types.func.isRequired
});
var canvas_overlay_defaultProps = {
  captureScroll: false,
  captureDrag: false,
  captureClick: false,
  captureDoubleClick: false,
  capturePointerMove: false
};

function CanvasOverlay(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var _useState = (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      ctx = _useState2[0],
      setDrawingContext = _useState2[1];

  (0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(function () {
    setDrawingContext(containerRef.current.getContext('2d'));
  }, []);
  var viewport = context.viewport,
      isDragging = context.isDragging;

  if (ctx) {
    ctx.save();
    ctx.scale(canvas_overlay_pixelRatio, canvas_overlay_pixelRatio);
    props.redraw({
      width: viewport.width,
      height: viewport.height,
      ctx: ctx,
      isDragging: isDragging,
      project: viewport.project,
      unproject: viewport.unproject
    });
    ctx.restore();
  }

  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("canvas", {
    ref: containerRef,
    width: viewport.width * canvas_overlay_pixelRatio,
    height: viewport.height * canvas_overlay_pixelRatio,
    style: {
      width: "".concat(viewport.width, "px"),
      height: "".concat(viewport.height, "px"),
      position: 'absolute',
      left: 0,
      top: 0
    }
  });
}

CanvasOverlay.propTypes = canvas_overlay_propTypes;
CanvasOverlay.defaultProps = canvas_overlay_defaultProps;
/* harmony default export */ const canvas_overlay = ((/* unused pure expression or super */ null && (CanvasOverlay)));
//# sourceMappingURL=canvas-overlay.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/overlays/html-overlay.js


function html_overlay_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function html_overlay_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { html_overlay_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { html_overlay_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }




var html_overlay_propTypes = Object.assign({}, mapControlPropTypes, {
  redraw: prop_types.func.isRequired,
  style: prop_types.object
});
var html_overlay_defaultProps = {
  captureScroll: false,
  captureDrag: false,
  captureClick: false,
  captureDoubleClick: false,
  capturePointerMove: false
};

function HTMLOverlay(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var viewport = context.viewport,
      isDragging = context.isDragging;

  var style = html_overlay_objectSpread({
    position: 'absolute',
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height
  }, props.style);

  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("div", {
    ref: containerRef,
    style: style
  }, props.redraw({
    width: viewport.width,
    height: viewport.height,
    isDragging: isDragging,
    project: viewport.project,
    unproject: viewport.unproject
  }));
}

HTMLOverlay.propTypes = html_overlay_propTypes;
HTMLOverlay.defaultProps = html_overlay_defaultProps;
/* harmony default export */ const html_overlay = ((/* unused pure expression or super */ null && (HTMLOverlay)));
//# sourceMappingURL=html-overlay.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/overlays/svg-overlay.js


function svg_overlay_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function svg_overlay_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { svg_overlay_ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { svg_overlay_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }




var svg_overlay_propTypes = Object.assign({}, mapControlPropTypes, {
  redraw: prop_types.func.isRequired,
  style: prop_types.object
});
var svg_overlay_defaultProps = {
  captureScroll: false,
  captureDrag: false,
  captureClick: false,
  captureDoubleClick: false,
  capturePointerMove: false
};

function SVGOverlay(props) {
  var _useMapControl = useMapControl(props),
      context = _useMapControl.context,
      containerRef = _useMapControl.containerRef;

  var viewport = context.viewport,
      isDragging = context.isDragging;

  var style = svg_overlay_objectSpread({
    position: 'absolute',
    left: 0,
    top: 0
  }, props.style);

  return external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.createElement("svg", {
    width: viewport.width,
    height: viewport.height,
    ref: containerRef,
    style: style
  }, props.redraw({
    width: viewport.width,
    height: viewport.height,
    isDragging: isDragging,
    project: viewport.project,
    unproject: viewport.unproject
  }));
}

SVGOverlay.propTypes = svg_overlay_propTypes;
SVGOverlay.defaultProps = svg_overlay_defaultProps;
/* harmony default export */ const svg_overlay = ((/* unused pure expression or super */ null && (SVGOverlay)));
//# sourceMappingURL=svg-overlay.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/utils/set-rtl-text-plugin.js

var setRTLTextPlugin = mapboxgl ? mapboxgl.setRTLTextPlugin : function () {};
/* harmony default export */ const set_rtl_text_plugin = ((/* unused pure expression or super */ null && (setRTLTextPlugin)));
//# sourceMappingURL=set-rtl-text-plugin.js.map
;// CONCATENATED MODULE: ./node_modules/react-map-gl/dist/esm/index.js
























//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./src/static/run_countries.js
const chinaGeojson={type:'FeatureCollection',features:[{type:'Feature',properties:{id:'65',size:'550',name:'新疆维吾尔自治区',cp:[84.9023,42.148],childNum:18},geometry:{type:'Polygon',coordinates:[[[96.416,42.7588],[96.416,42.7148],[95.9766,42.4951],[96.0645,42.3193],[96.2402,42.2314],[95.9766,41.9238],[95.2734,41.6162],[95.1855,41.792],[94.5703,41.4844],[94.043,41.0889],[93.8672,40.6934],[93.0762,40.6494],[92.6367,39.6387],[92.373,39.3311],[92.373,39.1113],[92.373,39.0234],[90.1758,38.4961],[90.3516,38.2324],[90.6152,38.3203],[90.5273,37.8369],[91.0547,37.4414],[91.3184,37.0898],[90.7031,36.7822],[90.791,36.6064],[91.0547,36.5186],[91.0547,36.0791],[90.8789,36.0352],[90,36.2549],[89.9121,36.0791],[89.7363,36.0791],[89.209,36.2988],[88.7695,36.3428],[88.5938,36.4746],[87.3633,36.4307],[86.2207,36.167],[86.1328,35.8594],[85.6055,35.6836],[85.0781,35.7275],[84.1992,35.376],[83.1445,35.4199],[82.8809,35.6836],[82.4414,35.7275],[82.002,35.332],[81.6504,35.2441],[80.4199,35.4199],[80.2441,35.2881],[80.332,35.1563],[80.2441,35.2002],[79.8926,34.8047],[79.8047,34.4971],[79.1016,34.4531],[79.0137,34.3213],[78.2227,34.7168],[78.0469,35.2441],[78.0469,35.5078],[77.4316,35.4639],[76.8164,35.6396],[76.5527,35.8594],[76.2012,35.8154],[75.9375,36.0352],[76.0254,36.4746],[75.8496,36.6943],[75.498,36.7383],[75.4102,36.958],[75.0586,37.002],[74.8828,36.9141],[74.7949,37.0459],[74.5313,37.0898],[74.5313,37.2217],[74.8828,37.2217],[75.1465,37.4414],[74.8828,37.5732],[74.9707,37.749],[74.8828,38.4521],[74.3555,38.6719],[74.1797,38.6719],[74.0918,38.54],[73.8281,38.584],[73.7402,38.8477],[73.8281,38.9795],[73.4766,39.375],[73.916,39.5068],[73.916,39.6826],[73.8281,39.7705],[74.0039,40.0342],[74.8828,40.3418],[74.7949,40.5176],[75.2344,40.4297],[75.5859,40.6494],[75.7617,40.2979],[76.377,40.3857],[76.9043,41.001],[77.6074,41.001],[78.1348,41.2207],[78.1348,41.3965],[80.1563,42.0557],[80.2441,42.2754],[80.1563,42.627],[80.2441,42.8467],[80.5078,42.8906],[80.4199,43.0664],[80.7715,43.1982],[80.4199,44.165],[80.4199,44.6045],[79.9805,44.8242],[79.9805,44.9561],[81.7383,45.3955],[82.0898,45.2197],[82.5293,45.2197],[82.2656,45.6592],[83.0566,47.2412],[83.6719,47.0215],[84.7266,47.0215],[84.9023,46.8896],[85.5176,47.0654],[85.6934,47.2852],[85.5176,48.1201],[85.7813,48.4277],[86.5723,48.5596],[86.8359,48.8232],[86.748,48.9551],[86.8359,49.1309],[87.8027,49.1748],[87.8906,48.999],[87.7148,48.9111],[88.0664,48.7354],[87.9785,48.6035],[88.5059,48.3838],[88.6816,48.1641],[89.1211,47.9883],[89.5605,48.0322],[89.7363,47.8564],[90.0879,47.8564],[90.3516,47.6807],[90.5273,47.2412],[90.8789,46.9775],[91.0547,46.582],[90.8789,46.3184],[91.0547,46.0107],[90.7031,45.7471],[90.7031,45.5273],[90.8789,45.2197],[91.582,45.0879],[93.5156,44.9561],[94.7461,44.3408],[95.3613,44.2969],[95.3613,44.0332],[95.5371,43.9014],[95.8887,43.2422],[96.3281,42.9346],[96.416,42.7588]]]}},{type:'Feature',properties:{id:'54',size:'550',name:'西藏自治区',cp:[87.8695,31.6846],childNum:7},geometry:{type:'Polygon',coordinates:[[[79.0137,34.3213],[79.1016,34.4531],[79.8047,34.4971],[79.8926,34.8047],[80.2441,35.2002],[80.332,35.1563],[80.2441,35.2881],[80.4199,35.4199],[81.6504,35.2441],[82.002,35.332],[82.4414,35.7275],[82.8809,35.6836],[83.1445,35.4199],[84.1992,35.376],[85.0781,35.7275],[85.6055,35.6836],[86.1328,35.8594],[86.2207,36.167],[87.3633,36.4307],[88.5938,36.4746],[88.7695,36.3428],[89.209,36.2988],[89.7363,36.0791],[89.3848,36.0352],[89.4727,35.9033],[89.7363,35.7715],[89.7363,35.4199],[89.4727,35.376],[89.4727,35.2441],[89.5605,34.8926],[89.8242,34.8486],[89.7363,34.6729],[89.8242,34.3652],[89.6484,34.0137],[90.0879,33.4863],[90.7031,33.1348],[91.4063,33.1348],[91.9336,32.8271],[92.1973,32.8271],[92.2852,32.7393],[92.9883,32.7393],[93.5156,32.4756],[93.7793,32.5635],[94.1309,32.4316],[94.6582,32.6074],[95.1855,32.4316],[95.0098,32.2998],[95.1855,32.3438],[95.2734,32.2119],[95.3613,32.168],[95.3613,31.9922],[95.4492,31.8164],[95.8008,31.6846],[95.9766,31.8164],[96.1523,31.5967],[96.2402,31.9482],[96.5039,31.7285],[96.8555,31.6846],[96.7676,31.9922],[97.2949,32.0801],[97.3828,32.5635],[97.7344,32.5195],[98.1738,32.3438],[98.4375,31.8604],[98.877,31.4209],[98.6133,31.2012],[98.9648,30.7617],[99.1406,29.2676],[98.9648,29.1357],[98.9648,28.8281],[98.7891,28.8721],[98.7891,29.0039],[98.7012,28.916],[98.6133,28.5205],[98.7891,28.3447],[98.7012,28.2129],[98.3496,28.125],[98.2617,28.3887],[98.1738,28.125],[97.5586,28.5205],[97.2949,28.0811],[97.3828,27.9053],[97.0313,27.7295],[96.5039,28.125],[95.7129,28.2568],[95.3613,28.125],[95.2734,27.9492],[94.2188,27.5537],[93.8672,27.0264],[93.6035,26.9385],[92.1094,26.8506],[92.0215,27.4658],[91.582,27.5537],[91.582,27.9053],[91.4063,28.0371],[91.0547,27.8613],[90.7031,28.0811],[89.8242,28.2129],[89.6484,28.1689],[89.1211,27.5977],[89.1211,27.334],[89.0332,27.2021],[88.7695,27.4219],[88.8574,27.9932],[88.6816,28.125],[88.1543,27.9053],[87.8906,27.9492],[87.7148,27.8174],[87.0996,27.8174],[86.748,28.125],[86.5723,28.125],[86.4844,27.9053],[86.1328,28.125],[86.0449,27.9053],[85.6934,28.3447],[85.6055,28.2568],[85.166,28.3447],[85.166,28.6523],[84.9023,28.5645],[84.4629,28.7402],[84.2871,28.8721],[84.1992,29.2236],[84.1113,29.2676],[83.584,29.1797],[83.2324,29.5752],[82.1777,30.0586],[82.0898,30.3223],[81.3867,30.3662],[81.2109,30.0146],[81.0352,30.2344],[80.0684,30.5859],[79.7168,30.9375],[79.0137,31.0693],[78.75,31.333],[78.8379,31.5967],[78.6621,31.8164],[78.75,31.9043],[78.4863,32.124],[78.3984,32.5195],[78.75,32.6953],[78.9258,32.3438],[79.2773,32.5635],[79.1016,33.1787],[78.6621,33.6621],[78.6621,34.1016],[78.9258,34.1455],[79.0137,34.3213]]]}},{type:'Feature',properties:{id:'15',size:'450',name:'内蒙古自治区',cp:[112.5977,46.3408],childNum:12},geometry:{type:'Polygon',coordinates:[[[97.207,42.8027],[99.4922,42.583],[100.8105,42.6709],[101.7773,42.4951],[102.041,42.2314],[102.7441,42.1436],[103.3594,41.8799],[103.8867,41.792],[104.502,41.8799],[104.502,41.6602],[105.0293,41.5723],[105.7324,41.9238],[107.4023,42.4512],[109.4238,42.4512],[110.3906,42.7588],[111.0059,43.3301],[111.9727,43.6816],[111.9727,43.8135],[111.4453,44.3848],[111.7969,45],[111.9727,45.0879],[113.6426,44.7363],[114.1699,44.9561],[114.5215,45.3955],[115.6641,45.4395],[116.1914,45.7031],[116.2793,45.9668],[116.543,46.2744],[117.334,46.3623],[117.4219,46.582],[117.7734,46.5381],[118.3008,46.7578],[118.7402,46.7139],[118.916,46.7578],[119.0918,46.6699],[119.707,46.626],[119.9707,46.7139],[119.707,47.1973],[118.4766,47.9883],[117.8613,48.0322],[117.334,47.6807],[116.8066,47.9004],[116.1914,47.8564],[115.9277,47.6807],[115.5762,47.9004],[115.4883,48.1641],[115.8398,48.252],[115.8398,48.5596],[116.7188,49.834],[117.7734,49.5264],[118.5645,49.9219],[119.2676,50.0977],[119.3555,50.3174],[119.1797,50.3613],[119.5313,50.7568],[119.5313,50.8887],[119.707,51.0645],[120.1465,51.6797],[120.6738,51.9434],[120.7617,52.1191],[120.7617,52.251],[120.5859,52.3389],[120.6738,52.5146],[120.4102,52.6465],[120.0586,52.6025],[120.0586,52.7344],[120.8496,53.2617],[121.4648,53.3496],[121.8164,53.042],[121.2012,52.5586],[121.6406,52.4268],[121.7285,52.2949],[121.9922,52.2949],[122.168,52.5146],[122.6953,52.251],[122.6074,52.0752],[122.959,51.3281],[123.3105,51.2402],[123.6621,51.3721],[124.3652,51.2842],[124.541,51.3721],[124.8926,51.3721],[125.0684,51.6357],[125.332,51.6357],[126.0352,51.0205],[125.7715,50.7568],[125.7715,50.5371],[125.332,50.1416],[125.1563,49.834],[125.2441,49.1748],[124.8047,49.1309],[124.4531,48.1201],[124.2773,48.5156],[122.4316,47.373],[123.0469,46.7139],[123.3984,46.8896],[123.3984,46.9775],[123.4863,46.9775],[123.5742,46.8457],[123.5742,46.8896],[123.5742,46.6699],[123.0469,46.582],[123.2227,46.2305],[122.7832,46.0107],[122.6953,45.7031],[122.4316,45.8789],[122.2559,45.791],[121.8164,46.0107],[121.7285,45.7471],[121.9043,45.7031],[122.2559,45.2637],[122.0801,44.8682],[122.3438,44.2529],[123.1348,44.4727],[123.4863,43.7256],[123.3105,43.5059],[123.6621,43.374],[123.5742,43.0225],[123.3105,42.9785],[123.1348,42.8027],[122.7832,42.7148],[122.3438,42.8467],[122.3438,42.6709],[121.9922,42.7148],[121.7285,42.4512],[121.4648,42.4951],[120.498,42.0996],[120.1465,41.7041],[119.8828,42.1875],[119.5313,42.3633],[119.3555,42.2754],[119.2676,41.7041],[119.4434,41.6162],[119.2676,41.3086],[118.3887,41.3086],[118.125,41.748],[118.3008,41.792],[118.3008,42.0996],[118.125,42.0557],[117.9492,42.2314],[118.0371,42.4072],[117.7734,42.627],[117.5098,42.583],[117.334,42.4512],[116.8945,42.4072],[116.8066,42.0117],[116.2793,42.0117],[116.0156,41.792],[115.9277,41.9238],[115.2246,41.5723],[114.9609,41.6162],[114.873,42.0996],[114.5215,42.1436],[114.1699,41.792],[114.2578,41.5723],[113.9063,41.4404],[113.9941,41.2207],[113.9063,41.1328],[114.082,40.7373],[114.082,40.5176],[113.8184,40.5176],[113.5547,40.3418],[113.2031,40.3857],[112.7637,40.166],[112.3242,40.2539],[111.9727,39.5947],[111.4453,39.6387],[111.3574,39.4189],[111.0938,39.375],[111.0938,39.5947],[110.6543,39.2871],[110.127,39.4629],[110.2148,39.2871],[109.8633,39.2432],[109.9512,39.1553],[108.9844,38.3203],[109.0723,38.0127],[108.8965,37.9688],[108.8086,38.0127],[108.7207,37.7051],[108.1934,37.6172],[107.666,37.8809],[107.3145,38.1006],[106.7871,38.1885],[106.5234,38.3203],[106.9629,38.9795],[106.7871,39.375],[106.3477,39.2871],[105.9082,38.7158],[105.8203,37.793],[104.3262,37.4414],[103.4473,37.8369],[103.3594,38.0127],[103.5352,38.1445],[103.4473,38.3643],[104.2383,38.9795],[104.0625,39.4189],[103.3594,39.3311],[103.0078,39.1113],[102.4805,39.2432],[101.8652,39.1113],[102.041,38.8916],[101.7773,38.6719],[101.3379,38.7598],[101.25,39.0234],[100.9863,38.9355],[100.8105,39.4189],[100.5469,39.4189],[100.0195,39.7705],[99.4922,39.8584],[100.1074,40.2539],[100.1953,40.6494],[99.9316,41.001],[99.2285,40.8691],[99.0527,40.6934],[98.9648,40.7813],[98.7891,40.6055],[98.5254,40.7373],[98.6133,40.6494],[98.3496,40.5615],[98.3496,40.9131],[97.4707,41.4844],[97.8223,41.6162],[97.8223,41.748],[97.207,42.8027]]]}},{type:'Feature',properties:{id:'63',size:'800',name:'青海省',cp:[95.2402,35.4199],childNum:8},geometry:{type:'Polygon',coordinates:[[[89.7363,36.0791],[89.9121,36.0791],[90,36.2549],[90.8789,36.0352],[91.0547,36.0791],[91.0547,36.5186],[90.791,36.6064],[90.7031,36.7822],[91.3184,37.0898],[91.0547,37.4414],[90.5273,37.8369],[90.6152,38.3203],[90.3516,38.2324],[90.1758,38.4961],[92.373,39.0234],[92.373,39.1113],[93.1641,39.1992],[93.1641,38.9795],[93.6914,38.9355],[93.8672,38.7158],[94.3066,38.7598],[94.5703,38.3643],[95.0098,38.4082],[95.4492,38.2764],[95.7129,38.3643],[96.2402,38.1006],[96.416,38.2324],[96.6797,38.1885],[96.6797,38.4521],[97.1191,38.584],[97.0313,39.1992],[98.1738,38.8037],[98.3496,39.0234],[98.6133,38.9355],[98.7891,39.0674],[99.1406,38.9355],[99.8438,38.3643],[100.1953,38.2764],[100.0195,38.4521],[100.1074,38.4961],[100.459,38.2764],[100.7227,38.2324],[101.1621,37.8369],[101.5137,37.8809],[101.7773,37.6172],[101.9531,37.7051],[102.1289,37.4414],[102.5684,37.1777],[102.4805,36.958],[102.6563,36.8262],[102.5684,36.7383],[102.832,36.3428],[103.0078,36.2549],[102.9199,36.0791],[102.9199,35.9033],[102.6563,35.7715],[102.832,35.5957],[102.4805,35.5957],[102.3047,35.4199],[102.3926,35.2002],[101.9531,34.8486],[101.9531,34.6289],[102.2168,34.4092],[102.1289,34.2773],[101.6895,34.1016],[100.9863,34.3652],[100.8105,34.2773],[101.25,33.6621],[101.5137,33.7061],[101.6016,33.5303],[101.7773,33.5303],[101.6895,33.3105],[101.7773,33.2227],[101.6016,33.1348],[101.1621,33.2227],[101.25,32.6953],[100.7227,32.6514],[100.7227,32.5195],[100.3711,32.7393],[100.1074,32.6514],[100.1074,32.8711],[99.8438,33.0029],[99.7559,32.7393],[99.2285,32.915],[99.2285,33.0469],[98.877,33.1787],[98.4375,34.0576],[97.8223,34.1895],[97.6465,34.1016],[97.7344,33.9258],[97.3828,33.8818],[97.4707,33.5742],[97.7344,33.3984],[97.3828,32.8711],[97.4707,32.6953],[97.7344,32.5195],[97.3828,32.5635],[97.2949,32.0801],[96.7676,31.9922],[96.8555,31.6846],[96.5039,31.7285],[96.2402,31.9482],[96.1523,31.5967],[95.9766,31.8164],[95.8008,31.6846],[95.4492,31.8164],[95.3613,31.9922],[95.3613,32.168],[95.2734,32.2119],[95.1855,32.3438],[95.0098,32.2998],[95.1855,32.4316],[94.6582,32.6074],[94.1309,32.4316],[93.7793,32.5635],[93.5156,32.4756],[92.9883,32.7393],[92.2852,32.7393],[92.1973,32.8271],[91.9336,32.8271],[91.4063,33.1348],[90.7031,33.1348],[90.0879,33.4863],[89.6484,34.0137],[89.8242,34.3652],[89.7363,34.6729],[89.8242,34.8486],[89.5605,34.8926],[89.4727,35.2441],[89.4727,35.376],[89.7363,35.4199],[89.7363,35.7715],[89.4727,35.9033],[89.3848,36.0352],[89.7363,36.0791]]]}},{type:'Feature',properties:{id:'51',size:'900',name:'四川省',cp:[101.9199,30.1904],childNum:21},geometry:{type:'Polygon',coordinates:[[[101.7773,33.5303],[101.8652,33.5742],[101.9531,33.4424],[101.8652,33.0908],[102.4805,33.4424],[102.2168,33.9258],[102.9199,34.3213],[103.0957,34.1895],[103.1836,33.7939],[104.1504,33.6182],[104.2383,33.3984],[104.4141,33.3105],[104.3262,33.2227],[104.4141,33.0469],[104.3262,32.8711],[104.4141,32.7393],[105.2051,32.6074],[105.3809,32.7393],[105.3809,32.8711],[105.4688,32.915],[105.5566,32.7393],[106.084,32.8711],[106.084,32.7393],[106.3477,32.6514],[107.0508,32.6953],[107.1387,32.4756],[107.2266,32.4316],[107.4023,32.5195],[108.0176,32.168],[108.2813,32.2559],[108.5449,32.2119],[108.3691,32.168],[108.2813,31.9043],[108.5449,31.6846],[108.1934,31.5088],[107.9297,30.8496],[107.4902,30.8496],[107.4023,30.7617],[107.4902,30.6299],[107.0508,30.0146],[106.7871,30.0146],[106.6113,30.3223],[106.2598,30.1904],[105.8203,30.4541],[105.6445,30.2783],[105.5566,30.1025],[105.7324,29.8828],[105.293,29.5313],[105.4688,29.3115],[105.7324,29.2676],[105.8203,28.96],[106.2598,28.8721],[106.3477,28.5205],[105.9961,28.7402],[105.6445,28.4326],[105.9082,28.125],[106.1719,28.125],[106.3477,27.8174],[105.6445,27.6416],[105.5566,27.7734],[105.293,27.7295],[105.2051,27.9932],[105.0293,28.0811],[104.8535,27.9053],[104.4141,27.9492],[104.3262,28.0371],[104.4141,28.125],[104.4141,28.2568],[104.2383,28.4326],[104.4141,28.6084],[103.8867,28.6523],[103.7988,28.3008],[103.4473,28.125],[103.4473,27.7734],[102.9199,27.29],[103.0078,26.3672],[102.6563,26.1914],[102.5684,26.3672],[102.1289,26.1035],[101.8652,26.0596],[101.6016,26.2354],[101.6895,26.3672],[101.4258,26.5869],[101.4258,26.8066],[101.4258,26.7188],[101.1621,27.0264],[101.1621,27.1582],[100.7227,27.8613],[100.3711,27.8174],[100.2832,27.7295],[100.0195,28.125],[100.1953,28.3447],[99.668,28.8281],[99.4043,28.5205],[99.4043,28.1689],[99.2285,28.3008],[99.1406,29.2676],[98.9648,30.7617],[98.6133,31.2012],[98.877,31.4209],[98.4375,31.8604],[98.1738,32.3438],[97.7344,32.5195],[97.4707,32.6953],[97.3828,32.8711],[97.7344,33.3984],[97.4707,33.5742],[97.3828,33.8818],[97.7344,33.9258],[97.6465,34.1016],[97.8223,34.1895],[98.4375,34.0576],[98.877,33.1787],[99.2285,33.0469],[99.2285,32.915],[99.7559,32.7393],[99.8438,33.0029],[100.1074,32.8711],[100.1074,32.6514],[100.3711,32.7393],[100.7227,32.5195],[100.7227,32.6514],[101.25,32.6953],[101.1621,33.2227],[101.6016,33.1348],[101.7773,33.2227],[101.6895,33.3105],[101.7773,33.5303]]]}},{type:'Feature',properties:{id:'23',size:'700',name:'黑龙江省',cp:[126.1445,48.7156],childNum:13},geometry:{type:'Polygon',coordinates:[[[121.4648,53.3496],[123.6621,53.5693],[124.8926,53.0859],[125.0684,53.2178],[125.5957,53.0859],[125.6836,52.9102],[126.123,52.7783],[126.0352,52.6025],[126.2109,52.5146],[126.3867,52.2949],[126.3867,52.207],[126.5625,52.1631],[126.4746,51.9434],[126.9141,51.3721],[126.8262,51.2842],[127.002,51.3281],[126.9141,51.1084],[127.2656,50.7568],[127.3535,50.2734],[127.6172,50.2295],[127.5293,49.8779],[127.793,49.6143],[128.7598,49.5703],[129.1113,49.3506],[129.4629,49.4385],[130.2539,48.8672],[130.6934,48.8672],[130.5176,48.6475],[130.8691,48.2959],[130.6934,48.1201],[131.0449,47.6807],[132.5391,47.7246],[132.627,47.9443],[133.0664,48.1201],[133.5059,48.1201],[134.209,48.3838],[135.0879,48.4277],[134.7363,48.252],[134.5605,47.9883],[134.7363,47.6807],[134.5605,47.4609],[134.3848,47.4609],[134.209,47.2852],[134.209,47.1533],[133.8574,46.5381],[133.9453,46.2744],[133.5059,45.835],[133.418,45.5713],[133.2422,45.5273],[133.0664,45.1318],[132.8906,45.0439],[131.9238,45.3516],[131.5723,45.0439],[131.0449,44.8682],[131.3086,44.0771],[131.2207,43.7256],[131.3086,43.4619],[130.8691,43.418],[130.5176,43.6377],[130.3418,43.9893],[129.9902,43.8574],[129.9023,44.0332],[129.8145,43.9014],[129.2871,43.8135],[129.1992,43.5938],[128.8477,43.5498],[128.4961,44.165],[128.4082,44.4727],[128.0566,44.3408],[128.0566,44.1211],[127.7051,44.1211],[127.5293,44.6045],[127.0898,44.6045],[127.002,44.7803],[127.0898,45],[126.9141,45.1318],[126.5625,45.2637],[126.0352,45.1758],[125.7715,45.3076],[125.6836,45.5273],[125.0684,45.3955],[124.8926,45.5273],[124.3652,45.4395],[124.0137,45.7471],[123.9258,46.2305],[123.2227,46.2305],[123.0469,46.582],[123.5742,46.6699],[123.5742,46.8896],[123.5742,46.8457],[123.4863,46.9775],[123.3984,46.9775],[123.3984,46.8896],[123.0469,46.7139],[122.4316,47.373],[124.2773,48.5156],[124.4531,48.1201],[124.8047,49.1309],[125.2441,49.1748],[125.1563,49.834],[125.332,50.1416],[125.7715,50.5371],[125.7715,50.7568],[126.0352,51.0205],[125.332,51.6357],[125.0684,51.6357],[124.8926,51.3721],[124.541,51.3721],[124.3652,51.2842],[123.6621,51.3721],[123.3105,51.2402],[122.959,51.3281],[122.6074,52.0752],[122.6953,52.251],[122.168,52.5146],[121.9922,52.2949],[121.7285,52.2949],[121.6406,52.4268],[121.2012,52.5586],[121.8164,53.042],[121.4648,53.3496]]]}},{type:'Feature',properties:{id:'62',size:'690',name:'甘肃省',cp:[99.7129,38.166],childNum:14},geometry:{type:'Polygon',coordinates:[[[96.416,42.7148],[97.207,42.8027],[97.8223,41.748],[97.8223,41.6162],[97.4707,41.4844],[98.3496,40.9131],[98.3496,40.5615],[98.6133,40.6494],[98.5254,40.7373],[98.7891,40.6055],[98.9648,40.7813],[99.0527,40.6934],[99.2285,40.8691],[99.9316,41.001],[100.1953,40.6494],[100.1074,40.2539],[99.4922,39.8584],[100.0195,39.7705],[100.5469,39.4189],[100.8105,39.4189],[100.9863,38.9355],[101.25,39.0234],[101.3379,38.7598],[101.7773,38.6719],[102.041,38.8916],[101.8652,39.1113],[102.4805,39.2432],[103.0078,39.1113],[103.3594,39.3311],[104.0625,39.4189],[104.2383,38.9795],[103.4473,38.3643],[103.5352,38.1445],[103.3594,38.0127],[103.4473,37.8369],[104.3262,37.4414],[104.5898,37.4414],[104.5898,37.2217],[104.8535,37.2217],[105.293,36.8262],[105.2051,36.6943],[105.4688,36.123],[105.293,35.9912],[105.3809,35.7715],[105.7324,35.7275],[105.8203,35.5518],[105.9961,35.4639],[105.9082,35.4199],[105.9961,35.4199],[106.084,35.376],[106.2598,35.4199],[106.3477,35.2441],[106.5234,35.332],[106.4355,35.6836],[106.6992,35.6836],[106.9629,35.8154],[106.875,36.123],[106.5234,36.2549],[106.5234,36.4746],[106.4355,36.5625],[106.6113,36.7822],[106.6113,37.0898],[107.3145,37.0898],[107.3145,36.9141],[108.7207,36.3428],[108.6328,35.9912],[108.5449,35.8594],[108.6328,35.5518],[108.5449,35.2881],[107.7539,35.2881],[107.7539,35.1123],[107.8418,35.0244],[107.666,34.9365],[107.2266,34.8926],[106.9629,35.0684],[106.6113,35.0684],[106.5234,34.7607],[106.3477,34.585],[106.6992,34.3213],[106.5234,34.2773],[106.6113,34.1455],[106.4355,33.9258],[106.5234,33.5303],[105.9961,33.6182],[105.7324,33.3984],[105.9961,33.1787],[105.9082,33.0029],[105.4688,32.915],[105.3809,32.8711],[105.3809,32.7393],[105.2051,32.6074],[104.4141,32.7393],[104.3262,32.8711],[104.4141,33.0469],[104.3262,33.2227],[104.4141,33.3105],[104.2383,33.3984],[104.1504,33.6182],[103.1836,33.7939],[103.0957,34.1895],[102.9199,34.3213],[102.2168,33.9258],[102.4805,33.4424],[101.8652,33.0908],[101.9531,33.4424],[101.8652,33.5742],[101.7773,33.5303],[101.6016,33.5303],[101.5137,33.7061],[101.25,33.6621],[100.8105,34.2773],[100.9863,34.3652],[101.6895,34.1016],[102.1289,34.2773],[102.2168,34.4092],[101.9531,34.6289],[101.9531,34.8486],[102.3926,35.2002],[102.3047,35.4199],[102.4805,35.5957],[102.832,35.5957],[102.6563,35.7715],[102.9199,35.9033],[102.9199,36.0791],[103.0078,36.2549],[102.832,36.3428],[102.5684,36.7383],[102.6563,36.8262],[102.4805,36.958],[102.5684,37.1777],[102.1289,37.4414],[101.9531,37.7051],[101.7773,37.6172],[101.5137,37.8809],[101.1621,37.8369],[100.7227,38.2324],[100.459,38.2764],[100.1074,38.4961],[100.0195,38.4521],[100.1953,38.2764],[99.8438,38.3643],[99.1406,38.9355],[98.7891,39.0674],[98.6133,38.9355],[98.3496,39.0234],[98.1738,38.8037],[97.0313,39.1992],[97.1191,38.584],[96.6797,38.4521],[96.6797,38.1885],[96.416,38.2324],[96.2402,38.1006],[95.7129,38.3643],[95.4492,38.2764],[95.0098,38.4082],[94.5703,38.3643],[94.3066,38.7598],[93.8672,38.7158],[93.6914,38.9355],[93.1641,38.9795],[93.1641,39.1992],[92.373,39.1113],[92.373,39.3311],[92.6367,39.6387],[93.0762,40.6494],[93.8672,40.6934],[94.043,41.0889],[94.5703,41.4844],[95.1855,41.792],[95.2734,41.6162],[95.9766,41.9238],[96.2402,42.2314],[96.0645,42.3193],[95.9766,42.4951],[96.416,42.7148]]]}},{type:'Feature',properties:{id:'53',size:'1200',name:'云南省',cp:[101.0652,25.1807],childNum:16},geometry:{type:'Polygon',coordinates:[[[98.1738,28.125],[98.2617,28.3887],[98.3496,28.125],[98.7012,28.2129],[98.7891,28.3447],[98.6133,28.5205],[98.7012,28.916],[98.7891,29.0039],[98.7891,28.8721],[98.9648,28.8281],[98.9648,29.1357],[99.1406,29.2676],[99.2285,28.3008],[99.4043,28.1689],[99.4043,28.5205],[99.668,28.8281],[100.1953,28.3447],[100.0195,28.125],[100.2832,27.7295],[100.3711,27.8174],[100.7227,27.8613],[101.1621,27.1582],[101.1621,27.0264],[101.4258,26.7188],[101.4258,26.8066],[101.4258,26.5869],[101.6895,26.3672],[101.6016,26.2354],[101.8652,26.0596],[102.1289,26.1035],[102.5684,26.3672],[102.6563,26.1914],[103.0078,26.3672],[102.9199,27.29],[103.4473,27.7734],[103.4473,28.125],[103.7988,28.3008],[103.8867,28.6523],[104.4141,28.6084],[104.2383,28.4326],[104.4141,28.2568],[104.4141,28.125],[104.3262,28.0371],[104.4141,27.9492],[104.8535,27.9053],[105.0293,28.0811],[105.2051,27.9932],[105.293,27.7295],[105.2051,27.3779],[104.5898,27.334],[104.4141,27.4658],[104.1504,27.2461],[103.8867,27.4219],[103.623,27.0264],[103.7109,26.9824],[103.7109,26.7627],[103.8867,26.543],[104.4141,26.6748],[104.6777,26.4111],[104.3262,25.708],[104.8535,25.2246],[104.5898,25.0488],[104.6777,24.9609],[104.502,24.7412],[104.6777,24.3457],[104.7656,24.4775],[105.0293,24.4336],[105.2051,24.082],[105.4688,24.0381],[105.5566,24.126],[105.9961,24.126],[106.1719,23.8184],[106.1719,23.5547],[105.6445,23.4229],[105.5566,23.2031],[105.293,23.3789],[104.8535,23.1592],[104.7656,22.8516],[104.3262,22.6758],[104.1504,22.8076],[103.9746,22.5439],[103.623,22.7637],[103.5352,22.5879],[103.3594,22.8076],[103.0957,22.4561],[102.4805,22.7637],[102.3047,22.4121],[101.8652,22.3682],[101.7773,22.5],[101.6016,22.1924],[101.8652,21.6211],[101.7773,21.1377],[101.6016,21.2256],[101.25,21.1816],[101.1621,21.7529],[100.6348,21.4453],[100.1074,21.4893],[99.9316,22.0605],[99.2285,22.1484],[99.4043,22.5879],[99.3164,22.7197],[99.4922,23.0713],[98.877,23.2031],[98.7012,23.9502],[98.877,24.126],[98.1738,24.082],[97.7344,23.8623],[97.5586,23.9063],[97.7344,24.126],[97.6465,24.4336],[97.5586,24.4336],[97.5586,24.7412],[97.7344,24.8291],[97.8223,25.2686],[98.1738,25.4004],[98.1738,25.6201],[98.3496,25.5762],[98.5254,25.8398],[98.7012,25.8838],[98.6133,26.0596],[98.7012,26.1475],[98.7891,26.5869],[98.7012,27.5098],[98.5254,27.6416],[98.3496,27.5098],[98.1738,28.125]]]}},{type:'Feature',properties:{id:'45',size:'1450',name:'广西壮族自治区',cp:[107.7813,23.6426],childNum:14},geometry:{type:'Polygon',coordinates:[[[104.502,24.7412],[104.6777,24.6094],[105.2051,24.9609],[105.9961,24.6533],[106.1719,24.7852],[106.1719,24.9609],[106.875,25.1807],[107.0508,25.2686],[106.9629,25.4883],[107.2266,25.6201],[107.4902,25.2246],[107.7539,25.2246],[107.8418,25.1367],[108.1055,25.2246],[108.1934,25.4443],[108.3691,25.5322],[108.6328,25.3125],[108.6328,25.5762],[109.0723,25.5322],[108.9844,25.752],[109.3359,25.708],[109.5117,26.0156],[109.7754,25.8838],[109.9512,26.1914],[110.2148,25.9717],[110.5664,26.3232],[111.1816,26.3232],[111.2695,26.2354],[111.2695,25.8838],[111.4453,25.8398],[111.0059,25.0049],[111.0938,24.9609],[111.3574,25.1367],[111.5332,24.6533],[111.709,24.7852],[112.0605,24.7412],[111.8848,24.6533],[112.0605,24.3457],[111.8848,24.2139],[111.8848,23.9941],[111.7969,23.8184],[111.6211,23.8184],[111.6211,23.6865],[111.3574,23.4668],[111.4453,23.0273],[111.2695,22.8076],[110.7422,22.5439],[110.7422,22.2803],[110.6543,22.1484],[110.3027,22.1484],[110.3027,21.8848],[109.9512,21.8408],[109.8633,21.665],[109.7754,21.6211],[109.7754,21.4014],[109.5996,21.4453],[109.1602,21.3574],[109.248,20.874],[109.0723,20.9619],[109.0723,21.5332],[108.7207,21.5332],[108.6328,21.665],[108.2813,21.4893],[107.8418,21.6211],[107.4023,21.6211],[107.0508,21.7969],[107.0508,21.9287],[106.6992,22.0166],[106.6113,22.4121],[106.7871,22.7637],[106.6992,22.8955],[105.9082,22.9395],[105.5566,23.0713],[105.5566,23.2031],[105.6445,23.4229],[106.1719,23.5547],[106.1719,23.8184],[105.9961,24.126],[105.5566,24.126],[105.4688,24.0381],[105.2051,24.082],[105.0293,24.4336],[104.7656,24.4775],[104.6777,24.3457],[104.502,24.7412]]]}},{type:'Feature',properties:{id:'43',size:'1700',name:'湖南省',cp:[111.5332,27.3779],childNum:14},geometry:{type:'Polygon',coordinates:[[[109.248,28.4766],[109.248,29.1357],[109.5117,29.6191],[109.6875,29.6191],[109.7754,29.751],[110.4785,29.6631],[110.6543,29.751],[110.4785,30.0146],[110.8301,30.1465],[111.7969,29.9268],[112.2363,29.5313],[112.5,29.6191],[112.6758,29.5752],[112.9395,29.7949],[113.0273,29.751],[112.9395,29.4873],[113.0273,29.4434],[113.5547,29.8389],[113.5547,29.707],[113.7305,29.5752],[113.6426,29.3115],[113.7305,29.0918],[113.9063,29.0479],[114.1699,28.8281],[114.082,28.5645],[114.2578,28.3447],[113.7305,27.9492],[113.6426,27.5977],[113.6426,27.3779],[113.8184,27.29],[113.7305,27.1143],[113.9063,26.9385],[113.9063,26.6309],[114.082,26.5869],[113.9941,26.1914],[114.2578,26.1475],[113.9941,26.0596],[113.9063,25.4443],[113.6426,25.3125],[113.2031,25.5322],[112.8516,25.3564],[113.0273,25.2246],[113.0273,24.9609],[112.8516,24.917],[112.5879,25.1367],[112.2363,25.1807],[112.1484,24.873],[112.0605,24.7412],[111.709,24.7852],[111.5332,24.6533],[111.3574,25.1367],[111.0938,24.9609],[111.0059,25.0049],[111.4453,25.8398],[111.2695,25.8838],[111.2695,26.2354],[111.1816,26.3232],[110.5664,26.3232],[110.2148,25.9717],[109.9512,26.1914],[109.7754,25.8838],[109.5117,26.0156],[109.4238,26.2793],[109.248,26.3232],[109.4238,26.5869],[109.3359,26.7188],[109.5117,26.8066],[109.5117,27.0264],[109.3359,27.1582],[108.8965,27.0264],[108.8086,27.1143],[109.4238,27.5977],[109.3359,27.9053],[109.3359,28.2568],[109.248,28.4766]]]}},{type:'Feature',properties:{id:'61',size:'1150',name:'陕西省',cp:[109.5996,35.7396],childNum:10},geometry:{type:'Polygon',coordinates:[[[105.4688,32.915],[105.9082,33.0029],[105.9961,33.1787],[105.7324,33.3984],[105.9961,33.6182],[106.5234,33.5303],[106.4355,33.9258],[106.6113,34.1455],[106.5234,34.2773],[106.6992,34.3213],[106.3477,34.585],[106.5234,34.7607],[106.6113,35.0684],[106.9629,35.0684],[107.2266,34.8926],[107.666,34.9365],[107.8418,35.0244],[107.7539,35.1123],[107.7539,35.2881],[108.5449,35.2881],[108.6328,35.5518],[108.5449,35.8594],[108.6328,35.9912],[108.7207,36.3428],[107.3145,36.9141],[107.3145,37.0898],[107.3145,37.6172],[107.666,37.8809],[108.1934,37.6172],[108.7207,37.7051],[108.8086,38.0127],[108.8965,37.9688],[109.0723,38.0127],[108.9844,38.3203],[109.9512,39.1553],[109.8633,39.2432],[110.2148,39.2871],[110.127,39.4629],[110.6543,39.2871],[111.0938,39.5947],[111.0938,39.375],[111.1816,39.2432],[110.918,38.7158],[110.8301,38.4961],[110.4785,38.1885],[110.4785,37.9688],[110.8301,37.6611],[110.3906,37.002],[110.4785,36.123],[110.5664,35.6396],[110.2148,34.8926],[110.2148,34.6729],[110.3906,34.585],[110.4785,34.2334],[110.6543,34.1455],[110.6543,33.8379],[111.0059,33.5303],[111.0059,33.2666],[110.7422,33.1348],[110.5664,33.2666],[110.3027,33.1787],[109.5996,33.2666],[109.4238,33.1348],[109.7754,33.0469],[109.7754,32.915],[110.127,32.7393],[110.127,32.6074],[109.6875,32.6074],[109.5117,32.4316],[109.5996,31.7285],[109.248,31.7285],[109.0723,31.9482],[108.5449,32.2119],[108.2813,32.2559],[108.0176,32.168],[107.4023,32.5195],[107.2266,32.4316],[107.1387,32.4756],[107.0508,32.6953],[106.3477,32.6514],[106.084,32.7393],[106.084,32.8711],[105.5566,32.7393],[105.4688,32.915]]]}},{type:'Feature',properties:{id:'44',size:'1600',name:'广东省',cp:[113.4668,22.8076],childNum:21},geometry:{type:'Polygon',coordinates:[[[109.7754,21.4014],[109.7754,21.6211],[109.8633,21.665],[109.9512,21.8408],[110.3027,21.8848],[110.3027,22.1484],[110.6543,22.1484],[110.7422,22.2803],[110.7422,22.5439],[111.2695,22.8076],[111.4453,23.0273],[111.3574,23.4668],[111.6211,23.6865],[111.6211,23.8184],[111.7969,23.8184],[111.8848,23.9941],[111.8848,24.2139],[112.0605,24.3457],[111.8848,24.6533],[112.0605,24.7412],[112.1484,24.873],[112.2363,25.1807],[112.5879,25.1367],[112.8516,24.917],[113.0273,24.9609],[113.0273,25.2246],[112.8516,25.3564],[113.2031,25.5322],[113.6426,25.3125],[113.9063,25.4443],[113.9941,25.2686],[114.6094,25.4004],[114.7852,25.2686],[114.6973,25.1367],[114.4336,24.9609],[114.1699,24.6973],[114.4336,24.5215],[115.4004,24.7852],[115.8398,24.5654],[115.752,24.7852],[115.9277,24.917],[116.2793,24.7852],[116.3672,24.873],[116.543,24.6094],[116.7188,24.6533],[116.9824,24.1699],[116.9824,23.9063],[117.1582,23.5547],[117.334,23.2471],[116.8945,23.3789],[116.6309,23.1152],[116.543,22.8516],[115.9277,22.7197],[115.6641,22.7637],[115.5762,22.6318],[115.0488,22.6758],[114.6094,22.3682],[114.3457,22.5439],[113.9941,22.5],[113.8184,22.1924],[114.3457,22.1484],[114.4336,22.0166],[114.082,21.9287],[113.9941,21.7969],[113.5547,22.0166],[113.1152,21.8408],[112.9395,21.5771],[112.4121,21.4453],[112.2363,21.5332],[111.5332,21.4893],[111.2695,21.3574],[110.7422,21.3574],[110.6543,21.2256],[110.7422,20.918],[110.4785,20.874],[110.6543,20.2588],[110.5664,20.2588],[110.3906,20.127],[110.0391,20.127],[109.8633,20.127],[109.8633,20.3027],[109.5996,20.918],[109.7754,21.4014],[109.7754,21.4014]],[[113.5986,22.1649],[113.6096,22.1265],[113.5547,22.11],[113.5437,22.2034],[113.5767,22.2034],[113.5986,22.1649]]]}},{type:'Feature',properties:{id:'22',size:'1120',name:'吉林省',cp:[125.7746,43.5938],childNum:9},geometry:{type:'Polygon',coordinates:[[[123.2227,46.2305],[123.9258,46.2305],[124.0137,45.7471],[124.3652,45.4395],[124.8926,45.5273],[125.0684,45.3955],[125.6836,45.5273],[125.7715,45.3076],[126.0352,45.1758],[126.5625,45.2637],[126.9141,45.1318],[127.0898,45],[127.002,44.7803],[127.0898,44.6045],[127.5293,44.6045],[127.7051,44.1211],[128.0566,44.1211],[128.0566,44.3408],[128.4082,44.4727],[128.4961,44.165],[128.8477,43.5498],[129.1992,43.5938],[129.2871,43.8135],[129.8145,43.9014],[129.9023,44.0332],[129.9902,43.8574],[130.3418,43.9893],[130.5176,43.6377],[130.8691,43.418],[131.3086,43.4619],[131.3086,43.3301],[131.1328,42.9346],[130.4297,42.7148],[130.6055,42.6709],[130.6055,42.4512],[130.2539,42.7588],[130.2539,42.8906],[130.166,42.9785],[129.9023,43.0225],[129.7266,42.4951],[129.375,42.4512],[128.9355,42.0117],[128.0566,42.0117],[128.3203,41.5723],[128.1445,41.3525],[127.0898,41.5283],[127.1777,41.5723],[126.9141,41.792],[126.6504,41.6602],[126.4746,41.3965],[126.123,40.957],[125.6836,40.8691],[125.5957,40.9131],[125.7715,41.2207],[125.332,41.6602],[125.332,41.9678],[125.4199,42.0996],[125.332,42.1436],[124.8926,42.8027],[124.8926,43.0664],[124.7168,43.0664],[124.4531,42.8467],[124.2773,43.2422],[123.8379,43.4619],[123.6621,43.374],[123.3105,43.5059],[123.4863,43.7256],[123.1348,44.4727],[122.3438,44.2529],[122.0801,44.8682],[122.2559,45.2637],[121.9043,45.7031],[121.7285,45.7471],[121.8164,46.0107],[122.2559,45.791],[122.4316,45.8789],[122.6953,45.7031],[122.7832,46.0107],[123.2227,46.2305]]]}},{type:'Feature',properties:{id:'13',size:'1300',name:'河北省',cp:[115.4004,39.4688],childNum:11},geometry:{type:'MultiPolygon',coordinates:[[[[114.5215,39.5068],[114.3457,39.8584],[113.9941,39.9902],[114.5215,40.3418],[114.3457,40.3857],[114.2578,40.6055],[114.082,40.7373],[113.9063,41.1328],[113.9941,41.2207],[113.9063,41.4404],[114.2578,41.5723],[114.1699,41.792],[114.5215,42.1436],[114.873,42.0996],[114.9609,41.6162],[115.2246,41.5723],[115.9277,41.9238],[116.0156,41.792],[116.2793,42.0117],[116.8066,42.0117],[116.8945,42.4072],[117.334,42.4512],[117.5098,42.583],[117.7734,42.627],[118.0371,42.4072],[117.9492,42.2314],[118.125,42.0557],[118.3008,42.0996],[118.3008,41.792],[118.125,41.748],[118.3887,41.3086],[119.2676,41.3086],[118.8281,40.8252],[119.2676,40.5176],[119.5313,40.5615],[119.707,40.1221],[119.8828,39.9463],[119.5313,39.6826],[119.4434,39.4189],[118.916,39.0674],[118.4766,38.9355],[118.125,39.0234],[118.0371,39.1992],[118.0371,39.2432],[117.8613,39.4189],[117.9492,39.5947],[117.6855,39.5947],[117.5098,39.7705],[117.5098,39.9902],[117.6855,39.9902],[117.6855,40.0781],[117.4219,40.21],[117.2461,40.5176],[117.4219,40.6494],[116.9824,40.6934],[116.6309,41.0449],[116.3672,40.9131],[116.4551,40.7813],[116.1914,40.7813],[116.1035,40.6055],[115.752,40.5615],[115.9277,40.2539],[115.4004,39.9463],[115.4883,39.6387],[115.752,39.5068],[116.1914,39.5947],[116.3672,39.4629],[116.543,39.5947],[116.8066,39.5947],[116.8945,39.1113],[116.7188,38.9355],[116.7188,38.8037],[117.2461,38.54],[117.5977,38.6279],[117.9492,38.3203],[117.4219,37.8369],[116.8066,37.8369],[116.4551,37.4854],[116.2793,37.5732],[116.2793,37.3535],[116.0156,37.3535],[115.752,36.9141],[115.3125,36.5186],[115.4883,36.167],[115.3125,36.0791],[115.1367,36.2109],[114.9609,36.0791],[114.873,36.123],[113.7305,36.3428],[113.4668,36.6504],[113.7305,36.8701],[113.7305,37.1338],[114.1699,37.6611],[113.9941,37.7051],[113.8184,38.1445],[113.5547,38.2764],[113.5547,38.54],[113.8184,38.8037],[113.8184,38.9355],[113.9063,39.0234],[114.3457,39.0674],[114.5215,39.5068]]],[[[117.2461,40.0781],[117.1582,39.8145],[117.1582,39.6387],[116.8945,39.6826],[116.8945,39.8145],[116.8066,39.9902],[117.2461,40.0781]]]]}},{type:'Feature',properties:{id:'42',size:'1500',name:'湖北省',cp:[112.2363,31.1572],childNum:17},geometry:{type:'Polygon',coordinates:[[[110.2148,31.1572],[110.127,31.377],[109.6875,31.5527],[109.7754,31.6846],[109.5996,31.7285],[109.5117,32.4316],[109.6875,32.6074],[110.127,32.6074],[110.127,32.7393],[109.7754,32.915],[109.7754,33.0469],[109.4238,33.1348],[109.5996,33.2666],[110.3027,33.1787],[110.5664,33.2666],[110.7422,33.1348],[111.0059,33.2666],[111.5332,32.6074],[112.3242,32.3438],[113.2031,32.4316],[113.4668,32.2998],[113.7305,32.4316],[113.8184,31.8604],[113.9941,31.7725],[114.1699,31.8604],[114.5215,31.7725],[114.6094,31.5527],[114.7852,31.4648],[115.1367,31.5967],[115.2246,31.4209],[115.4004,31.4209],[115.5762,31.2012],[116.0156,31.0254],[115.752,30.6738],[116.1035,30.1904],[116.1035,29.8389],[115.9277,29.707],[115.4883,29.7949],[114.873,29.3994],[114.2578,29.3555],[113.9063,29.0479],[113.7305,29.0918],[113.6426,29.3115],[113.7305,29.5752],[113.5547,29.707],[113.5547,29.8389],[113.0273,29.4434],[112.9395,29.4873],[113.0273,29.751],[112.9395,29.7949],[112.6758,29.5752],[112.5,29.6191],[112.2363,29.5313],[111.7969,29.9268],[110.8301,30.1465],[110.4785,30.0146],[110.6543,29.751],[110.4785,29.6631],[109.7754,29.751],[109.6875,29.6191],[109.5117,29.6191],[109.248,29.1357],[109.0723,29.3555],[108.9844,29.3115],[108.6328,29.8389],[108.457,29.7949],[108.5449,30.2344],[108.457,30.4102],[108.6328,30.5859],[108.8086,30.498],[109.0723,30.6299],[109.1602,30.542],[109.248,30.6299],[109.4238,30.542],[109.8633,30.8936],[110.0391,30.8057],[110.2148,31.1572]]]}},{type:'Feature',properties:{id:'52',size:'2000',name:'贵州省',cp:[106.6113,26.9385],childNum:9},geometry:{type:'Polygon',coordinates:[[[104.1504,27.2461],[104.4141,27.4658],[104.5898,27.334],[105.2051,27.3779],[105.293,27.7295],[105.5566,27.7734],[105.6445,27.6416],[106.3477,27.8174],[106.1719,28.125],[105.9082,28.125],[105.6445,28.4326],[105.9961,28.7402],[106.3477,28.5205],[106.5234,28.5645],[106.4355,28.7842],[106.5234,28.7842],[106.6113,28.6523],[106.6113,28.5205],[106.6992,28.4766],[106.875,28.7842],[107.4023,28.8721],[107.4023,29.1797],[107.5781,29.2236],[107.8418,29.1357],[107.8418,29.0039],[108.2813,29.0918],[108.3691,28.6523],[108.5449,28.6523],[108.5449,28.3887],[108.7207,28.4766],[108.7207,28.2129],[109.0723,28.2129],[109.248,28.4766],[109.3359,28.2568],[109.3359,27.9053],[109.4238,27.5977],[108.8086,27.1143],[108.8965,27.0264],[109.3359,27.1582],[109.5117,27.0264],[109.5117,26.8066],[109.3359,26.7188],[109.4238,26.5869],[109.248,26.3232],[109.4238,26.2793],[109.5117,26.0156],[109.3359,25.708],[108.9844,25.752],[109.0723,25.5322],[108.6328,25.5762],[108.6328,25.3125],[108.3691,25.5322],[108.1934,25.4443],[108.1055,25.2246],[107.8418,25.1367],[107.7539,25.2246],[107.4902,25.2246],[107.2266,25.6201],[106.9629,25.4883],[107.0508,25.2686],[106.875,25.1807],[106.1719,24.9609],[106.1719,24.7852],[105.9961,24.6533],[105.2051,24.9609],[104.6777,24.6094],[104.502,24.7412],[104.6777,24.9609],[104.5898,25.0488],[104.8535,25.2246],[104.3262,25.708],[104.6777,26.4111],[104.4141,26.6748],[103.8867,26.543],[103.7109,26.7627],[103.7109,26.9824],[103.623,27.0264],[103.8867,27.4219],[104.1504,27.2461]]]}},{type:'Feature',properties:{id:'37',size:'1500',name:'山东省',cp:[118.7402,36.4307],childNum:17},geometry:{type:'Polygon',coordinates:[[[115.4883,36.167],[115.3125,36.5186],[115.752,36.9141],[116.0156,37.3535],[116.2793,37.3535],[116.2793,37.5732],[116.4551,37.4854],[116.8066,37.8369],[117.4219,37.8369],[117.9492,38.3203],[118.125,38.1445],[118.916,38.1445],[119.3555,37.6611],[119.0039,37.5293],[119.0039,37.3535],[119.3555,37.1338],[119.707,37.1338],[119.8828,37.3975],[120.498,37.8369],[120.5859,38.1445],[120.9375,38.4521],[121.0254,37.8369],[121.2012,37.6611],[121.9043,37.4854],[122.168,37.6172],[122.2559,37.4854],[122.6074,37.4854],[122.6953,37.3535],[122.6074,36.9141],[122.4316,36.7822],[121.8164,36.8701],[121.7285,36.6943],[121.1133,36.6064],[121.1133,36.4307],[121.377,36.2549],[120.7617,36.167],[120.9375,35.8594],[120.6738,36.0352],[119.707,35.4639],[119.9707,34.9805],[119.3555,35.0244],[119.2676,35.1123],[118.916,35.0244],[118.7402,34.7168],[118.4766,34.6729],[118.3887,34.4092],[118.2129,34.4092],[118.125,34.6289],[117.9492,34.6729],[117.5977,34.4531],[117.334,34.585],[117.2461,34.4531],[116.8066,34.9365],[116.4551,34.8926],[116.3672,34.6289],[116.1914,34.585],[115.5762,34.585],[115.4004,34.8486],[114.7852,35.0684],[115.0488,35.376],[115.2246,35.4199],[115.4883,35.7275],[116.1035,36.0791],[115.3125,35.8154],[115.4883,36.167]]]}},{type:'Feature',properties:{id:'36',size:'1700',name:'江西省',cp:[116.0156,27.29],childNum:11},geometry:{type:'Polygon',coordinates:[[[114.2578,28.3447],[114.082,28.5645],[114.1699,28.8281],[113.9063,29.0479],[114.2578,29.3555],[114.873,29.3994],[115.4883,29.7949],[115.9277,29.707],[116.1035,29.8389],[116.2793,29.7949],[116.7188,30.0586],[116.8945,29.9268],[116.7188,29.751],[116.7188,29.6191],[117.1582,29.707],[117.0703,29.8389],[117.1582,29.9268],[117.5098,29.6191],[118.0371,29.5752],[118.2129,29.3994],[118.0371,29.1797],[118.0371,29.0479],[118.3887,28.7842],[118.4766,28.3447],[118.4766,28.3008],[118.3008,28.0811],[117.7734,27.8174],[117.5098,27.9932],[116.9824,27.6416],[117.1582,27.29],[117.0703,27.1143],[116.543,26.8066],[116.6309,26.4551],[116.3672,26.2354],[116.4551,26.1035],[116.1914,25.8838],[116.0156,25.2686],[115.8398,25.2246],[115.9277,24.917],[115.752,24.7852],[115.8398,24.5654],[115.4004,24.7852],[114.4336,24.5215],[114.1699,24.6973],[114.4336,24.9609],[114.6973,25.1367],[114.7852,25.2686],[114.6094,25.4004],[113.9941,25.2686],[113.9063,25.4443],[113.9941,26.0596],[114.2578,26.1475],[113.9941,26.1914],[114.082,26.5869],[113.9063,26.6309],[113.9063,26.9385],[113.7305,27.1143],[113.8184,27.29],[113.6426,27.3779],[113.6426,27.5977],[113.7305,27.9492],[114.2578,28.3447]]]}},{type:'Feature',properties:{id:'41',size:'1700',name:'河南省',cp:[113.0668,33.8818],childNum:17},geometry:{type:'Polygon',coordinates:[[[110.3906,34.585],[110.8301,34.6289],[111.1816,34.8047],[111.5332,34.8486],[111.7969,35.0684],[112.0605,35.0684],[112.0605,35.2881],[112.7637,35.2002],[113.1152,35.332],[113.6426,35.6836],[113.7305,36.3428],[114.873,36.123],[114.9609,36.0791],[115.1367,36.2109],[115.3125,36.0791],[115.4883,36.167],[115.3125,35.8154],[116.1035,36.0791],[115.4883,35.7275],[115.2246,35.4199],[115.0488,35.376],[114.7852,35.0684],[115.4004,34.8486],[115.5762,34.585],[116.1914,34.585],[116.1914,34.4092],[116.543,34.2773],[116.6309,33.9258],[116.1914,33.7061],[116.0156,33.9697],[115.6641,34.0576],[115.5762,33.9258],[115.5762,33.6621],[115.4004,33.5303],[115.3125,33.1787],[114.873,33.1348],[114.873,33.0029],[115.1367,32.8711],[115.2246,32.6074],[115.5762,32.4316],[115.8398,32.5195],[115.9277,31.7725],[115.4883,31.6846],[115.4004,31.4209],[115.2246,31.4209],[115.1367,31.5967],[114.7852,31.4648],[114.6094,31.5527],[114.5215,31.7725],[114.1699,31.8604],[113.9941,31.7725],[113.8184,31.8604],[113.7305,32.4316],[113.4668,32.2998],[113.2031,32.4316],[112.3242,32.3438],[111.5332,32.6074],[111.0059,33.2666],[111.0059,33.5303],[110.6543,33.8379],[110.6543,34.1455],[110.4785,34.2334],[110.3906,34.585]]]}},{type:'Feature',properties:{id:'21',size:'1500',name:'辽宁省',cp:[122.0438,41.0889],childNum:14},geometry:{type:'Polygon',coordinates:[[[119.2676,41.3086],[119.4434,41.6162],[119.2676,41.7041],[119.3555,42.2754],[119.5313,42.3633],[119.8828,42.1875],[120.1465,41.7041],[120.498,42.0996],[121.4648,42.4951],[121.7285,42.4512],[121.9922,42.7148],[122.3438,42.6709],[122.3438,42.8467],[122.7832,42.7148],[123.1348,42.8027],[123.3105,42.9785],[123.5742,43.0225],[123.6621,43.374],[123.8379,43.4619],[124.2773,43.2422],[124.4531,42.8467],[124.7168,43.0664],[124.8926,43.0664],[124.8926,42.8027],[125.332,42.1436],[125.4199,42.0996],[125.332,41.9678],[125.332,41.6602],[125.7715,41.2207],[125.5957,40.9131],[125.6836,40.8691],[124.541,40.21],[124.1016,39.6826],[123.3984,39.6826],[123.1348,39.4189],[123.1348,39.0234],[122.0801,39.0234],[121.5527,38.7158],[121.1133,38.6719],[120.9375,38.9795],[121.377,39.1992],[121.2012,39.5508],[122.0801,40.3857],[121.9922,40.6934],[121.7285,40.8252],[121.2012,40.8252],[120.5859,40.21],[119.8828,39.9463],[119.707,40.1221],[119.5313,40.5615],[119.2676,40.5176],[118.8281,40.8252],[119.2676,41.3086]]]}},{type:'Feature',properties:{id:'14',size:'1450',name:'山西省',cp:[112.4121,37.6611],childNum:11},geometry:{type:'Polygon',coordinates:[[[110.918,38.7158],[111.1816,39.2432],[111.0938,39.375],[111.3574,39.4189],[111.4453,39.6387],[111.9727,39.5947],[112.3242,40.2539],[112.7637,40.166],[113.2031,40.3857],[113.5547,40.3418],[113.8184,40.5176],[114.082,40.5176],[114.082,40.7373],[114.2578,40.6055],[114.3457,40.3857],[114.5215,40.3418],[113.9941,39.9902],[114.3457,39.8584],[114.5215,39.5068],[114.3457,39.0674],[113.9063,39.0234],[113.8184,38.9355],[113.8184,38.8037],[113.5547,38.54],[113.5547,38.2764],[113.8184,38.1445],[113.9941,37.7051],[114.1699,37.6611],[113.7305,37.1338],[113.7305,36.8701],[113.4668,36.6504],[113.7305,36.3428],[113.6426,35.6836],[113.1152,35.332],[112.7637,35.2002],[112.0605,35.2881],[112.0605,35.0684],[111.7969,35.0684],[111.5332,34.8486],[111.1816,34.8047],[110.8301,34.6289],[110.3906,34.585],[110.2148,34.6729],[110.2148,34.8926],[110.5664,35.6396],[110.4785,36.123],[110.3906,37.002],[110.8301,37.6611],[110.4785,37.9688],[110.4785,38.1885],[110.8301,38.4961],[110.918,38.7158]]]}},{type:'Feature',properties:{id:'34',size:'1700',name:'安徽省',cp:[117.2461,32.0361],childNum:17},geometry:{type:'Polygon',coordinates:[[[116.6309,33.9258],[116.543,34.2773],[116.1914,34.4092],[116.1914,34.585],[116.3672,34.6289],[116.8945,34.4092],[117.1582,34.0576],[117.5977,34.0137],[117.7734,33.7061],[118.125,33.75],[117.9492,33.2227],[118.0371,33.1348],[118.2129,33.2227],[118.3008,32.7832],[118.7402,32.7393],[118.916,32.959],[119.1797,32.8271],[119.1797,32.4756],[118.5645,32.5635],[118.6523,32.2119],[118.4766,32.168],[118.3887,31.9482],[118.916,31.5527],[118.7402,31.377],[118.8281,31.2451],[119.3555,31.2891],[119.4434,31.1572],[119.6191,31.1133],[119.6191,31.0693],[119.4434,30.6738],[119.2676,30.6299],[119.3555,30.4102],[118.916,30.3223],[118.916,29.9707],[118.7402,29.707],[118.2129,29.3994],[118.0371,29.5752],[117.5098,29.6191],[117.1582,29.9268],[117.0703,29.8389],[117.1582,29.707],[116.7188,29.6191],[116.7188,29.751],[116.8945,29.9268],[116.7188,30.0586],[116.2793,29.7949],[116.1035,29.8389],[116.1035,30.1904],[115.752,30.6738],[116.0156,31.0254],[115.5762,31.2012],[115.4004,31.4209],[115.4883,31.6846],[115.9277,31.7725],[115.8398,32.5195],[115.5762,32.4316],[115.2246,32.6074],[115.1367,32.8711],[114.873,33.0029],[114.873,33.1348],[115.3125,33.1787],[115.4004,33.5303],[115.5762,33.6621],[115.5762,33.9258],[115.6641,34.0576],[116.0156,33.9697],[116.1914,33.7061],[116.6309,33.9258]]]}},{type:'Feature',properties:{id:'35',size:'2000',name:'福建省',cp:[118.3008,25.9277],childNum:9},geometry:{type:'Polygon',coordinates:[[[118.4766,28.3008],[118.8281,28.2568],[118.7402,28.0371],[118.916,27.4658],[119.2676,27.4219],[119.6191,27.6855],[119.7949,27.29],[120.2344,27.4219],[120.4102,27.1582],[120.7617,27.0264],[120.6738,26.8945],[120.2344,26.8506],[120.2344,26.7188],[120.4102,26.6748],[120.498,26.3672],[120.2344,26.2793],[120.4102,26.1475],[120.0586,26.1914],[119.9707,25.9277],[119.7949,25.9277],[119.9707,25.4004],[119.7949,25.2686],[119.5313,25.1367],[119.4434,25.0049],[119.2676,25.0928],[118.916,24.8291],[118.6523,24.5215],[118.4766,24.5215],[118.4766,24.4336],[118.2129,24.3457],[118.2129,24.1699],[117.8613,23.9941],[117.7734,23.7744],[117.5098,23.5986],[117.1582,23.5547],[116.9824,23.9063],[116.9824,24.1699],[116.7188,24.6533],[116.543,24.6094],[116.3672,24.873],[116.2793,24.7852],[115.9277,24.917],[115.8398,25.2246],[116.0156,25.2686],[116.1914,25.8838],[116.4551,26.1035],[116.3672,26.2354],[116.6309,26.4551],[116.543,26.8066],[117.0703,27.1143],[117.1582,27.29],[116.9824,27.6416],[117.5098,27.9932],[117.7734,27.8174],[118.3008,28.0811],[118.4766,28.3008]]]}},{type:'Feature',properties:{id:'33',size:'2100',name:'浙江省',cp:[120.498,29.0918],childNum:11},geometry:{type:'Polygon',coordinates:[[[118.2129,29.3994],[118.7402,29.707],[118.916,29.9707],[118.916,30.3223],[119.3555,30.4102],[119.2676,30.6299],[119.4434,30.6738],[119.6191,31.0693],[119.6191,31.1133],[119.9707,31.1572],[120.498,30.8057],[120.9375,31.0254],[121.2891,30.6738],[121.9922,30.8057],[122.6953,30.8936],[122.8711,30.7178],[122.959,30.1465],[122.6074,30.1025],[122.6074,29.9268],[122.168,29.5313],[122.3438,28.8721],[121.9922,28.8721],[121.9922,28.4326],[121.7285,28.3447],[121.7285,28.2129],[121.4648,28.2129],[121.5527,28.0371],[121.2891,27.9492],[121.1133,27.4219],[120.6738,27.334],[120.6738,27.1582],[120.9375,27.0264],[120.7617,27.0264],[120.4102,27.1582],[120.2344,27.4219],[119.7949,27.29],[119.6191,27.6855],[119.2676,27.4219],[118.916,27.4658],[118.7402,28.0371],[118.8281,28.2568],[118.4766,28.3008],[118.4766,28.3447],[118.3887,28.7842],[118.0371,29.0479],[118.0371,29.1797],[118.2129,29.3994]]]}},{type:'Feature',properties:{id:'32',size:'1950',name:'江苏省',cp:[118.8586,32.915],childNum:13},geometry:{type:'Polygon',coordinates:[[[116.3672,34.6289],[116.4551,34.8926],[116.8066,34.9365],[117.2461,34.4531],[117.334,34.585],[117.5977,34.4531],[117.9492,34.6729],[118.125,34.6289],[118.2129,34.4092],[118.3887,34.4092],[118.4766,34.6729],[118.7402,34.7168],[118.916,35.0244],[119.2676,35.1123],[119.3555,35.0244],[119.3555,34.8486],[119.707,34.585],[120.3223,34.3652],[120.9375,33.0469],[121.0254,32.6514],[121.377,32.4756],[121.4648,32.168],[121.9043,31.9922],[121.9922,31.6846],[121.9922,31.5967],[121.2012,31.8604],[121.1133,31.7285],[121.377,31.5088],[121.2012,31.4648],[120.9375,31.0254],[120.498,30.8057],[119.9707,31.1572],[119.6191,31.1133],[119.4434,31.1572],[119.3555,31.2891],[118.8281,31.2451],[118.7402,31.377],[118.916,31.5527],[118.3887,31.9482],[118.4766,32.168],[118.6523,32.2119],[118.5645,32.5635],[119.1797,32.4756],[119.1797,32.8271],[118.916,32.959],[118.7402,32.7393],[118.3008,32.7832],[118.2129,33.2227],[118.0371,33.1348],[117.9492,33.2227],[118.125,33.75],[117.7734,33.7061],[117.5977,34.0137],[117.1582,34.0576],[116.8945,34.4092],[116.3672,34.6289]]]}},{type:'Feature',properties:{id:'50',size:'2380',name:'重庆市',cp:[107.7539,30.1904],childNum:40},geometry:{type:'Polygon',coordinates:[[[108.5449,31.6846],[108.2813,31.9043],[108.3691,32.168],[108.5449,32.2119],[109.0723,31.9482],[109.248,31.7285],[109.5996,31.7285],[109.7754,31.6846],[109.6875,31.5527],[110.127,31.377],[110.2148,31.1572],[110.0391,30.8057],[109.8633,30.8936],[109.4238,30.542],[109.248,30.6299],[109.1602,30.542],[109.0723,30.6299],[108.8086,30.498],[108.6328,30.5859],[108.457,30.4102],[108.5449,30.2344],[108.457,29.7949],[108.6328,29.8389],[108.9844,29.3115],[109.0723,29.3555],[109.248,29.1357],[109.248,28.4766],[109.0723,28.2129],[108.7207,28.2129],[108.7207,28.4766],[108.5449,28.3887],[108.5449,28.6523],[108.3691,28.6523],[108.2813,29.0918],[107.8418,29.0039],[107.8418,29.1357],[107.5781,29.2236],[107.4023,29.1797],[107.4023,28.8721],[106.875,28.7842],[106.6992,28.4766],[106.6113,28.5205],[106.6113,28.6523],[106.5234,28.7842],[106.4355,28.7842],[106.5234,28.5645],[106.3477,28.5205],[106.2598,28.8721],[105.8203,28.96],[105.7324,29.2676],[105.4688,29.3115],[105.293,29.5313],[105.7324,29.8828],[105.5566,30.1025],[105.6445,30.2783],[105.8203,30.4541],[106.2598,30.1904],[106.6113,30.3223],[106.7871,30.0146],[107.0508,30.0146],[107.4902,30.6299],[107.4023,30.7617],[107.4902,30.8496],[107.9297,30.8496],[108.1934,31.5088],[108.5449,31.6846]]]}},{type:'Feature',properties:{id:'64',size:'2100',name:'宁夏回族自治区',cp:[105.9961,37.3096],childNum:5},geometry:{type:'Polygon',coordinates:[[[104.3262,37.4414],[105.8203,37.793],[105.9082,38.7158],[106.3477,39.2871],[106.7871,39.375],[106.9629,38.9795],[106.5234,38.3203],[106.7871,38.1885],[107.3145,38.1006],[107.666,37.8809],[107.3145,37.6172],[107.3145,37.0898],[106.6113,37.0898],[106.6113,36.7822],[106.4355,36.5625],[106.5234,36.4746],[106.5234,36.2549],[106.875,36.123],[106.9629,35.8154],[106.6992,35.6836],[106.4355,35.6836],[106.5234,35.332],[106.3477,35.2441],[106.2598,35.4199],[106.084,35.376],[105.9961,35.4199],[106.084,35.4639],[105.9961,35.4639],[105.8203,35.5518],[105.7324,35.7275],[105.3809,35.7715],[105.293,35.9912],[105.4688,36.123],[105.2051,36.6943],[105.293,36.8262],[104.8535,37.2217],[104.5898,37.2217],[104.5898,37.4414],[104.3262,37.4414]]]}},{type:'Feature',properties:{id:'46',size:'4500',name:'海南省',cp:[109.9512,19.2041],childNum:18},geometry:{type:'Polygon',coordinates:[[[108.6328,19.3799],[109.0723,19.6436],[109.248,19.9512],[109.5996,20.0391],[110.0391,20.127],[110.3906,20.127],[110.5664,20.2588],[110.6543,20.2588],[111.0938,19.9512],[111.2695,19.9951],[110.6543,19.1602],[110.5664,18.6768],[110.2148,18.5889],[110.0391,18.3691],[109.8633,18.3691],[109.6875,18.1055],[108.9844,18.2813],[108.6328,18.457],[108.6328,19.3799]]]}},{type:'Feature',properties:{id:'71',size:'3000',name:'台湾省',cp:[120.0254,23.5986],childNum:1},geometry:{type:'Polygon',coordinates:[[[121.9043,25.0488],[121.9922,25.0049],[121.8164,24.7412],[121.9043,24.5654],[121.6406,24.0381],[121.377,23.1152],[121.0254,22.6758],[120.8496,22.0605],[120.7617,21.9287],[120.6738,22.3242],[120.2344,22.5879],[120.0586,23.0713],[120.1465,23.6865],[121.0254,25.0488],[121.5527,25.3125],[121.9043,25.0488]]]}},{type:'Feature',properties:{id:'11',size:'5000',name:'北京市',cp:[116.4551,40.2539],childNum:19},geometry:{type:'Polygon',coordinates:[[[117.4219,40.21],[117.334,40.1221],[117.2461,40.0781],[116.8066,39.9902],[116.8945,39.8145],[116.8945,39.6826],[116.8066,39.5947],[116.543,39.5947],[116.3672,39.4629],[116.1914,39.5947],[115.752,39.5068],[115.4883,39.6387],[115.4004,39.9463],[115.9277,40.2539],[115.752,40.5615],[116.1035,40.6055],[116.1914,40.7813],[116.4551,40.7813],[116.3672,40.9131],[116.6309,41.0449],[116.9824,40.6934],[117.4219,40.6494],[117.2461,40.5176],[117.4219,40.21]]]}},{type:'Feature',properties:{id:'12',size:'5000',name:'天津市',cp:[117.4219,39.4189],childNum:18},geometry:{type:'Polygon',coordinates:[[[116.8066,39.5947],[116.8945,39.6826],[117.1582,39.6387],[117.1582,39.8145],[117.2461,40.0781],[117.334,40.1221],[117.4219,40.21],[117.6855,40.0781],[117.6855,39.9902],[117.5098,39.9902],[117.5098,39.7705],[117.6855,39.5947],[117.9492,39.5947],[117.8613,39.4189],[118.0371,39.2432],[118.0371,39.1992],[117.8613,39.1113],[117.5977,38.6279],[117.2461,38.54],[116.7188,38.8037],[116.7188,38.9355],[116.8945,39.1113],[116.8066,39.5947]]]}},{type:'Feature',properties:{id:'31',size:'7500',name:'上海市',cp:[121.4648,31.2891],childNum:19},geometry:{type:'Polygon',coordinates:[[[120.9375,31.0254],[121.2012,31.4648],[121.377,31.5088],[121.1133,31.7285],[121.2012,31.8604],[121.9922,31.5967],[121.9043,31.1572],[121.9922,30.8057],[121.2891,30.6738],[120.9375,31.0254]]]}},{type:'Feature',properties:{id:'81',size:'18000',name:'香港特别行政区',cp:[114.1178,22.3242],childNum:1},geometry:{type:'Polygon',coordinates:[[[114.6094,22.4121],[114.5215,22.1484],[114.3457,22.1484],[113.9063,22.1484],[113.8184,22.1924],[113.9063,22.4121],[114.1699,22.5439],[114.3457,22.5439],[114.4336,22.5439],[114.4336,22.4121],[114.6094,22.4121]]]}},{type:'Feature',properties:{id:'82',size:'27',name:'澳门特别行政区',cp:[111.5547,22.1484],childNum:1},geometry:{type:'Polygon',coordinates:[[[113.5986,22.1649],[113.6096,22.1265],[113.5547,22.11],[113.5437,22.2034],[113.5767,22.2034],[113.5986,22.1649]]]}}]};
;// CONCATENATED MODULE: ./src/static/city.js
const chinaCities=[{"code":"130100","name":"石家庄市","province":"13","city":"01"},{"code":"130200","name":"唐山市","province":"13","city":"02"},{"code":"130300","name":"秦皇岛市","province":"13","city":"03"},{"code":"130400","name":"邯郸市","province":"13","city":"04"},{"code":"130500","name":"邢台市","province":"13","city":"05"},{"code":"130600","name":"保定市","province":"13","city":"06"},{"code":"130700","name":"张家口市","province":"13","city":"07"},{"code":"130800","name":"承德市","province":"13","city":"08"},{"code":"130900","name":"沧州市","province":"13","city":"09"},{"code":"131000","name":"廊坊市","province":"13","city":"10"},{"code":"131100","name":"衡水市","province":"13","city":"11"},{"code":"140100","name":"太原市","province":"14","city":"01"},{"code":"140200","name":"大同市","province":"14","city":"02"},{"code":"140300","name":"阳泉市","province":"14","city":"03"},{"code":"140400","name":"长治市","province":"14","city":"04"},{"code":"140500","name":"晋城市","province":"14","city":"05"},{"code":"140600","name":"朔州市","province":"14","city":"06"},{"code":"140700","name":"晋中市","province":"14","city":"07"},{"code":"140800","name":"运城市","province":"14","city":"08"},{"code":"140900","name":"忻州市","province":"14","city":"09"},{"code":"141000","name":"临汾市","province":"14","city":"10"},{"code":"141100","name":"吕梁市","province":"14","city":"11"},{"code":"150100","name":"呼和浩特市","province":"15","city":"01"},{"code":"150200","name":"包头市","province":"15","city":"02"},{"code":"150300","name":"乌海市","province":"15","city":"03"},{"code":"150400","name":"赤峰市","province":"15","city":"04"},{"code":"150500","name":"通辽市","province":"15","city":"05"},{"code":"150600","name":"鄂尔多斯市","province":"15","city":"06"},{"code":"150700","name":"呼伦贝尔市","province":"15","city":"07"},{"code":"150800","name":"巴彦淖尔市","province":"15","city":"08"},{"code":"150900","name":"乌兰察布市","province":"15","city":"09"},{"code":"152200","name":"兴安盟","province":"15","city":"22"},{"code":"152500","name":"锡林郭勒盟","province":"15","city":"25"},{"code":"152900","name":"阿拉善盟","province":"15","city":"29"},{"code":"210100","name":"沈阳市","province":"21","city":"01"},{"code":"210200","name":"大连市","province":"21","city":"02"},{"code":"210300","name":"鞍山市","province":"21","city":"03"},{"code":"210400","name":"抚顺市","province":"21","city":"04"},{"code":"210500","name":"本溪市","province":"21","city":"05"},{"code":"210600","name":"丹东市","province":"21","city":"06"},{"code":"210700","name":"锦州市","province":"21","city":"07"},{"code":"210800","name":"营口市","province":"21","city":"08"},{"code":"210900","name":"阜新市","province":"21","city":"09"},{"code":"211000","name":"辽阳市","province":"21","city":"10"},{"code":"211100","name":"盘锦市","province":"21","city":"11"},{"code":"211200","name":"铁岭市","province":"21","city":"12"},{"code":"211300","name":"朝阳市","province":"21","city":"13"},{"code":"211400","name":"葫芦岛市","province":"21","city":"14"},{"code":"220100","name":"长春市","province":"22","city":"01"},{"code":"220200","name":"吉林市","province":"22","city":"02"},{"code":"220300","name":"四平市","province":"22","city":"03"},{"code":"220400","name":"辽源市","province":"22","city":"04"},{"code":"220500","name":"通化市","province":"22","city":"05"},{"code":"220600","name":"白山市","province":"22","city":"06"},{"code":"220700","name":"松原市","province":"22","city":"07"},{"code":"220800","name":"白城市","province":"22","city":"08"},{"code":"222400","name":"延边朝鲜族自治州","province":"22","city":"24"},{"code":"230100","name":"哈尔滨市","province":"23","city":"01"},{"code":"230200","name":"齐齐哈尔市","province":"23","city":"02"},{"code":"230300","name":"鸡西市","province":"23","city":"03"},{"code":"230400","name":"鹤岗市","province":"23","city":"04"},{"code":"230500","name":"双鸭山市","province":"23","city":"05"},{"code":"230600","name":"大庆市","province":"23","city":"06"},{"code":"230700","name":"伊春市","province":"23","city":"07"},{"code":"230800","name":"佳木斯市","province":"23","city":"08"},{"code":"230900","name":"七台河市","province":"23","city":"09"},{"code":"231000","name":"牡丹江市","province":"23","city":"10"},{"code":"231100","name":"黑河市","province":"23","city":"11"},{"code":"231200","name":"绥化市","province":"23","city":"12"},{"code":"232700","name":"大兴安岭地区","province":"23","city":"27"},{"code":"320100","name":"南京市","province":"32","city":"01"},{"code":"320200","name":"无锡市","province":"32","city":"02"},{"code":"320300","name":"徐州市","province":"32","city":"03"},{"code":"320400","name":"常州市","province":"32","city":"04"},{"code":"320500","name":"苏州市","province":"32","city":"05"},{"code":"320600","name":"南通市","province":"32","city":"06"},{"code":"320700","name":"连云港市","province":"32","city":"07"},{"code":"320800","name":"淮安市","province":"32","city":"08"},{"code":"320900","name":"盐城市","province":"32","city":"09"},{"code":"321000","name":"扬州市","province":"32","city":"10"},{"code":"321100","name":"镇江市","province":"32","city":"11"},{"code":"321200","name":"泰州市","province":"32","city":"12"},{"code":"321300","name":"宿迁市","province":"32","city":"13"},{"code":"330100","name":"杭州市","province":"33","city":"01"},{"code":"330200","name":"宁波市","province":"33","city":"02"},{"code":"330300","name":"温州市","province":"33","city":"03"},{"code":"330400","name":"嘉兴市","province":"33","city":"04"},{"code":"330500","name":"湖州市","province":"33","city":"05"},{"code":"330600","name":"绍兴市","province":"33","city":"06"},{"code":"330700","name":"金华市","province":"33","city":"07"},{"code":"330800","name":"衢州市","province":"33","city":"08"},{"code":"330900","name":"舟山市","province":"33","city":"09"},{"code":"331000","name":"台州市","province":"33","city":"10"},{"code":"331100","name":"丽水市","province":"33","city":"11"},{"code":"340100","name":"合肥市","province":"34","city":"01"},{"code":"340200","name":"芜湖市","province":"34","city":"02"},{"code":"340300","name":"蚌埠市","province":"34","city":"03"},{"code":"340400","name":"淮南市","province":"34","city":"04"},{"code":"340500","name":"马鞍山市","province":"34","city":"05"},{"code":"340600","name":"淮北市","province":"34","city":"06"},{"code":"340700","name":"铜陵市","province":"34","city":"07"},{"code":"340800","name":"安庆市","province":"34","city":"08"},{"code":"341000","name":"黄山市","province":"34","city":"10"},{"code":"341100","name":"滁州市","province":"34","city":"11"},{"code":"341200","name":"阜阳市","province":"34","city":"12"},{"code":"341300","name":"宿州市","province":"34","city":"13"},{"code":"341500","name":"六安市","province":"34","city":"15"},{"code":"341600","name":"亳州市","province":"34","city":"16"},{"code":"341700","name":"池州市","province":"34","city":"17"},{"code":"341800","name":"宣城市","province":"34","city":"18"},{"code":"350100","name":"福州市","province":"35","city":"01"},{"code":"350200","name":"厦门市","province":"35","city":"02"},{"code":"350300","name":"莆田市","province":"35","city":"03"},{"code":"350400","name":"三明市","province":"35","city":"04"},{"code":"350500","name":"泉州市","province":"35","city":"05"},{"code":"350600","name":"漳州市","province":"35","city":"06"},{"code":"350700","name":"南平市","province":"35","city":"07"},{"code":"350800","name":"龙岩市","province":"35","city":"08"},{"code":"350900","name":"宁德市","province":"35","city":"09"},{"code":"360100","name":"南昌市","province":"36","city":"01"},{"code":"360200","name":"景德镇市","province":"36","city":"02"},{"code":"360300","name":"萍乡市","province":"36","city":"03"},{"code":"360400","name":"九江市","province":"36","city":"04"},{"code":"360500","name":"新余市","province":"36","city":"05"},{"code":"360600","name":"鹰潭市","province":"36","city":"06"},{"code":"360700","name":"赣州市","province":"36","city":"07"},{"code":"360800","name":"吉安市","province":"36","city":"08"},{"code":"360900","name":"宜春市","province":"36","city":"09"},{"code":"361000","name":"抚州市","province":"36","city":"10"},{"code":"361100","name":"上饶市","province":"36","city":"11"},{"code":"370100","name":"济南市","province":"37","city":"01"},{"code":"370200","name":"青岛市","province":"37","city":"02"},{"code":"370300","name":"淄博市","province":"37","city":"03"},{"code":"370400","name":"枣庄市","province":"37","city":"04"},{"code":"370500","name":"东营市","province":"37","city":"05"},{"code":"370600","name":"烟台市","province":"37","city":"06"},{"code":"370700","name":"潍坊市","province":"37","city":"07"},{"code":"370800","name":"济宁市","province":"37","city":"08"},{"code":"370900","name":"泰安市","province":"37","city":"09"},{"code":"371000","name":"威海市","province":"37","city":"10"},{"code":"371100","name":"日照市","province":"37","city":"11"},{"code":"371300","name":"临沂市","province":"37","city":"13"},{"code":"371400","name":"德州市","province":"37","city":"14"},{"code":"371500","name":"聊城市","province":"37","city":"15"},{"code":"371600","name":"滨州市","province":"37","city":"16"},{"code":"371700","name":"菏泽市","province":"37","city":"17"},{"code":"410100","name":"郑州市","province":"41","city":"01"},{"code":"410200","name":"开封市","province":"41","city":"02"},{"code":"410300","name":"洛阳市","province":"41","city":"03"},{"code":"410400","name":"平顶山市","province":"41","city":"04"},{"code":"410500","name":"安阳市","province":"41","city":"05"},{"code":"410600","name":"鹤壁市","province":"41","city":"06"},{"code":"410700","name":"新乡市","province":"41","city":"07"},{"code":"410800","name":"焦作市","province":"41","city":"08"},{"code":"410900","name":"濮阳市","province":"41","city":"09"},{"code":"411000","name":"许昌市","province":"41","city":"10"},{"code":"411100","name":"漯河市","province":"41","city":"11"},{"code":"411200","name":"三门峡市","province":"41","city":"12"},{"code":"411300","name":"南阳市","province":"41","city":"13"},{"code":"411400","name":"商丘市","province":"41","city":"14"},{"code":"411500","name":"信阳市","province":"41","city":"15"},{"code":"411600","name":"周口市","province":"41","city":"16"},{"code":"411700","name":"驻马店市","province":"41","city":"17"},{"code":"420100","name":"武汉市","province":"42","city":"01"},{"code":"420200","name":"黄石市","province":"42","city":"02"},{"code":"420300","name":"十堰市","province":"42","city":"03"},{"code":"420500","name":"宜昌市","province":"42","city":"05"},{"code":"420600","name":"襄阳市","province":"42","city":"06"},{"code":"420700","name":"鄂州市","province":"42","city":"07"},{"code":"420800","name":"荆门市","province":"42","city":"08"},{"code":"420900","name":"孝感市","province":"42","city":"09"},{"code":"421000","name":"荆州市","province":"42","city":"10"},{"code":"421100","name":"黄冈市","province":"42","city":"11"},{"code":"421200","name":"咸宁市","province":"42","city":"12"},{"code":"421300","name":"随州市","province":"42","city":"13"},{"code":"422800","name":"恩施土家族苗族自治州","province":"42","city":"28"},{"code":"430100","name":"长沙市","province":"43","city":"01"},{"code":"430200","name":"株洲市","province":"43","city":"02"},{"code":"430300","name":"湘潭市","province":"43","city":"03"},{"code":"430400","name":"衡阳市","province":"43","city":"04"},{"code":"430500","name":"邵阳市","province":"43","city":"05"},{"code":"430600","name":"岳阳市","province":"43","city":"06"},{"code":"430700","name":"常德市","province":"43","city":"07"},{"code":"430800","name":"张家界市","province":"43","city":"08"},{"code":"430900","name":"益阳市","province":"43","city":"09"},{"code":"431000","name":"郴州市","province":"43","city":"10"},{"code":"431100","name":"永州市","province":"43","city":"11"},{"code":"431200","name":"怀化市","province":"43","city":"12"},{"code":"431300","name":"娄底市","province":"43","city":"13"},{"code":"433100","name":"湘西土家族苗族自治州","province":"43","city":"31"},{"code":"440100","name":"广州市","province":"44","city":"01"},{"code":"440200","name":"韶关市","province":"44","city":"02"},{"code":"440300","name":"深圳市","province":"44","city":"03"},{"code":"440400","name":"珠海市","province":"44","city":"04"},{"code":"440500","name":"汕头市","province":"44","city":"05"},{"code":"440600","name":"佛山市","province":"44","city":"06"},{"code":"440700","name":"江门市","province":"44","city":"07"},{"code":"440800","name":"湛江市","province":"44","city":"08"},{"code":"440900","name":"茂名市","province":"44","city":"09"},{"code":"441200","name":"肇庆市","province":"44","city":"12"},{"code":"441300","name":"惠州市","province":"44","city":"13"},{"code":"441400","name":"梅州市","province":"44","city":"14"},{"code":"441500","name":"汕尾市","province":"44","city":"15"},{"code":"441600","name":"河源市","province":"44","city":"16"},{"code":"441700","name":"阳江市","province":"44","city":"17"},{"code":"441800","name":"清远市","province":"44","city":"18"},{"code":"441900","name":"东莞市","province":"44","city":"19"},{"code":"442000","name":"中山市","province":"44","city":"20"},{"code":"445100","name":"潮州市","province":"44","city":"51"},{"code":"445200","name":"揭阳市","province":"44","city":"52"},{"code":"445300","name":"云浮市","province":"44","city":"53"},{"code":"450100","name":"南宁市","province":"45","city":"01"},{"code":"450200","name":"柳州市","province":"45","city":"02"},{"code":"450300","name":"桂林市","province":"45","city":"03"},{"code":"450400","name":"梧州市","province":"45","city":"04"},{"code":"450500","name":"北海市","province":"45","city":"05"},{"code":"450600","name":"防城港市","province":"45","city":"06"},{"code":"450700","name":"钦州市","province":"45","city":"07"},{"code":"450800","name":"贵港市","province":"45","city":"08"},{"code":"450900","name":"玉林市","province":"45","city":"09"},{"code":"451000","name":"百色市","province":"45","city":"10"},{"code":"451100","name":"贺州市","province":"45","city":"11"},{"code":"451200","name":"河池市","province":"45","city":"12"},{"code":"451300","name":"来宾市","province":"45","city":"13"},{"code":"451400","name":"崇左市","province":"45","city":"14"},{"code":"460100","name":"海口市","province":"46","city":"01"},{"code":"460200","name":"三亚市","province":"46","city":"02"},{"code":"460300","name":"三沙市","province":"46","city":"03"},{"code":"460400","name":"儋州市","province":"46","city":"04"},{"code":"510100","name":"成都市","province":"51","city":"01"},{"code":"510300","name":"自贡市","province":"51","city":"03"},{"code":"510400","name":"攀枝花市","province":"51","city":"04"},{"code":"510500","name":"泸州市","province":"51","city":"05"},{"code":"510600","name":"德阳市","province":"51","city":"06"},{"code":"510700","name":"绵阳市","province":"51","city":"07"},{"code":"510800","name":"广元市","province":"51","city":"08"},{"code":"510900","name":"遂宁市","province":"51","city":"09"},{"code":"511000","name":"内江市","province":"51","city":"10"},{"code":"511100","name":"乐山市","province":"51","city":"11"},{"code":"511300","name":"南充市","province":"51","city":"13"},{"code":"511400","name":"眉山市","province":"51","city":"14"},{"code":"511500","name":"宜宾市","province":"51","city":"15"},{"code":"511600","name":"广安市","province":"51","city":"16"},{"code":"511700","name":"达州市","province":"51","city":"17"},{"code":"511800","name":"雅安市","province":"51","city":"18"},{"code":"511900","name":"巴中市","province":"51","city":"19"},{"code":"512000","name":"资阳市","province":"51","city":"20"},{"code":"513200","name":"阿坝藏族羌族自治州","province":"51","city":"32"},{"code":"513300","name":"甘孜藏族自治州","province":"51","city":"33"},{"code":"513400","name":"凉山彝族自治州","province":"51","city":"34"},{"code":"520100","name":"贵阳市","province":"52","city":"01"},{"code":"520200","name":"六盘水市","province":"52","city":"02"},{"code":"520300","name":"遵义市","province":"52","city":"03"},{"code":"520400","name":"安顺市","province":"52","city":"04"},{"code":"520500","name":"毕节市","province":"52","city":"05"},{"code":"520600","name":"铜仁市","province":"52","city":"06"},{"code":"522300","name":"黔西南布依族苗族自治州","province":"52","city":"23"},{"code":"522600","name":"黔东南苗族侗族自治州","province":"52","city":"26"},{"code":"522700","name":"黔南布依族苗族自治州","province":"52","city":"27"},{"code":"530100","name":"昆明市","province":"53","city":"01"},{"code":"530300","name":"曲靖市","province":"53","city":"03"},{"code":"530400","name":"玉溪市","province":"53","city":"04"},{"code":"530500","name":"保山市","province":"53","city":"05"},{"code":"530600","name":"昭通市","province":"53","city":"06"},{"code":"530700","name":"丽江市","province":"53","city":"07"},{"code":"530800","name":"普洱市","province":"53","city":"08"},{"code":"530900","name":"临沧市","province":"53","city":"09"},{"code":"532300","name":"楚雄彝族自治州","province":"53","city":"23"},{"code":"532500","name":"红河哈尼族彝族自治州","province":"53","city":"25"},{"code":"532600","name":"文山壮族苗族自治州","province":"53","city":"26"},{"code":"532800","name":"西双版纳傣族自治州","province":"53","city":"28"},{"code":"532900","name":"大理白族自治州","province":"53","city":"29"},{"code":"533100","name":"德宏傣族景颇族自治州","province":"53","city":"31"},{"code":"533300","name":"怒江傈僳族自治州","province":"53","city":"33"},{"code":"533400","name":"迪庆藏族自治州","province":"53","city":"34"},{"code":"540100","name":"拉萨市","province":"54","city":"01"},{"code":"540200","name":"日喀则市","province":"54","city":"02"},{"code":"540300","name":"昌都市","province":"54","city":"03"},{"code":"540400","name":"林芝市","province":"54","city":"04"},{"code":"540500","name":"山南市","province":"54","city":"05"},{"code":"540600","name":"那曲市","province":"54","city":"06"},{"code":"542500","name":"阿里地区","province":"54","city":"25"},{"code":"610100","name":"西安市","province":"61","city":"01"},{"code":"610200","name":"铜川市","province":"61","city":"02"},{"code":"610300","name":"宝鸡市","province":"61","city":"03"},{"code":"610400","name":"咸阳市","province":"61","city":"04"},{"code":"610500","name":"渭南市","province":"61","city":"05"},{"code":"610600","name":"延安市","province":"61","city":"06"},{"code":"610700","name":"汉中市","province":"61","city":"07"},{"code":"610800","name":"榆林市","province":"61","city":"08"},{"code":"610900","name":"安康市","province":"61","city":"09"},{"code":"611000","name":"商洛市","province":"61","city":"10"},{"code":"620100","name":"兰州市","province":"62","city":"01"},{"code":"620200","name":"嘉峪关市","province":"62","city":"02"},{"code":"620300","name":"金昌市","province":"62","city":"03"},{"code":"620400","name":"白银市","province":"62","city":"04"},{"code":"620500","name":"天水市","province":"62","city":"05"},{"code":"620600","name":"武威市","province":"62","city":"06"},{"code":"620700","name":"张掖市","province":"62","city":"07"},{"code":"620800","name":"平凉市","province":"62","city":"08"},{"code":"620900","name":"酒泉市","province":"62","city":"09"},{"code":"621000","name":"庆阳市","province":"62","city":"10"},{"code":"621100","name":"定西市","province":"62","city":"11"},{"code":"621200","name":"陇南市","province":"62","city":"12"},{"code":"622900","name":"临夏回族自治州","province":"62","city":"29"},{"code":"623000","name":"甘南藏族自治州","province":"62","city":"30"},{"code":"630100","name":"西宁市","province":"63","city":"01"},{"code":"630200","name":"海东市","province":"63","city":"02"},{"code":"632200","name":"海北藏族自治州","province":"63","city":"22"},{"code":"632300","name":"黄南藏族自治州","province":"63","city":"23"},{"code":"632500","name":"海南藏族自治州","province":"63","city":"25"},{"code":"632600","name":"果洛藏族自治州","province":"63","city":"26"},{"code":"632700","name":"玉树藏族自治州","province":"63","city":"27"},{"code":"632800","name":"海西蒙古族藏族自治州","province":"63","city":"28"},{"code":"640100","name":"银川市","province":"64","city":"01"},{"code":"640200","name":"石嘴山市","province":"64","city":"02"},{"code":"640300","name":"吴忠市","province":"64","city":"03"},{"code":"640400","name":"固原市","province":"64","city":"04"},{"code":"640500","name":"中卫市","province":"64","city":"05"},{"code":"650100","name":"乌鲁木齐市","province":"65","city":"01"},{"code":"650200","name":"克拉玛依市","province":"65","city":"02"},{"code":"650400","name":"吐鲁番市","province":"65","city":"04"},{"code":"650500","name":"哈密市","province":"65","city":"05"},{"code":"652300","name":"昌吉回族自治州","province":"65","city":"23"},{"code":"652700","name":"博尔塔拉蒙古自治州","province":"65","city":"27"},{"code":"652800","name":"巴音郭楞蒙古自治州","province":"65","city":"28"},{"code":"652900","name":"阿克苏地区","province":"65","city":"29"},{"code":"653000","name":"克孜勒苏柯尔克孜自治州","province":"65","city":"30"},{"code":"653100","name":"喀什地区","province":"65","city":"31"},{"code":"653200","name":"和田地区","province":"65","city":"32"},{"code":"654000","name":"伊犁哈萨克自治州","province":"65","city":"40"},{"code":"654200","name":"塔城地区","province":"65","city":"42"},{"code":"654300","name":"阿勒泰地区","province":"65","city":"43"},{"code":"429000","name":"湖北省-自治区直辖县级行政区划","province":"42","city":"90"},{"code":"469000","name":"海南省-自治区直辖县级行政区划","province":"46","city":"90"},{"code":"659000","name":"新疆维吾尔自治区-自治区直辖县级行政区划","province":"65","city":"90"},{"code":"419000","name":"河南省-省直辖县级行政区划","province":"41","city":"90"},{"code":"110000","name":"北京市","province":"11"},{"code":"120000","name":"天津市","province":"12"},{"code":"130000","name":"河北省","province":"13"},{"code":"140000","name":"山西省","province":"14"},{"code":"150000","name":"内蒙古自治区","province":"15"},{"code":"210000","name":"辽宁省","province":"21"},{"code":"220000","name":"吉林省","province":"22"},{"code":"230000","name":"黑龙江省","province":"23"},{"code":"310000","name":"上海市","province":"31"},{"code":"320000","name":"江苏省","province":"32"},{"code":"330000","name":"浙江省","province":"33"},{"code":"340000","name":"安徽省","province":"34"},{"code":"350000","name":"福建省","province":"35"},{"code":"360000","name":"江西省","province":"36"},{"code":"370000","name":"山东省","province":"37"},{"code":"410000","name":"河南省","province":"41"},{"code":"420000","name":"湖北省","province":"42"},{"code":"430000","name":"湖南省","province":"43"},{"code":"440000","name":"广东省","province":"44"},{"code":"450000","name":"广西壮族自治区","province":"45"},{"code":"460000","name":"海南省","province":"46"},{"code":"500000","name":"重庆市","province":"50"},{"code":"510000","name":"四川省","province":"51"},{"code":"520000","name":"贵州省","province":"52"},{"code":"530000","name":"云南省","province":"53"},{"code":"540000","name":"西藏自治区","province":"54"},{"code":"610000","name":"陕西省","province":"61"},{"code":"620000","name":"甘肃省","province":"62"},{"code":"630000","name":"青海省","province":"63"},{"code":"640000","name":"宁夏回族自治区","province":"64"},{"code":"650000","name":"新疆维吾尔自治区","province":"65"},{"code":"710000","name":"台湾省","province":"71"},{"code":"810000","name":"香港特别行政区","province":"81"},{"code":"820000","name":"澳门特别行政区","province":"82"}];
;// CONCATENATED MODULE: ./src/utils/const.js
// const
const MAPBOX_TOKEN='pk.eyJ1IjoieWlob25nMDYxOCIsImEiOiJja2J3M28xbG4wYzl0MzJxZm0ya2Fua2p2In0.PNKfkeQwYuyGOTT_x9BJ4Q';const MUNICIPALITY_CITIES_ARR=['北京市','上海市','天津市','重庆市','香港特别行政区','澳门特别行政区'];const MAP_LAYER_LIST=['road-label','waterway-label','natural-line-label','natural-point-label','water-line-label','water-point-label','poi-label','airport-label','settlement-subdivision-label','settlement-label','state-label','country-label'];// styling: set to `true` if you want dash-line route
const USE_DASH_LINE=true;// styling: route line opacity: [0, 1]
const LINE_OPACITY=0.4;// styling: map height
const MAP_HEIGHT=600;//set to `false` if you want to hide the road label characters
const ROAD_LABEL_DISPLAY=true;// IF you outside China please make sure IS_CHINESE = false
const IS_CHINESE=true;const USE_ANIMATION_FOR_GRID=false;const CHINESE_INFO_MESSAGE=(yearLength,year)=>{const yearStr=year==='Total'?'所有':` ${year} `;return`我用 App 记录自己跑步 ${yearLength} 年了，下面列表展示的是${yearStr}的数据`;};const ENGLISH_INFO_MESSAGE=(yearLength,year)=>`Running Journey with ${yearLength} Years, the table shows year ${year} data`;// not support English for now
const CHINESE_LOCATION_INFO_MESSAGE_FIRST='我跑过了一些地方，希望随着时间推移，地图点亮的地方越来越多';const CHINESE_LOCATION_INFO_MESSAGE_SECOND='不要停下来，不要停下奔跑的脚步';const INFO_MESSAGE=IS_CHINESE?CHINESE_INFO_MESSAGE:ENGLISH_INFO_MESSAGE;const FULL_MARATHON_RUN_TITLE=IS_CHINESE?'全程马拉松':'Full Marathon';const HALF_MARATHON_RUN_TITLE=IS_CHINESE?'半程马拉松':'Half Marathon';const MORNING_RUN_TITLE=IS_CHINESE?'清晨跑步':'Morning Run';const MIDDAY_RUN_TITLE=IS_CHINESE?'午间跑步':'Midday Run';const AFTERNOON_RUN_TITLE=IS_CHINESE?'午后跑步':'Afternoon Run';const EVENING_RUN_TITLE=IS_CHINESE?'傍晚跑步':'Evening Run';const NIGHT_RUN_TITLE=IS_CHINESE?'夜晚跑步':'Night Run';const RUN_TITLES={FULL_MARATHON_RUN_TITLE,HALF_MARATHON_RUN_TITLE,MORNING_RUN_TITLE,MIDDAY_RUN_TITLE,AFTERNOON_RUN_TITLE,EVENING_RUN_TITLE,NIGHT_RUN_TITLE};const nike='rgb(224,237,94)';// if you want change the main color change here src/styles/variables.scss
// If your map has an offset please change this line
// issues #92 and #198
const NEED_FIX_MAP=false;const MAIN_COLOR=nike;const PROVINCE_FILL_COLOR='#47b8e0';
;// CONCATENATED MODULE: ./src/utils/utils.js
const titleForShow=run=>{const date=run.start_date_local.slice(0,11);const distance=(run.distance/1000.0).toFixed(1);let name='Run';if(run.name.slice(0,7)==='Running'){name='run';}if(run.name){name=run.name;}return`${name} ${date} ${distance} KM ${!run.summary_polyline?'(No map data for this run)':''}`;};const formatPace=d=>{if(Number.isNaN(d))return'0';const pace=1000.0/60.0*(1.0/d);const minutes=Math.floor(pace);const seconds=Math.floor((pace-minutes)*60.0);return`${minutes}'${seconds.toFixed(0).toString().padStart(2,'0')}"`;};const formatRunTime=(distance,pace)=>{if(Number.isNaN(distance)||Number.isNaN(pace)){return'0min';}const formatPace=1000.0/60.0*(1.0/pace);const minutes=Math.floor(formatPace*distance);if(minutes===0){const seconds=Math.floor((formatPace*distance-minutes)*60.0);return seconds+'s';}return minutes+'min';};// for scroll to the map
const scrollToMap=()=>{const el=document.querySelector('.fl.w-100.w-70-l');const rect=el.getBoundingClientRect();window.scroll(rect.left+window.scrollX,rect.top+window.scrollY);};const cities=chinaCities.map(c=>c.name);// what about oversea?
const locationForRun=run=>{let location=run.location_country;let[city,province,country]=['','',''];if(location){// Only for Chinese now
// should fiter 臺灣
if(location.indexOf('臺灣')>-1){const taiwan='台湾';location=location.replace('臺灣',taiwan);const _locArr=location.split(',').map(item=>item.trim());const _locArrLen=_locArr.length;// directly repalce last item with 中国
_locArr[_locArrLen-1]='中国';// if location not contain '台湾省', insert it before zip code(posistion is _locArrLen-2)
if(_locArr.indexOf(`${taiwan}省`)===-1){_locArr.splice(_locArrLen-2,0,`${taiwan}省`);}location=_locArr.join(',');}const cityMatch=location.match(/[\u4e00-\u9fa5]{2,}(市|自治州)/);const provinceMatch=location.match(/[\u4e00-\u9fa5]{2,}(省|自治区)/);if(cityMatch){[city]=cityMatch;if(!cities.includes(city)){city='';}}if(provinceMatch){[province]=provinceMatch;}const l=location.split(',');// or to handle keep location format
let countryMatch=l[l.length-1].match(/[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/);if(!countryMatch&&l.length>=3){countryMatch=l[2].match(/[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/);}if(countryMatch){[country]=countryMatch;}}if(MUNICIPALITY_CITIES_ARR.includes(city)){province=city;}return{country,province,city};};const intComma=(x='')=>{if(x.toString().length<=5){return x;}return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');};const pathForRun=run=>{try{const c=polyline.decode(run.summary_polyline);// reverse lat long for mapbox
c.forEach(arr=>{[arr[0],arr[1]]=!NEED_FIX_MAP?[arr[1],arr[0]]:gcoord_esm.transform([arr[1],arr[0]],gcoord_esm.GCJ02,gcoord_esm.WGS84);});return c;}catch(err){return[];}};const geoJsonForRuns=runs=>({type:'FeatureCollection',features:runs.map(run=>{const points=pathForRun(run);if(!points){return null;}return{type:'Feature',geometry:{type:'LineString',coordinates:points}};})});const geoJsonForMap=()=>chinaGeojson;const titleForRun=run=>{const runDistance=run.distance/1000;const runHour=+run.start_date_local.slice(11,13);if(runDistance>20&&runDistance<40){return RUN_TITLES.HALF_MARATHON_RUN_TITLE;}if(runDistance>=40){return RUN_TITLES.FULL_MARATHON_RUN_TITLE;}if(runHour>=0&&runHour<=10){return RUN_TITLES.MORNING_RUN_TITLE;}if(runHour>10&&runHour<=14){return RUN_TITLES.MIDDAY_RUN_TITLE;}if(runHour>14&&runHour<=18){return RUN_TITLES.AFTERNOON_RUN_TITLE;}if(runHour>18&&runHour<=21){return RUN_TITLES.EVENING_RUN_TITLE;}return RUN_TITLES.NIGHT_RUN_TITLE;};const applyToArray=(func,array)=>func.apply(Math,array);const getBoundsForGeoData=geoData=>{const{features}=geoData;let points;// find first have data
for(const f of features){if(f.geometry.coordinates.length){points=f.geometry.coordinates;break;}}if(!points){return{};}// Calculate corner values of bounds
const pointsLong=points.map(point=>point[0]);const pointsLat=points.map(point=>point[1]);const cornersLongLat=[[applyToArray(Math.min,pointsLong),applyToArray(Math.min,pointsLat)],[applyToArray(Math.max,pointsLong),applyToArray(Math.max,pointsLat)]];const viewport=new WebMercatorViewport({width:800,height:600}).fitBounds(cornersLongLat,{padding:200});let{longitude,latitude,zoom}=viewport;if(features.length>1){zoom=11.5;}return{longitude,latitude,zoom};};const filterYearRuns=(run,year)=>{if(run&&run.start_date_local){return run.start_date_local.slice(0,4)===year;}return false;};const filterCityRuns=(run,city)=>{if(run&&run.location_country){return run.location_country.includes(city);}return false;};const filterTitleRuns=(run,title)=>titleForRun(run)===title;const filterAndSortRuns=(activities,item,filterFunc,sortFunc)=>{let s=activities;if(item!=='Total'){s=activities.filter(run=>filterFunc(run,item));}return s.sort(sortFunc);};const sortDateFunc=(a,b)=>new Date(b.start_date_local.replace(' ','T'))-new Date(a.start_date_local.replace(' ','T'));const sortDateFuncReverse=(a,b)=>sortDateFunc(b,a);
;// CONCATENATED MODULE: ./src/components/Stat/index.jsx
const divStyle={fontWeight:'700'};const Stat=({value,description,className,citySize,onClick})=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:`${className} pb2 w-100`,onClick:onClick},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("span",{className:`f${citySize||1} fw9 i`,style:divStyle},intComma(value)),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("span",{className:"f3 fw6 i"},description));/* harmony default export */ const components_Stat = (Stat);
// EXTERNAL MODULE: ./.cache/gatsby-browser-entry.js + 6 modules
var gatsby_browser_entry = __webpack_require__(4718);
;// CONCATENATED MODULE: ./src/hooks/useActivities.js
const useActivities=()=>{const{allActivitiesJson}=(0,gatsby_browser_entry.useStaticQuery)("3278082143");const activities=allActivitiesJson.nodes;const cities={};const runPeriod={};const provinces=new Set();const countries=new Set();let years=new Set();let thisYear='';activities.forEach(run=>{const location=locationForRun(run);const periodName=titleForRun(run);if(periodName){runPeriod[periodName]=runPeriod[periodName]?runPeriod[periodName]+1:1;}const{city,province,country}=location;// drop only one char city
if(city.length>1){cities[city]=cities[city]?cities[city]+run.distance:run.distance;}if(province)provinces.add(province);if(country)countries.add(country);const year=run.start_date_local.slice(0,4);years.add(year);});years=[...years].sort().reverse();if(years)[thisYear]=years;// set current year as first one of years array
return{activities,years,countries:[...countries],provinces:[...provinces],cities,runPeriod,thisYear};};/* harmony default export */ const hooks_useActivities = (useActivities);
;// CONCATENATED MODULE: ./src/hooks/useHover.js
const useHover=()=>{const{0:hovered,1:setHovered}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)();const{0:timer,1:setTimer}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)();const eventHandlers={onMouseOver(){setTimer(setTimeout(()=>setHovered(true),700));},onMouseOut(){clearTimeout(timer);setHovered(false);}};return[hovered,eventHandlers];};/* harmony default export */ const hooks_useHover = (useHover);
;// CONCATENATED MODULE: ./src/components/YearStat/style.module.scss
// Exports
/* harmony default export */ const style_module = ({
	"yearSVG": "style-module--yearSVG--347ec"
});

;// CONCATENATED MODULE: ./src/components/YearStat/index.jsx
const YearStat=({year,onClick})=>{let{activities:runs,years}=hooks_useActivities();// for hover
const[hovered,eventHandlers]=hooks_useHover();// lazy Component
const YearSVG=/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().lazy(()=>__webpack_require__(4147)(`./year_${year}.svg`).catch(()=>({default:()=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null)})));if(years.includes(year)){runs=runs.filter(run=>run.start_date_local.slice(0,4)===year);}let sumDistance=0;let streak=0;let pace=0;let paceNullCount=0;let heartRate=0;let heartRateNullCount=0;runs.forEach(run=>{sumDistance+=run.distance||0;if(run.average_speed){pace+=run.average_speed;}else{paceNullCount++;}if(run.average_heartrate){heartRate+=run.average_heartrate;}else{heartRateNullCount++;}if(run.streak){streak=Math.max(streak,run.streak);}});sumDistance=(sumDistance/1000.0).toFixed(1);const avgPace=formatPace(pace/(runs.length-paceNullCount));const hasHeartRate=!(heartRate===0);const avgHeartRate=(heartRate/(runs.length-heartRateNullCount)).toFixed(0);return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",Object.assign({style:{cursor:'pointer'},onClick:()=>onClick(year)},eventHandlers),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:year,description:" Journey"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:runs.length,description:" Runs"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:sumDistance,description:" KM"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:avgPace,description:" Avg Pace"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:`${streak} day`,description:" Streak",className:"mb0 pb0"}),hasHeartRate&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:avgHeartRate,description:" Avg Heart Rate"})),hovered&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement((external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default()).Suspense,{fallback:"loading..."},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(YearSVG,{className:style_module.yearSVG})),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}));};/* harmony default export */ const components_YearStat = (YearStat);
;// CONCATENATED MODULE: ./src/components/LocationStat/CitiesStat.jsx
// only support China for now
const CitiesStat=({onClick})=>{const{cities}=hooks_useActivities();const citiesArr=Object.entries(cities);citiesArr.sort((a,b)=>b[1]-a[1]);return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{style:{cursor:'pointer'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",null,citiesArr.map(([city,distance])=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{key:city,value:city,description:` ${(distance/1000).toFixed(0)} KM`,citySize:3,onClick:()=>onClick(city)}))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}));};/* harmony default export */ const LocationStat_CitiesStat = (CitiesStat);
;// CONCATENATED MODULE: ./src/components/LocationStat/LocationSummary.jsx
// only support China for now
const LocationSummary=()=>{const{years,countries,provinces,cities}=hooks_useActivities();return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{style:{cursor:'pointer'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",null,years&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:`${years.length}`,description:" \u5E74\u91CC\u6211\u8DD1\u8FC7"}),countries&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:countries.length,description:" \u4E2A\u56FD\u5BB6"}),provinces&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:provinces.length,description:" \u4E2A\u7701\u4EFD"}),cities&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{value:Object.keys(cities).length,description:" \u4E2A\u57CE\u5E02"})),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}));};/* harmony default export */ const LocationStat_LocationSummary = (LocationSummary);
;// CONCATENATED MODULE: ./src/components/LocationStat/PeriodStat.jsx
const PeriodStat=({onClick})=>{const{runPeriod}=hooks_useActivities();const periodArr=Object.entries(runPeriod);periodArr.sort((a,b)=>b[1]-a[1]);return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{style:{cursor:'pointer'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",null,periodArr.map(([period,times])=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_Stat,{key:period,value:period,description:` ${times} Runs`,citySize:3,onClick:()=>onClick(period)}))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}));};/* harmony default export */ const LocationStat_PeriodStat = (PeriodStat);
;// CONCATENATED MODULE: ./src/components/LocationStat/index.jsx
const LocationStat=({changeYear,changeCity,changeTitle})=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"fl w-100 w-30-l pb5 pr5-l"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",{className:"pb4",style:{paddingBottom:'0rem'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("p",{style:{lineHeight:1.8}},CHINESE_LOCATION_INFO_MESSAGE_FIRST,".",/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("br",null),CHINESE_LOCATION_INFO_MESSAGE_SECOND,".",/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("br",null),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("br",null),"Yesterday you said tomorrow.")),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(LocationStat_LocationSummary,null),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(LocationStat_CitiesStat,{onClick:changeCity}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(LocationStat_PeriodStat,{onClick:changeTitle}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_YearStat,{year:"Total",onClick:changeYear}));/* harmony default export */ const components_LocationStat = (LocationStat);
// EXTERNAL MODULE: ./node_modules/@mapbox/mapbox-gl-language/index.js
var mapbox_gl_language = __webpack_require__(9167);
var mapbox_gl_language_default = /*#__PURE__*/__webpack_require__.n(mapbox_gl_language);
// EXTERNAL MODULE: ./assets/end.svg
var end = __webpack_require__(3950);
var end_default = /*#__PURE__*/__webpack_require__.n(end);
// EXTERNAL MODULE: ./assets/start.svg
var start = __webpack_require__(9274);
var start_default = /*#__PURE__*/__webpack_require__.n(start);
;// CONCATENATED MODULE: ./src/components/RunMap/style.module.scss
// Exports
/* harmony default export */ const RunMap_style_module = ({
	"locationSVG": "style-module--locationSVG--2adbd",
	"buttons": "style-module--buttons--4da44",
	"button": "style-module--button--1573e",
	"fullscreenButton": "style-module--fullscreenButton--4aa1d",
	"runTitle": "style-module--runTitle--09504"
});

;// CONCATENATED MODULE: ./src/components/RunMap/RunMaker.jsx
const RunMarker=({startLon,startLat,endLon,endLat})=>{const size=20;return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(marker,{key:"maker_start",longitude:startLon,latitude:startLat},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{style:{transform:`translate(${-size/2}px,${-size}px)`,maxWidth:'25px'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement((start_default()),{className:RunMap_style_module.locationSVG}))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(marker,{key:"maker_end",longitude:endLon,latitude:endLat},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{style:{transform:`translate(${-size/2}px,${-size}px)`,maxWidth:'25px'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement((end_default()),{className:RunMap_style_module.locationSVG}))));};/* harmony default export */ const RunMaker = (RunMarker);
;// CONCATENATED MODULE: ./src/components/RunMap/RunMapButtons.jsx
const RunMapButtons=({changeYear,thisYear,mapButtonYear})=>{const elements=document.getElementsByClassName(RunMap_style_module.button);const{years}=hooks_useActivities();const yearsButtons=years.slice();yearsButtons.push('Total');const{0:index,1:setIndex}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(0);const handleClick=(e,year)=>{const elementIndex=yearsButtons.indexOf(year);e.target.style.color=MAIN_COLOR;if(index!==elementIndex){elements[index].style.color='white';}setIndex(elementIndex);};return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("ul",{className:RunMap_style_module.buttons},yearsButtons.map(year=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("li",{key:`${year}button`,style:{color:year===thisYear?MAIN_COLOR:'white'},year:year,onClick:e=>{changeYear(year);handleClick(e,year);},className:RunMap_style_module.button},year))));};/* harmony default export */ const RunMap_RunMapButtons = (RunMapButtons);
;// CONCATENATED MODULE: ./src/components/RunMap/index.jsx
const RunMap=({title,viewport,setViewport,changeYear,geoData,thisYear,mapButtonYear})=>{const{provinces}=hooks_useActivities();const mapRef=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useRef)();const mapRefCallback=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useCallback)(ref=>{if(ref!==null){mapRef.current=ref;const map=ref.getMap();if(map&&IS_CHINESE){map.addControl(new (mapbox_gl_language_default())({defaultLanguage:'zh-Hans'}));if(!ROAD_LABEL_DISPLAY){// todo delete layers
map.on('load',()=>{MAP_LAYER_LIST.forEach(layerId=>{map.removeLayer(layerId);});});}}}},[mapRef]);const filterProvinces=provinces.slice();// for geojson format
filterProvinces.unshift('in','name');const isBigMap=viewport.zoom<=3;if(isBigMap&&IS_CHINESE){geoData=geoJsonForMap();}const isSingleRun=geoData.features.length===1&&geoData.features[0].geometry.coordinates.length;let startLon;let startLat;let endLon;let endLat;if(isSingleRun){const points=geoData.features[0].geometry.coordinates;[startLon,startLat]=points[0];[endLon,endLat]=points[points.length-1];}let dash=USE_DASH_LINE&&!isSingleRun?[2,2]:[2,0];return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(interactive_map,Object.assign({},viewport,{width:"100%",height:MAP_HEIGHT,mapStyle:"mapbox://styles/mapbox/dark-v10",onViewportChange:setViewport,ref:mapRefCallback,mapboxApiAccessToken:MAPBOX_TOKEN}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(RunMap_RunMapButtons,{changeYear:changeYear,thisYear:thisYear,mapButtonYear:mapButtonYear}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(fullscreen_control,{className:RunMap_style_module.fullscreenButton}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(source,{id:"data",type:"geojson",data:geoData},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_layer,{id:"province",type:"fill",paint:{'fill-color':PROVINCE_FILL_COLOR},filter:filterProvinces}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_layer,{id:"runs2",type:"line",paint:{'line-color':MAIN_COLOR,'line-width':isBigMap?1:2,'line-dasharray':dash,'line-opacity':isSingleRun?1:LINE_OPACITY},layout:{'line-join':'round','line-cap':'round'}})),isSingleRun&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(RunMaker,{startLat:startLat,startLon:startLon,endLat:endLat,endLon:endLon}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("span",{className:RunMap_style_module.runTitle},title));};/* harmony default export */ const components_RunMap = (RunMap);
;// CONCATENATED MODULE: ./src/components/RunTable/style.module.scss
// Exports
/* harmony default export */ const RunTable_style_module = ({
	"runTable": "style-module--runTable--84570",
	"runRow": "style-module--runRow--42c85",
	"tableContainer": "style-module--tableContainer--b302a",
	"runDate": "style-module--runDate--b8f52"
});

;// CONCATENATED MODULE: ./src/components/RunTable/RunRow.jsx
const RunRow=({runs,run,locateActivity,runIndex,setRunIndex})=>{const distance=(run.distance/1000.0).toFixed(1);const pace=run.average_speed;const paceParts=pace?formatPace(pace):null;const heartRate=run.average_heartrate;const runTime=formatRunTime(distance,pace);// change click color
const handleClick=(e,runs,run)=>{const elementIndex=runs.indexOf(run);e.target.parentElement.style.color='red';const elements=document.getElementsByClassName(RunTable_style_module.runRow);if(runIndex!==-1&&elementIndex!==runIndex){elements[runIndex].style.color=MAIN_COLOR;}setRunIndex(elementIndex);};return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("tr",{className:RunTable_style_module.runRow,key:run.start_date_local,onClick:e=>{handleClick(e,runs,run);locateActivity(run);}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",null,titleForRun(run)),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",null,distance),pace&&/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",null,paceParts),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",null,heartRate&&heartRate.toFixed(0)),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",null,runTime),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("td",{className:RunTable_style_module.runDate},run.start_date_local));};/* harmony default export */ const RunTable_RunRow = (RunRow);
;// CONCATENATED MODULE: ./src/components/RunTable/index.jsx
const RunTable=({runs,locateActivity,setActivity,runIndex,setRunIndex})=>{const{0:sortFuncInfo,1:setSortFuncInfo}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)('');// TODO refactor?
const sortKMFunc=(a,b)=>sortFuncInfo==='KM'?a.distance-b.distance:b.distance-a.distance;const sortPaceFunc=(a,b)=>sortFuncInfo==='Pace'?a.average_speed-b.average_speed:b.average_speed-a.average_speed;const sortBPMFunc=(a,b)=>sortFuncInfo==='BPM'?a.average_heartrate-b.average_heartrate:b.average_heartrate-a.average_heartrate;const sortRunTimeFunc=(a,b)=>{if(Number.isNaN(a.distance)||Number.isNaN(b.distance)||Number.isNaN(a.average_speed)||Number.isNaN(b.average_speed)){return 0;}const aDistance=(a.distance/1000.0).toFixed(1);const bDistance=(b.distance/1000.0).toFixed(1);const aPace=1000.0/60.0*(1.0/a.average_speed);const bPace=1000.0/60.0*(1.0/b.average_speed);if(sortFuncInfo==='Time'){return aDistance*aPace-bDistance*bPace;}else{return bDistance*bPace-aDistance*aPace;}};const sortDateFuncClick=sortFuncInfo==='Date'?sortDateFunc:sortDateFuncReverse;const sortFuncMap=new Map([['KM',sortKMFunc],['Pace',sortPaceFunc],['BPM',sortBPMFunc],['Time',sortRunTimeFunc],['Date',sortDateFuncClick]]);const handleClick=e=>{const funcName=e.target.innerHTML;if(sortFuncInfo===funcName){setSortFuncInfo('');}else{setSortFuncInfo(funcName);}const f=sortFuncMap.get(e.target.innerHTML);if(runIndex!==-1){const el=document.getElementsByClassName(RunTable_style_module.runRow);el[runIndex].style.color=MAIN_COLOR;}setActivity(runs.sort(f));};return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:RunTable_style_module.tableContainer},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("table",{className:RunTable_style_module.runTable,cellSpacing:"0",cellPadding:"0"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("thead",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("tr",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("th",null),Array.from(sortFuncMap.keys()).map(k=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("th",{key:k,onClick:e=>handleClick(e)},k)))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("tbody",null,runs.map(run=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(RunTable_RunRow,{runs:runs,run:run,key:run.run_id,locateActivity:locateActivity,runIndex:runIndex,setRunIndex:setRunIndex})))));};/* harmony default export */ const components_RunTable = (RunTable);
// EXTERNAL MODULE: ./assets/github.svg
var github = __webpack_require__(1316);
var github_default = /*#__PURE__*/__webpack_require__.n(github);
// EXTERNAL MODULE: ./assets/grid.svg
var grid = __webpack_require__(1502);
var grid_default = /*#__PURE__*/__webpack_require__.n(grid);
;// CONCATENATED MODULE: ./src/components/SVGStat/style.module.scss
// Exports
/* harmony default export */ const SVGStat_style_module = ({
	"runSVG": "style-module--runSVG--e35c5"
});

;// CONCATENATED MODULE: ./src/components/SVGStat/index.jsx
const SVGStat=()=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement((github_default()),{className:SVGStat_style_module.runSVG}),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement((grid_default()),{className:SVGStat_style_module.runSVG}));/* harmony default export */ const components_SVGStat = (SVGStat);
;// CONCATENATED MODULE: ./src/components/YearsStat/index.jsx
const YearsStat=({year,onClick})=>{const{years}=hooks_useActivities();// make sure the year click on front
let yearsArrayUpdate=years.slice();yearsArrayUpdate.push('Total');yearsArrayUpdate=yearsArrayUpdate.filter(x=>x!==year);yearsArrayUpdate.unshift(year);// for short solution need to refactor
return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"fl w-100-l pb5 pr5-l"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("section",{className:"pb4",style:{paddingBottom:'0rem'}},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("p",{style:{lineHeight:1.8}},INFO_MESSAGE(years.length,year),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("br",null))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("hr",{color:"red"}),yearsArrayUpdate.map(year=>/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_YearStat,{key:year,year:year,onClick:onClick})),yearsArrayUpdate.hasOwnProperty('Total')?/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_YearStat,{key:"Total",year:"Total",onClick:onClick}):/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",null));};/* harmony default export */ const components_YearsStat = (YearsStat);
// EXTERNAL MODULE: ./src/hooks/useSiteMetadata.js
var useSiteMetadata = __webpack_require__(2712);
;// CONCATENATED MODULE: ./src/pages/index.jsx
const Index=()=>{const{siteTitle}=(0,useSiteMetadata/* default */.Z)();const{activities,thisYear}=hooks_useActivities();const{0:year,1:setYear}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(thisYear);const{0:runIndex,1:setRunIndex}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(-1);const{0:runs,1:setActivity}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(filterAndSortRuns(activities,year,filterYearRuns,sortDateFunc));const{0:title,1:setTitle}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)('');const{0:geoData,1:setGeoData}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)(geoJsonForRuns(runs));// for auto zoom
const bounds=getBoundsForGeoData(geoData);const{0:intervalId,1:setIntervalId}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)();const{0:viewport,1:setViewport}=(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useState)({...bounds});const changeByItem=(item,name,func,isChanged)=>{scrollToMap();setActivity(filterAndSortRuns(activities,item,func,sortDateFunc));// if the year not change, we do not need to setYear
if(!isChanged){setRunIndex(-1);setTitle(`${item} ${name} Running Heatmap`);}};const changeYear=y=>{const isChanged=y===year;// default year
setYear(y);if(viewport.zoom>3){setViewport({...bounds});}changeByItem(y,'Year',filterYearRuns,isChanged);clearInterval(intervalId);};const changeCity=city=>{changeByItem(city,'City',filterCityRuns,false);};const changeTitle=title=>{changeByItem(title,'Title',filterTitleRuns,false);};const locateActivity=run=>{setGeoData(geoJsonForRuns([run]));setTitle(titleForShow(run));clearInterval(intervalId);scrollToMap();};(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(()=>{setViewport({...bounds});},[geoData]);(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(()=>{const runsNum=runs.length;// maybe change 20 ?
const sliceNume=runsNum>=20?runsNum/20:1;let i=sliceNume;const id=setInterval(()=>{if(i>=runsNum){clearInterval(id);}const tempRuns=runs.slice(0,i);setGeoData(geoJsonForRuns(tempRuns));i+=sliceNume;},100);setIntervalId(id);},[runs]);// TODO refactor
(0,external_D_dev_project_github_tt_running_page_node_modules_react_index_js_.useEffect)(()=>{if(year!=='Total'){return;}let rectArr=document.querySelectorAll('rect');if(rectArr.length!==0){rectArr=Array.from(rectArr).slice(1);}rectArr.forEach(rect=>{const rectColor=rect.getAttribute('fill');// not run has no click event
if(rectColor!=='#444444'){const runDate=rect.innerHTML;// ingnore the error
const[runName]=runDate.match(/\d{4}-\d{1,2}-\d{1,2}/)||[];const runLocate=runs.filter(r=>r.start_date_local.slice(0,10)===runName).sort((a,b)=>b.distance-a.distance)[0];// do not add the event next time
// maybe a better way?
if(runLocate){rect.addEventListener('click',()=>locateActivity(runLocate),false);}}});let polylineArr=document.querySelectorAll('polyline');if(polylineArr.length!==0){polylineArr=Array.from(polylineArr).slice(1);}// add picked runs svg event
polylineArr.forEach(polyline=>{// not run has no click event
const runDate=polyline.innerHTML;// `${+thisYear + 1}` ==> 2021
const[runName]=runDate.match(/\d{4}-\d{1,2}-\d{1,2}/)||[`${+thisYear+1}`];const run=runs.filter(r=>r.start_date_local.slice(0,10)===runName).sort((a,b)=>b.distance-a.distance)[0];// do not add the event next time
// maybe a better way?
if(run){polyline.addEventListener('click',()=>locateActivity(run),false);}});},[year]);return/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(Layout/* default */.Z,null,/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"mb5"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"fl w-30-l"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("h1",{className:"f1 fw9 i"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("a",{href:"/"},siteTitle)),viewport.zoom<=3&&IS_CHINESE?/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_LocationStat,{changeYear:changeYear,changeCity:changeCity,changeTitle:changeTitle}):/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_YearsStat,{year:year,onClick:changeYear})),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement("div",{className:"fl w-100 w-70-l"},/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_RunMap,{runs:runs,year:year,title:title,viewport:viewport,geoData:geoData,setViewport:setViewport,changeYear:changeYear,thisYear:year}),year==='Total'?/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_SVGStat,null):/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(components_RunTable,{runs:runs,year:year,locateActivity:locateActivity,setActivity:setActivity,runIndex:runIndex,setRunIndex:setRunIndex}))),/*#__PURE__*/external_D_dev_project_github_tt_running_page_node_modules_react_index_js_default().createElement(Analytics,null));};/* harmony default export */ const pages = (Index);

/***/ }),

/***/ 3950:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var React = __webpack_require__(3691);

function End (props) {
    return React.createElement("svg",props,React.createElement("g",{"id":"Page-1","fill":"none","fillRule":"evenodd"},React.createElement("g",{"id":"037---Waypoint-Flag","fillRule":"nonzero","transform":"translate(-1 -1)"},[React.createElement("path",{"id":"Shape","d":"m58.44 30.6c-11.88 14.2-32.78-3.93-44.27 11.64l-.66-2.34v-.01c-2.29-8.19-4.58-16.3833333-6.87-24.58-.22-.78-.43-1.56-.65-2.34 11.49-15.57 32.4 2.56 44.27-11.64.58-.7 1.13-.4 1.01.62-.06.48-.13.96-.19 1.43-.69 5-1.53 9.44-2.49 13.46-.27 1.13-.54 2.22-.83 3.29-.0181734.0757458-.0315335.1525661-.04.23-.0106736.2802805.1027422.5510151.31.74 2.9783401 2.7019905 6.2761919 5.0292932 9.82 6.93.28.14.55.27.82.39.46.2.35 1.48-.23 2.18z","fill":"#e64c3c","key":0}),React.createElement("path",{"id":"Shape","d":"m58.44 30.6c-11.88 14.2-32.78-3.93-44.27 11.64-.22-.78-1.95-.87-2.17-1.65v-.01c-2.29-8.19-4.58-16.3833333-6.87-24.58-.22-.78 1.08-2.25.86-3.03 11.49-15.57 32.4 2.56 44.27-11.64.58-.7 1.13-.4 1.01.62-.06.48-.13.96-.19 1.43-.69 5-1.53 9.44-2.49 13.46-.27 1.13-.54 2.22-.83 3.29-.0181734.0757458-.0315335.1525661-.04.23-.0106736.2802805.1027422.5510151.31.74 2.9783401 2.7019905 6.2761919 5.0292932 9.82 6.93.28.14.55.27.82.39.46.2.35 1.48-.23 2.18z","fill":"#e64c3c","key":1}),React.createElement("path",{"id":"Shape","d":"m9.45150963 10.0111708h.1433c.64015307 0 1.25408707.2542998 1.70674367.7069563.4526565.4526566.7069563 1.0665906.7069563 1.7067437v45.3626c0 1.0664618-.8645381 1.931-1.931 1.931h-1.10879997c-1.06646186 0-1.931-.8645382-1.931-1.931v-45.3626c0-1.3330497 1.0806503-2.4137 2.4137-2.4137z","fill":"#cf976a","transform":"matrix(.963 -.269 .269 .963 -9.032 3.849)","key":2})])));
}

End.defaultProps = {"height":"16","viewBox":"0 0 58 58","width":"16"};

module.exports = End;

End.default = End;


/***/ }),

/***/ 1316:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var React = __webpack_require__(3691);

function Github (props) {
    return React.createElement("svg",props,[React.createElement("defs",{"key":0}),React.createElement("rect",{"fill":"#222222","height":"270","width":"200","x":"0","y":"0","key":1}),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"12px","fontFamily":"Arial","fontWeight":"bold"},"x":"10","y":"20","key":2},"2Tu"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"4px","fontFamily":"Arial"},"x":"10","y":"250","key":3},"ATHLETE"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"9px","fontFamily":"Arial"},"x":"10","y":"260","key":4},"2Tu"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"4px","fontFamily":"Arial"},"x":"120","y":"250","key":5},"STATISTICS"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"120","y":"255","key":6},"Number: 171"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"120","y":"260","key":7},"Weekly: 1.6"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"141","y":"255","key":8},"Total: 769.7 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"141","y":"260","key":9},"Avg: 4.5 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"167","y":"255","key":10},"Min: 0.5 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"167","y":"260","key":11},"Max: 10.4 km"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"10.0px","fontFamily":"Arial"},"x":"10","y":"30","key":12},"2023"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"4.125px","fontFamily":"Arial"},"x":"175","y":"35","key":13},"28.0 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"10.0","y":"44","key":14},"Jan"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"25.5","y":"44","key":15},"Feb"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"41.0","y":"44","key":16},"Mar"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"56.5","y":"44","key":17},"Apr"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"72.0","y":"44","key":18},"May"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"87.5","y":"44","key":19},"Jun"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"103.0","y":"44","key":20},"Jul"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"118.5","y":"44","key":21},"Aug"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"134.0","y":"44","key":22},"Sep"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"149.5","y":"44","key":23},"Oct"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"165.0","y":"44","key":24},"Nov"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"180.5","y":"44","key":25},"Dec"),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"45.5","key":26},React.createElement("title",null,"2022-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"49.0","key":27},React.createElement("title",null,"2022-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"52.5","key":28},React.createElement("title",null,"2022-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"56.0","key":29},React.createElement("title",null,"2022-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"59.5","key":30},React.createElement("title",null,"2022-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"63.0","key":31},React.createElement("title",null,"2022-12-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"66.5","key":32},React.createElement("title",null,"2023-01-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"45.5","key":33},React.createElement("title",null,"2023-01-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"49.0","key":34},React.createElement("title",null,"2023-01-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"52.5","key":35},React.createElement("title",null,"2023-01-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"56.0","key":36},React.createElement("title",null,"2023-01-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"59.5","key":37},React.createElement("title",null,"2023-01-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"63.0","key":38},React.createElement("title",null,"2023-01-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"66.5","key":39},React.createElement("title",null,"2023-01-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"45.5","key":40},React.createElement("title",null,"2023-01-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"49.0","key":41},React.createElement("title",null,"2023-01-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"52.5","key":42},React.createElement("title",null,"2023-01-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"56.0","key":43},React.createElement("title",null,"2023-01-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"59.5","key":44},React.createElement("title",null,"2023-01-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"63.0","key":45},React.createElement("title",null,"2023-01-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"66.5","key":46},React.createElement("title",null,"2023-01-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"45.5","key":47},React.createElement("title",null,"2023-01-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"49.0","key":48},React.createElement("title",null,"2023-01-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"52.5","key":49},React.createElement("title",null,"2023-01-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"56.0","key":50},React.createElement("title",null,"2023-01-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"59.5","key":51},React.createElement("title",null,"2023-01-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"63.0","key":52},React.createElement("title",null,"2023-01-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"66.5","key":53},React.createElement("title",null,"2023-01-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"45.5","key":54},React.createElement("title",null,"2023-01-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"49.0","key":55},React.createElement("title",null,"2023-01-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"52.5","key":56},React.createElement("title",null,"2023-01-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"56.0","key":57},React.createElement("title",null,"2023-01-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"59.5","key":58},React.createElement("title",null,"2023-01-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"63.0","key":59},React.createElement("title",null,"2023-01-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"66.5","key":60},React.createElement("title",null,"2023-01-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"45.5","key":61},React.createElement("title",null,"2023-01-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"49.0","key":62},React.createElement("title",null,"2023-01-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"52.5","key":63},React.createElement("title",null,"2023-02-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"56.0","key":64},React.createElement("title",null,"2023-02-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"59.5","key":65},React.createElement("title",null,"2023-02-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"63.0","key":66},React.createElement("title",null,"2023-02-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"66.5","key":67},React.createElement("title",null,"2023-02-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"45.5","key":68},React.createElement("title",null,"2023-02-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"49.0","key":69},React.createElement("title",null,"2023-02-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"52.5","key":70},React.createElement("title",null,"2023-02-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"56.0","key":71},React.createElement("title",null,"2023-02-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"59.5","key":72},React.createElement("title",null,"2023-02-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"63.0","key":73},React.createElement("title",null,"2023-02-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"66.5","key":74},React.createElement("title",null,"2023-02-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"45.5","key":75},React.createElement("title",null,"2023-02-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"49.0","key":76},React.createElement("title",null,"2023-02-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"52.5","key":77},React.createElement("title",null,"2023-02-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"56.0","key":78},React.createElement("title",null,"2023-02-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"59.5","key":79},React.createElement("title",null,"2023-02-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"63.0","key":80},React.createElement("title",null,"2023-02-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"66.5","key":81},React.createElement("title",null,"2023-02-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"45.5","key":82},React.createElement("title",null,"2023-02-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"49.0","key":83},React.createElement("title",null,"2023-02-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"52.5","key":84},React.createElement("title",null,"2023-02-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"56.0","key":85},React.createElement("title",null,"2023-02-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"59.5","key":86},React.createElement("title",null,"2023-02-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"38.0","y":"63.0","key":87},React.createElement("title",null,"2023-02-25 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"66.5","key":88},React.createElement("title",null,"2023-02-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"45.5","key":89},React.createElement("title",null,"2023-02-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"49.0","key":90},React.createElement("title",null,"2023-02-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"52.5","key":91},React.createElement("title",null,"2023-03-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"56.0","key":92},React.createElement("title",null,"2023-03-02 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"59.5","key":93},React.createElement("title",null,"2023-03-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"63.0","key":94},React.createElement("title",null,"2023-03-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"66.5","key":95},React.createElement("title",null,"2023-03-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"45.5","key":96},React.createElement("title",null,"2023-03-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"49.0","key":97},React.createElement("title",null,"2023-03-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"52.5","key":98},React.createElement("title",null,"2023-03-08 6.4 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"56.0","key":99},React.createElement("title",null,"2023-03-09 6.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"59.5","key":100},React.createElement("title",null,"2023-03-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"63.0","key":101},React.createElement("title",null,"2023-03-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"66.5","key":102},React.createElement("title",null,"2023-03-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"48.5","y":"45.5","key":103},React.createElement("title",null,"2023-03-13 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"49.0","key":104},React.createElement("title",null,"2023-03-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"52.5","key":105},React.createElement("title",null,"2023-03-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"56.0","key":106},React.createElement("title",null,"2023-03-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"59.5","key":107},React.createElement("title",null,"2023-03-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"63.0","key":108},React.createElement("title",null,"2023-03-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"66.5","key":109},React.createElement("title",null,"2023-03-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"45.5","key":110},React.createElement("title",null,"2023-03-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"49.0","key":111},React.createElement("title",null,"2023-03-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"52.5","key":112},React.createElement("title",null,"2023-03-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"56.0","key":113},React.createElement("title",null,"2023-03-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"59.5","key":114},React.createElement("title",null,"2023-03-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"63.0","key":115},React.createElement("title",null,"2023-03-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"66.5","key":116},React.createElement("title",null,"2023-03-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"45.5","key":117},React.createElement("title",null,"2023-03-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"49.0","key":118},React.createElement("title",null,"2023-03-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"52.5","key":119},React.createElement("title",null,"2023-03-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"56.0","key":120},React.createElement("title",null,"2023-03-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"59.5","key":121},React.createElement("title",null,"2023-03-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"63.0","key":122},React.createElement("title",null,"2023-04-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"66.5","key":123},React.createElement("title",null,"2023-04-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"45.5","key":124},React.createElement("title",null,"2023-04-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"49.0","key":125},React.createElement("title",null,"2023-04-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"52.5","key":126},React.createElement("title",null,"2023-04-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"56.0","key":127},React.createElement("title",null,"2023-04-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"59.5","key":128},React.createElement("title",null,"2023-04-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"63.0","key":129},React.createElement("title",null,"2023-04-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"66.5","key":130},React.createElement("title",null,"2023-04-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"45.5","key":131},React.createElement("title",null,"2023-04-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"49.0","key":132},React.createElement("title",null,"2023-04-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"52.5","key":133},React.createElement("title",null,"2023-04-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"56.0","key":134},React.createElement("title",null,"2023-04-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"59.5","key":135},React.createElement("title",null,"2023-04-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"63.0","key":136},React.createElement("title",null,"2023-04-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"66.5","key":137},React.createElement("title",null,"2023-04-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"45.5","key":138},React.createElement("title",null,"2023-04-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"49.0","key":139},React.createElement("title",null,"2023-04-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"52.5","key":140},React.createElement("title",null,"2023-04-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"56.0","key":141},React.createElement("title",null,"2023-04-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"59.5","key":142},React.createElement("title",null,"2023-04-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"63.0","key":143},React.createElement("title",null,"2023-04-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"66.5","key":144},React.createElement("title",null,"2023-04-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"45.5","key":145},React.createElement("title",null,"2023-04-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"49.0","key":146},React.createElement("title",null,"2023-04-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"52.5","key":147},React.createElement("title",null,"2023-04-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"56.0","key":148},React.createElement("title",null,"2023-04-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"59.5","key":149},React.createElement("title",null,"2023-04-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"63.0","key":150},React.createElement("title",null,"2023-04-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"66.5","key":151},React.createElement("title",null,"2023-04-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"45.5","key":152},React.createElement("title",null,"2023-05-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"49.0","key":153},React.createElement("title",null,"2023-05-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"52.5","key":154},React.createElement("title",null,"2023-05-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"56.0","key":155},React.createElement("title",null,"2023-05-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"59.5","key":156},React.createElement("title",null,"2023-05-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"63.0","key":157},React.createElement("title",null,"2023-05-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"66.5","key":158},React.createElement("title",null,"2023-05-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"45.5","key":159},React.createElement("title",null,"2023-05-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"49.0","key":160},React.createElement("title",null,"2023-05-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"52.5","key":161},React.createElement("title",null,"2023-05-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"56.0","key":162},React.createElement("title",null,"2023-05-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"59.5","key":163},React.createElement("title",null,"2023-05-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"63.0","key":164},React.createElement("title",null,"2023-05-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"66.5","key":165},React.createElement("title",null,"2023-05-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"45.5","key":166},React.createElement("title",null,"2023-05-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"49.0","key":167},React.createElement("title",null,"2023-05-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"52.5","key":168},React.createElement("title",null,"2023-05-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"56.0","key":169},React.createElement("title",null,"2023-05-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"59.5","key":170},React.createElement("title",null,"2023-05-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"63.0","key":171},React.createElement("title",null,"2023-05-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"66.5","key":172},React.createElement("title",null,"2023-05-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"45.5","key":173},React.createElement("title",null,"2023-05-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"49.0","key":174},React.createElement("title",null,"2023-05-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"52.5","key":175},React.createElement("title",null,"2023-05-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"56.0","key":176},React.createElement("title",null,"2023-05-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"59.5","key":177},React.createElement("title",null,"2023-05-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"63.0","key":178},React.createElement("title",null,"2023-05-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"66.5","key":179},React.createElement("title",null,"2023-05-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"45.5","key":180},React.createElement("title",null,"2023-05-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"49.0","key":181},React.createElement("title",null,"2023-05-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"52.5","key":182},React.createElement("title",null,"2023-05-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"56.0","key":183},React.createElement("title",null,"2023-06-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"59.5","key":184},React.createElement("title",null,"2023-06-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"63.0","key":185},React.createElement("title",null,"2023-06-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"66.5","key":186},React.createElement("title",null,"2023-06-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"45.5","key":187},React.createElement("title",null,"2023-06-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"49.0","key":188},React.createElement("title",null,"2023-06-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"52.5","key":189},React.createElement("title",null,"2023-06-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"56.0","key":190},React.createElement("title",null,"2023-06-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"59.5","key":191},React.createElement("title",null,"2023-06-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"63.0","key":192},React.createElement("title",null,"2023-06-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"66.5","key":193},React.createElement("title",null,"2023-06-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"45.5","key":194},React.createElement("title",null,"2023-06-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"49.0","key":195},React.createElement("title",null,"2023-06-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"52.5","key":196},React.createElement("title",null,"2023-06-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"56.0","key":197},React.createElement("title",null,"2023-06-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"59.5","key":198},React.createElement("title",null,"2023-06-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"63.0","key":199},React.createElement("title",null,"2023-06-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"66.5","key":200},React.createElement("title",null,"2023-06-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"45.5","key":201},React.createElement("title",null,"2023-06-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"49.0","key":202},React.createElement("title",null,"2023-06-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"52.5","key":203},React.createElement("title",null,"2023-06-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"56.0","key":204},React.createElement("title",null,"2023-06-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"59.5","key":205},React.createElement("title",null,"2023-06-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"63.0","key":206},React.createElement("title",null,"2023-06-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"66.5","key":207},React.createElement("title",null,"2023-06-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"45.5","key":208},React.createElement("title",null,"2023-06-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"49.0","key":209},React.createElement("title",null,"2023-06-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"52.5","key":210},React.createElement("title",null,"2023-06-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"56.0","key":211},React.createElement("title",null,"2023-06-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"59.5","key":212},React.createElement("title",null,"2023-06-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"63.0","key":213},React.createElement("title",null,"2023-07-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"66.5","key":214},React.createElement("title",null,"2023-07-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"45.5","key":215},React.createElement("title",null,"2023-07-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"49.0","key":216},React.createElement("title",null,"2023-07-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"52.5","key":217},React.createElement("title",null,"2023-07-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"56.0","key":218},React.createElement("title",null,"2023-07-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"59.5","key":219},React.createElement("title",null,"2023-07-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"63.0","key":220},React.createElement("title",null,"2023-07-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"66.5","key":221},React.createElement("title",null,"2023-07-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"45.5","key":222},React.createElement("title",null,"2023-07-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"49.0","key":223},React.createElement("title",null,"2023-07-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"52.5","key":224},React.createElement("title",null,"2023-07-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"56.0","key":225},React.createElement("title",null,"2023-07-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"59.5","key":226},React.createElement("title",null,"2023-07-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"63.0","key":227},React.createElement("title",null,"2023-07-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"66.5","key":228},React.createElement("title",null,"2023-07-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"45.5","key":229},React.createElement("title",null,"2023-07-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"49.0","key":230},React.createElement("title",null,"2023-07-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"52.5","key":231},React.createElement("title",null,"2023-07-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"56.0","key":232},React.createElement("title",null,"2023-07-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"59.5","key":233},React.createElement("title",null,"2023-07-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"63.0","key":234},React.createElement("title",null,"2023-07-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"66.5","key":235},React.createElement("title",null,"2023-07-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"45.5","key":236},React.createElement("title",null,"2023-07-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"49.0","key":237},React.createElement("title",null,"2023-07-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"52.5","key":238},React.createElement("title",null,"2023-07-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"56.0","key":239},React.createElement("title",null,"2023-07-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"59.5","key":240},React.createElement("title",null,"2023-07-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"63.0","key":241},React.createElement("title",null,"2023-07-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"66.5","key":242},React.createElement("title",null,"2023-07-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"45.5","key":243},React.createElement("title",null,"2023-07-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"49.0","key":244},React.createElement("title",null,"2023-08-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"52.5","key":245},React.createElement("title",null,"2023-08-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"56.0","key":246},React.createElement("title",null,"2023-08-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"59.5","key":247},React.createElement("title",null,"2023-08-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"63.0","key":248},React.createElement("title",null,"2023-08-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"66.5","key":249},React.createElement("title",null,"2023-08-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"45.5","key":250},React.createElement("title",null,"2023-08-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"49.0","key":251},React.createElement("title",null,"2023-08-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"52.5","key":252},React.createElement("title",null,"2023-08-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"56.0","key":253},React.createElement("title",null,"2023-08-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"59.5","key":254},React.createElement("title",null,"2023-08-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"63.0","key":255},React.createElement("title",null,"2023-08-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"66.5","key":256},React.createElement("title",null,"2023-08-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"45.5","key":257},React.createElement("title",null,"2023-08-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"49.0","key":258},React.createElement("title",null,"2023-08-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"52.5","key":259},React.createElement("title",null,"2023-08-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"56.0","key":260},React.createElement("title",null,"2023-08-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"59.5","key":261},React.createElement("title",null,"2023-08-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"63.0","key":262},React.createElement("title",null,"2023-08-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"66.5","key":263},React.createElement("title",null,"2023-08-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"45.5","key":264},React.createElement("title",null,"2023-08-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"49.0","key":265},React.createElement("title",null,"2023-08-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"52.5","key":266},React.createElement("title",null,"2023-08-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"56.0","key":267},React.createElement("title",null,"2023-08-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"59.5","key":268},React.createElement("title",null,"2023-08-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"63.0","key":269},React.createElement("title",null,"2023-08-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"66.5","key":270},React.createElement("title",null,"2023-08-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"45.5","key":271},React.createElement("title",null,"2023-08-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"49.0","key":272},React.createElement("title",null,"2023-08-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"52.5","key":273},React.createElement("title",null,"2023-08-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"56.0","key":274},React.createElement("title",null,"2023-08-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"59.5","key":275},React.createElement("title",null,"2023-09-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"63.0","key":276},React.createElement("title",null,"2023-09-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"66.5","key":277},React.createElement("title",null,"2023-09-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"45.5","key":278},React.createElement("title",null,"2023-09-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"49.0","key":279},React.createElement("title",null,"2023-09-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"52.5","key":280},React.createElement("title",null,"2023-09-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"56.0","key":281},React.createElement("title",null,"2023-09-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"59.5","key":282},React.createElement("title",null,"2023-09-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"63.0","key":283},React.createElement("title",null,"2023-09-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"66.5","key":284},React.createElement("title",null,"2023-09-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"45.5","key":285},React.createElement("title",null,"2023-09-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"49.0","key":286},React.createElement("title",null,"2023-09-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"52.5","key":287},React.createElement("title",null,"2023-09-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"56.0","key":288},React.createElement("title",null,"2023-09-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"59.5","key":289},React.createElement("title",null,"2023-09-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"63.0","key":290},React.createElement("title",null,"2023-09-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"66.5","key":291},React.createElement("title",null,"2023-09-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"45.5","key":292},React.createElement("title",null,"2023-09-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"49.0","key":293},React.createElement("title",null,"2023-09-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"52.5","key":294},React.createElement("title",null,"2023-09-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"56.0","key":295},React.createElement("title",null,"2023-09-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"59.5","key":296},React.createElement("title",null,"2023-09-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"63.0","key":297},React.createElement("title",null,"2023-09-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"66.5","key":298},React.createElement("title",null,"2023-09-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"45.5","key":299},React.createElement("title",null,"2023-09-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"49.0","key":300},React.createElement("title",null,"2023-09-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"52.5","key":301},React.createElement("title",null,"2023-09-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"56.0","key":302},React.createElement("title",null,"2023-09-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"59.5","key":303},React.createElement("title",null,"2023-09-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"63.0","key":304},React.createElement("title",null,"2023-09-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"66.5","key":305},React.createElement("title",null,"2023-10-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"45.5","key":306},React.createElement("title",null,"2023-10-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"49.0","key":307},React.createElement("title",null,"2023-10-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"52.5","key":308},React.createElement("title",null,"2023-10-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"56.0","key":309},React.createElement("title",null,"2023-10-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"59.5","key":310},React.createElement("title",null,"2023-10-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"63.0","key":311},React.createElement("title",null,"2023-10-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"66.5","key":312},React.createElement("title",null,"2023-10-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"45.5","key":313},React.createElement("title",null,"2023-10-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"49.0","key":314},React.createElement("title",null,"2023-10-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"52.5","key":315},React.createElement("title",null,"2023-10-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"56.0","key":316},React.createElement("title",null,"2023-10-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"59.5","key":317},React.createElement("title",null,"2023-10-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"63.0","key":318},React.createElement("title",null,"2023-10-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"66.5","key":319},React.createElement("title",null,"2023-10-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"45.5","key":320},React.createElement("title",null,"2023-10-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"49.0","key":321},React.createElement("title",null,"2023-10-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"52.5","key":322},React.createElement("title",null,"2023-10-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"56.0","key":323},React.createElement("title",null,"2023-10-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"59.5","key":324},React.createElement("title",null,"2023-10-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"63.0","key":325},React.createElement("title",null,"2023-10-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"66.5","key":326},React.createElement("title",null,"2023-10-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"45.5","key":327},React.createElement("title",null,"2023-10-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"49.0","key":328},React.createElement("title",null,"2023-10-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"52.5","key":329},React.createElement("title",null,"2023-10-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"56.0","key":330},React.createElement("title",null,"2023-10-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"59.5","key":331},React.createElement("title",null,"2023-10-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"63.0","key":332},React.createElement("title",null,"2023-10-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"66.5","key":333},React.createElement("title",null,"2023-10-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"45.5","key":334},React.createElement("title",null,"2023-10-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"49.0","key":335},React.createElement("title",null,"2023-10-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"52.5","key":336},React.createElement("title",null,"2023-11-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"56.0","key":337},React.createElement("title",null,"2023-11-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"59.5","key":338},React.createElement("title",null,"2023-11-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"63.0","key":339},React.createElement("title",null,"2023-11-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"66.5","key":340},React.createElement("title",null,"2023-11-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"45.5","key":341},React.createElement("title",null,"2023-11-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"49.0","key":342},React.createElement("title",null,"2023-11-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"52.5","key":343},React.createElement("title",null,"2023-11-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"56.0","key":344},React.createElement("title",null,"2023-11-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"59.5","key":345},React.createElement("title",null,"2023-11-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"63.0","key":346},React.createElement("title",null,"2023-11-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"66.5","key":347},React.createElement("title",null,"2023-11-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"45.5","key":348},React.createElement("title",null,"2023-11-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"49.0","key":349},React.createElement("title",null,"2023-11-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"52.5","key":350},React.createElement("title",null,"2023-11-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"56.0","key":351},React.createElement("title",null,"2023-11-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"59.5","key":352},React.createElement("title",null,"2023-11-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"63.0","key":353},React.createElement("title",null,"2023-11-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"66.5","key":354},React.createElement("title",null,"2023-11-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"45.5","key":355},React.createElement("title",null,"2023-11-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"49.0","key":356},React.createElement("title",null,"2023-11-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"52.5","key":357},React.createElement("title",null,"2023-11-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"56.0","key":358},React.createElement("title",null,"2023-11-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"59.5","key":359},React.createElement("title",null,"2023-11-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"63.0","key":360},React.createElement("title",null,"2023-11-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"66.5","key":361},React.createElement("title",null,"2023-11-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"45.5","key":362},React.createElement("title",null,"2023-11-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"49.0","key":363},React.createElement("title",null,"2023-11-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"52.5","key":364},React.createElement("title",null,"2023-11-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"56.0","key":365},React.createElement("title",null,"2023-11-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"59.5","key":366},React.createElement("title",null,"2023-12-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"63.0","key":367},React.createElement("title",null,"2023-12-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"66.5","key":368},React.createElement("title",null,"2023-12-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"45.5","key":369},React.createElement("title",null,"2023-12-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"49.0","key":370},React.createElement("title",null,"2023-12-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"52.5","key":371},React.createElement("title",null,"2023-12-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"56.0","key":372},React.createElement("title",null,"2023-12-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"59.5","key":373},React.createElement("title",null,"2023-12-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"63.0","key":374},React.createElement("title",null,"2023-12-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"66.5","key":375},React.createElement("title",null,"2023-12-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"45.5","key":376},React.createElement("title",null,"2023-12-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"49.0","key":377},React.createElement("title",null,"2023-12-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"52.5","key":378},React.createElement("title",null,"2023-12-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"56.0","key":379},React.createElement("title",null,"2023-12-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"59.5","key":380},React.createElement("title",null,"2023-12-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"63.0","key":381},React.createElement("title",null,"2023-12-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"66.5","key":382},React.createElement("title",null,"2023-12-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"45.5","key":383},React.createElement("title",null,"2023-12-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"49.0","key":384},React.createElement("title",null,"2023-12-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"52.5","key":385},React.createElement("title",null,"2023-12-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"56.0","key":386},React.createElement("title",null,"2023-12-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"59.5","key":387},React.createElement("title",null,"2023-12-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"63.0","key":388},React.createElement("title",null,"2023-12-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"66.5","key":389},React.createElement("title",null,"2023-12-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"45.5","key":390},React.createElement("title",null,"2023-12-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"49.0","key":391},React.createElement("title",null,"2023-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"52.5","key":392},React.createElement("title",null,"2023-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"56.0","key":393},React.createElement("title",null,"2023-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"59.5","key":394},React.createElement("title",null,"2023-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"63.0","key":395},React.createElement("title",null,"2023-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"66.5","key":396},React.createElement("title",null,"2023-12-31")),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"10.0px","fontFamily":"Arial"},"x":"10","y":"73.0","key":397},"2022"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"4.125px","fontFamily":"Arial"},"x":"175","y":"78.0","key":398},"117.8 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"10.0","y":"87.0","key":399},"Jan"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"25.5","y":"87.0","key":400},"Feb"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"41.0","y":"87.0","key":401},"Mar"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"56.5","y":"87.0","key":402},"Apr"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"72.0","y":"87.0","key":403},"May"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"87.5","y":"87.0","key":404},"Jun"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"103.0","y":"87.0","key":405},"Jul"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"118.5","y":"87.0","key":406},"Aug"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"134.0","y":"87.0","key":407},"Sep"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"149.5","y":"87.0","key":408},"Oct"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"165.0","y":"87.0","key":409},"Nov"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"180.5","y":"87.0","key":410},"Dec"),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"88.5","key":411},React.createElement("title",null,"2021-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"92.0","key":412},React.createElement("title",null,"2021-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"95.5","key":413},React.createElement("title",null,"2021-12-29")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"10.0","y":"99.0","key":414},React.createElement("title",null,"2021-12-30 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"102.5","key":415},React.createElement("title",null,"2021-12-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"106.0","key":416},React.createElement("title",null,"2022-01-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"109.5","key":417},React.createElement("title",null,"2022-01-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"88.5","key":418},React.createElement("title",null,"2022-01-03")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"13.5","y":"92.0","key":419},React.createElement("title",null,"2022-01-04 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"95.5","key":420},React.createElement("title",null,"2022-01-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"13.5","y":"99.0","key":421},React.createElement("title",null,"2022-01-06 5.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"102.5","key":422},React.createElement("title",null,"2022-01-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"106.0","key":423},React.createElement("title",null,"2022-01-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"109.5","key":424},React.createElement("title",null,"2022-01-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"88.5","key":425},React.createElement("title",null,"2022-01-10")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"17.0","y":"92.0","key":426},React.createElement("title",null,"2022-01-11 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"95.5","key":427},React.createElement("title",null,"2022-01-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"99.0","key":428},React.createElement("title",null,"2022-01-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"102.5","key":429},React.createElement("title",null,"2022-01-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"106.0","key":430},React.createElement("title",null,"2022-01-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"109.5","key":431},React.createElement("title",null,"2022-01-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"88.5","key":432},React.createElement("title",null,"2022-01-17")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"20.5","y":"92.0","key":433},React.createElement("title",null,"2022-01-18 6.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"95.5","key":434},React.createElement("title",null,"2022-01-19")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"20.5","y":"99.0","key":435},React.createElement("title",null,"2022-01-20 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"102.5","key":436},React.createElement("title",null,"2022-01-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"106.0","key":437},React.createElement("title",null,"2022-01-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"109.5","key":438},React.createElement("title",null,"2022-01-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"88.5","key":439},React.createElement("title",null,"2022-01-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"24.0","y":"92.0","key":440},React.createElement("title",null,"2022-01-25 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"95.5","key":441},React.createElement("title",null,"2022-01-26")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"24.0","y":"99.0","key":442},React.createElement("title",null,"2022-01-27 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"102.5","key":443},React.createElement("title",null,"2022-01-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"106.0","key":444},React.createElement("title",null,"2022-01-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"109.5","key":445},React.createElement("title",null,"2022-01-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"88.5","key":446},React.createElement("title",null,"2022-01-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"92.0","key":447},React.createElement("title",null,"2022-02-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"95.5","key":448},React.createElement("title",null,"2022-02-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"99.0","key":449},React.createElement("title",null,"2022-02-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"102.5","key":450},React.createElement("title",null,"2022-02-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"106.0","key":451},React.createElement("title",null,"2022-02-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"109.5","key":452},React.createElement("title",null,"2022-02-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"88.5","key":453},React.createElement("title",null,"2022-02-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"92.0","key":454},React.createElement("title",null,"2022-02-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"95.5","key":455},React.createElement("title",null,"2022-02-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"99.0","key":456},React.createElement("title",null,"2022-02-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"102.5","key":457},React.createElement("title",null,"2022-02-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"106.0","key":458},React.createElement("title",null,"2022-02-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"109.5","key":459},React.createElement("title",null,"2022-02-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"88.5","key":460},React.createElement("title",null,"2022-02-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"92.0","key":461},React.createElement("title",null,"2022-02-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"95.5","key":462},React.createElement("title",null,"2022-02-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"34.5","y":"99.0","key":463},React.createElement("title",null,"2022-02-17 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"102.5","key":464},React.createElement("title",null,"2022-02-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"106.0","key":465},React.createElement("title",null,"2022-02-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"109.5","key":466},React.createElement("title",null,"2022-02-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"88.5","key":467},React.createElement("title",null,"2022-02-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"92.0","key":468},React.createElement("title",null,"2022-02-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"38.0","y":"95.5","key":469},React.createElement("title",null,"2022-02-23 4.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"99.0","key":470},React.createElement("title",null,"2022-02-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"102.5","key":471},React.createElement("title",null,"2022-02-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"106.0","key":472},React.createElement("title",null,"2022-02-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"109.5","key":473},React.createElement("title",null,"2022-02-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"88.5","key":474},React.createElement("title",null,"2022-02-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"92.0","key":475},React.createElement("title",null,"2022-03-01 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"95.5","key":476},React.createElement("title",null,"2022-03-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"99.0","key":477},React.createElement("title",null,"2022-03-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"102.5","key":478},React.createElement("title",null,"2022-03-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"106.0","key":479},React.createElement("title",null,"2022-03-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"109.5","key":480},React.createElement("title",null,"2022-03-06")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"88.5","key":481},React.createElement("title",null,"2022-03-07 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"92.0","key":482},React.createElement("title",null,"2022-03-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"95.5","key":483},React.createElement("title",null,"2022-03-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"99.0","key":484},React.createElement("title",null,"2022-03-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"102.5","key":485},React.createElement("title",null,"2022-03-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"106.0","key":486},React.createElement("title",null,"2022-03-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"109.5","key":487},React.createElement("title",null,"2022-03-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"88.5","key":488},React.createElement("title",null,"2022-03-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"92.0","key":489},React.createElement("title",null,"2022-03-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"95.5","key":490},React.createElement("title",null,"2022-03-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"99.0","key":491},React.createElement("title",null,"2022-03-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"102.5","key":492},React.createElement("title",null,"2022-03-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"106.0","key":493},React.createElement("title",null,"2022-03-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"109.5","key":494},React.createElement("title",null,"2022-03-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"88.5","key":495},React.createElement("title",null,"2022-03-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"92.0","key":496},React.createElement("title",null,"2022-03-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"95.5","key":497},React.createElement("title",null,"2022-03-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"99.0","key":498},React.createElement("title",null,"2022-03-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"102.5","key":499},React.createElement("title",null,"2022-03-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"106.0","key":500},React.createElement("title",null,"2022-03-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"109.5","key":501},React.createElement("title",null,"2022-03-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"88.5","key":502},React.createElement("title",null,"2022-03-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"92.0","key":503},React.createElement("title",null,"2022-03-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"95.5","key":504},React.createElement("title",null,"2022-03-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"99.0","key":505},React.createElement("title",null,"2022-03-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"102.5","key":506},React.createElement("title",null,"2022-04-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"106.0","key":507},React.createElement("title",null,"2022-04-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"109.5","key":508},React.createElement("title",null,"2022-04-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"88.5","key":509},React.createElement("title",null,"2022-04-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"92.0","key":510},React.createElement("title",null,"2022-04-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"95.5","key":511},React.createElement("title",null,"2022-04-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"99.0","key":512},React.createElement("title",null,"2022-04-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"102.5","key":513},React.createElement("title",null,"2022-04-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"106.0","key":514},React.createElement("title",null,"2022-04-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"109.5","key":515},React.createElement("title",null,"2022-04-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"88.5","key":516},React.createElement("title",null,"2022-04-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"92.0","key":517},React.createElement("title",null,"2022-04-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"95.5","key":518},React.createElement("title",null,"2022-04-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"99.0","key":519},React.createElement("title",null,"2022-04-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"102.5","key":520},React.createElement("title",null,"2022-04-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"106.0","key":521},React.createElement("title",null,"2022-04-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"109.5","key":522},React.createElement("title",null,"2022-04-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"88.5","key":523},React.createElement("title",null,"2022-04-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"92.0","key":524},React.createElement("title",null,"2022-04-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"95.5","key":525},React.createElement("title",null,"2022-04-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"99.0","key":526},React.createElement("title",null,"2022-04-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"102.5","key":527},React.createElement("title",null,"2022-04-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"106.0","key":528},React.createElement("title",null,"2022-04-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"109.5","key":529},React.createElement("title",null,"2022-04-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"88.5","key":530},React.createElement("title",null,"2022-04-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"92.0","key":531},React.createElement("title",null,"2022-04-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"95.5","key":532},React.createElement("title",null,"2022-04-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"99.0","key":533},React.createElement("title",null,"2022-04-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"102.5","key":534},React.createElement("title",null,"2022-04-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"106.0","key":535},React.createElement("title",null,"2022-04-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"109.5","key":536},React.createElement("title",null,"2022-05-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"88.5","key":537},React.createElement("title",null,"2022-05-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"92.0","key":538},React.createElement("title",null,"2022-05-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"95.5","key":539},React.createElement("title",null,"2022-05-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"99.0","key":540},React.createElement("title",null,"2022-05-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"102.5","key":541},React.createElement("title",null,"2022-05-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"106.0","key":542},React.createElement("title",null,"2022-05-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"109.5","key":543},React.createElement("title",null,"2022-05-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"88.5","key":544},React.createElement("title",null,"2022-05-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"92.0","key":545},React.createElement("title",null,"2022-05-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"95.5","key":546},React.createElement("title",null,"2022-05-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"99.0","key":547},React.createElement("title",null,"2022-05-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"102.5","key":548},React.createElement("title",null,"2022-05-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"106.0","key":549},React.createElement("title",null,"2022-05-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"109.5","key":550},React.createElement("title",null,"2022-05-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"88.5","key":551},React.createElement("title",null,"2022-05-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"92.0","key":552},React.createElement("title",null,"2022-05-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"95.5","key":553},React.createElement("title",null,"2022-05-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"99.0","key":554},React.createElement("title",null,"2022-05-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"102.5","key":555},React.createElement("title",null,"2022-05-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"106.0","key":556},React.createElement("title",null,"2022-05-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"109.5","key":557},React.createElement("title",null,"2022-05-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"88.5","key":558},React.createElement("title",null,"2022-05-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"92.0","key":559},React.createElement("title",null,"2022-05-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"95.5","key":560},React.createElement("title",null,"2022-05-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"99.0","key":561},React.createElement("title",null,"2022-05-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"102.5","key":562},React.createElement("title",null,"2022-05-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"106.0","key":563},React.createElement("title",null,"2022-05-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"109.5","key":564},React.createElement("title",null,"2022-05-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"88.5","key":565},React.createElement("title",null,"2022-05-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"92.0","key":566},React.createElement("title",null,"2022-05-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"95.5","key":567},React.createElement("title",null,"2022-06-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"99.0","key":568},React.createElement("title",null,"2022-06-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"102.5","key":569},React.createElement("title",null,"2022-06-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"106.0","key":570},React.createElement("title",null,"2022-06-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"109.5","key":571},React.createElement("title",null,"2022-06-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"88.5","key":572},React.createElement("title",null,"2022-06-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"92.0","key":573},React.createElement("title",null,"2022-06-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"95.5","key":574},React.createElement("title",null,"2022-06-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"99.0","key":575},React.createElement("title",null,"2022-06-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"102.5","key":576},React.createElement("title",null,"2022-06-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"106.0","key":577},React.createElement("title",null,"2022-06-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"109.5","key":578},React.createElement("title",null,"2022-06-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"88.5","key":579},React.createElement("title",null,"2022-06-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"92.0","key":580},React.createElement("title",null,"2022-06-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"95.5","key":581},React.createElement("title",null,"2022-06-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"99.0","key":582},React.createElement("title",null,"2022-06-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"102.5","key":583},React.createElement("title",null,"2022-06-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"106.0","key":584},React.createElement("title",null,"2022-06-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"109.5","key":585},React.createElement("title",null,"2022-06-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"88.5","key":586},React.createElement("title",null,"2022-06-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"92.0","key":587},React.createElement("title",null,"2022-06-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"95.5","key":588},React.createElement("title",null,"2022-06-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"99.0","key":589},React.createElement("title",null,"2022-06-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"102.5","key":590},React.createElement("title",null,"2022-06-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"106.0","key":591},React.createElement("title",null,"2022-06-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"109.5","key":592},React.createElement("title",null,"2022-06-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"88.5","key":593},React.createElement("title",null,"2022-06-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"92.0","key":594},React.createElement("title",null,"2022-06-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"95.5","key":595},React.createElement("title",null,"2022-06-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"99.0","key":596},React.createElement("title",null,"2022-06-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"102.5","key":597},React.createElement("title",null,"2022-07-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"106.0","key":598},React.createElement("title",null,"2022-07-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"109.5","key":599},React.createElement("title",null,"2022-07-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"88.5","key":600},React.createElement("title",null,"2022-07-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"92.0","key":601},React.createElement("title",null,"2022-07-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"95.5","key":602},React.createElement("title",null,"2022-07-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"99.0","key":603},React.createElement("title",null,"2022-07-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"102.5","key":604},React.createElement("title",null,"2022-07-08")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"104.5","y":"106.0","key":605},React.createElement("title",null,"2022-07-09 4.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"109.5","key":606},React.createElement("title",null,"2022-07-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"88.5","key":607},React.createElement("title",null,"2022-07-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"92.0","key":608},React.createElement("title",null,"2022-07-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"95.5","key":609},React.createElement("title",null,"2022-07-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"99.0","key":610},React.createElement("title",null,"2022-07-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"102.5","key":611},React.createElement("title",null,"2022-07-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"106.0","key":612},React.createElement("title",null,"2022-07-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"109.5","key":613},React.createElement("title",null,"2022-07-17")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"111.5","y":"88.5","key":614},React.createElement("title",null,"2022-07-18 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"92.0","key":615},React.createElement("title",null,"2022-07-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"95.5","key":616},React.createElement("title",null,"2022-07-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"99.0","key":617},React.createElement("title",null,"2022-07-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"102.5","key":618},React.createElement("title",null,"2022-07-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"106.0","key":619},React.createElement("title",null,"2022-07-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"109.5","key":620},React.createElement("title",null,"2022-07-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"88.5","key":621},React.createElement("title",null,"2022-07-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"92.0","key":622},React.createElement("title",null,"2022-07-26")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"95.5","key":623},React.createElement("title",null,"2022-07-27 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"99.0","key":624},React.createElement("title",null,"2022-07-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"102.5","key":625},React.createElement("title",null,"2022-07-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"106.0","key":626},React.createElement("title",null,"2022-07-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"109.5","key":627},React.createElement("title",null,"2022-07-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"88.5","key":628},React.createElement("title",null,"2022-08-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"92.0","key":629},React.createElement("title",null,"2022-08-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"95.5","key":630},React.createElement("title",null,"2022-08-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"99.0","key":631},React.createElement("title",null,"2022-08-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"102.5","key":632},React.createElement("title",null,"2022-08-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"118.5","y":"106.0","key":633},React.createElement("title",null,"2022-08-06 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"109.5","key":634},React.createElement("title",null,"2022-08-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"88.5","key":635},React.createElement("title",null,"2022-08-08 2.0 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"92.0","key":636},React.createElement("title",null,"2022-08-09 0.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"95.5","key":637},React.createElement("title",null,"2022-08-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"99.0","key":638},React.createElement("title",null,"2022-08-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"102.5","key":639},React.createElement("title",null,"2022-08-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"106.0","key":640},React.createElement("title",null,"2022-08-13 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"109.5","key":641},React.createElement("title",null,"2022-08-14")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"125.5","y":"88.5","key":642},React.createElement("title",null,"2022-08-15 3.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"92.0","key":643},React.createElement("title",null,"2022-08-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"125.5","y":"95.5","key":644},React.createElement("title",null,"2022-08-17 6.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"99.0","key":645},React.createElement("title",null,"2022-08-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"102.5","key":646},React.createElement("title",null,"2022-08-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"106.0","key":647},React.createElement("title",null,"2022-08-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"109.5","key":648},React.createElement("title",null,"2022-08-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"88.5","key":649},React.createElement("title",null,"2022-08-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"92.0","key":650},React.createElement("title",null,"2022-08-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"95.5","key":651},React.createElement("title",null,"2022-08-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"99.0","key":652},React.createElement("title",null,"2022-08-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"102.5","key":653},React.createElement("title",null,"2022-08-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"106.0","key":654},React.createElement("title",null,"2022-08-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"109.5","key":655},React.createElement("title",null,"2022-08-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"88.5","key":656},React.createElement("title",null,"2022-08-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"92.0","key":657},React.createElement("title",null,"2022-08-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"95.5","key":658},React.createElement("title",null,"2022-08-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"99.0","key":659},React.createElement("title",null,"2022-09-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"102.5","key":660},React.createElement("title",null,"2022-09-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"106.0","key":661},React.createElement("title",null,"2022-09-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"109.5","key":662},React.createElement("title",null,"2022-09-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"88.5","key":663},React.createElement("title",null,"2022-09-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"92.0","key":664},React.createElement("title",null,"2022-09-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"95.5","key":665},React.createElement("title",null,"2022-09-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"99.0","key":666},React.createElement("title",null,"2022-09-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"102.5","key":667},React.createElement("title",null,"2022-09-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"106.0","key":668},React.createElement("title",null,"2022-09-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"109.5","key":669},React.createElement("title",null,"2022-09-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"88.5","key":670},React.createElement("title",null,"2022-09-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"92.0","key":671},React.createElement("title",null,"2022-09-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"95.5","key":672},React.createElement("title",null,"2022-09-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"99.0","key":673},React.createElement("title",null,"2022-09-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"102.5","key":674},React.createElement("title",null,"2022-09-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"106.0","key":675},React.createElement("title",null,"2022-09-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"109.5","key":676},React.createElement("title",null,"2022-09-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"88.5","key":677},React.createElement("title",null,"2022-09-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"92.0","key":678},React.createElement("title",null,"2022-09-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"95.5","key":679},React.createElement("title",null,"2022-09-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"143.0","y":"99.0","key":680},React.createElement("title",null,"2022-09-22 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"102.5","key":681},React.createElement("title",null,"2022-09-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"106.0","key":682},React.createElement("title",null,"2022-09-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"109.5","key":683},React.createElement("title",null,"2022-09-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"88.5","key":684},React.createElement("title",null,"2022-09-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"92.0","key":685},React.createElement("title",null,"2022-09-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"95.5","key":686},React.createElement("title",null,"2022-09-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"99.0","key":687},React.createElement("title",null,"2022-09-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"102.5","key":688},React.createElement("title",null,"2022-09-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"106.0","key":689},React.createElement("title",null,"2022-10-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"109.5","key":690},React.createElement("title",null,"2022-10-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"88.5","key":691},React.createElement("title",null,"2022-10-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"92.0","key":692},React.createElement("title",null,"2022-10-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"95.5","key":693},React.createElement("title",null,"2022-10-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"99.0","key":694},React.createElement("title",null,"2022-10-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"102.5","key":695},React.createElement("title",null,"2022-10-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"106.0","key":696},React.createElement("title",null,"2022-10-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"109.5","key":697},React.createElement("title",null,"2022-10-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"88.5","key":698},React.createElement("title",null,"2022-10-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"92.0","key":699},React.createElement("title",null,"2022-10-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"95.5","key":700},React.createElement("title",null,"2022-10-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"99.0","key":701},React.createElement("title",null,"2022-10-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"102.5","key":702},React.createElement("title",null,"2022-10-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"106.0","key":703},React.createElement("title",null,"2022-10-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"109.5","key":704},React.createElement("title",null,"2022-10-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"88.5","key":705},React.createElement("title",null,"2022-10-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"92.0","key":706},React.createElement("title",null,"2022-10-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"95.5","key":707},React.createElement("title",null,"2022-10-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"99.0","key":708},React.createElement("title",null,"2022-10-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"102.5","key":709},React.createElement("title",null,"2022-10-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"106.0","key":710},React.createElement("title",null,"2022-10-22 4.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"109.5","key":711},React.createElement("title",null,"2022-10-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"88.5","key":712},React.createElement("title",null,"2022-10-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"92.0","key":713},React.createElement("title",null,"2022-10-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"95.5","key":714},React.createElement("title",null,"2022-10-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"99.0","key":715},React.createElement("title",null,"2022-10-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"102.5","key":716},React.createElement("title",null,"2022-10-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"106.0","key":717},React.createElement("title",null,"2022-10-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"109.5","key":718},React.createElement("title",null,"2022-10-30")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"164.0","y":"88.5","key":719},React.createElement("title",null,"2022-10-31 4.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"92.0","key":720},React.createElement("title",null,"2022-11-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"95.5","key":721},React.createElement("title",null,"2022-11-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"99.0","key":722},React.createElement("title",null,"2022-11-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"102.5","key":723},React.createElement("title",null,"2022-11-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"106.0","key":724},React.createElement("title",null,"2022-11-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"109.5","key":725},React.createElement("title",null,"2022-11-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"88.5","key":726},React.createElement("title",null,"2022-11-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"92.0","key":727},React.createElement("title",null,"2022-11-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"95.5","key":728},React.createElement("title",null,"2022-11-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"99.0","key":729},React.createElement("title",null,"2022-11-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"102.5","key":730},React.createElement("title",null,"2022-11-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"106.0","key":731},React.createElement("title",null,"2022-11-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"109.5","key":732},React.createElement("title",null,"2022-11-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"88.5","key":733},React.createElement("title",null,"2022-11-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"92.0","key":734},React.createElement("title",null,"2022-11-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"95.5","key":735},React.createElement("title",null,"2022-11-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"99.0","key":736},React.createElement("title",null,"2022-11-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"102.5","key":737},React.createElement("title",null,"2022-11-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"106.0","key":738},React.createElement("title",null,"2022-11-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"109.5","key":739},React.createElement("title",null,"2022-11-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"88.5","key":740},React.createElement("title",null,"2022-11-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"92.0","key":741},React.createElement("title",null,"2022-11-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"95.5","key":742},React.createElement("title",null,"2022-11-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"99.0","key":743},React.createElement("title",null,"2022-11-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"102.5","key":744},React.createElement("title",null,"2022-11-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"106.0","key":745},React.createElement("title",null,"2022-11-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"109.5","key":746},React.createElement("title",null,"2022-11-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"88.5","key":747},React.createElement("title",null,"2022-11-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"92.0","key":748},React.createElement("title",null,"2022-11-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"95.5","key":749},React.createElement("title",null,"2022-11-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"99.0","key":750},React.createElement("title",null,"2022-12-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"102.5","key":751},React.createElement("title",null,"2022-12-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"106.0","key":752},React.createElement("title",null,"2022-12-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"109.5","key":753},React.createElement("title",null,"2022-12-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"88.5","key":754},React.createElement("title",null,"2022-12-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"92.0","key":755},React.createElement("title",null,"2022-12-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"95.5","key":756},React.createElement("title",null,"2022-12-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"99.0","key":757},React.createElement("title",null,"2022-12-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"102.5","key":758},React.createElement("title",null,"2022-12-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"106.0","key":759},React.createElement("title",null,"2022-12-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"109.5","key":760},React.createElement("title",null,"2022-12-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"88.5","key":761},React.createElement("title",null,"2022-12-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"185.0","y":"92.0","key":762},React.createElement("title",null,"2022-12-13 7.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"95.5","key":763},React.createElement("title",null,"2022-12-14")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"185.0","y":"99.0","key":764},React.createElement("title",null,"2022-12-15 8.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"102.5","key":765},React.createElement("title",null,"2022-12-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"106.0","key":766},React.createElement("title",null,"2022-12-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"109.5","key":767},React.createElement("title",null,"2022-12-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"88.5","key":768},React.createElement("title",null,"2022-12-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"92.0","key":769},React.createElement("title",null,"2022-12-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"95.5","key":770},React.createElement("title",null,"2022-12-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"99.0","key":771},React.createElement("title",null,"2022-12-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"102.5","key":772},React.createElement("title",null,"2022-12-23")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"188.5","y":"106.0","key":773},React.createElement("title",null,"2022-12-24 5.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"109.5","key":774},React.createElement("title",null,"2022-12-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"88.5","key":775},React.createElement("title",null,"2022-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"92.0","key":776},React.createElement("title",null,"2022-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"95.5","key":777},React.createElement("title",null,"2022-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"99.0","key":778},React.createElement("title",null,"2022-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"102.5","key":779},React.createElement("title",null,"2022-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"106.0","key":780},React.createElement("title",null,"2022-12-31")),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"10.0px","fontFamily":"Arial"},"x":"10","y":"116.0","key":781},"2021"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"4.125px","fontFamily":"Arial"},"x":"175","y":"121.0","key":782},"279.6 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"10.0","y":"130.0","key":783},"Jan"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"25.5","y":"130.0","key":784},"Feb"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"41.0","y":"130.0","key":785},"Mar"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"56.5","y":"130.0","key":786},"Apr"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"72.0","y":"130.0","key":787},"May"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"87.5","y":"130.0","key":788},"Jun"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"103.0","y":"130.0","key":789},"Jul"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"118.5","y":"130.0","key":790},"Aug"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"134.0","y":"130.0","key":791},"Sep"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"149.5","y":"130.0","key":792},"Oct"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"165.0","y":"130.0","key":793},"Nov"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"180.5","y":"130.0","key":794},"Dec"),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"131.5","key":795},React.createElement("title",null,"2020-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"135.0","key":796},React.createElement("title",null,"2020-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"138.5","key":797},React.createElement("title",null,"2020-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"142.0","key":798},React.createElement("title",null,"2020-12-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"145.5","key":799},React.createElement("title",null,"2021-01-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"149.0","key":800},React.createElement("title",null,"2021-01-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"152.5","key":801},React.createElement("title",null,"2021-01-03")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"13.5","y":"131.5","key":802},React.createElement("title",null,"2021-01-04 1.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"135.0","key":803},React.createElement("title",null,"2021-01-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"138.5","key":804},React.createElement("title",null,"2021-01-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"142.0","key":805},React.createElement("title",null,"2021-01-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"145.5","key":806},React.createElement("title",null,"2021-01-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"149.0","key":807},React.createElement("title",null,"2021-01-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"152.5","key":808},React.createElement("title",null,"2021-01-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"131.5","key":809},React.createElement("title",null,"2021-01-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"135.0","key":810},React.createElement("title",null,"2021-01-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"138.5","key":811},React.createElement("title",null,"2021-01-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"142.0","key":812},React.createElement("title",null,"2021-01-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"145.5","key":813},React.createElement("title",null,"2021-01-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"149.0","key":814},React.createElement("title",null,"2021-01-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"152.5","key":815},React.createElement("title",null,"2021-01-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"131.5","key":816},React.createElement("title",null,"2021-01-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"135.0","key":817},React.createElement("title",null,"2021-01-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"138.5","key":818},React.createElement("title",null,"2021-01-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"142.0","key":819},React.createElement("title",null,"2021-01-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"145.5","key":820},React.createElement("title",null,"2021-01-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"149.0","key":821},React.createElement("title",null,"2021-01-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"152.5","key":822},React.createElement("title",null,"2021-01-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"131.5","key":823},React.createElement("title",null,"2021-01-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"135.0","key":824},React.createElement("title",null,"2021-01-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"138.5","key":825},React.createElement("title",null,"2021-01-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"142.0","key":826},React.createElement("title",null,"2021-01-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"145.5","key":827},React.createElement("title",null,"2021-01-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"149.0","key":828},React.createElement("title",null,"2021-01-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"152.5","key":829},React.createElement("title",null,"2021-01-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"131.5","key":830},React.createElement("title",null,"2021-02-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"135.0","key":831},React.createElement("title",null,"2021-02-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"138.5","key":832},React.createElement("title",null,"2021-02-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"142.0","key":833},React.createElement("title",null,"2021-02-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"145.5","key":834},React.createElement("title",null,"2021-02-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"149.0","key":835},React.createElement("title",null,"2021-02-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"152.5","key":836},React.createElement("title",null,"2021-02-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"131.5","key":837},React.createElement("title",null,"2021-02-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"135.0","key":838},React.createElement("title",null,"2021-02-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"138.5","key":839},React.createElement("title",null,"2021-02-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"142.0","key":840},React.createElement("title",null,"2021-02-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"145.5","key":841},React.createElement("title",null,"2021-02-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"31.0","y":"149.0","key":842},React.createElement("title",null,"2021-02-13 4.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"152.5","key":843},React.createElement("title",null,"2021-02-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"131.5","key":844},React.createElement("title",null,"2021-02-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"135.0","key":845},React.createElement("title",null,"2021-02-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"138.5","key":846},React.createElement("title",null,"2021-02-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"142.0","key":847},React.createElement("title",null,"2021-02-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"145.5","key":848},React.createElement("title",null,"2021-02-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"149.0","key":849},React.createElement("title",null,"2021-02-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"152.5","key":850},React.createElement("title",null,"2021-02-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"131.5","key":851},React.createElement("title",null,"2021-02-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"135.0","key":852},React.createElement("title",null,"2021-02-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"138.5","key":853},React.createElement("title",null,"2021-02-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"142.0","key":854},React.createElement("title",null,"2021-02-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"145.5","key":855},React.createElement("title",null,"2021-02-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"149.0","key":856},React.createElement("title",null,"2021-02-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"152.5","key":857},React.createElement("title",null,"2021-02-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"131.5","key":858},React.createElement("title",null,"2021-03-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"135.0","key":859},React.createElement("title",null,"2021-03-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"138.5","key":860},React.createElement("title",null,"2021-03-03")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"142.0","key":861},React.createElement("title",null,"2021-03-04 1.6 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"145.5","key":862},React.createElement("title",null,"2021-03-05 2.6 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"149.0","key":863},React.createElement("title",null,"2021-03-06 1.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"152.5","key":864},React.createElement("title",null,"2021-03-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"131.5","key":865},React.createElement("title",null,"2021-03-08 5.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"135.0","key":866},React.createElement("title",null,"2021-03-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"138.5","key":867},React.createElement("title",null,"2021-03-10 3.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"142.0","key":868},React.createElement("title",null,"2021-03-11")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"45.0","y":"145.5","key":869},React.createElement("title",null,"2021-03-12 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"149.0","key":870},React.createElement("title",null,"2021-03-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"152.5","key":871},React.createElement("title",null,"2021-03-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"131.5","key":872},React.createElement("title",null,"2021-03-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"135.0","key":873},React.createElement("title",null,"2021-03-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"48.5","y":"138.5","key":874},React.createElement("title",null,"2021-03-17 6.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"142.0","key":875},React.createElement("title",null,"2021-03-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"145.5","key":876},React.createElement("title",null,"2021-03-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"149.0","key":877},React.createElement("title",null,"2021-03-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"152.5","key":878},React.createElement("title",null,"2021-03-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"131.5","key":879},React.createElement("title",null,"2021-03-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"52.0","y":"135.0","key":880},React.createElement("title",null,"2021-03-23 8.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"138.5","key":881},React.createElement("title",null,"2021-03-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"52.0","y":"142.0","key":882},React.createElement("title",null,"2021-03-25 3.7 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"52.0","y":"145.5","key":883},React.createElement("title",null,"2021-03-26 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"149.0","key":884},React.createElement("title",null,"2021-03-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"152.5","key":885},React.createElement("title",null,"2021-03-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"131.5","key":886},React.createElement("title",null,"2021-03-29 5.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"135.0","key":887},React.createElement("title",null,"2021-03-30")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"138.5","key":888},React.createElement("title",null,"2021-03-31 5.0 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"142.0","key":889},React.createElement("title",null,"2021-04-01 4.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"145.5","key":890},React.createElement("title",null,"2021-04-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"149.0","key":891},React.createElement("title",null,"2021-04-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"152.5","key":892},React.createElement("title",null,"2021-04-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"131.5","key":893},React.createElement("title",null,"2021-04-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"135.0","key":894},React.createElement("title",null,"2021-04-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"138.5","key":895},React.createElement("title",null,"2021-04-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"142.0","key":896},React.createElement("title",null,"2021-04-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"145.5","key":897},React.createElement("title",null,"2021-04-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"149.0","key":898},React.createElement("title",null,"2021-04-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"152.5","key":899},React.createElement("title",null,"2021-04-11")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"62.5","y":"131.5","key":900},React.createElement("title",null,"2021-04-12 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"135.0","key":901},React.createElement("title",null,"2021-04-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"138.5","key":902},React.createElement("title",null,"2021-04-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"142.0","key":903},React.createElement("title",null,"2021-04-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"145.5","key":904},React.createElement("title",null,"2021-04-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"149.0","key":905},React.createElement("title",null,"2021-04-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"152.5","key":906},React.createElement("title",null,"2021-04-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"131.5","key":907},React.createElement("title",null,"2021-04-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"135.0","key":908},React.createElement("title",null,"2021-04-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"138.5","key":909},React.createElement("title",null,"2021-04-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"66.0","y":"142.0","key":910},React.createElement("title",null,"2021-04-22 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"145.5","key":911},React.createElement("title",null,"2021-04-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"149.0","key":912},React.createElement("title",null,"2021-04-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"152.5","key":913},React.createElement("title",null,"2021-04-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"131.5","key":914},React.createElement("title",null,"2021-04-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"135.0","key":915},React.createElement("title",null,"2021-04-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"138.5","key":916},React.createElement("title",null,"2021-04-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"142.0","key":917},React.createElement("title",null,"2021-04-29")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"69.5","y":"145.5","key":918},React.createElement("title",null,"2021-04-30 7.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"149.0","key":919},React.createElement("title",null,"2021-05-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"152.5","key":920},React.createElement("title",null,"2021-05-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"131.5","key":921},React.createElement("title",null,"2021-05-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"135.0","key":922},React.createElement("title",null,"2021-05-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"138.5","key":923},React.createElement("title",null,"2021-05-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"142.0","key":924},React.createElement("title",null,"2021-05-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"145.5","key":925},React.createElement("title",null,"2021-05-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"149.0","key":926},React.createElement("title",null,"2021-05-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"152.5","key":927},React.createElement("title",null,"2021-05-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"76.5","y":"131.5","key":928},React.createElement("title",null,"2021-05-10 1.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"135.0","key":929},React.createElement("title",null,"2021-05-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"138.5","key":930},React.createElement("title",null,"2021-05-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"142.0","key":931},React.createElement("title",null,"2021-05-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"145.5","key":932},React.createElement("title",null,"2021-05-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"149.0","key":933},React.createElement("title",null,"2021-05-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"152.5","key":934},React.createElement("title",null,"2021-05-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"131.5","key":935},React.createElement("title",null,"2021-05-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"135.0","key":936},React.createElement("title",null,"2021-05-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"138.5","key":937},React.createElement("title",null,"2021-05-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"142.0","key":938},React.createElement("title",null,"2021-05-20")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"80.0","y":"145.5","key":939},React.createElement("title",null,"2021-05-21 6.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"149.0","key":940},React.createElement("title",null,"2021-05-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"152.5","key":941},React.createElement("title",null,"2021-05-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"131.5","key":942},React.createElement("title",null,"2021-05-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"135.0","key":943},React.createElement("title",null,"2021-05-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"138.5","key":944},React.createElement("title",null,"2021-05-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"142.0","key":945},React.createElement("title",null,"2021-05-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"145.5","key":946},React.createElement("title",null,"2021-05-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"149.0","key":947},React.createElement("title",null,"2021-05-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"152.5","key":948},React.createElement("title",null,"2021-05-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"131.5","key":949},React.createElement("title",null,"2021-05-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"135.0","key":950},React.createElement("title",null,"2021-06-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"138.5","key":951},React.createElement("title",null,"2021-06-02")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"87.0","y":"142.0","key":952},React.createElement("title",null,"2021-06-03 6.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"145.5","key":953},React.createElement("title",null,"2021-06-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"149.0","key":954},React.createElement("title",null,"2021-06-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"152.5","key":955},React.createElement("title",null,"2021-06-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"131.5","key":956},React.createElement("title",null,"2021-06-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"135.0","key":957},React.createElement("title",null,"2021-06-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"138.5","key":958},React.createElement("title",null,"2021-06-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"90.5","y":"142.0","key":959},React.createElement("title",null,"2021-06-10 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"145.5","key":960},React.createElement("title",null,"2021-06-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"149.0","key":961},React.createElement("title",null,"2021-06-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"152.5","key":962},React.createElement("title",null,"2021-06-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"131.5","key":963},React.createElement("title",null,"2021-06-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"135.0","key":964},React.createElement("title",null,"2021-06-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"138.5","key":965},React.createElement("title",null,"2021-06-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"94.0","y":"142.0","key":966},React.createElement("title",null,"2021-06-17 6.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"145.5","key":967},React.createElement("title",null,"2021-06-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"149.0","key":968},React.createElement("title",null,"2021-06-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"152.5","key":969},React.createElement("title",null,"2021-06-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"131.5","key":970},React.createElement("title",null,"2021-06-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"135.0","key":971},React.createElement("title",null,"2021-06-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"138.5","key":972},React.createElement("title",null,"2021-06-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"142.0","key":973},React.createElement("title",null,"2021-06-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"97.5","y":"145.5","key":974},React.createElement("title",null,"2021-06-25 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"149.0","key":975},React.createElement("title",null,"2021-06-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"152.5","key":976},React.createElement("title",null,"2021-06-27")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"101.0","y":"131.5","key":977},React.createElement("title",null,"2021-06-28 5.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"135.0","key":978},React.createElement("title",null,"2021-06-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"138.5","key":979},React.createElement("title",null,"2021-06-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"142.0","key":980},React.createElement("title",null,"2021-07-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"101.0","y":"145.5","key":981},React.createElement("title",null,"2021-07-02 6.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"149.0","key":982},React.createElement("title",null,"2021-07-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"152.5","key":983},React.createElement("title",null,"2021-07-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"131.5","key":984},React.createElement("title",null,"2021-07-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"135.0","key":985},React.createElement("title",null,"2021-07-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"138.5","key":986},React.createElement("title",null,"2021-07-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"104.5","y":"142.0","key":987},React.createElement("title",null,"2021-07-08 5.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"145.5","key":988},React.createElement("title",null,"2021-07-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"149.0","key":989},React.createElement("title",null,"2021-07-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"152.5","key":990},React.createElement("title",null,"2021-07-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"131.5","key":991},React.createElement("title",null,"2021-07-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"135.0","key":992},React.createElement("title",null,"2021-07-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"138.5","key":993},React.createElement("title",null,"2021-07-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"142.0","key":994},React.createElement("title",null,"2021-07-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"145.5","key":995},React.createElement("title",null,"2021-07-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"149.0","key":996},React.createElement("title",null,"2021-07-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"152.5","key":997},React.createElement("title",null,"2021-07-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"131.5","key":998},React.createElement("title",null,"2021-07-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"135.0","key":999},React.createElement("title",null,"2021-07-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"138.5","key":1000},React.createElement("title",null,"2021-07-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"142.0","key":1001},React.createElement("title",null,"2021-07-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"145.5","key":1002},React.createElement("title",null,"2021-07-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"149.0","key":1003},React.createElement("title",null,"2021-07-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"152.5","key":1004},React.createElement("title",null,"2021-07-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"131.5","key":1005},React.createElement("title",null,"2021-07-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"135.0","key":1006},React.createElement("title",null,"2021-07-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"138.5","key":1007},React.createElement("title",null,"2021-07-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"142.0","key":1008},React.createElement("title",null,"2021-07-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"145.5","key":1009},React.createElement("title",null,"2021-07-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"149.0","key":1010},React.createElement("title",null,"2021-07-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"152.5","key":1011},React.createElement("title",null,"2021-08-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"131.5","key":1012},React.createElement("title",null,"2021-08-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"135.0","key":1013},React.createElement("title",null,"2021-08-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"138.5","key":1014},React.createElement("title",null,"2021-08-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"142.0","key":1015},React.createElement("title",null,"2021-08-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"145.5","key":1016},React.createElement("title",null,"2021-08-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"149.0","key":1017},React.createElement("title",null,"2021-08-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"152.5","key":1018},React.createElement("title",null,"2021-08-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"131.5","key":1019},React.createElement("title",null,"2021-08-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"135.0","key":1020},React.createElement("title",null,"2021-08-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"138.5","key":1021},React.createElement("title",null,"2021-08-11")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"142.0","key":1022},React.createElement("title",null,"2021-08-12 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"145.5","key":1023},React.createElement("title",null,"2021-08-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"149.0","key":1024},React.createElement("title",null,"2021-08-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"152.5","key":1025},React.createElement("title",null,"2021-08-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"131.5","key":1026},React.createElement("title",null,"2021-08-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"135.0","key":1027},React.createElement("title",null,"2021-08-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"138.5","key":1028},React.createElement("title",null,"2021-08-18")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"125.5","y":"142.0","key":1029},React.createElement("title",null,"2021-08-19 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"145.5","key":1030},React.createElement("title",null,"2021-08-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"149.0","key":1031},React.createElement("title",null,"2021-08-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"152.5","key":1032},React.createElement("title",null,"2021-08-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"131.5","key":1033},React.createElement("title",null,"2021-08-23")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"129.0","y":"135.0","key":1034},React.createElement("title",null,"2021-08-24 8.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"138.5","key":1035},React.createElement("title",null,"2021-08-25")),React.createElement("rect",{"fill":"#ff0000","height":"2.6","width":"2.6","x":"129.0","y":"142.0","key":1036},React.createElement("title",null,"2021-08-26 10.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"145.5","key":1037},React.createElement("title",null,"2021-08-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"149.0","key":1038},React.createElement("title",null,"2021-08-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"152.5","key":1039},React.createElement("title",null,"2021-08-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"131.5","key":1040},React.createElement("title",null,"2021-08-30")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"132.5","y":"135.0","key":1041},React.createElement("title",null,"2021-08-31 7.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"138.5","key":1042},React.createElement("title",null,"2021-09-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"132.5","y":"142.0","key":1043},React.createElement("title",null,"2021-09-02 6.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"145.5","key":1044},React.createElement("title",null,"2021-09-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"149.0","key":1045},React.createElement("title",null,"2021-09-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"152.5","key":1046},React.createElement("title",null,"2021-09-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"131.5","key":1047},React.createElement("title",null,"2021-09-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"135.0","key":1048},React.createElement("title",null,"2021-09-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"136.0","y":"138.5","key":1049},React.createElement("title",null,"2021-09-08 5.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"142.0","key":1050},React.createElement("title",null,"2021-09-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"145.5","key":1051},React.createElement("title",null,"2021-09-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"149.0","key":1052},React.createElement("title",null,"2021-09-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"152.5","key":1053},React.createElement("title",null,"2021-09-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"131.5","key":1054},React.createElement("title",null,"2021-09-13")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"139.5","y":"135.0","key":1055},React.createElement("title",null,"2021-09-14 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"138.5","key":1056},React.createElement("title",null,"2021-09-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"142.0","key":1057},React.createElement("title",null,"2021-09-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"139.5","y":"145.5","key":1058},React.createElement("title",null,"2021-09-17 6.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"149.0","key":1059},React.createElement("title",null,"2021-09-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"152.5","key":1060},React.createElement("title",null,"2021-09-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"131.5","key":1061},React.createElement("title",null,"2021-09-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"135.0","key":1062},React.createElement("title",null,"2021-09-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"138.5","key":1063},React.createElement("title",null,"2021-09-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"143.0","y":"142.0","key":1064},React.createElement("title",null,"2021-09-23 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"145.5","key":1065},React.createElement("title",null,"2021-09-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"149.0","key":1066},React.createElement("title",null,"2021-09-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"152.5","key":1067},React.createElement("title",null,"2021-09-26")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"146.5","y":"131.5","key":1068},React.createElement("title",null,"2021-09-27 5.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"135.0","key":1069},React.createElement("title",null,"2021-09-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"138.5","key":1070},React.createElement("title",null,"2021-09-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"142.0","key":1071},React.createElement("title",null,"2021-09-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"145.5","key":1072},React.createElement("title",null,"2021-10-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"149.0","key":1073},React.createElement("title",null,"2021-10-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"152.5","key":1074},React.createElement("title",null,"2021-10-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"131.5","key":1075},React.createElement("title",null,"2021-10-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"135.0","key":1076},React.createElement("title",null,"2021-10-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"138.5","key":1077},React.createElement("title",null,"2021-10-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"142.0","key":1078},React.createElement("title",null,"2021-10-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"145.5","key":1079},React.createElement("title",null,"2021-10-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"149.0","key":1080},React.createElement("title",null,"2021-10-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"152.5","key":1081},React.createElement("title",null,"2021-10-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"131.5","key":1082},React.createElement("title",null,"2021-10-11")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"153.5","y":"135.0","key":1083},React.createElement("title",null,"2021-10-12 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"138.5","key":1084},React.createElement("title",null,"2021-10-13")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"153.5","y":"142.0","key":1085},React.createElement("title",null,"2021-10-14 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"145.5","key":1086},React.createElement("title",null,"2021-10-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"149.0","key":1087},React.createElement("title",null,"2021-10-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"152.5","key":1088},React.createElement("title",null,"2021-10-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"131.5","key":1089},React.createElement("title",null,"2021-10-18")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"135.0","key":1090},React.createElement("title",null,"2021-10-19 5.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"138.5","key":1091},React.createElement("title",null,"2021-10-20")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"142.0","key":1092},React.createElement("title",null,"2021-10-21 5.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"145.5","key":1093},React.createElement("title",null,"2021-10-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"149.0","key":1094},React.createElement("title",null,"2021-10-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"152.5","key":1095},React.createElement("title",null,"2021-10-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"131.5","key":1096},React.createElement("title",null,"2021-10-25")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"160.5","y":"135.0","key":1097},React.createElement("title",null,"2021-10-26 4.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"138.5","key":1098},React.createElement("title",null,"2021-10-27")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"160.5","y":"142.0","key":1099},React.createElement("title",null,"2021-10-28 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"145.5","key":1100},React.createElement("title",null,"2021-10-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"149.0","key":1101},React.createElement("title",null,"2021-10-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"152.5","key":1102},React.createElement("title",null,"2021-10-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"131.5","key":1103},React.createElement("title",null,"2021-11-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"164.0","y":"135.0","key":1104},React.createElement("title",null,"2021-11-02 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"138.5","key":1105},React.createElement("title",null,"2021-11-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"142.0","key":1106},React.createElement("title",null,"2021-11-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"145.5","key":1107},React.createElement("title",null,"2021-11-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"149.0","key":1108},React.createElement("title",null,"2021-11-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"152.5","key":1109},React.createElement("title",null,"2021-11-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"131.5","key":1110},React.createElement("title",null,"2021-11-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"135.0","key":1111},React.createElement("title",null,"2021-11-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"138.5","key":1112},React.createElement("title",null,"2021-11-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"142.0","key":1113},React.createElement("title",null,"2021-11-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"145.5","key":1114},React.createElement("title",null,"2021-11-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"149.0","key":1115},React.createElement("title",null,"2021-11-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"152.5","key":1116},React.createElement("title",null,"2021-11-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"131.5","key":1117},React.createElement("title",null,"2021-11-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"135.0","key":1118},React.createElement("title",null,"2021-11-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"138.5","key":1119},React.createElement("title",null,"2021-11-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"142.0","key":1120},React.createElement("title",null,"2021-11-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"145.5","key":1121},React.createElement("title",null,"2021-11-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"149.0","key":1122},React.createElement("title",null,"2021-11-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"152.5","key":1123},React.createElement("title",null,"2021-11-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"131.5","key":1124},React.createElement("title",null,"2021-11-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"174.5","y":"135.0","key":1125},React.createElement("title",null,"2021-11-23 4.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"138.5","key":1126},React.createElement("title",null,"2021-11-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"174.5","y":"142.0","key":1127},React.createElement("title",null,"2021-11-25 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"145.5","key":1128},React.createElement("title",null,"2021-11-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"149.0","key":1129},React.createElement("title",null,"2021-11-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"152.5","key":1130},React.createElement("title",null,"2021-11-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"131.5","key":1131},React.createElement("title",null,"2021-11-29")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"178.0","y":"135.0","key":1132},React.createElement("title",null,"2021-11-30 4.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"138.5","key":1133},React.createElement("title",null,"2021-12-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"178.0","y":"142.0","key":1134},React.createElement("title",null,"2021-12-02 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"145.5","key":1135},React.createElement("title",null,"2021-12-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"149.0","key":1136},React.createElement("title",null,"2021-12-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"152.5","key":1137},React.createElement("title",null,"2021-12-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"131.5","key":1138},React.createElement("title",null,"2021-12-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"135.0","key":1139},React.createElement("title",null,"2021-12-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"138.5","key":1140},React.createElement("title",null,"2021-12-08")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"181.5","y":"142.0","key":1141},React.createElement("title",null,"2021-12-09 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"145.5","key":1142},React.createElement("title",null,"2021-12-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"149.0","key":1143},React.createElement("title",null,"2021-12-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"152.5","key":1144},React.createElement("title",null,"2021-12-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"131.5","key":1145},React.createElement("title",null,"2021-12-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"135.0","key":1146},React.createElement("title",null,"2021-12-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"138.5","key":1147},React.createElement("title",null,"2021-12-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"142.0","key":1148},React.createElement("title",null,"2021-12-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"145.5","key":1149},React.createElement("title",null,"2021-12-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"149.0","key":1150},React.createElement("title",null,"2021-12-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"152.5","key":1151},React.createElement("title",null,"2021-12-19")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"188.5","y":"131.5","key":1152},React.createElement("title",null,"2021-12-20 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"135.0","key":1153},React.createElement("title",null,"2021-12-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"138.5","key":1154},React.createElement("title",null,"2021-12-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"142.0","key":1155},React.createElement("title",null,"2021-12-23")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"188.5","y":"145.5","key":1156},React.createElement("title",null,"2021-12-24 5.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"149.0","key":1157},React.createElement("title",null,"2021-12-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"152.5","key":1158},React.createElement("title",null,"2021-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"131.5","key":1159},React.createElement("title",null,"2021-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"135.0","key":1160},React.createElement("title",null,"2021-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"138.5","key":1161},React.createElement("title",null,"2021-12-29")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"192.0","y":"142.0","key":1162},React.createElement("title",null,"2021-12-30 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"145.5","key":1163},React.createElement("title",null,"2021-12-31")),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"10.0px","fontFamily":"Arial"},"x":"10","y":"159.0","key":1164},"2020"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"4.125px","fontFamily":"Arial"},"x":"175","y":"164.0","key":1165},"84.1 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"10.0","y":"173.0","key":1166},"Jan"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"25.5","y":"173.0","key":1167},"Feb"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"41.0","y":"173.0","key":1168},"Mar"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"56.5","y":"173.0","key":1169},"Apr"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"72.0","y":"173.0","key":1170},"May"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"87.5","y":"173.0","key":1171},"Jun"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"103.0","y":"173.0","key":1172},"Jul"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"118.5","y":"173.0","key":1173},"Aug"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"134.0","y":"173.0","key":1174},"Sep"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"149.5","y":"173.0","key":1175},"Oct"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"165.0","y":"173.0","key":1176},"Nov"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"180.5","y":"173.0","key":1177},"Dec"),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"174.5","key":1178},React.createElement("title",null,"2019-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"178.0","key":1179},React.createElement("title",null,"2019-12-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"181.5","key":1180},React.createElement("title",null,"2020-01-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"185.0","key":1181},React.createElement("title",null,"2020-01-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"188.5","key":1182},React.createElement("title",null,"2020-01-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"192.0","key":1183},React.createElement("title",null,"2020-01-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"195.5","key":1184},React.createElement("title",null,"2020-01-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"174.5","key":1185},React.createElement("title",null,"2020-01-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"178.0","key":1186},React.createElement("title",null,"2020-01-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"181.5","key":1187},React.createElement("title",null,"2020-01-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"185.0","key":1188},React.createElement("title",null,"2020-01-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"188.5","key":1189},React.createElement("title",null,"2020-01-10")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"13.5","y":"192.0","key":1190},React.createElement("title",null,"2020-01-11 6.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"195.5","key":1191},React.createElement("title",null,"2020-01-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"174.5","key":1192},React.createElement("title",null,"2020-01-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"178.0","key":1193},React.createElement("title",null,"2020-01-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"181.5","key":1194},React.createElement("title",null,"2020-01-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"185.0","key":1195},React.createElement("title",null,"2020-01-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"188.5","key":1196},React.createElement("title",null,"2020-01-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"192.0","key":1197},React.createElement("title",null,"2020-01-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"195.5","key":1198},React.createElement("title",null,"2020-01-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"174.5","key":1199},React.createElement("title",null,"2020-01-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"178.0","key":1200},React.createElement("title",null,"2020-01-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"181.5","key":1201},React.createElement("title",null,"2020-01-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"185.0","key":1202},React.createElement("title",null,"2020-01-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"188.5","key":1203},React.createElement("title",null,"2020-01-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"192.0","key":1204},React.createElement("title",null,"2020-01-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"195.5","key":1205},React.createElement("title",null,"2020-01-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"174.5","key":1206},React.createElement("title",null,"2020-01-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"178.0","key":1207},React.createElement("title",null,"2020-01-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"181.5","key":1208},React.createElement("title",null,"2020-01-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"185.0","key":1209},React.createElement("title",null,"2020-01-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"188.5","key":1210},React.createElement("title",null,"2020-01-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"192.0","key":1211},React.createElement("title",null,"2020-02-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"195.5","key":1212},React.createElement("title",null,"2020-02-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"174.5","key":1213},React.createElement("title",null,"2020-02-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"178.0","key":1214},React.createElement("title",null,"2020-02-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"181.5","key":1215},React.createElement("title",null,"2020-02-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"185.0","key":1216},React.createElement("title",null,"2020-02-06")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"27.5","y":"188.5","key":1217},React.createElement("title",null,"2020-02-07 2.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"192.0","key":1218},React.createElement("title",null,"2020-02-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"195.5","key":1219},React.createElement("title",null,"2020-02-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"31.0","y":"174.5","key":1220},React.createElement("title",null,"2020-02-10 0.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"178.0","key":1221},React.createElement("title",null,"2020-02-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"181.5","key":1222},React.createElement("title",null,"2020-02-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"185.0","key":1223},React.createElement("title",null,"2020-02-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"188.5","key":1224},React.createElement("title",null,"2020-02-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"192.0","key":1225},React.createElement("title",null,"2020-02-15")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"31.0","y":"195.5","key":1226},React.createElement("title",null,"2020-02-16 1.6 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"34.5","y":"174.5","key":1227},React.createElement("title",null,"2020-02-17 2.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"178.0","key":1228},React.createElement("title",null,"2020-02-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"181.5","key":1229},React.createElement("title",null,"2020-02-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"185.0","key":1230},React.createElement("title",null,"2020-02-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"188.5","key":1231},React.createElement("title",null,"2020-02-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"192.0","key":1232},React.createElement("title",null,"2020-02-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"34.5","y":"195.5","key":1233},React.createElement("title",null,"2020-02-23 2.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"174.5","key":1234},React.createElement("title",null,"2020-02-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"178.0","key":1235},React.createElement("title",null,"2020-02-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"181.5","key":1236},React.createElement("title",null,"2020-02-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"185.0","key":1237},React.createElement("title",null,"2020-02-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"188.5","key":1238},React.createElement("title",null,"2020-02-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"192.0","key":1239},React.createElement("title",null,"2020-02-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"195.5","key":1240},React.createElement("title",null,"2020-03-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"174.5","key":1241},React.createElement("title",null,"2020-03-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"178.0","key":1242},React.createElement("title",null,"2020-03-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"181.5","key":1243},React.createElement("title",null,"2020-03-04")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"41.5","y":"185.0","key":1244},React.createElement("title",null,"2020-03-05 2.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"188.5","key":1245},React.createElement("title",null,"2020-03-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"192.0","key":1246},React.createElement("title",null,"2020-03-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"195.5","key":1247},React.createElement("title",null,"2020-03-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"174.5","key":1248},React.createElement("title",null,"2020-03-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"178.0","key":1249},React.createElement("title",null,"2020-03-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"181.5","key":1250},React.createElement("title",null,"2020-03-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"185.0","key":1251},React.createElement("title",null,"2020-03-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"188.5","key":1252},React.createElement("title",null,"2020-03-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"192.0","key":1253},React.createElement("title",null,"2020-03-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"195.5","key":1254},React.createElement("title",null,"2020-03-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"174.5","key":1255},React.createElement("title",null,"2020-03-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"178.0","key":1256},React.createElement("title",null,"2020-03-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"181.5","key":1257},React.createElement("title",null,"2020-03-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"185.0","key":1258},React.createElement("title",null,"2020-03-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"188.5","key":1259},React.createElement("title",null,"2020-03-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"192.0","key":1260},React.createElement("title",null,"2020-03-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"195.5","key":1261},React.createElement("title",null,"2020-03-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"174.5","key":1262},React.createElement("title",null,"2020-03-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"178.0","key":1263},React.createElement("title",null,"2020-03-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"181.5","key":1264},React.createElement("title",null,"2020-03-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"185.0","key":1265},React.createElement("title",null,"2020-03-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"188.5","key":1266},React.createElement("title",null,"2020-03-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"192.0","key":1267},React.createElement("title",null,"2020-03-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"195.5","key":1268},React.createElement("title",null,"2020-03-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"174.5","key":1269},React.createElement("title",null,"2020-03-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"178.0","key":1270},React.createElement("title",null,"2020-03-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"181.5","key":1271},React.createElement("title",null,"2020-04-01")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"185.0","key":1272},React.createElement("title",null,"2020-04-02 1.1 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"188.5","key":1273},React.createElement("title",null,"2020-04-03 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"192.0","key":1274},React.createElement("title",null,"2020-04-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"195.5","key":1275},React.createElement("title",null,"2020-04-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"174.5","key":1276},React.createElement("title",null,"2020-04-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"178.0","key":1277},React.createElement("title",null,"2020-04-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"181.5","key":1278},React.createElement("title",null,"2020-04-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"185.0","key":1279},React.createElement("title",null,"2020-04-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"188.5","key":1280},React.createElement("title",null,"2020-04-10")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"59.0","y":"192.0","key":1281},React.createElement("title",null,"2020-04-11 4.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"195.5","key":1282},React.createElement("title",null,"2020-04-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"174.5","key":1283},React.createElement("title",null,"2020-04-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"178.0","key":1284},React.createElement("title",null,"2020-04-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"181.5","key":1285},React.createElement("title",null,"2020-04-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"185.0","key":1286},React.createElement("title",null,"2020-04-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"188.5","key":1287},React.createElement("title",null,"2020-04-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"192.0","key":1288},React.createElement("title",null,"2020-04-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"195.5","key":1289},React.createElement("title",null,"2020-04-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"174.5","key":1290},React.createElement("title",null,"2020-04-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"178.0","key":1291},React.createElement("title",null,"2020-04-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"181.5","key":1292},React.createElement("title",null,"2020-04-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"185.0","key":1293},React.createElement("title",null,"2020-04-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"188.5","key":1294},React.createElement("title",null,"2020-04-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"192.0","key":1295},React.createElement("title",null,"2020-04-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"195.5","key":1296},React.createElement("title",null,"2020-04-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"174.5","key":1297},React.createElement("title",null,"2020-04-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"178.0","key":1298},React.createElement("title",null,"2020-04-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"181.5","key":1299},React.createElement("title",null,"2020-04-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"185.0","key":1300},React.createElement("title",null,"2020-04-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"188.5","key":1301},React.createElement("title",null,"2020-05-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"192.0","key":1302},React.createElement("title",null,"2020-05-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"195.5","key":1303},React.createElement("title",null,"2020-05-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"174.5","key":1304},React.createElement("title",null,"2020-05-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"178.0","key":1305},React.createElement("title",null,"2020-05-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"181.5","key":1306},React.createElement("title",null,"2020-05-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"185.0","key":1307},React.createElement("title",null,"2020-05-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"188.5","key":1308},React.createElement("title",null,"2020-05-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"192.0","key":1309},React.createElement("title",null,"2020-05-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"195.5","key":1310},React.createElement("title",null,"2020-05-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"174.5","key":1311},React.createElement("title",null,"2020-05-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"178.0","key":1312},React.createElement("title",null,"2020-05-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"181.5","key":1313},React.createElement("title",null,"2020-05-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"185.0","key":1314},React.createElement("title",null,"2020-05-14")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"76.5","y":"188.5","key":1315},React.createElement("title",null,"2020-05-15 3.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"192.0","key":1316},React.createElement("title",null,"2020-05-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"195.5","key":1317},React.createElement("title",null,"2020-05-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"174.5","key":1318},React.createElement("title",null,"2020-05-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"178.0","key":1319},React.createElement("title",null,"2020-05-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"181.5","key":1320},React.createElement("title",null,"2020-05-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"185.0","key":1321},React.createElement("title",null,"2020-05-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"188.5","key":1322},React.createElement("title",null,"2020-05-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"192.0","key":1323},React.createElement("title",null,"2020-05-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"195.5","key":1324},React.createElement("title",null,"2020-05-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"174.5","key":1325},React.createElement("title",null,"2020-05-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"178.0","key":1326},React.createElement("title",null,"2020-05-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"181.5","key":1327},React.createElement("title",null,"2020-05-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"185.0","key":1328},React.createElement("title",null,"2020-05-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"83.5","y":"188.5","key":1329},React.createElement("title",null,"2020-05-29 2.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"192.0","key":1330},React.createElement("title",null,"2020-05-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"195.5","key":1331},React.createElement("title",null,"2020-05-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"174.5","key":1332},React.createElement("title",null,"2020-06-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"178.0","key":1333},React.createElement("title",null,"2020-06-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"181.5","key":1334},React.createElement("title",null,"2020-06-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"185.0","key":1335},React.createElement("title",null,"2020-06-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"188.5","key":1336},React.createElement("title",null,"2020-06-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"192.0","key":1337},React.createElement("title",null,"2020-06-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"195.5","key":1338},React.createElement("title",null,"2020-06-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"174.5","key":1339},React.createElement("title",null,"2020-06-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"178.0","key":1340},React.createElement("title",null,"2020-06-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"181.5","key":1341},React.createElement("title",null,"2020-06-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"185.0","key":1342},React.createElement("title",null,"2020-06-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"188.5","key":1343},React.createElement("title",null,"2020-06-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"192.0","key":1344},React.createElement("title",null,"2020-06-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"195.5","key":1345},React.createElement("title",null,"2020-06-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"174.5","key":1346},React.createElement("title",null,"2020-06-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"178.0","key":1347},React.createElement("title",null,"2020-06-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"181.5","key":1348},React.createElement("title",null,"2020-06-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"185.0","key":1349},React.createElement("title",null,"2020-06-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"188.5","key":1350},React.createElement("title",null,"2020-06-19")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"94.0","y":"192.0","key":1351},React.createElement("title",null,"2020-06-20 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"195.5","key":1352},React.createElement("title",null,"2020-06-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"174.5","key":1353},React.createElement("title",null,"2020-06-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"178.0","key":1354},React.createElement("title",null,"2020-06-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"181.5","key":1355},React.createElement("title",null,"2020-06-24")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"97.5","y":"185.0","key":1356},React.createElement("title",null,"2020-06-25 3.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"188.5","key":1357},React.createElement("title",null,"2020-06-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"192.0","key":1358},React.createElement("title",null,"2020-06-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"195.5","key":1359},React.createElement("title",null,"2020-06-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"174.5","key":1360},React.createElement("title",null,"2020-06-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"178.0","key":1361},React.createElement("title",null,"2020-06-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"181.5","key":1362},React.createElement("title",null,"2020-07-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"185.0","key":1363},React.createElement("title",null,"2020-07-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"188.5","key":1364},React.createElement("title",null,"2020-07-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"192.0","key":1365},React.createElement("title",null,"2020-07-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"195.5","key":1366},React.createElement("title",null,"2020-07-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"174.5","key":1367},React.createElement("title",null,"2020-07-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"178.0","key":1368},React.createElement("title",null,"2020-07-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"181.5","key":1369},React.createElement("title",null,"2020-07-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"185.0","key":1370},React.createElement("title",null,"2020-07-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"188.5","key":1371},React.createElement("title",null,"2020-07-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"192.0","key":1372},React.createElement("title",null,"2020-07-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"195.5","key":1373},React.createElement("title",null,"2020-07-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"174.5","key":1374},React.createElement("title",null,"2020-07-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"178.0","key":1375},React.createElement("title",null,"2020-07-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"181.5","key":1376},React.createElement("title",null,"2020-07-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"185.0","key":1377},React.createElement("title",null,"2020-07-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"188.5","key":1378},React.createElement("title",null,"2020-07-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"192.0","key":1379},React.createElement("title",null,"2020-07-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"195.5","key":1380},React.createElement("title",null,"2020-07-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"174.5","key":1381},React.createElement("title",null,"2020-07-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"178.0","key":1382},React.createElement("title",null,"2020-07-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"181.5","key":1383},React.createElement("title",null,"2020-07-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"185.0","key":1384},React.createElement("title",null,"2020-07-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"188.5","key":1385},React.createElement("title",null,"2020-07-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"192.0","key":1386},React.createElement("title",null,"2020-07-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"195.5","key":1387},React.createElement("title",null,"2020-07-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"174.5","key":1388},React.createElement("title",null,"2020-07-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"178.0","key":1389},React.createElement("title",null,"2020-07-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"181.5","key":1390},React.createElement("title",null,"2020-07-29 7.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"185.0","key":1391},React.createElement("title",null,"2020-07-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"188.5","key":1392},React.createElement("title",null,"2020-07-31")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"192.0","key":1393},React.createElement("title",null,"2020-08-01 3.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"195.5","key":1394},React.createElement("title",null,"2020-08-02")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"118.5","y":"174.5","key":1395},React.createElement("title",null,"2020-08-03 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"178.0","key":1396},React.createElement("title",null,"2020-08-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"181.5","key":1397},React.createElement("title",null,"2020-08-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"185.0","key":1398},React.createElement("title",null,"2020-08-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"188.5","key":1399},React.createElement("title",null,"2020-08-07")),React.createElement("rect",{"fill":"#ff0800","height":"2.6","width":"2.6","x":"118.5","y":"192.0","key":1400},React.createElement("title",null,"2020-08-08 10.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"195.5","key":1401},React.createElement("title",null,"2020-08-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"174.5","key":1402},React.createElement("title",null,"2020-08-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"178.0","key":1403},React.createElement("title",null,"2020-08-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"181.5","key":1404},React.createElement("title",null,"2020-08-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"185.0","key":1405},React.createElement("title",null,"2020-08-13 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"188.5","key":1406},React.createElement("title",null,"2020-08-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"192.0","key":1407},React.createElement("title",null,"2020-08-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"195.5","key":1408},React.createElement("title",null,"2020-08-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"174.5","key":1409},React.createElement("title",null,"2020-08-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"178.0","key":1410},React.createElement("title",null,"2020-08-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"181.5","key":1411},React.createElement("title",null,"2020-08-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"185.0","key":1412},React.createElement("title",null,"2020-08-20")),React.createElement("rect",{"fill":"#ff0300","height":"2.6","width":"2.6","x":"125.5","y":"188.5","key":1413},React.createElement("title",null,"2020-08-21 10.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"192.0","key":1414},React.createElement("title",null,"2020-08-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"195.5","key":1415},React.createElement("title",null,"2020-08-23")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"129.0","y":"174.5","key":1416},React.createElement("title",null,"2020-08-24 0.9 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"178.0","key":1417},React.createElement("title",null,"2020-08-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"181.5","key":1418},React.createElement("title",null,"2020-08-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"185.0","key":1419},React.createElement("title",null,"2020-08-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"188.5","key":1420},React.createElement("title",null,"2020-08-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"192.0","key":1421},React.createElement("title",null,"2020-08-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"195.5","key":1422},React.createElement("title",null,"2020-08-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"174.5","key":1423},React.createElement("title",null,"2020-08-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"178.0","key":1424},React.createElement("title",null,"2020-09-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"181.5","key":1425},React.createElement("title",null,"2020-09-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"185.0","key":1426},React.createElement("title",null,"2020-09-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"188.5","key":1427},React.createElement("title",null,"2020-09-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"192.0","key":1428},React.createElement("title",null,"2020-09-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"195.5","key":1429},React.createElement("title",null,"2020-09-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"174.5","key":1430},React.createElement("title",null,"2020-09-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"178.0","key":1431},React.createElement("title",null,"2020-09-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"181.5","key":1432},React.createElement("title",null,"2020-09-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"185.0","key":1433},React.createElement("title",null,"2020-09-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"188.5","key":1434},React.createElement("title",null,"2020-09-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"192.0","key":1435},React.createElement("title",null,"2020-09-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"195.5","key":1436},React.createElement("title",null,"2020-09-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"174.5","key":1437},React.createElement("title",null,"2020-09-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"178.0","key":1438},React.createElement("title",null,"2020-09-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"181.5","key":1439},React.createElement("title",null,"2020-09-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"185.0","key":1440},React.createElement("title",null,"2020-09-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"188.5","key":1441},React.createElement("title",null,"2020-09-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"192.0","key":1442},React.createElement("title",null,"2020-09-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"195.5","key":1443},React.createElement("title",null,"2020-09-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"174.5","key":1444},React.createElement("title",null,"2020-09-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"178.0","key":1445},React.createElement("title",null,"2020-09-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"181.5","key":1446},React.createElement("title",null,"2020-09-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"185.0","key":1447},React.createElement("title",null,"2020-09-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"188.5","key":1448},React.createElement("title",null,"2020-09-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"192.0","key":1449},React.createElement("title",null,"2020-09-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"195.5","key":1450},React.createElement("title",null,"2020-09-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"174.5","key":1451},React.createElement("title",null,"2020-09-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"178.0","key":1452},React.createElement("title",null,"2020-09-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"181.5","key":1453},React.createElement("title",null,"2020-09-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"185.0","key":1454},React.createElement("title",null,"2020-10-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"188.5","key":1455},React.createElement("title",null,"2020-10-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"192.0","key":1456},React.createElement("title",null,"2020-10-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"195.5","key":1457},React.createElement("title",null,"2020-10-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"174.5","key":1458},React.createElement("title",null,"2020-10-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"178.0","key":1459},React.createElement("title",null,"2020-10-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"181.5","key":1460},React.createElement("title",null,"2020-10-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"185.0","key":1461},React.createElement("title",null,"2020-10-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"188.5","key":1462},React.createElement("title",null,"2020-10-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"192.0","key":1463},React.createElement("title",null,"2020-10-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"195.5","key":1464},React.createElement("title",null,"2020-10-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"174.5","key":1465},React.createElement("title",null,"2020-10-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"178.0","key":1466},React.createElement("title",null,"2020-10-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"181.5","key":1467},React.createElement("title",null,"2020-10-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"185.0","key":1468},React.createElement("title",null,"2020-10-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"188.5","key":1469},React.createElement("title",null,"2020-10-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"192.0","key":1470},React.createElement("title",null,"2020-10-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"195.5","key":1471},React.createElement("title",null,"2020-10-18")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"174.5","key":1472},React.createElement("title",null,"2020-10-19 1.1 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"178.0","key":1473},React.createElement("title",null,"2020-10-20 2.5 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"181.5","key":1474},React.createElement("title",null,"2020-10-21 1.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"185.0","key":1475},React.createElement("title",null,"2020-10-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"188.5","key":1476},React.createElement("title",null,"2020-10-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"192.0","key":1477},React.createElement("title",null,"2020-10-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"195.5","key":1478},React.createElement("title",null,"2020-10-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"174.5","key":1479},React.createElement("title",null,"2020-10-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"178.0","key":1480},React.createElement("title",null,"2020-10-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"181.5","key":1481},React.createElement("title",null,"2020-10-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"185.0","key":1482},React.createElement("title",null,"2020-10-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"188.5","key":1483},React.createElement("title",null,"2020-10-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"192.0","key":1484},React.createElement("title",null,"2020-10-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"195.5","key":1485},React.createElement("title",null,"2020-11-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"174.5","key":1486},React.createElement("title",null,"2020-11-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"178.0","key":1487},React.createElement("title",null,"2020-11-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"181.5","key":1488},React.createElement("title",null,"2020-11-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"185.0","key":1489},React.createElement("title",null,"2020-11-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"188.5","key":1490},React.createElement("title",null,"2020-11-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"192.0","key":1491},React.createElement("title",null,"2020-11-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"195.5","key":1492},React.createElement("title",null,"2020-11-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"174.5","key":1493},React.createElement("title",null,"2020-11-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"178.0","key":1494},React.createElement("title",null,"2020-11-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"181.5","key":1495},React.createElement("title",null,"2020-11-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"185.0","key":1496},React.createElement("title",null,"2020-11-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"188.5","key":1497},React.createElement("title",null,"2020-11-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"192.0","key":1498},React.createElement("title",null,"2020-11-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"195.5","key":1499},React.createElement("title",null,"2020-11-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"174.5","key":1500},React.createElement("title",null,"2020-11-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"178.0","key":1501},React.createElement("title",null,"2020-11-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"181.5","key":1502},React.createElement("title",null,"2020-11-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"185.0","key":1503},React.createElement("title",null,"2020-11-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"188.5","key":1504},React.createElement("title",null,"2020-11-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"192.0","key":1505},React.createElement("title",null,"2020-11-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"195.5","key":1506},React.createElement("title",null,"2020-11-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"174.5","key":1507},React.createElement("title",null,"2020-11-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"178.0","key":1508},React.createElement("title",null,"2020-11-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"181.5","key":1509},React.createElement("title",null,"2020-11-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"185.0","key":1510},React.createElement("title",null,"2020-11-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"188.5","key":1511},React.createElement("title",null,"2020-11-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"192.0","key":1512},React.createElement("title",null,"2020-11-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"195.5","key":1513},React.createElement("title",null,"2020-11-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"174.5","key":1514},React.createElement("title",null,"2020-11-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"178.0","key":1515},React.createElement("title",null,"2020-12-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"181.5","key":1516},React.createElement("title",null,"2020-12-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"185.0","key":1517},React.createElement("title",null,"2020-12-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"188.5","key":1518},React.createElement("title",null,"2020-12-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"192.0","key":1519},React.createElement("title",null,"2020-12-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"195.5","key":1520},React.createElement("title",null,"2020-12-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"174.5","key":1521},React.createElement("title",null,"2020-12-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"178.0","key":1522},React.createElement("title",null,"2020-12-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"181.5","key":1523},React.createElement("title",null,"2020-12-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"185.0","key":1524},React.createElement("title",null,"2020-12-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"188.5","key":1525},React.createElement("title",null,"2020-12-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"192.0","key":1526},React.createElement("title",null,"2020-12-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"195.5","key":1527},React.createElement("title",null,"2020-12-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"174.5","key":1528},React.createElement("title",null,"2020-12-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"178.0","key":1529},React.createElement("title",null,"2020-12-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"181.5","key":1530},React.createElement("title",null,"2020-12-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"185.0","key":1531},React.createElement("title",null,"2020-12-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"188.5","key":1532},React.createElement("title",null,"2020-12-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"192.0","key":1533},React.createElement("title",null,"2020-12-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"195.5","key":1534},React.createElement("title",null,"2020-12-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"174.5","key":1535},React.createElement("title",null,"2020-12-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"178.0","key":1536},React.createElement("title",null,"2020-12-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"181.5","key":1537},React.createElement("title",null,"2020-12-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"185.0","key":1538},React.createElement("title",null,"2020-12-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"188.5","key":1539},React.createElement("title",null,"2020-12-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"192.0","key":1540},React.createElement("title",null,"2020-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"195.5","key":1541},React.createElement("title",null,"2020-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"174.5","key":1542},React.createElement("title",null,"2020-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"178.0","key":1543},React.createElement("title",null,"2020-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"181.5","key":1544},React.createElement("title",null,"2020-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"185.0","key":1545},React.createElement("title",null,"2020-12-31")),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"10.0px","fontFamily":"Arial"},"x":"10","y":"202.0","key":1546},"2019"),React.createElement("text",{"alignmentBaseline":"hanging","fill":"#FFFFFF","style":{"fontSize":"4.125px","fontFamily":"Arial"},"x":"175","y":"207.0","key":1547},"260.1 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"10.0","y":"216.0","key":1548},"Jan"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"25.5","y":"216.0","key":1549},"Feb"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"41.0","y":"216.0","key":1550},"Mar"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"56.5","y":"216.0","key":1551},"Apr"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"72.0","y":"216.0","key":1552},"May"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"87.5","y":"216.0","key":1553},"Jun"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"103.0","y":"216.0","key":1554},"Jul"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"118.5","y":"216.0","key":1555},"Aug"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"134.0","y":"216.0","key":1556},"Sep"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"149.5","y":"216.0","key":1557},"Oct"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"165.0","y":"216.0","key":1558},"Nov"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"2.5px","fontFamily":"Arial"},"x":"180.5","y":"216.0","key":1559},"Dec"),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"217.5","key":1560},React.createElement("title",null,"2018-12-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"221.0","key":1561},React.createElement("title",null,"2019-01-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"224.5","key":1562},React.createElement("title",null,"2019-01-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"228.0","key":1563},React.createElement("title",null,"2019-01-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"231.5","key":1564},React.createElement("title",null,"2019-01-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"235.0","key":1565},React.createElement("title",null,"2019-01-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"10.0","y":"238.5","key":1566},React.createElement("title",null,"2019-01-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"217.5","key":1567},React.createElement("title",null,"2019-01-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"221.0","key":1568},React.createElement("title",null,"2019-01-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"224.5","key":1569},React.createElement("title",null,"2019-01-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"228.0","key":1570},React.createElement("title",null,"2019-01-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"231.5","key":1571},React.createElement("title",null,"2019-01-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"235.0","key":1572},React.createElement("title",null,"2019-01-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"13.5","y":"238.5","key":1573},React.createElement("title",null,"2019-01-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"217.5","key":1574},React.createElement("title",null,"2019-01-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"221.0","key":1575},React.createElement("title",null,"2019-01-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"224.5","key":1576},React.createElement("title",null,"2019-01-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"228.0","key":1577},React.createElement("title",null,"2019-01-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"231.5","key":1578},React.createElement("title",null,"2019-01-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"235.0","key":1579},React.createElement("title",null,"2019-01-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"17.0","y":"238.5","key":1580},React.createElement("title",null,"2019-01-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"217.5","key":1581},React.createElement("title",null,"2019-01-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"221.0","key":1582},React.createElement("title",null,"2019-01-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"224.5","key":1583},React.createElement("title",null,"2019-01-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"228.0","key":1584},React.createElement("title",null,"2019-01-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"231.5","key":1585},React.createElement("title",null,"2019-01-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"235.0","key":1586},React.createElement("title",null,"2019-01-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"20.5","y":"238.5","key":1587},React.createElement("title",null,"2019-01-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"217.5","key":1588},React.createElement("title",null,"2019-01-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"221.0","key":1589},React.createElement("title",null,"2019-01-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"224.5","key":1590},React.createElement("title",null,"2019-01-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"228.0","key":1591},React.createElement("title",null,"2019-01-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"231.5","key":1592},React.createElement("title",null,"2019-02-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"235.0","key":1593},React.createElement("title",null,"2019-02-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"24.0","y":"238.5","key":1594},React.createElement("title",null,"2019-02-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"217.5","key":1595},React.createElement("title",null,"2019-02-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"221.0","key":1596},React.createElement("title",null,"2019-02-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"224.5","key":1597},React.createElement("title",null,"2019-02-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"228.0","key":1598},React.createElement("title",null,"2019-02-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"231.5","key":1599},React.createElement("title",null,"2019-02-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"235.0","key":1600},React.createElement("title",null,"2019-02-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"27.5","y":"238.5","key":1601},React.createElement("title",null,"2019-02-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"217.5","key":1602},React.createElement("title",null,"2019-02-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"221.0","key":1603},React.createElement("title",null,"2019-02-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"224.5","key":1604},React.createElement("title",null,"2019-02-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"228.0","key":1605},React.createElement("title",null,"2019-02-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"231.5","key":1606},React.createElement("title",null,"2019-02-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"235.0","key":1607},React.createElement("title",null,"2019-02-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"31.0","y":"238.5","key":1608},React.createElement("title",null,"2019-02-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"217.5","key":1609},React.createElement("title",null,"2019-02-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"221.0","key":1610},React.createElement("title",null,"2019-02-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"224.5","key":1611},React.createElement("title",null,"2019-02-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"228.0","key":1612},React.createElement("title",null,"2019-02-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"231.5","key":1613},React.createElement("title",null,"2019-02-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"235.0","key":1614},React.createElement("title",null,"2019-02-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"34.5","y":"238.5","key":1615},React.createElement("title",null,"2019-02-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"217.5","key":1616},React.createElement("title",null,"2019-02-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"221.0","key":1617},React.createElement("title",null,"2019-02-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"224.5","key":1618},React.createElement("title",null,"2019-02-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"228.0","key":1619},React.createElement("title",null,"2019-02-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"231.5","key":1620},React.createElement("title",null,"2019-03-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"235.0","key":1621},React.createElement("title",null,"2019-03-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"38.0","y":"238.5","key":1622},React.createElement("title",null,"2019-03-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"217.5","key":1623},React.createElement("title",null,"2019-03-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"221.0","key":1624},React.createElement("title",null,"2019-03-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"224.5","key":1625},React.createElement("title",null,"2019-03-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"228.0","key":1626},React.createElement("title",null,"2019-03-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"231.5","key":1627},React.createElement("title",null,"2019-03-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"235.0","key":1628},React.createElement("title",null,"2019-03-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"41.5","y":"238.5","key":1629},React.createElement("title",null,"2019-03-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"217.5","key":1630},React.createElement("title",null,"2019-03-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"221.0","key":1631},React.createElement("title",null,"2019-03-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"224.5","key":1632},React.createElement("title",null,"2019-03-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"228.0","key":1633},React.createElement("title",null,"2019-03-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"231.5","key":1634},React.createElement("title",null,"2019-03-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"235.0","key":1635},React.createElement("title",null,"2019-03-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"45.0","y":"238.5","key":1636},React.createElement("title",null,"2019-03-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"217.5","key":1637},React.createElement("title",null,"2019-03-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"221.0","key":1638},React.createElement("title",null,"2019-03-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"224.5","key":1639},React.createElement("title",null,"2019-03-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"228.0","key":1640},React.createElement("title",null,"2019-03-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"231.5","key":1641},React.createElement("title",null,"2019-03-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"48.5","y":"235.0","key":1642},React.createElement("title",null,"2019-03-23 2.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"48.5","y":"238.5","key":1643},React.createElement("title",null,"2019-03-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"217.5","key":1644},React.createElement("title",null,"2019-03-25")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"52.0","y":"221.0","key":1645},React.createElement("title",null,"2019-03-26 1.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"224.5","key":1646},React.createElement("title",null,"2019-03-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"228.0","key":1647},React.createElement("title",null,"2019-03-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"52.0","y":"231.5","key":1648},React.createElement("title",null,"2019-03-29 1.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"235.0","key":1649},React.createElement("title",null,"2019-03-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"52.0","y":"238.5","key":1650},React.createElement("title",null,"2019-03-31")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"217.5","key":1651},React.createElement("title",null,"2019-04-01 0.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"221.0","key":1652},React.createElement("title",null,"2019-04-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"224.5","key":1653},React.createElement("title",null,"2019-04-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"228.0","key":1654},React.createElement("title",null,"2019-04-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"231.5","key":1655},React.createElement("title",null,"2019-04-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"55.5","y":"235.0","key":1656},React.createElement("title",null,"2019-04-06 2.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"55.5","y":"238.5","key":1657},React.createElement("title",null,"2019-04-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"59.0","y":"217.5","key":1658},React.createElement("title",null,"2019-04-08 2.4 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"221.0","key":1659},React.createElement("title",null,"2019-04-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"224.5","key":1660},React.createElement("title",null,"2019-04-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"228.0","key":1661},React.createElement("title",null,"2019-04-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"231.5","key":1662},React.createElement("title",null,"2019-04-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"235.0","key":1663},React.createElement("title",null,"2019-04-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"59.0","y":"238.5","key":1664},React.createElement("title",null,"2019-04-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"217.5","key":1665},React.createElement("title",null,"2019-04-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"221.0","key":1666},React.createElement("title",null,"2019-04-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"224.5","key":1667},React.createElement("title",null,"2019-04-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"228.0","key":1668},React.createElement("title",null,"2019-04-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"231.5","key":1669},React.createElement("title",null,"2019-04-19")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"62.5","y":"235.0","key":1670},React.createElement("title",null,"2019-04-20 1.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"62.5","y":"238.5","key":1671},React.createElement("title",null,"2019-04-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"217.5","key":1672},React.createElement("title",null,"2019-04-22")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"221.0","key":1673},React.createElement("title",null,"2019-04-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"224.5","key":1674},React.createElement("title",null,"2019-04-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"228.0","key":1675},React.createElement("title",null,"2019-04-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"231.5","key":1676},React.createElement("title",null,"2019-04-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"235.0","key":1677},React.createElement("title",null,"2019-04-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"66.0","y":"238.5","key":1678},React.createElement("title",null,"2019-04-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"217.5","key":1679},React.createElement("title",null,"2019-04-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"221.0","key":1680},React.createElement("title",null,"2019-04-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"224.5","key":1681},React.createElement("title",null,"2019-05-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"228.0","key":1682},React.createElement("title",null,"2019-05-02")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"69.5","y":"231.5","key":1683},React.createElement("title",null,"2019-05-03 2.9 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"235.0","key":1684},React.createElement("title",null,"2019-05-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"69.5","y":"238.5","key":1685},React.createElement("title",null,"2019-05-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"217.5","key":1686},React.createElement("title",null,"2019-05-06")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"73.0","y":"221.0","key":1687},React.createElement("title",null,"2019-05-07 3.5 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"73.0","y":"224.5","key":1688},React.createElement("title",null,"2019-05-08 0.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"228.0","key":1689},React.createElement("title",null,"2019-05-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"231.5","key":1690},React.createElement("title",null,"2019-05-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"235.0","key":1691},React.createElement("title",null,"2019-05-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"73.0","y":"238.5","key":1692},React.createElement("title",null,"2019-05-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"217.5","key":1693},React.createElement("title",null,"2019-05-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"221.0","key":1694},React.createElement("title",null,"2019-05-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"224.5","key":1695},React.createElement("title",null,"2019-05-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"228.0","key":1696},React.createElement("title",null,"2019-05-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"76.5","y":"231.5","key":1697},React.createElement("title",null,"2019-05-17 2.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"235.0","key":1698},React.createElement("title",null,"2019-05-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"76.5","y":"238.5","key":1699},React.createElement("title",null,"2019-05-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"217.5","key":1700},React.createElement("title",null,"2019-05-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"221.0","key":1701},React.createElement("title",null,"2019-05-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"80.0","y":"224.5","key":1702},React.createElement("title",null,"2019-05-22 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"228.0","key":1703},React.createElement("title",null,"2019-05-23")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"80.0","y":"231.5","key":1704},React.createElement("title",null,"2019-05-24 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"235.0","key":1705},React.createElement("title",null,"2019-05-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"80.0","y":"238.5","key":1706},React.createElement("title",null,"2019-05-26")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"83.5","y":"217.5","key":1707},React.createElement("title",null,"2019-05-27 1.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"221.0","key":1708},React.createElement("title",null,"2019-05-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"224.5","key":1709},React.createElement("title",null,"2019-05-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"228.0","key":1710},React.createElement("title",null,"2019-05-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"231.5","key":1711},React.createElement("title",null,"2019-05-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"235.0","key":1712},React.createElement("title",null,"2019-06-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"83.5","y":"238.5","key":1713},React.createElement("title",null,"2019-06-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"217.5","key":1714},React.createElement("title",null,"2019-06-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"221.0","key":1715},React.createElement("title",null,"2019-06-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"224.5","key":1716},React.createElement("title",null,"2019-06-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"87.0","y":"228.0","key":1717},React.createElement("title",null,"2019-06-06 1.7 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"87.0","y":"231.5","key":1718},React.createElement("title",null,"2019-06-07 5.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"235.0","key":1719},React.createElement("title",null,"2019-06-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"87.0","y":"238.5","key":1720},React.createElement("title",null,"2019-06-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"217.5","key":1721},React.createElement("title",null,"2019-06-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"221.0","key":1722},React.createElement("title",null,"2019-06-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"224.5","key":1723},React.createElement("title",null,"2019-06-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"228.0","key":1724},React.createElement("title",null,"2019-06-13")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"90.5","y":"231.5","key":1725},React.createElement("title",null,"2019-06-14 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"235.0","key":1726},React.createElement("title",null,"2019-06-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"90.5","y":"238.5","key":1727},React.createElement("title",null,"2019-06-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"217.5","key":1728},React.createElement("title",null,"2019-06-17")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"94.0","y":"221.0","key":1729},React.createElement("title",null,"2019-06-18 6.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"224.5","key":1730},React.createElement("title",null,"2019-06-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"228.0","key":1731},React.createElement("title",null,"2019-06-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"231.5","key":1732},React.createElement("title",null,"2019-06-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"94.0","y":"235.0","key":1733},React.createElement("title",null,"2019-06-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"94.0","y":"238.5","key":1734},React.createElement("title",null,"2019-06-23 3.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"217.5","key":1735},React.createElement("title",null,"2019-06-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"221.0","key":1736},React.createElement("title",null,"2019-06-25")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"97.5","y":"224.5","key":1737},React.createElement("title",null,"2019-06-26 6.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"228.0","key":1738},React.createElement("title",null,"2019-06-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"231.5","key":1739},React.createElement("title",null,"2019-06-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"97.5","y":"235.0","key":1740},React.createElement("title",null,"2019-06-29 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"97.5","y":"238.5","key":1741},React.createElement("title",null,"2019-06-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"217.5","key":1742},React.createElement("title",null,"2019-07-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"221.0","key":1743},React.createElement("title",null,"2019-07-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"224.5","key":1744},React.createElement("title",null,"2019-07-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"228.0","key":1745},React.createElement("title",null,"2019-07-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"231.5","key":1746},React.createElement("title",null,"2019-07-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"101.0","y":"235.0","key":1747},React.createElement("title",null,"2019-07-06 4.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"101.0","y":"238.5","key":1748},React.createElement("title",null,"2019-07-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"217.5","key":1749},React.createElement("title",null,"2019-07-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"221.0","key":1750},React.createElement("title",null,"2019-07-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"104.5","y":"224.5","key":1751},React.createElement("title",null,"2019-07-10 7.3 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"228.0","key":1752},React.createElement("title",null,"2019-07-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"231.5","key":1753},React.createElement("title",null,"2019-07-12")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"104.5","y":"235.0","key":1754},React.createElement("title",null,"2019-07-13 4.9 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"104.5","y":"238.5","key":1755},React.createElement("title",null,"2019-07-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"217.5","key":1756},React.createElement("title",null,"2019-07-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"221.0","key":1757},React.createElement("title",null,"2019-07-16")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"108.0","y":"224.5","key":1758},React.createElement("title",null,"2019-07-17 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"228.0","key":1759},React.createElement("title",null,"2019-07-18")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"108.0","y":"231.5","key":1760},React.createElement("title",null,"2019-07-19 3.9 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"235.0","key":1761},React.createElement("title",null,"2019-07-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"108.0","y":"238.5","key":1762},React.createElement("title",null,"2019-07-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"217.5","key":1763},React.createElement("title",null,"2019-07-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"111.5","y":"221.0","key":1764},React.createElement("title",null,"2019-07-23 3.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"224.5","key":1765},React.createElement("title",null,"2019-07-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"228.0","key":1766},React.createElement("title",null,"2019-07-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"231.5","key":1767},React.createElement("title",null,"2019-07-26")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"111.5","y":"235.0","key":1768},React.createElement("title",null,"2019-07-27 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"111.5","y":"238.5","key":1769},React.createElement("title",null,"2019-07-28")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"217.5","key":1770},React.createElement("title",null,"2019-07-29 4.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"221.0","key":1771},React.createElement("title",null,"2019-07-30")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"224.5","key":1772},React.createElement("title",null,"2019-07-31 6.0 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"228.0","key":1773},React.createElement("title",null,"2019-08-01 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"231.5","key":1774},React.createElement("title",null,"2019-08-02")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"115.0","y":"235.0","key":1775},React.createElement("title",null,"2019-08-03 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"115.0","y":"238.5","key":1776},React.createElement("title",null,"2019-08-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"217.5","key":1777},React.createElement("title",null,"2019-08-05")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"118.5","y":"221.0","key":1778},React.createElement("title",null,"2019-08-06 8.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"224.5","key":1779},React.createElement("title",null,"2019-08-07")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"118.5","y":"228.0","key":1780},React.createElement("title",null,"2019-08-08 4.0 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"118.5","y":"231.5","key":1781},React.createElement("title",null,"2019-08-09 5.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"235.0","key":1782},React.createElement("title",null,"2019-08-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"118.5","y":"238.5","key":1783},React.createElement("title",null,"2019-08-11")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"217.5","key":1784},React.createElement("title",null,"2019-08-12 7.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"221.0","key":1785},React.createElement("title",null,"2019-08-13")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"224.5","key":1786},React.createElement("title",null,"2019-08-14 9.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"228.0","key":1787},React.createElement("title",null,"2019-08-15")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"122.0","y":"231.5","key":1788},React.createElement("title",null,"2019-08-16 6.7 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"235.0","key":1789},React.createElement("title",null,"2019-08-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"122.0","y":"238.5","key":1790},React.createElement("title",null,"2019-08-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"217.5","key":1791},React.createElement("title",null,"2019-08-19")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"125.5","y":"221.0","key":1792},React.createElement("title",null,"2019-08-20 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"224.5","key":1793},React.createElement("title",null,"2019-08-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"125.5","y":"228.0","key":1794},React.createElement("title",null,"2019-08-22 6.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"231.5","key":1795},React.createElement("title",null,"2019-08-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"235.0","key":1796},React.createElement("title",null,"2019-08-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"125.5","y":"238.5","key":1797},React.createElement("title",null,"2019-08-25")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"129.0","y":"217.5","key":1798},React.createElement("title",null,"2019-08-26 6.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"221.0","key":1799},React.createElement("title",null,"2019-08-27")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"129.0","y":"224.5","key":1800},React.createElement("title",null,"2019-08-28 3.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"228.0","key":1801},React.createElement("title",null,"2019-08-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"231.5","key":1802},React.createElement("title",null,"2019-08-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"129.0","y":"235.0","key":1803},React.createElement("title",null,"2019-08-31")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"129.0","y":"238.5","key":1804},React.createElement("title",null,"2019-09-01 7.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"217.5","key":1805},React.createElement("title",null,"2019-09-02")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"132.5","y":"221.0","key":1806},React.createElement("title",null,"2019-09-03 7.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"224.5","key":1807},React.createElement("title",null,"2019-09-04")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"132.5","y":"228.0","key":1808},React.createElement("title",null,"2019-09-05 1.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"231.5","key":1809},React.createElement("title",null,"2019-09-06")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"132.5","y":"235.0","key":1810},React.createElement("title",null,"2019-09-07 7.0 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"132.5","y":"238.5","key":1811},React.createElement("title",null,"2019-09-08")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"136.0","y":"217.5","key":1812},React.createElement("title",null,"2019-09-09 7.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"221.0","key":1813},React.createElement("title",null,"2019-09-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"224.5","key":1814},React.createElement("title",null,"2019-09-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"228.0","key":1815},React.createElement("title",null,"2019-09-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"231.5","key":1816},React.createElement("title",null,"2019-09-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"235.0","key":1817},React.createElement("title",null,"2019-09-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"136.0","y":"238.5","key":1818},React.createElement("title",null,"2019-09-15")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"139.5","y":"217.5","key":1819},React.createElement("title",null,"2019-09-16 0.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"221.0","key":1820},React.createElement("title",null,"2019-09-17")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"139.5","y":"224.5","key":1821},React.createElement("title",null,"2019-09-18 5.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"228.0","key":1822},React.createElement("title",null,"2019-09-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"231.5","key":1823},React.createElement("title",null,"2019-09-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"235.0","key":1824},React.createElement("title",null,"2019-09-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"139.5","y":"238.5","key":1825},React.createElement("title",null,"2019-09-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"143.0","y":"217.5","key":1826},React.createElement("title",null,"2019-09-23 0.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"221.0","key":1827},React.createElement("title",null,"2019-09-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"224.5","key":1828},React.createElement("title",null,"2019-09-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"228.0","key":1829},React.createElement("title",null,"2019-09-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"143.0","y":"231.5","key":1830},React.createElement("title",null,"2019-09-27")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"143.0","y":"235.0","key":1831},React.createElement("title",null,"2019-09-28 5.1 km")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"143.0","y":"238.5","key":1832},React.createElement("title",null,"2019-09-29 0.9 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"217.5","key":1833},React.createElement("title",null,"2019-09-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"221.0","key":1834},React.createElement("title",null,"2019-10-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"224.5","key":1835},React.createElement("title",null,"2019-10-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"228.0","key":1836},React.createElement("title",null,"2019-10-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"231.5","key":1837},React.createElement("title",null,"2019-10-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"235.0","key":1838},React.createElement("title",null,"2019-10-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"146.5","y":"238.5","key":1839},React.createElement("title",null,"2019-10-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"217.5","key":1840},React.createElement("title",null,"2019-10-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"221.0","key":1841},React.createElement("title",null,"2019-10-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"224.5","key":1842},React.createElement("title",null,"2019-10-09")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"150.0","y":"228.0","key":1843},React.createElement("title",null,"2019-10-10 5.2 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"231.5","key":1844},React.createElement("title",null,"2019-10-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"235.0","key":1845},React.createElement("title",null,"2019-10-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"150.0","y":"238.5","key":1846},React.createElement("title",null,"2019-10-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"217.5","key":1847},React.createElement("title",null,"2019-10-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"221.0","key":1848},React.createElement("title",null,"2019-10-15")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"153.5","y":"224.5","key":1849},React.createElement("title",null,"2019-10-16 6.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"228.0","key":1850},React.createElement("title",null,"2019-10-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"231.5","key":1851},React.createElement("title",null,"2019-10-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"235.0","key":1852},React.createElement("title",null,"2019-10-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"153.5","y":"238.5","key":1853},React.createElement("title",null,"2019-10-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"217.5","key":1854},React.createElement("title",null,"2019-10-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"221.0","key":1855},React.createElement("title",null,"2019-10-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"157.0","y":"224.5","key":1856},React.createElement("title",null,"2019-10-23 0.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"228.0","key":1857},React.createElement("title",null,"2019-10-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"231.5","key":1858},React.createElement("title",null,"2019-10-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"235.0","key":1859},React.createElement("title",null,"2019-10-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"157.0","y":"238.5","key":1860},React.createElement("title",null,"2019-10-27")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"160.5","y":"217.5","key":1861},React.createElement("title",null,"2019-10-28 7.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"221.0","key":1862},React.createElement("title",null,"2019-10-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"224.5","key":1863},React.createElement("title",null,"2019-10-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"228.0","key":1864},React.createElement("title",null,"2019-10-31")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"231.5","key":1865},React.createElement("title",null,"2019-11-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"235.0","key":1866},React.createElement("title",null,"2019-11-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"160.5","y":"238.5","key":1867},React.createElement("title",null,"2019-11-03")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"164.0","y":"217.5","key":1868},React.createElement("title",null,"2019-11-04 0.5 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"221.0","key":1869},React.createElement("title",null,"2019-11-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"224.5","key":1870},React.createElement("title",null,"2019-11-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"228.0","key":1871},React.createElement("title",null,"2019-11-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"231.5","key":1872},React.createElement("title",null,"2019-11-08")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"164.0","y":"235.0","key":1873},React.createElement("title",null,"2019-11-09 8.1 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"164.0","y":"238.5","key":1874},React.createElement("title",null,"2019-11-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"217.5","key":1875},React.createElement("title",null,"2019-11-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"221.0","key":1876},React.createElement("title",null,"2019-11-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"224.5","key":1877},React.createElement("title",null,"2019-11-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"228.0","key":1878},React.createElement("title",null,"2019-11-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"231.5","key":1879},React.createElement("title",null,"2019-11-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"235.0","key":1880},React.createElement("title",null,"2019-11-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"167.5","y":"238.5","key":1881},React.createElement("title",null,"2019-11-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"217.5","key":1882},React.createElement("title",null,"2019-11-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"221.0","key":1883},React.createElement("title",null,"2019-11-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"224.5","key":1884},React.createElement("title",null,"2019-11-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"228.0","key":1885},React.createElement("title",null,"2019-11-21")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"231.5","key":1886},React.createElement("title",null,"2019-11-22")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"171.0","y":"235.0","key":1887},React.createElement("title",null,"2019-11-23 4.8 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"171.0","y":"238.5","key":1888},React.createElement("title",null,"2019-11-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"217.5","key":1889},React.createElement("title",null,"2019-11-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"221.0","key":1890},React.createElement("title",null,"2019-11-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"224.5","key":1891},React.createElement("title",null,"2019-11-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"228.0","key":1892},React.createElement("title",null,"2019-11-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"231.5","key":1893},React.createElement("title",null,"2019-11-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"235.0","key":1894},React.createElement("title",null,"2019-11-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"174.5","y":"238.5","key":1895},React.createElement("title",null,"2019-12-01")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"217.5","key":1896},React.createElement("title",null,"2019-12-02")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"221.0","key":1897},React.createElement("title",null,"2019-12-03")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"224.5","key":1898},React.createElement("title",null,"2019-12-04")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"228.0","key":1899},React.createElement("title",null,"2019-12-05")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"231.5","key":1900},React.createElement("title",null,"2019-12-06")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"235.0","key":1901},React.createElement("title",null,"2019-12-07")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"178.0","y":"238.5","key":1902},React.createElement("title",null,"2019-12-08")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"217.5","key":1903},React.createElement("title",null,"2019-12-09")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"221.0","key":1904},React.createElement("title",null,"2019-12-10")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"224.5","key":1905},React.createElement("title",null,"2019-12-11")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"228.0","key":1906},React.createElement("title",null,"2019-12-12")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"231.5","key":1907},React.createElement("title",null,"2019-12-13")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"235.0","key":1908},React.createElement("title",null,"2019-12-14")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"181.5","y":"238.5","key":1909},React.createElement("title",null,"2019-12-15")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"217.5","key":1910},React.createElement("title",null,"2019-12-16")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"221.0","key":1911},React.createElement("title",null,"2019-12-17")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"224.5","key":1912},React.createElement("title",null,"2019-12-18")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"228.0","key":1913},React.createElement("title",null,"2019-12-19")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"231.5","key":1914},React.createElement("title",null,"2019-12-20")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"185.0","y":"235.0","key":1915},React.createElement("title",null,"2019-12-21")),React.createElement("rect",{"fill":"#4dd2ff","height":"2.6","width":"2.6","x":"185.0","y":"238.5","key":1916},React.createElement("title",null,"2019-12-22 1.6 km")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"217.5","key":1917},React.createElement("title",null,"2019-12-23")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"221.0","key":1918},React.createElement("title",null,"2019-12-24")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"224.5","key":1919},React.createElement("title",null,"2019-12-25")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"228.0","key":1920},React.createElement("title",null,"2019-12-26")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"231.5","key":1921},React.createElement("title",null,"2019-12-27")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"235.0","key":1922},React.createElement("title",null,"2019-12-28")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"188.5","y":"238.5","key":1923},React.createElement("title",null,"2019-12-29")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"217.5","key":1924},React.createElement("title",null,"2019-12-30")),React.createElement("rect",{"fill":"#444444","height":"2.6","width":"2.6","x":"192.0","y":"221.0","key":1925},React.createElement("title",null,"2019-12-31"))]);
}

Github.defaultProps = {"baseProfile":"full","height":"270mm","version":"1.1","viewBox":"0,0,200,270","width":"200mm","xmlnsEv":"http://www.w3.org/2001/xml-events"};

module.exports = Github;

Github.default = Github;


/***/ }),

/***/ 1502:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var React = __webpack_require__(3691);

function Grid (props) {
    return React.createElement("svg",props,[React.createElement("defs",{"key":0}),React.createElement("rect",{"fill":"#222222","height":"300","width":"200","x":"0","y":"0","key":1}),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"12px","fontFamily":"Arial","fontWeight":"bold"},"x":"10","y":"20","key":2},"2Tu"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"4px","fontFamily":"Arial"},"x":"10","y":"280","key":3},"ATHLETE"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"9px","fontFamily":"Arial"},"x":"10","y":"290","key":4},"2Tu"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"4px","fontFamily":"Arial"},"x":"120","y":"280","key":5},"STATISTICS"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"120","y":"285","key":6},"Number: 2"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"120","y":"290","key":7},"Weekly: 1.0"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"141","y":"285","key":8},"Total: 20.3 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"141","y":"290","key":9},"Avg: 10.2 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"167","y":"285","key":10},"Min: 10.1 km"),React.createElement("text",{"fill":"#FFFFFF","style":{"fontSize":"3px","fontFamily":"Arial"},"x":"167","y":"290","key":11},"Max: 10.2 km"),React.createElement("polyline",{"fill":"none","points":"85.39428365323693,38.666823415551335 83.69414735864848,36.711153687152546 83.69414735864848,36.711153687152546 81.37577968463302,36.0 79.67564339004457,37.066730318707414 79.2892487780191,37.60009500198066 79.2892487780191,37.60009500198066 79.05741201061755,36.62225950695574 79.44380662264302,37.60009500198066 79.44380662264302,37.60009500198066 79.98475908022374,38.666823415551335 81.37577968463302,38.75571739283623 83.15319490153342,38.31124741892563 83.15319490153342,38.31124741892563 84.85333119612187,38.40014143125154 86.0125150331296,37.955671281029936 86.0125150331296,37.955671281029936 87.09441994735971,38.222353397577535 88.17632486252114,38.40014143125154 88.17632486252114,38.40014143125154 87.17169887013733,40.000232146529015 87.17169887013733,40.000232146529015 85.85795718804002,41.77810736745596 85.39428365323693,43.46708555938676 85.39428365323693,43.46708555938676 85.54884149832651,45.33384722529445 85.93523611081764,46.667246033845004 85.93523611081764,46.667246033845004 87.17169887013733,47.02281871403102 88.79455624194816,47.37839125347091 90.64925038116053,47.37839125347091 90.64925038116053,47.37839125347091 92.34938667574897,47.822856729326304 94.04952296987176,48.53400103171589 94.04952296987176,48.53400103171589 95.51782249705866,48.44510802481091 96.83156417869031,48.26732198416721 98.22258478309959,47.55617747013457 98.22258478309959,47.55617747013457 99.61360538797453,47.289498131896835 100.38639461249113,48.17842895089416 100.38639461249113,48.17842895089416 100.92734707007185,49.51182352594333 101.31374168209732,50.84521611657692 101.54557844949886,52.08971407730132 101.54557844949886,52.08971407730132 101.39102060487494,53.24531777878292 101.23646275978535,54.489812405372504 101.23646275978535,54.489812405372504 101.31374168209732,56.17876663437346 101.15918383747339,57.778825598652475 101.39102060487494,59.20109783456428 101.39102060487494,59.20109783456428 101.62285737227648,60.09001683577662 101.62285737227648,61.15671847271733 102.00925198430195,62.490093733300455 102.00925198430195,62.490093733300455 102.16380982939154,63.91235849063378 102.00925198430195,65.24572965019615 102.00925198430195,65.24572965019615 101.85469413921237,66.66799003363121 101.39102060487494,68.09024815924931 100.85006814729422,69.86806764145149 100.85006814729422,69.86806764145149 100.6955103026703,71.112539180147 100.61823137989268,72.44589962513419 100.61823137989268,72.44589962513419 100.6955103026703,73.8681485793204 100.85006814729422,75.20150492340326 101.23646275978535,76.53485928365262 101.23646275978535,76.53485928365262 101.46829952672124,77.86821165971924 101.00462599238381,79.2904520072043 101.00462599238381,79.2904520072043 100.54095245758072,80.62380028289044 100.46367353480309,81.86825688323006 100.30911569017917,83.20160132308956 100.30911569017917,83.20160132308956 100.07727892231196,84.44605434330879 99.92272107768804,85.69050563528435 99.92272107768804,85.69050563528435 99.92272107768804,86.93495519889984 99.84544215537608,88.26829209941206 99.92272107768804,89.60162701585796 99.92272107768804,89.60162701585796 100.92734707007185,90.2238492979086 102.08653090661392,91.37940381822409 102.08653090661392,91.37940381822409 102.47292551910505,93.15717709361343 103.55483043380082,93.51273132523056 104.9458510382101,93.42384278058307 104.9458510382101,93.42384278058307 106.25959272030741,93.42384278058307 107.65061332471669,93.42384278058307 107.65061332471669,93.42384278058307 109.04163392912596,93.42384278058307 109.50530746392906,94.57939317444107 109.50530746392906,95.91271869983757 109.50530746392906,95.91271869983757 109.58258638624102,97.15715406724485 109.65986530901864,98.4015877066995 109.65986530901864,99.73490754526574 109.65986530901864,99.73490754526574 109.58258638624102,101.15711318643298 109.65986530901864,102.49042892490979 109.65986530901864,102.49042892490979 109.58258638624102,103.91263019293547 109.58258638624102,105.15705445071217 109.65986530901864,106.40147698041983 109.65986530901864,106.40147698041983 109.7371442313306,107.82367204123875 109.65986530901864,109.15697786089731 109.65986530901864,109.15697786089731 109.65986530901864,110.49028169678058 109.58258638624102,111.91247026855126 109.50530746392906,113.24577000469435 109.50530746392906,113.24577000469435 109.58258638624102,114.66795420326525 109.58258638624102,116.09013614512514 109.58258638624102,116.09013614512514 109.50530746392906,117.42342966573779 109.58258638624102,118.6678351618466 109.65986530901864,120.00112484727288 109.65986530901864,120.00112484727288 109.58258638624102,121.3344125491567 109.50530746392906,122.66769826755626 109.50530746392906,122.66769826755626 109.50530746392906,123.91209648147924 109.58258638624102,125.15649296779884 109.65986530901864,126.40088772593299 109.65986530901864,126.40088772593299 109.65986530901864,127.82305104791885 109.65986530901864,129.24521211342653 109.65986530901864,129.24521211342653 109.58258638624102,130.5784860624699 109.65986530901864,131.911758028029 109.7371442313306,133.33391260524513 109.7371442313306,133.33391260524513 109.7371442313306,134.6671804714715 109.7371442313306,136.00044635444647 109.7371442313306,136.00044635444647 109.65986530901864,137.33371025405359 109.7371442313306,138.6669721698854 109.7371442313306,140.0891160275205 109.7371442313306,140.0891160275205 109.81442315410823,141.42237384448526 110.04625992150977,142.6667460175231 110.04625992150977,142.6667460175231 111.05088591342792,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 112.28734867274761,143.11116423195926 119.78340415237471,143.6444657985703 119.78340415237471,143.6444657985703 120.78803014475852,143.28893145610346 120.86530906707048,142.22232758265454 120.86530906707048,142.22232758265454 120.7107512219809,140.97795479255728 120.47891445457935,139.5558123452356 120.32435660995543,138.31143585284008 120.32435660995543,138.31143585284008 120.16979876486585,136.97817340807524 120.2470776871778,135.73379333666526 120.2470776871778,135.73379333666526 120.32435660995543,134.40052705671405 120.16979876486585,132.88948954222724 120.16979876486585,131.55621903127758 120.16979876486585,131.55621903127758 120.16979876486585,130.22294653672725 120.09251984255388,128.80078702280298 120.09251984255388,128.80078702280298 120.01524091977626,127.28974006662611 119.9379619974643,125.77869056293275 119.9379619974643,124.1787530167494 119.9379619974643,124.1787530167494 120.01524091977626,122.66769826755626 120.09251984255388,121.42329832550604 120.09251984255388,121.42329832550604 120.01524091977626,120.0900107556954 120.01524091977626,118.75672120251693 119.9379619974643,117.42342966573779 119.9379619974643,117.42342966573779 119.9379619974643,116.17902244138531 120.01524091977626,114.8457270693616 120.01524091977626,114.8457270693616 119.86068307515234,113.42354315280681 119.86068307515234,112.09024368133396 120.01524091977626,110.6680553915794 120.01524091977626,110.6680553915794 120.01524091977626,109.33475182036636 119.9379619974643,107.91255915764486 119.9379619974643,107.91255915764486 119.9379619974643,106.4903642378631 119.9379619974643,105.06816706119571 120.01524091977626,103.73485515790526 120.01524091977626,103.73485515790526 119.9379619974643,102.40154127083952 119.9379619974643,101.06822539988207 119.9379619974643,101.06822539988207 120.09251984255388,99.64601961767767 120.01524091977626,98.22381157823838 120.01524091977626,96.80160128173884 120.01524091977626,96.80160128173884 120.01524091977626,95.46827707841294 120.09251984255388,94.13495089136995 119.4742884626612,93.51273132523056 119.4742884626612,93.51273132523056 118.0059889354743,93.6905083884485 116.61496833153069,93.95717391680228 116.61496833153069,93.95717391680228 115.22394772665575,94.13495089136995 113.75564819993451,94.223839365819 112.36462759552523,94.31272783124587 112.36462759552523,94.31272783124587 110.89632806833833,94.31272783124587 109.50530746392906,94.40161628770875 109.50530746392906,94.40161628770875 109.19619177374989,95.379388727888 109.19619177374989,96.53493659960805 109.27347069652751,97.86825921590207 109.27347069652751,97.86825921590207 109.35074961883947,99.20157984789694 109.35074961883947,100.44601064792369 109.35074961883947,100.44601064792369 109.35074961883947,101.77932744461577 109.4280285416171,103.11264225747436 109.50530746392906,104.35706762626069 109.50530746392906,104.35706762626069 109.50530746392906,105.69037860375829 109.58258638624102,107.02368759730598 109.58258638624102,107.02368759730598 109.58258638624102,108.35699460713658 109.58258638624102,109.51252574444516 109.58258638624102,110.75694222591119 109.58258638624102,110.75694222591119 109.58258638624102,112.09024368133396 109.50530746392906,113.33465658320347 109.50530746392906,113.33465658320347 109.58258638624102,114.66795420326525 109.50530746392906,115.91236352559645 109.58258638624102,117.42342966573779 109.58258638624102,117.42342966573779 109.65986530901864,118.75672120251693 109.65986530901864,120.0900107556954 109.65986530901864,120.0900107556954 109.50530746392906,121.42329832550604 109.58258638624102,122.75658391148318 109.65986530901864,124.1787530167494 109.65986530901864,124.1787530167494 109.7371442313306,125.42314913257724 109.65986530901864,126.6675435207435 109.65986530901864,128.00082130468218 109.65986530901864,128.00082130468218 109.7371442313306,129.4229820878827 109.7371442313306,130.845140614314 109.7371442313306,130.845140614314 109.7371442313306,132.1784121832461 109.81442315410823,133.51168176857755 109.81442315410823,134.84494937048294 109.81442315410823,134.84494937048294 109.7371442313306,136.26709929300705 109.81442315410823,137.68924695870373 109.81442315410823,137.68924695870373 109.81442315410823,139.02250834583538 109.81442315410823,140.26688385097077 109.89170207642019,141.68902517005336 109.89170207642019,141.68902517005336 110.12353884382173,142.7556296781986 111.28272268082947,143.11116423195926 111.28272268082947,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 112.67374328523874,143.11116423195926 120.16979876486585,143.28893145610346 120.9425879898481,142.57786234823288 120.9425879898481,142.57786234823288 120.78803014475852,141.42237384448526 120.63347229966894,140.1779999434948 120.40163553226739,138.7558562272461 120.40163553226739,138.7558562272461 120.2470776871778,137.42259444337105 120.16979876486585,136.08933067606995 120.16979876486585,136.08933067606995 120.16979876486585,134.9338338067173 120.40163553226739,133.68945089669432 120.40163553226739,132.35618157574208 120.40163553226739,132.35618157574208 120.32435660995543,130.93402544735 120.40163553226739,129.68963698338484 120.40163553226739,129.68963698338484 120.40163553226739,128.35636171197984 120.40163553226739,127.02308445685776 120.40163553226739,125.68980521842605 120.40163553226739,125.68980521842605 120.2470776871778,124.35652399627725 120.16979876486585,122.93435517302714 120.16979876486585,122.93435517302714 120.09251984255388,121.42329832550604 119.9379619974643,120.00112484727288 120.09251984255388,118.6678351618466 120.09251984255388,118.6678351618466 120.16979876486585,117.24565731093753 120.09251984255388,115.82347720279358 119.9379619974643,114.49018130201148 119.9379619974643,114.49018130201148 119.9379619974643,113.06799682124984 120.01524091977626,111.55692333733896 120.01524091977626,111.55692333733896 120.09251984255388,110.1347342011868 120.2470776871778,108.8014298361959 120.2470776871778,107.37923632719321 120.2470776871778,107.37923632719321 120.2470776871778,105.86815325071802 120.09251984255388,104.44595508655766 120.09251984255388,104.44595508655766 120.09251984255388,103.11264225747436 120.09251984255388,101.77932744461577 119.9379619974643,100.53489849623293 119.9379619974643,100.53489849623293 119.86068307515234,99.11269186751451 119.78340415237471,97.69048298150301 119.78340415237471,97.69048298150301 119.86068307515234,96.26827183872228 119.86068307515234,94.75717002578313 119.4742884626612,93.51273132523056 119.4742884626612,93.51273132523056 118.31510462565348,93.60161986126332 117.15592078864574,93.6905083884485 117.15592078864574,93.6905083884485 115.61034233914688,93.6905083884485 113.9102060450241,93.77939690661151 112.36462759552523,93.86828541598516 112.36462759552523,93.86828541598516 110.89632806833833,93.95717391680228 109.4280285416171,94.223839365819 109.4280285416171,94.223839365819 109.27347069652751,95.46827707841294 109.19619177374989,96.80160128173884 109.35074961883947,98.31269964680541 109.35074961883947,98.31269964680541 109.4280285416171,99.82379546394804 109.50530746392906,101.42377649300033 109.50530746392906,101.42377649300033 109.50530746392906,102.84597945353016 109.4280285416171,104.35706762626069 109.27347069652751,105.86815325071802 109.27347069652751,105.86815325071802 109.27347069652751,107.37923632719321 109.27347069652751,108.8014298361959 109.27347069652751,110.22362108819652 109.27347069652751,110.22362108819652 109.27347069652751,111.73469682026189 109.27347069652751,113.24577000469435 109.27347069652751,113.24577000469435 109.35074961883947,114.66795420326525 109.27347069652751,116.00124983978458 109.27347069652751,117.33454349258682 109.27347069652751,117.33454349258682 109.27347069652751,118.6678351618466 109.19619177374989,120.0900107556954 109.19619177374989,120.0900107556954 109.27347069652751,121.3344125491567 109.35074961883947,122.75658391148318 109.35074961883947,122.75658391148318 109.50530746392906,124.08986751391785 109.58258638624102,125.33426375314593 109.58258638624102,126.48977299965918 109.58258638624102,126.48977299965918 109.50530746392906,127.73416590644047 109.50530746392906,129.06744210369652 109.50530746392906,129.06744210369652 109.50530746392906,130.4007163172937 109.58258638624102,131.733988547232 109.7371442313306,132.97837417235132 109.7371442313306,132.97837417235132 109.81442315410823,134.22275806980906 109.7371442313306,135.5560246136738 109.7371442313306,135.5560246136738 109.65986530901864,136.88928917446174 109.58258638624102,138.22255175170721 109.58258638624102,139.5558123452356 109.58258638624102,139.5558123452356 109.58258638624102,140.889070955629 109.58258638624102,142.22232758265454 109.58258638624102,142.22232758265454 110.12353884382173,142.8445133297355 111.28272268082947,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 112.4419065178372,142.7556296781986 119.70612523052841,142.93339697248302 120.40163553226739,142.4000949828187 120.40163553226739,142.4000949828187 120.47891445457935,141.3334900517366 120.40163553226739,140.00023210258223 120.16979876486585,138.8447402754682 120.16979876486585,138.8447402754682 120.01524091977626,137.42259444337105 119.9379619974643,136.26709929300705 119.9379619974643,134.9338338067173 119.9379619974643,134.9338338067173 119.9379619974643,133.68945089669432 119.9379619974643,132.35618157574208 119.9379619974643,132.35618157574208 119.86068307515234,131.0229102714802 119.9379619974643,129.77852193120634 119.9379619974643,128.44524679187452 119.9379619974643,128.44524679187452 120.01524091977626,127.11196966894204 120.01524091977626,125.77869056293275 120.01524091977626,125.77869056293275 120.01524091977626,124.44540947285714 120.01524091977626,123.11212639935547 119.9379619974643,121.60106985166203 119.9379619974643,121.60106985166203 119.86068307515234,120.35666842828505 119.86068307515234,119.11226527747931 119.86068307515234,119.11226527747931 119.9379619974643,117.86786039842991 119.9379619974643,116.53456753899809 119.9379619974643,115.2012726959656 119.9379619974643,115.2012726959656 119.9379619974643,113.77908934361767 119.9379619974643,112.35690373397665 119.9379619974643,112.35690373397665 119.9379619974643,111.02360267582117 119.9379619974643,109.601412693155 119.9379619974643,108.26810753485188 119.9379619974643,108.26810753485188 119.9379619974643,106.93480039283168 119.86068307515234,105.51260392129188 119.86068307515234,105.51260392129188 119.86068307515234,104.09040519263363 119.86068307515234,102.75709183467552 119.86068307515234,101.42377649300033 119.86068307515234,101.42377649300033 119.86068307515234,100.09045916708419 119.86068307515234,98.84602787328186 119.86068307515234,98.84602787328186 119.78340415237471,97.51270671206294 119.78340415237471,96.26827183872228 119.86068307515234,94.93494684190955 119.86068307515234,94.93494684190955 119.62884630775079,93.86828541598516 118.62422031536698,93.6905083884485 117.31047863373533,93.77939690661151 117.31047863373533,93.77939690661151 116.07401587394997,93.86828541598516 114.60571634676307,93.77939690661151 114.60571634676307,93.77939690661151 113.2146957423538,93.77939690661151 111.9782329830341,93.6905083884485 110.81904914602637,93.6905083884485 110.81904914602637,93.6905083884485 109.58258638624102,93.95717391680228 109.35074961883947,95.11272362282034 109.35074961883947,95.11272362282034 109.27347069652751,96.44604835478822 109.35074961883947,97.77937110315543 109.4280285416171,99.02380387816811 109.4280285416171,99.02380387816811 109.50530746392906,100.35712279099971 109.4280285416171,101.69043971976498 109.4280285416171,101.69043971976498 109.27347069652751,102.93486706371186 109.27347069652751,104.17929267929867 109.19619177374989,105.51260392129188 109.19619177374989,105.51260392129188 109.27347069652751,106.84591317962622 109.27347069652751,108.17922045377782 109.27347069652751,108.17922045377782 109.19619177374989,109.51252574444516 109.11891285143793,110.75694222591119 109.04163392912596,112.09024368133396 109.04163392912596,112.09024368133396 108.964355006814,113.42354315280681 109.19619177374989,114.8457270693616 109.19619177374989,114.8457270693616 109.27347069652751,116.17902244138531 109.4280285416171,117.60120198508957 109.58258638624102,118.93449325760594 109.58258638624102,118.93449325760594 109.50530746392906,120.35666842828505 109.35074961883947,121.60106985166203 109.35074961883947,121.60106985166203 109.4280285416171,122.84546954673715 109.50530746392906,124.08986751391785 109.58258638624102,125.33426375314593 109.58258638624102,125.33426375314593 109.58258638624102,126.6675435207435 109.35074961883947,127.9119361807243 109.35074961883947,127.9119361807243 109.19619177374989,129.06744210369652 109.19619177374989,130.31183143128874 109.35074961883947,131.64510379364947 109.35074961883947,131.64510379364947 109.4280285416171,132.88948954222724 109.35074961883947,134.1338735629106 109.35074961883947,135.46714023925597 109.35074961883947,135.46714023925597 109.27347069652751,136.71152068086667 109.27347069652751,138.04478352266597 109.27347069652751,138.04478352266597 109.35074961883947,139.3780443808646 109.50530746392906,140.71130325546255 109.4280285416171,141.95567641599337 109.4280285416171,141.95567641599337 109.96898099873215,142.93339697248302 111.12816483573988,142.93339697248302 111.12816483573988,142.93339697248302 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 119.31973061757162,143.20004784851335 120.09251984255388,142.93339697248302 120.09251984255388,142.93339697248302 120.47891445457935,142.3112112871604 120.2470776871778,141.15572243958013 120.2470776871778,141.15572243958013 120.16979876486585,140.00023210258223 120.09251984255388,138.7558562272461 119.9379619974643,137.42259444337105 119.9379619974643,137.42259444337105 119.78340415237471,136.17821498884587 119.78340415237471,134.6671804714715 119.78340415237471,134.6671804714715 119.70612523052841,133.24502801027847 119.78340415237471,131.8228732921998 119.70612523052841,130.5784860624699 119.70612523052841,130.5784860624699 119.70612523052841,129.24521211342653 119.70612523052841,127.82305104791885 119.70612523052841,127.82305104791885 119.62884630775079,126.48977299965918 119.55156738497317,125.15649296779884 119.55156738497317,123.73432541382499 119.55156738497317,123.73432541382499 119.55156738497317,122.48992695298512 119.55156738497317,121.245526764018 119.55156738497317,121.245526764018 119.55156738497317,119.82335300400155 119.70612523052841,118.31229091068963 119.78340415237471,116.80122626945376 119.78340415237471,116.80122626945376 119.70612523052841,115.37904545618221 119.55156738497317,114.13463539333316 119.4742884626612,112.89022360218223 119.4742884626612,112.89022360218223 119.55156738497317,111.55692333733896 119.62884630775079,110.31250796664972 119.62884630775079,110.31250796664972 119.62884630775079,108.97920386621263 119.62884630775079,107.64589778205846 119.70612523052841,106.31258971430361 119.70612523052841,106.31258971430361 119.78340415237471,104.97927966259886 119.86068307515234,103.73485515790526 119.86068307515234,103.73485515790526 119.86068307515234,102.40154127083952 119.78340415237471,101.15711318643298 119.70612523052841,99.91268337372458 119.70612523052841,99.91268337372458 119.62884630775079,98.57936379982857 119.55156738497317,97.33493040758185 119.55156738497317,97.33493040758185 119.4742884626612,95.91271869983757 119.55156738497317,94.49050473532407 118.93333600554615,93.6905083884485 118.93333600554615,93.6905083884485 117.85143109085038,93.60161986126332 116.69224725337699,93.60161986126332 116.69224725337699,93.60161986126332 115.45578449452296,93.60161986126332 114.2193217347376,93.6905083884485 112.82830113032833,93.6905083884485 112.82830113032833,93.6905083884485 111.51455944823101,93.77939690661151 110.12353884382173,93.86828541598516 110.12353884382173,93.86828541598516 109.27347069652751,94.49050473532407 109.19619177374989,95.73494207800832 109.19619177374989,96.97937769204145 109.19619177374989,96.97937769204145 109.27347069652751,98.31269964680541 109.35074961883947,99.55713168141665 109.35074961883947,99.55713168141665 109.27347069652751,100.89044980070321 109.19619177374989,102.13487825548509 109.27347069652751,103.46819253906142 109.27347069652751,103.46819253906142 109.35074961883947,104.71261741424678 109.35074961883947,105.95704056113027 109.35074961883947,105.95704056113027 109.35074961883947,107.29034915810917 109.27347069652751,108.62365577119635 109.27347069652751,109.86807348701404 109.27347069652751,109.86807348701404 109.27347069652751,111.29026304610306 109.35074961883947,112.62356370780617 109.50530746392906,114.04574889398646 109.50530746392906,114.04574889398646 109.58258638624102,115.46793182333931 109.58258638624102,116.80122626945376 109.58258638624102,116.80122626945376 109.58258638624102,118.04563262977172 109.35074961883947,119.37892324087443 109.19619177374989,120.5344401660841 109.19619177374989,120.5344401660841 109.11891285143793,121.68995560135227 109.19619177374989,122.84546954673715 109.19619177374989,122.84546954673715 109.11891285143793,124.08986751391785 109.19619177374989,125.33426375314593 109.35074961883947,126.6675435207435 109.35074961883947,126.6675435207435 109.4280285416171,128.1785915258224 109.27347069652751,129.51186706183944 109.27347069652751,129.51186706183944 109.27347069652751,130.75625577243045 109.27347069652751,132.08952747378498 109.35074961883947,133.51168176857755 109.35074961883947,133.51168176857755 109.4280285416171,134.84494937048294 109.50530746392906,136.26709929300705 109.50530746392906,136.26709929300705 109.4280285416171,137.60036279587075 109.4280285416171,138.8447402754682 109.50530746392906,140.1779999434948 109.50530746392906,140.1779999434948 109.35074961883947,141.51125762821175 109.65986530901864,142.7556296781986 109.65986530901864,142.7556296781986 110.5099334558472,143.11116423195926 111.74639621563256,143.20004784851335 112.90558005264029,143.28893145610346 112.90558005264029,143.28893145610346 113.13741682004184,143.9111164630158 113.98748496733606,144.0 113.98748496733606,144.0 116.38313156412914,143.37781505507883 118.16054678056389,143.37781505507883 118.16054678056389,143.37781505507883 119.4742884626612,143.20004784851335 120.01524091977626,142.4000949828187 119.9379619974643,141.0668386204634 119.9379619974643,141.0668386204634 119.9379619974643,139.8224642262794 119.86068307515234,138.57808810373535 119.86068307515234,137.33371025405359 119.86068307515234,137.33371025405359 119.78340415237471,136.00044635444647 119.78340415237471,134.6671804714715 119.78340415237471,134.6671804714715 119.86068307515234,133.15614340628963 119.9379619974643,131.733988547232 119.62884630775079,130.48960119421827 119.62884630775079,130.48960119421827 119.55156738497317,129.15632711304352 119.55156738497317,127.73416590644047 119.55156738497317,127.73416590644047 119.4742884626612,126.31200244353386 119.39700954034925,124.88983672321774 119.55156738497317,123.64543986687204 119.55156738497317,123.64543986687204 119.55156738497317,122.22326991526643 119.4742884626612,120.97886935586575 119.4742884626612,120.97886935586575 119.4742884626612,119.64558112516534 119.62884630775079,118.22340482572326 119.70612523052841,116.80122626945376 119.70612523052841,116.80122626945376 119.70612523052841,115.46793182333931 119.55156738497317,114.13463539333316 119.55156738497317,114.13463539333316 119.4742884626612,112.80133697960991 119.4742884626612,111.37914981861832 119.4742884626612,110.0458473051549 119.4742884626612,110.0458473051549 119.4742884626612,108.7125428080908 119.4742884626612,107.37923632719321 119.4742884626612,107.37923632719321 119.55156738497317,105.95704056113027 119.55156738497317,104.71261741424678 119.55156738497317,103.3793049819651 119.55156738497317,103.3793049819651 119.55156738497317,102.04599056602456 119.39700954034925,100.62378633540357 119.39700954034925,100.62378633540357 119.31973061757162,99.20157984789694 119.31973061757162,97.86825921590207 119.31973061757162,96.35716010112083 119.31973061757162,96.35716010112083 119.55156738497317,94.8460584380664 119.01061492785811,93.95717391680228 119.01061492785811,93.95717391680228 118.08326785825193,93.77939690661151 117.00136294355616,93.86828541598516 115.45578449452296,93.86828541598516 115.45578449452296,93.86828541598516 113.9102060450241,93.86828541598516 112.67374328523874,93.86828541598516 111.36000160314143,93.77939690661151 111.36000160314143,93.77939690661151 109.96898099873215,93.6905083884485 109.11891285143793,94.49050473532407 109.11891285143793,94.49050473532407 109.04163392912596,95.91271869983757 108.964355006814,97.15715406724485 109.04163392912596,98.57936379982857 109.04163392912596,98.57936379982857 109.11891285143793,100.00157127488637 109.11891285143793,101.3348887328757 109.11891285143793,101.3348887328757 109.04163392912596,102.66820420703152 109.04163392912596,104.00151769717922 108.964355006814,105.33482920366805 108.964355006814,105.33482920366805 108.964355006814,106.66813872620696 108.80979716172442,107.91255915764486 108.80979716172442,107.91255915764486 108.80979716172442,109.24586484505562 108.80979716172442,110.57916854857467 108.88707608450204,111.91247026855126 108.88707608450204,111.91247026855126 108.964355006814,113.33465658320347 109.04163392912596,114.66795420326525 109.04163392912596,114.66795420326525 109.04163392912596,115.91236352559645 109.04163392912596,117.24565731093753 109.19619177374989,118.57894911221229 109.19619177374989,118.57894911221229 109.19619177374989,119.7344670688617 109.04163392912596,120.88998353568604 109.04163392912596,120.88998353568604 109.04163392912596,122.13438421813771 108.964355006814,123.28989759046817 108.964355006814,124.44540947285714 108.964355006814,124.44540947285714 109.19619177374989,125.77869056293275 109.35074961883947,126.93419923639158 109.35074961883947,126.93419923639158 109.4280285416171,128.26747662341222 109.4280285416171,129.4229820878827 109.4280285416171,130.66737092193216 109.4280285416171,130.66737092193216 109.35074961883947,131.733988547232 109.19619177374989,132.97837417235132 109.19619177374989,132.97837417235132 109.27347069652751,134.22275806980906 109.27347069652751,135.46714023925597 109.27347069652751,136.71152068086667 109.27347069652751,136.71152068086667 109.19619177374989,138.04478352266597 109.19619177374989,139.3780443808646 109.27347069652751,140.71130325546255 109.27347069652751,140.71130325546255 109.4280285416171,142.0445601469837 109.65986530901864,142.93339697248302 109.65986530901864,142.93339697248302 110.74177022324875,142.8445133297355 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 112.05551190534607,142.7556296781986 119.01061492785811,143.11116423195926 120.09251984255388,142.7556296781986 120.16979876486585,141.68902517005336 120.16979876486585,141.68902517005336 120.09251984255388,140.53353552037152 120.16979876486585,139.3780443808646 120.16979876486585,139.3780443808646 120.09251984255388,138.22255175170721 119.9379619974643,137.06705763260834 119.86068307515234,135.73379333666526 119.86068307515234,135.73379333666526 119.86068307515234,134.40052705671405 119.78340415237471,132.97837417235132 119.78340415237471,132.97837417235132 119.62884630775079,131.733988547232 119.4742884626612,130.48960119421827 119.39700954034925,129.15632711304352 119.39700954034925,129.15632711304352 119.31973061757162,127.73416590644047 119.31973061757162,126.31200244353386 119.31973061757162,126.31200244353386 119.39700954034925,124.88983672321774 119.31973061757162,123.46766874624882 119.31973061757162,122.04549851251068 119.31973061757162,122.04549851251068 119.31973061757162,120.62332602153765 119.39700954034925,119.20115127420286 119.39700954034925,119.20115127420286 119.62884630775079,117.95674651837908 119.78340415237471,116.44568127772072 119.78340415237471,114.8457270693616 119.78340415237471,114.8457270693616 119.78340415237471,113.42354315280681 119.9379619974643,112.00135697924998 119.9379619974643,110.49028169678058 119.9379619974643,110.49028169678058 119.86068307515234,108.97920386621263 119.78340415237471,107.55701063934248 119.78340415237471,107.55701063934248 119.70612523052841,106.04592786246212 119.70612523052841,104.71261741424678 119.78340415237471,103.20152984111337 119.78340415237471,103.20152984111337 119.78340415237471,101.77932744461577 119.70612523052841,100.35712279099971 119.70612523052841,100.35712279099971 119.70612523052841,99.02380387816811 119.70612523052841,97.51270671206294 119.62884630775079,96.17938356706873 119.62884630775079,96.17938356706873 119.62884630775079,94.93494684190955 119.4742884626612,93.6905083884485 119.4742884626612,93.6905083884485 118.4696624702774,93.42384278058307 117.15592078864574,93.42384278058307 115.84217910654843,93.60161986126332 115.84217910654843,93.60161986126332 114.52843742445111,93.6905083884485 113.13741682004184,93.6905083884485 113.13741682004184,93.6905083884485 111.74639621563256,93.86828541598516","stroke":"#4dd2ff","strokeLinecap":"round","strokeLinejoin":"round","strokeWidth":"0.5","key":12},React.createElement("title",null,"2020-08-21 10.2km")),React.createElement("polyline",{"fill":"none","points":"88.97185435518622,210.36321412201505 89.12939929310232,212.35650122829247 89.12939929310232,212.35650122829247 88.97185435518622,215.25582404620945 88.97185435518622,218.15514226339292 88.81430941727012,220.5108349263901 88.81430941727012,220.5108349263901 88.97185435518622,223.0477313210722 89.12939929310232,225.76583069132175 89.12939929310232,225.76583069132175 89.28694423101842,227.75910099362954 89.28694423101842,229.75236912001856 89.28694423101842,231.92684096028097 89.28694423101842,231.92684096028097 89.60203410685062,233.73889885051176 89.9171239817515,233.92010454053525 89.9171239817515,233.92010454053525 89.9171239817515,234.1013102127472 89.9171239817515,234.1013102127472 89.9171239817515,234.82613272196613 89.60203410685062,238.26903571246658 89.60203410685062,238.26903571246658 89.28694423101842,242.07434199634008 89.12939929310232,245.51723132829648 89.44448916893452,248.59770575759467 89.44448916893452,248.59770575759467 89.60203410685062,251.31576711754315 89.60203410685062,253.8526207386749 89.60203410685062,253.8526207386749 90.2322138575837,256.20826737582684 93.06802273821086,256.75187770742923 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 96.21892149373889,256.9330811143154 106.45934244990349,254.03382443415467 106.45934244990349,254.03382443415467 106.45934244990349,251.13456315244548 106.30179751291871,248.2352972710505 106.30179751291871,248.2352972710505 106.14425257500261,245.33602678810712 105.82916269917041,242.79916134185623 105.98670763615519,240.26229237322696 105.98670763615519,240.26229237322696 105.98670763615519,237.54421456926502 106.14425257500261,235.0073383039562 106.14425257500261,235.0073383039562 106.14425257500261,232.28925268200692 106.14425257500261,229.57116301637143 105.98670763615519,227.21548203530256 105.98670763615519,227.21548203530256 105.82916269917041,225.22221114090644 105.82916269917041,223.4101448035799 105.67161776125431,221.5980766696157 105.67161776125431,221.5980766696157 105.51407282333821,219.24238540814258 105.04143801052123,216.8866911092773 105.04143801052123,216.8866911092773 104.56880319677293,213.80616321228445 103.62353357020766,210.54442213079892 103.30844369437546,207.28267522563692 103.30844369437546,207.28267522563692 103.46598863229156,204.5645483562257 103.62353357020766,202.0276262962725 103.62353357020766,202.0276262962725 103.62353357020766,199.3094916077098 103.62353357020766,196.77256225049496 103.46598863229156,194.05441974464338 103.46598863229156,194.05441974464338 103.46598863229156,191.69869296741672 103.30844369437546,189.705383321736 103.30844369437546,189.705383321736 102.99335381854326,187.71207150141709 102.67826394364238,185.71875750645995 102.67826394364238,183.0005985533353 102.67826394364238,183.0005985533353 102.83580888155848,180.28243555582594 102.67826394364238,177.92669102014042 102.67826394364238,177.92669102014042 102.67826394364238,174.84609742823523 102.52071900572628,172.30913409905042 102.20562912989408,169.40974312275648 102.20562912989408,169.40974312275648 102.20562912989408,166.5103475456126 102.20562912989408,163.61094736552332 102.20562912989408,163.61094736552332 102.20562912989408,160.71154258446768 101.89053925406188,157.99334642314352 100.15754493884742,156.1812134013744 100.15754493884742,156.1812134013744 97.47928099613637,156.0 94.64347211550921,156.0 94.64347211550921,156.0 91.96520817372948,156.72485349618364 89.60203410685062,157.81213320139796 89.12939929310232,160.16790367593057 89.12939929310232,160.16790367593057 89.28694423101842,162.7048838660121 89.28694423101842,165.06064803083427 89.28694423101842,167.23519687075168 89.28694423101842,167.23519687075168 89.28694423101842,169.95337928144727 89.44448916893452,172.6715576472925 89.44448916893452,172.6715576472925 89.44448916893452,175.2085204735631 89.28694423101842,177.74547977617476 89.28694423101842,179.92001351714134 89.28694423101842,179.92001351714134 89.28694423101842,182.2757554827258 89.44448916893452,184.993915514322 89.44448916893452,184.993915514322 89.44448916893452,187.71207150141709 89.44448916893452,190.24901344091631 89.44448916893452,192.78595185722224 89.44448916893452,192.78595185722224 89.28694423101842,195.6853057333501 89.28694423101842,198.5846550083952 89.28694423101842,198.5846550083952 89.12939929310232,201.30279077484738 89.44448916893452,203.83971384121105 89.60203410685062,206.01421652326826 89.60203410685062,206.01421652326826 89.75957904476672,208.55113304732367 89.60203410685062,211.08804604876786 89.60203410685062,211.08804604876786 89.44448916893452,213.44374782440718 89.44448916893452,215.9806540318532 89.44448916893452,218.69876391626894 89.44448916893452,218.69876391626894 89.60203410685062,221.2356628270354 89.60203410685062,224.13497155415826 89.60203410685062,224.13497155415826 89.44448916893452,226.85306930693332 89.28694423101842,229.2087507552933 89.44448916893452,232.28925268200692 89.44448916893452,232.28925268200692 89.44448916893452,235.18854386825114 89.44448916893452,238.08783045317978 89.44448916893452,238.08783045317978 89.60203410685062,240.98711243807338 89.44448916893452,243.5239804002922 89.60203410685062,246.6044581901515 89.60203410685062,246.6044581901515 89.60203410685062,249.50372666062322 89.75957904476672,252.04058279760648 89.75957904476672,252.04058279760648 90.07466892059892,254.57743541221134 91.65011829789728,255.84586039872374 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 94.17083730269223,256.02706389594823 109.13760639261454,258.02030118368566 109.13760639261454,258.02030118368566 111.0281456457451,256.75187770742923 111.5007804594934,254.3962317709811 111.5007804594934,251.67817499360535 111.5007804594934,251.67817499360535 111.3432355215773,249.14131835335866 111.0281456457451,246.24204930837732 111.0281456457451,246.24204930837732 111.0281456457451,243.70518511987757 111.18569058459252,240.98711243807338 111.3432355215773,238.26903571246658 111.3432355215773,238.26903571246658 111.3432355215773,235.55095494294073 111.18569058459252,233.01407591009047 111.18569058459252,233.01407591009047 111.18569058459252,230.29598732257728 111.18569058459252,227.57789469219279 111.3432355215773,224.85979801707435 111.3432355215773,224.85979801707435 111.3432355215773,221.9604904402513 111.3432355215773,218.8799710982712 111.3432355215773,218.8799710982712 111.5007804594934,216.34306891669985 111.6583253974095,213.6249555272516 111.5007804594934,211.26925398525782 111.5007804594934,211.26925398525782 111.3432355215773,208.36992484075017 111.6583253974095,206.7390501750633 111.6583253974095,206.7390501750633 111.81587033439428,204.38333975418936 111.81587033439428,201.6652085710084 111.81587033439428,201.6652085710084 111.5007804594934,199.3094916077098 111.6583253974095,196.77256225049496 111.81587033439428,194.05441974464338 111.81587033439428,194.05441974464338 112.1309602111578,191.51748308946844 112.1309602111578,188.618122598622 112.1309602111578,188.618122598622 111.9734152732417,185.8999679593835 111.81587033439428,183.18180927622598 111.6583253974095,180.64485752256587 111.6583253974095,180.64485752256587 111.81587033439428,177.92669102014042 111.5007804594934,175.2085204735631 111.3432355215773,172.30913409905042 111.3432355215773,172.30913409905042 111.3432355215773,169.590955193853 111.3432355215773,166.87277224392164 111.3432355215773,166.87277224392164 111.5007804594934,164.15458525018767 111.6583253974095,161.61760707281064 111.6583253974095,159.0806253728224 111.6583253974095,159.0806253728224 110.24042095709592,157.99334642314352 107.24706713948399,158.17455962626263 107.24706713948399,158.17455962626263 102.99335381854326,158.8994122594595 98.89718543644994,158.8994122594595 95.27365186717361,158.53698597848415 95.27365186717361,158.53698597848415 92.12275311164558,158.8994122594595 89.60203410685062,159.0806253728224 89.60203410685062,159.0806253728224 88.81430941727012,161.25518133176956 88.97185435518622,163.97337263973895 89.12939929310232,166.6915599037893 89.12939929310232,166.6915599037893 88.97185435518622,168.68489466013853 89.12939929310232,171.40307491319254 89.12939929310232,171.40307491319254 89.28694423101842,173.94003950059414 89.28694423101842,176.65821193472948 89.60203410685062,179.01395810651593 89.60203410685062,179.01395810651593 89.60203410685062,181.36970124021173 89.60203410685062,183.72544133639894 89.60203410685062,183.72544133639894 89.75957904476672,186.0811783943791 89.75957904476672,188.4369124150835 89.75957904476672,190.61143343057483 89.75957904476672,190.61143343057483 89.60203410685062,192.96716160944197 89.60203410685062,195.32288675080054 89.60203410685062,195.32288675080054 89.60203410685062,197.67860885476694 89.60203410685062,199.85311886912677 89.9171239817515,202.39004394912627 89.9171239817515,202.39004394912627 89.75957904476672,204.92696550569963 89.9171239817515,206.9202585434541 89.9171239817515,206.9202585434541 90.07466892059892,208.91354940575548 90.07466892059892,210.72563012118917 89.9171239817515,212.35650122829247 89.9171239817515,212.35650122829247 89.75957904476672,214.34978615993168 89.75957904476672,216.34306891669985 89.75957904476672,218.51755671657156 89.75957904476672,218.51755671657156 89.75957904476672,220.87324891262688 90.2322138575837,223.22893807129003 90.2322138575837,223.22893807129003 90.2322138575837,225.76583069132175 90.2322138575837,228.48392601835076 90.07466892059892,231.0208113414701 90.07466892059892,231.0208113414701 90.07466892059892,233.5576931424439 90.07466892059892,236.45698231540155 90.07466892059892,236.45698231540155 90.2322138575837,239.53747202118393 90.2322138575837,241.893137114821 90.2322138575837,244.24879917083308 90.2322138575837,244.24879917083308 90.2322138575837,246.7856626046123 90.07466892059892,249.14131835335866 90.07466892059892,249.14131835335866 90.2322138575837,251.67817499360535 90.3897587954998,254.3962317709811 90.3897587954998,257.1142845043214 90.3897587954998,257.1142845043214 91.80766323581338,258.7451142036589 94.01329236477613,258.7451142036589 94.01329236477613,258.7451142036589 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 96.53401136957109,259.1075206066016 110.39796589501202,259.2887237799587 110.39796589501202,259.2887237799587 111.81587033439428,257.83909788390156 111.9734152732417,255.1210462283343 112.1309602111578,252.76539818942547 112.1309602111578,252.76539818942547 111.9734152732417,250.40974711370654 111.9734152732417,248.05409300059546 111.9734152732417,248.05409300059546 112.1309602111578,245.51723132829648 111.9734152732417,242.98036613315344 112.1309602111578,240.4434974162141 112.1309602111578,240.4434974162141 111.9734152732417,238.08783045317978 111.81587033439428,235.55095494294073 111.81587033439428,235.18854386825114 111.6583253974095,233.37648741621524 111.5007804594934,230.83960536355153 111.5007804594934,228.30271978862584 111.5007804594934,228.30271978862584 111.6583253974095,225.40341767598875 111.5007804594934,222.32290413905866 111.5007804594934,219.42359253647737 111.5007804594934,219.42359253647737 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 111.6583253974095,216.52427633258048 105.51407282333821,212.71891683223657 105.19898294750601,210.72563012118917 105.19898294750601,210.72563012118917 105.04143801052123,208.73234123561997 105.04143801052123,206.37663338484708 105.04143801052123,203.47729647590313 105.04143801052123,203.47729647590313 105.04143801052123,200.75916394533124 105.35652788635343,198.04102736944333 105.35652788635343,198.04102736944333 105.98670763615519,195.6853057333501 106.45934244990349,193.51079075760208 106.61688738781959,190.9738533477066 106.61688738781959,190.9738533477066 106.61688738781959,188.4369124150835 106.61688738781959,185.8999679593835 106.61688738781959,185.8999679593835 106.61688738781959,183.18180927622598 106.61688738781959,180.4636465483345 106.45934244990349,180.10122454562224 106.30179751291871,177.74547977617476 106.30179751291871,175.2085204735631 106.45934244990349,172.6715576472925 106.45934244990349,172.6715576472925 106.61688738781959,170.13459129817784 106.14425257500261,167.59762142621912 104.88389307260513,165.2418605327839 104.88389307260513,165.2418605327839 104.72634813468903,162.52367111225612 104.56880319677293,159.8054776461795 104.56880319677293,159.8054776461795 102.67826394364238,158.35577281133737 100.15754493884742,157.99334642314352 97.32173605915159,158.17455962626263 97.32173605915159,158.17455962626263 94.17083730269223,158.35577281133737 91.33502842206508,158.35577281133737 88.97185435518622,159.0806253728224 88.97185435518622,159.0806253728224 88.34167460445315,160.8927555179689 88.34167460445315,163.24852201959584 88.34167460445315,163.24852201959584 88.49921954143792,165.60428548336495 88.49921954143792,168.14125812368002 88.49921954143792,168.14125812368002 88.49921954143792,170.4970152779715 88.65676448028535,172.8527693945216 89.12939929310232,175.38973196886946 89.12939929310232,175.38973196886946 89.28694423101842,177.5642685139319 89.12939929310232,179.73880247119814 89.12939929310232,179.73880247119814 89.12939929310232,182.09454467031173 88.97185435518622,184.26907323475461 88.97185435518622,184.45028383180033 89.12939929310232,186.44359921046998 89.28694423101842,188.9805429117987 89.12939929310232,191.51748308946844 89.12939929310232,191.51748308946844 89.28694423101842,194.05441974464338 89.28694423101842,196.59135287662502 89.12939929310232,199.3094916077098 89.12939929310232,199.3094916077098 88.81430941727012,201.84641744254623 89.12939929310232,204.38333975418936 89.12939929310232,204.38333975418936 89.44448916893452,206.9202585434541 89.28694423101842,209.4571738091763 88.97185435518622,211.6316698048031 88.97185435518622,211.6316698048031 88.65676448028535,213.98737087962218 88.65676448028535,216.52427633258048 88.65676448028535,216.52427633258048 88.65676448028535,219.24238540814258 88.97185435518622,221.9604904402513 89.12939929310232,224.49738482164685 89.12939929310232,224.49738482164685 89.28694423101842,227.03427568031475 89.28694423101842,229.75236912001856 89.28694423101842,229.75236912001856 89.12939929310232,231.92684096028097 89.12939929310232,234.1013102127472 89.28694423101842,236.09457142057363 89.28694423101842,236.09457142057363 89.12939929310232,238.63144617609214 89.12939929310232,241.16831740923226 88.97185435518622,243.5239804002922 88.97185435518622,243.5239804002922 88.97185435518622,246.06084484024905 88.97185435518622,248.41650152334478 88.97185435518622,248.41650152334478 89.12939929310232,250.9533591697691 89.28694423101842,253.67141702549998 89.44448916893452,256.20826737582684 89.44448916893452,256.20826737582684 89.60203410685062,258.2015044655418 91.17748348414898,259.1075206066016 91.17748348414898,259.1075206066016 93.38311261311173,259.1075206066016 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 110.71305577084422,259.2887237799587 111.3432355215773,257.6578945661895 111.3432355215773,257.6578945661895 111.3432355215773,255.4834533499088 111.5007804594934,253.12780577817466 111.18569058459252,250.9533591697691 111.18569058459252,250.9533591697691 111.18569058459252,248.59770575759467 111.0281456457451,246.06084484024905 111.0281456457451,246.06084484024905 111.18569058459252,243.5239804002922 111.18569058459252,241.16831740923226 111.18569058459252,238.81265138089657 111.18569058459252,238.81265138089657 111.3432355215773,236.45698231540155 111.18569058459252,234.1013102127472 111.18569058459252,234.1013102127472 111.0281456457451,231.74563507258426 111.18569058459252,229.38995689491276 111.18569058459252,229.0275445986772 111.18569058459252,227.21548203530256 111.0281456457451,224.85979801707435 110.87060070876032,222.32290413905866 110.87060070876032,222.32290413905866 110.87060070876032,219.96721381216776 111.0281456457451,217.43031314003747 110.87060070876032,215.25582404620945 110.87060070876032,215.25582404620945 110.39796589501202,214.16857852891553 110.08287601917982,213.6249555272516 110.08287601917982,213.6249555272516 110.08287601917982,213.08133236435242 110.55551083292812,212.71891683223657 110.55551083292812,212.71891683223657 111.0281456457451,211.99408555263653 111.18569058459252,210.00079805066343 111.5007804594934,207.10146689321846 111.5007804594934,207.10146689321846 111.6583253974095,204.20213113469072 111.5007804594934,201.30279077484738 111.5007804594934,201.30279077484738 111.5007804594934,198.04102736944333 111.5007804594934,194.77925814152695 111.18569058459252,191.69869296741672 111.18569058459252,191.69869296741672 111.18569058459252,188.79933276388329 111.3432355215773,186.0811783943791 111.3432355215773,186.0811783943791 111.18569058459252,183.18180927622598 111.3432355215773,180.10122454562224 111.18569058459252,177.20184593671001 111.18569058459252,177.20184593671001 111.3432355215773,173.94003950059414 111.3432355215773,170.6782272409182 111.3432355215773,170.6782272409182 111.18569058459252,167.59762142621912 111.3432355215773,164.51701041590422 111.3432355215773,163.97337263973895 111.3432355215773,161.43639421125408 110.39796589501202,158.8994122594595 107.56215701531619,158.7181991279358 107.56215701531619,158.7181991279358 104.41125825885683,159.0806253728224 101.57544937822968,158.8994122594595 98.58209556061774,158.8994122594595 98.58209556061774,158.8994122594595 95.74628667999059,158.7181991279358 92.91047780029476,158.7181991279358 92.91047780029476,158.7181991279358 90.07466892059892,159.4430515456479 88.49921954143792,161.25518133176956 88.34167460445315,163.97337263973895 88.34167460445315,163.97337263973895 88.34167460445315,166.6915599037893 88.34167460445315,169.590955193853 88.34167460445315,169.590955193853 88.65676448028535,172.30913409905042 88.65676448028535,175.02730895963032 88.81430941727012,177.74547977617476 88.81430941727012,177.74547977617476 88.65676448028535,180.64485752256587 88.49921954143792,183.54423066717573 88.65676448028535,186.26238881167956 88.65676448028535,186.26238881167956 88.49921954143792,188.9805429117987 88.49921954143792,191.69869296741672 88.49921954143792,191.69869296741672 88.34167460445315,194.41683897888288 88.34167460445315,197.3161902668653 88.34167460445315,200.03432792052627 88.34167460445315,200.03432792052627 88.65676448028535,202.93367029342335 88.65676448028535,205.83300806500483 88.65676448028535,205.83300806500483 88.65676448028535,208.55113304732367 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 88.81430941727012,211.08804604876786 87.71149485278875,213.08133236435242 87.71149485278875,213.08133236435242 88.65676448028535,215.61823907482903 88.81430941727012,218.33634949894622 88.81430941727012,218.33634949894622 89.12939929310232,221.2356628270354 89.44448916893452,224.13497155415826 89.44448916893452,226.85306930693332 89.44448916893452,226.85306930693332 89.12939929310232,229.57116301637143 89.28694423101842,233.01407591009047 89.28694423101842,233.01407591009047 89.28694423101842,236.63818773603998 89.44448916893452,239.71867713611573 89.28694423101842,242.79916134185623 89.28694423101842,242.79916134185623 89.44448916893452,245.87964035442565 88.97185435518622,249.50372666062322 88.97185435518622,249.50372666062322 88.97185435518622,251.85937890480272 88.97185435518622,254.93984264112078 89.28694423101842,257.83909788390156 89.28694423101842,257.83909788390156 89.12939929310232,260.73834852629807 90.3897587954998,262.55037784203887 90.3897587954998,262.55037784203887 92.91047780029476,262.00676923571154 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 95.74628667999059,261.8255663313903 110.24042095709592,261.1007545333123 111.9734152732417,260.1947393815499 111.9734152732417,260.1947393815499 112.1309602111578,258.38270773005206 111.81587033439428,256.20826737582684 111.81587033439428,256.20826737582684 111.5007804594934,253.67141702549998 111.3432355215773,251.13456315244548 111.3432355215773,248.2352972710505 111.3432355215773,248.2352972710505 111.18569058459252,245.51723132829648 111.0281456457451,242.79916134185623 111.0281456457451,242.79916134185623 110.87060070876032,240.26229237322696 110.87060070876032,237.7254198816372 110.87060070876032,235.0073383039562 110.87060070876032,235.0073383039562 110.87060070876032,232.10804683039896 110.87060070876032,229.38995689491276 110.87060070876032,229.38995689491276 111.0281456457451,226.67186291667167 110.87060070876032,223.7725582148414 110.87060070876032,223.4101448035799 110.87060070876032,221.0544558786787 110.71305577084422,218.33634949894622 110.71305577084422,215.61823907482903 110.71305577084422,215.61823907482903 110.87060070876032,212.71891683223657 111.18569058459252,209.81958998856135 111.3432355215773,207.28267522563692 111.3432355215773,207.28267522563692 111.0281456457451,204.7457569403341 110.87060070876032,202.20883513148874 110.87060070876032,201.84641744254623 110.87060070876032,199.49070071359165 110.87060070876032,196.59135287662502 110.87060070876032,193.87321010034066 110.87060070876032,193.87321010034066 110.87060070876032,191.33627319382504 110.87060070876032,188.9805429117987 111.0281456457451,186.0811783943791 111.0281456457451,186.0811783943791 111.18569058459252,183.36301998083945 111.18569058459252,180.64485752256587 111.18569058459252,180.64485752256587 111.0281456457451,178.10790224629454 111.0281456457451,175.5709434467135 111.0281456457451,172.6715576472925 111.0281456457451,172.6715576472925 110.71305577084422,169.77216724678874 111.0281456457451,166.87277224392164 111.0281456457451,166.87277224392164 111.0281456457451,163.97337263973895 110.39796589501202,161.61760707281064 108.03479182813317,161.25518133176956 108.03479182813317,161.25518133176956 105.35652788635343,161.43639421125408 102.36317406687886,161.43639421125408 102.36317406687886,161.43639421125408 99.36982024926692,161.61760707281064 96.53401136957109,161.7988199169049 93.69820248987526,162.16124555002898 93.69820248987526,162.16124555002898 91.17748348414898,162.16124555002898 88.97185435518622,163.067309319973 88.97185435518622,163.067309319973 88.65676448028535,165.2418605327839 88.97185435518622,167.7788336769445 89.12939929310232,170.31580329686403 89.12939929310232,170.31580329686403 89.12939929310232,172.8527693945216 89.12939929310232,175.5709434467135 89.12939929310232,175.5709434467135 88.81430941727012,178.2891134544043 88.81430941727012,181.00727941736113 88.81430941727012,183.9066519869957 88.81430941727012,183.9066519869957 88.81430941727012,186.62480959203094 88.81430941727012,189.3429631527979 88.81430941727012,189.3429631527979 88.81430941727012,191.8799028272042 88.65676448028535,194.59804856893606 88.49921954143792,196.95377160736825 88.49921954143792,196.95377160736825 88.65676448028535,199.67190980026498 88.49921954143792,202.39004394912627 88.65676448028535,204.92696550569963 88.65676448028535,204.92696550569963 88.81430941727012,207.64509183564223 88.65676448028535,210.00079805066343 88.65676448028535,210.00079805066343 88.81430941727012,212.53770903905388 88.65676448028535,215.0746165048331 88.65676448028535,217.43031314003747 88.65676448028535,217.43031314003747 88.81430941727012,220.1484208679758 89.12939929310232,223.22893807129003 89.12939929310232,223.22893807129003 89.44448916893452,225.9470371720381 89.60203410685062,228.6651322299149 89.60203410685062,229.0275445986772 89.60203410685062,231.3832232429413 89.44448916893452,234.28251586668193 89.44448916893452,237.00059852330014 89.44448916893452,237.00059852330014 89.60203410685062,239.71867713611573 89.60203410685062,242.61795653193258 89.75957904476672,245.69843585055787 89.75957904476672,245.69843585055787 89.9171239817515,248.59770575759467 89.9171239817515,251.13456315244548 89.9171239817515,251.13456315244548 89.9171239817515,254.03382443415467 89.9171239817515,256.75187770742923 89.9171239817515,259.4699269364355 89.9171239817515,259.4699269364355 90.2322138575837,262.00676923571154 91.80766323581338,263.09398628608324 91.80766323581338,263.09398628608324 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 94.17083730269223,262.55037784203887 110.71305577084422,262.00676923571154 112.28850514814258,261.6443634084426 112.1309602111578,260.1947393815499 112.1309602111578,260.1947393815499 111.9734152732417,257.6578945661895 111.5007804594934,255.3022497984348 111.5007804594934,252.76539818942547 111.5007804594934,252.76539818942547 111.18569058459252,250.2285430592019 111.3432355215773,247.3292757391464 111.3432355215773,247.3292757391464 111.0281456457451,244.61120844900142 111.0281456457451,241.893137114821 111.18569058459252,238.99385656812228 111.18569058459252,238.99385656812228 111.18569058459252,236.09457142057363 111.18569058459252,233.1952816719422 111.18569058459252,233.1952816719422 111.3432355215773,230.29598732257728 111.18569058459252,227.57789469219279 111.18569058459252,224.67859142809175 111.18569058459252,224.67859142809175 110.87060070876032,221.77928356372286 111.5007804594934,218.51755671657156 111.5007804594934,218.51755671657156 111.5007804594934,215.79944656265434 112.1309602111578,213.2625401035184 112.1309602111578,210.1820060950704 112.1309602111578,210.1820060950704 111.6583253974095,207.64509183564223 111.5007804594934,204.92696550569963 111.5007804594934,204.92696550569963 111.3432355215773,201.84641744254623 111.5007804594934,198.9470733446069 111.5007804594934,198.40344581368845 111.3432355215773,195.86651519790757 111.5007804594934,193.1483713435009 111.5007804594934,190.61143343057483 111.5007804594934,190.61143343057483 111.6583253974095,187.89328175690025 111.81587033439428,185.53754703560844 111.9734152732417,183.0005985533353 111.9734152732417,183.0005985533353 111.9734152732417,180.10122454562224 111.9734152732417,177.38305723434314 111.9734152732417,177.38305723434314 112.1309602111578,174.4836743111955 111.9734152732417,171.40307491319254 111.81587033439428,168.50368249951862 111.81587033439428,168.50368249951862 111.6583253974095,165.42307301738765 111.5007804594934,162.7048838660121 111.5007804594934,162.7048838660121 109.76778614427894,161.61760707281064 107.08952220156789,161.61760707281064 104.41125825885683,161.7988199169049 104.41125825885683,161.7988199169049 101.57544937822968,161.98003274248913 98.73964049853384,161.7988199169049 96.06137655582279,161.7988199169049 96.06137655582279,161.7988199169049 93.22556767612696,161.98003274248913 90.3897587954998,162.34245834033936 90.3897587954998,162.34245834033936 89.12939929310232,164.15458525018767 89.28694423101842,166.87277224392164 89.60203410685062,169.40974312275648 89.60203410685062,169.40974312275648 89.60203410685062,172.30913409905042 89.75957904476672,174.84609742823523 89.75957904476672,174.84609742823523 89.60203410685062,177.5642685139319 89.60203410685062,180.28243555582594 89.60203410685062,183.0005985533353 89.60203410685062,183.0005985533353 89.75957904476672,185.8999679593835 89.9171239817515,188.79933276388329 89.9171239817515,188.79933276388329 89.75957904476672,191.69869296741672 89.75957904476672,194.23562937078532 89.9171239817515,196.77256225049496 89.9171239817515,196.77256225049496 90.07466892059892,199.49070071359165 90.2322138575837,202.20883513148874 90.2322138575837,202.20883513148874 90.2322138575837,205.10817405360285 90.07466892059892,207.64509183564223 89.9171239817515,210.1820060950704 89.9171239817515,210.1820060950704 90.07466892059892,212.9001246074913 90.2322138575837,215.43703156989068 90.2322138575837,215.43703156989068 90.07466892059892,217.79272773780394 89.9171239817515,220.32962790643796 90.07466892059892,222.86652455222793 90.07466892059892,222.86652455222793 89.9171239817515,225.40341767598875 89.9171239817515,227.75910099362954 89.9171239817515,227.75910099362954 90.07466892059892,230.1147812731797 89.9171239817515,232.6516643317882 89.9171239817515,235.0073383039562 89.9171239817515,235.0073383039562 90.2322138575837,237.54421456926502 90.5473037334159,240.26229237322696 90.5473037334159,240.26229237322696 90.5473037334159,242.98036613315344 90.5473037334159,245.51723132829648 90.70484867040068,248.05409300059546 90.70484867040068,248.05409300059546 90.8623936092481,250.59095115063246 90.5473037334159,253.12780577817466 90.5473037334159,255.66465688322205 90.5473037334159,255.66465688322205 90.3897587954998,258.2015044655418 90.3897587954998,260.73834852629807 90.3897587954998,260.73834852629807 90.8623936092481,262.7315806746483 92.91047780029476,263.6375945688924 94.80101705342531,263.4563918255735 94.80101705342531,263.4563918255735 96.84910124447197,264.0 96.84910124447197,264.0 96.84910124447197,264.0 96.84910124447197,264.0 96.84910124447197,264.0 96.84910124447197,264.0 96.84910124447197,264.0 110.71305577084422,264.0 112.28850514814258,262.7315806746483 112.28850514814258,262.7315806746483 112.1309602111578,260.73834852629807 111.81587033439428,258.2015044655418 111.9734152732417,255.66465688322205 111.9734152732417,255.66465688322205 111.3432355215773,253.12780577817466 111.3432355215773,250.59095115063246 111.3432355215773,250.59095115063246 111.3432355215773,247.8728887118632 111.3432355215773,245.15482223033905 111.3432355215773,242.25554685958195 111.3432355215773,242.25554685958195 111.3432355215773,239.35626688750926 111.3432355215773,236.27577687695157 111.3432355215773,236.27577687695157 111.18569058459252,233.73889885051176 111.6583253974095,230.83960536355153 111.18569058459252,227.94030727643985 111.18569058459252,227.94030727643985 111.0281456457451,225.0410045882454 111.0281456457451,222.32290413905866 111.0281456457451,222.32290413905866 111.3432355215773,219.42359253647737 111.6583253974095,216.52427633258048 111.81587033439428,213.6249555272516 111.81587033439428,213.6249555272516 111.5007804594934,210.1820060950704 111.3432355215773,206.9202585434541 111.18569058459252,206.37663338484708 111.18569058459252,203.65850516792852 111.18569058459252,200.21553695341572 111.3432355215773,196.77256225049496 111.3432355215773,196.77256225049496 111.18569058459252,193.51079075760208 111.3432355215773,190.06780341896228 111.3432355215773,189.705383321736 111.5007804594934,186.98723030055407 111.5007804594934,184.0878626195481 111.5007804594934,181.1884903375758 111.5007804594934,181.1884903375758 111.5007804594934,178.2891134544043 111.5007804594934,175.5709434467135 111.5007804594934,172.8527693945216 111.5007804594934,172.8527693945216 111.5007804594934,170.4970152779715 111.5007804594934,168.14125812368002 111.5007804594934,168.14125812368002 111.5007804594934,165.42307301738765 111.3432355215773,162.8860966017237 109.45269626844674,161.7988199169049 109.45269626844674,161.7988199169049 107.08952220156789,161.7988199169049 104.72634813468903,161.61760707281064 104.72634813468903,161.61760707281064 102.36317406687886,161.61760707281064 99.52736518718302,161.61760707281064 96.69155630748719,161.61760707281064 96.69155630748719,161.61760707281064 93.69820248987526,161.98003274248913 91.01993854623288,162.16124555002898 91.01993854623288,162.16124555002898 89.60203410685062,163.97337263973895","stroke":"#4dd2ff","strokeLinecap":"round","strokeLinejoin":"round","strokeWidth":"0.5","key":13},React.createElement("title",null,"2020-08-08 10.1km"))]);
}

Grid.defaultProps = {"baseProfile":"full","height":"300mm","version":"1.1","viewBox":"0,0,200,300","width":"200mm","xmlnsEv":"http://www.w3.org/2001/xml-events"};

module.exports = Grid;

Grid.default = Grid;


/***/ }),

/***/ 9274:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var React = __webpack_require__(3691);

function Start (props) {
    return React.createElement("svg",props,React.createElement("g",{"id":"Page-1","fill":"none","fillRule":"evenodd"},React.createElement("g",{"id":"037---Waypoint-Flag","fillRule":"nonzero","transform":"translate(0 -1)"},[React.createElement("g",{"id":"Icons_copy","transform":"translate(0 1)","key":0},[React.createElement("path",{"id":"Shape","d":"m58.44 30.6c-11.88 14.2-32.78-3.93-44.27 11.64l-.66-2.34v-.01c-2.29-8.19-4.58-16.3833333-6.87-24.58-.22-.78-.43-1.56-.65-2.34 11.49-15.57 32.4 2.56 44.27-11.64.58-.7 1.13-.4 1.01.62-.06.48-.13.96-.19 1.43-.69 5-1.53 9.44-2.49 13.46-.27 1.13-.54 2.22-.83 3.29-.0181734.0757458-.0315335.1525661-.04.23-.0106736.2802805.1027422.5510151.31.74 2.9783401 2.7019905 6.2761919 5.0292932 9.82 6.93.28.14.55.27.82.39.46.2.35 1.48-.23 2.18z","fill":"#e64c3c","key":0}),React.createElement("path",{"id":"Shape","d":"m58.44 30.6c-.6501399.7802412-1.3697588 1.4998601-2.15 2.15-10.83 8.99-27.3-2.22-38.4 5.76h-.01c-1.4199733 1.046483-2.6711663 2.304421-3.71 3.73-.22-.78-1.95-.87-2.17-1.65v-.01c-.02-.07-.04-.13-.06-.2-2.27-8.12-4.54-16.2466667-6.81-24.38-.22-.78 1.08-2.25.86-3.03 5.09-6.89 12.02-7.18 19.19-6.6 7.87.65 16.04 2.35 22.38-2.46.9983609-.75079008 1.9046285-1.61677914 2.7-2.58.58-.7 1.13-.4 1.01.62-.06.48-.13.96-.19 1.43-.69 5-1.53 9.44-2.49 13.46-.27 1.13-.54 2.22-.83 3.29-.0181734.0757458-.0315335.1525661-.04.23-.0106736.2802805.1027422.5510151.31.74 2.9783401 2.7019905 6.2761919 5.0292932 9.82 6.93.28.14.55.27.82.39.46.2.35 1.48-.23 2.18z","fill":"#cad9fc","key":1}),React.createElement("g",{"fill":"#e8edfc","key":2},[React.createElement("path",{"id":"Shape","d":"m56.41 32.61c-.04.05-.08.09-.12.14-10.83 8.99-27.3-2.22-38.4 5.76h-.01c-2.07.32-2 3.52-3.88 4.49-2.27-8.12-6.6-18.87-8.87-27-.22-.78 1.08-2.25.86-3.03 5.09-6.89 12.02-7.18 19.19-6.6 7.87.65 17.48 1.44 23.82-3.37-.71 4.7-2.07 9.87-3 13.78-.31 1.3-.62 2.56-.96 3.79-.0182073.0858464-.0315618.1726507-.04.26-.0165937.3214646.1118607.6334254.35.85 3.99 3.47 6.87 6.23 10.38 7.98.32.16.63.31.94.44.53.23.4 1.71-.26 2.51z","key":0}),React.createElement("path",{"id":"Shape","d":"m9.45150963 10.0111708h.1433c.64015307 0 1.25408707.2542998 1.70674367.7069563.4526565.4526566.7069563 1.0665906.7069563 1.7067437v45.3626c0 1.0664618-.8645381 1.931-1.931 1.931h-1.10879997c-1.06646186 0-1.931-.8645382-1.931-1.931v-45.3626c0-1.3330497 1.0806503-2.4137 2.4137-2.4137z","transform":"matrix(.963 -.269 .269 .963 -9.032 3.849)","key":1})])]),React.createElement("g",{"id":"Icons","fill":"#fff","transform":"translate(1 11)","key":1},React.createElement("path",{"id":"Shape","d":"m14.678 48.9507 1.0678-.2984c.0634142-.0210171.1256684-.0453847.1865-.073-.3059718-.2499171-.5272905-.5882341-.6337-.9687l-12.2086-43.6888c-.27028924-.97424098.09689756-2.01356496.9192-2.6018-.59836922-.46042192-1.37842214-.61265447-2.106-.411l-.1379.0385c-1.28392347.35874479-2.03396372 1.69035388-1.6753 2.9743l12.2086 43.6888c.2870014 1.0271063 1.3522895 1.6270863 2.3794 1.3401z"})),React.createElement("g",{"id":"Layer_2","key":2},[React.createElement("path",{"id":"Shape","d":"m2.053 14.653 3.499 12.52 8.71 31.168-1.926.539-8.71-31.169-3.499-12.52z","fill":"#fff","key":0}),React.createElement("g",{"fill":"#428dff","key":1},[React.createElement("path",{"id":"Shape","d":"m2.4358 19.7373c.53079922-.1500279.84084226-.7005107.694-1.2322l-1.0765-3.8525-1.9262.5383 1.0765 3.8524c.14998144.5308358.70050349.840901 1.2322.694z","key":0}),React.createElement("path",{"id":"Shape","d":"m12.3355 58.88 1.9262-.5383-8.9789-32.1317c-.09615803-.3440825-.36857754-.6107281-.71464074-.6994941-.34606319-.0887659-.71319484.0138335-.9631.26915-.24990517.2553166-.3446173.6245616-.24845926.9686441z","key":1}),React.createElement("path",{"id":"Shape","d":"m4.2063 22.3575c-.07490138-.2538315-.24272249-.4701065-.47-.6057l-.1767-.0754c-.06393913-.0215298-.13045347-.0344763-.1978-.0385-.06253228-.0124484-.12657787-.0154484-.19-.0089-.06662004.0069034-.13267939.0184312-.1977.0345-.25396014.0747004-.47033292.2425696-.6058.47-.25632418.4849939-.08842788 1.0857657.3822 1.3676.11633877.0611962.24326559.0996815.374.1134.12966928.0170871.26143258.0085248.3878-.0252.25694371-.0689915.47530619-.2384954.60586452-.4703023.13055832-.2318068.16232364-.506406.08813548-.7618977z","key":2}),React.createElement("path",{"id":"Shape","d":"m15.1543 61.0234c-1.3131578-.0035737-2.4641659-.8789182-2.8184-2.1434-.1047434-.3467682-.0137665-.7230684.2378229-.9836871.2515895-.2606187.6244494-.3648018.9746938-.2723454.3502445.0924565.6231043.3670948.7132833.7179325.1386638.4946286.6515843.7836357 1.1465.646l1.0693-.2988c.4945675-.1390172.783314-.6520959.6455-1.147l-12.208-43.6891c-.21192095-.751076-.99110897-1.1895509-1.7431-.9809l-.1367.0381c-.75150823.21118-1.19077567.9902817-.9825 1.7426.10566032.3470367.0150922.7240796-.23666629.985262-.25175848.2611825-.62522009.3655392-.9759038.2726977-.3506837-.0928415-.62358626-.3683195-.71312991-.7198597-.50468593-1.815475.55497633-3.6969782 2.3691-4.2065l.1377-.0386c1.81535016-.5036775 3.69623437.5553314 4.207 2.3687l12.208 43.6894c.2094014.7485105.1128149 1.5495525-.2685031 2.2268365-.381318.6772839-1.0161182 1.1753058-1.7646969 1.3844635l-1.0693.2989c-.2578315.0721343-.5242682.1089039-.792.1093z","key":3}),React.createElement("path",{"id":"Shape","d":"m14.166 44.2441c-.0605828.0000403-.1210397-.0055166-.1806-.0166-.3759553-.0688112-.6796786-.3461339-.7823-.7143l-8.18-29.27c-.08284248-.2966212-.02449022-.614866.1582-.8628 6.2012-8.4072 14.9463-7.5347 23.4043-6.689 7.9366.7954 15.4327 1.5425 20.9053-5.0054.4028894-.63382158 1.1959029-.89698941 1.8978-.6298.249.1079 1.0508.5722.872 2.0126-.7623159 6.18130331-1.9437366 12.3036693-3.5361 18.3248 3.0998951 2.8439162 6.5841877 5.237941 10.3506 7.1118.4232899.1992905.726435.5881733.8164 1.0473.1707533.9506993-.0781613 1.9287813-.6826 2.6822l-.0029.0039c-6.1534 7.3589-14.53 6.5234-22.64 5.7129-8.2637-.8252-16.07-1.607-21.5957 5.8862-.1883675.2555125-.4869587.4062929-.8044.4062zm-7.083-30.062 7.527 26.9351c6.0947-6.7608 14.2519-5.9463 22.1552-5.1558 7.9336.7935 15.4307 1.542 20.9043-5.0039.1637292-.2242914.2617894-.4897328.2832-.7666-3.8403085-1.9552616-7.3981938-4.4214973-10.5767-7.3315-.5562771-.4965314-.7823066-1.2658845-.583-1.9844 1.472317-5.5570772 2.5852862-11.20319096 3.332-16.9033-6.0586 6.2759-14.0225 5.479-21.7373 4.71-8.125-.8117-15.7977-1.5792-21.3047 5.5004zm51.166 16.1446.02.0092z","key":4})])])])));
}

Start.defaultProps = {"height":"16","viewBox":"0 0 60 60","width":"16"};

module.exports = Start;

Start.default = Start;


/***/ })

};
;
//# sourceMappingURL=component---src-pages-index-jsx.js.map