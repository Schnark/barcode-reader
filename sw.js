/*global caches, fetch, Promise */
(function (worker) {
"use strict";

var PREFIX = 'barcode-reader',
	VERSION = '1.5',
	FILES = [
		'app.css',
		'index.html',
		'icons/icon-512.png',
		'js/app.js',
		'js/parse.js',
		'js/reader.js',
		'js/lib/l10n.js',
		'js/lib/vcard.min.js',
		'js/lib/zbar-worker.js',
		'l10n/de.properties',
		'l10n/en.properties',
		'l10n/locales.ini'
	];

worker.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(PREFIX + ':' + VERSION).then(function (cache) {
			return cache.addAll(FILES);
		})
	);
});

worker.addEventListener('activate', function (e) {
	e.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(keys.map(function (key) {
				if (key.indexOf(PREFIX + ':') === 0 && key !== PREFIX + ':' + VERSION) {
					return caches.delete(key);
				}
			}));
		})
	);
});

worker.addEventListener('fetch', function (e) {
	e.respondWith(caches.match(e.request, {ignoreSearch: true})
		.then(function (response) {
			return response || fetch(e.request);
		})
	);
});

})(this);