/*global decodeFromInput: true*/
decodeFromInput =
(function () {
"use strict";

var callbacks = [], curId = 0, workers = {};

function initWorker (id) {
	workers[id] = new Worker('js/lib/' + id + '-worker.js');
	workers[id].onmessage = onMessage;
}

function onMessage (e) {
	callbacks[e.data.id](e.data.data, e.data.format);
}

function sendToWorker (data, worker, callback) {
	if (!data || !workers[worker]) {
		setTimeout(function () {
			callback(false);
		}, 0);
		return;
	}
	data.id = curId;
	callbacks[data.id] = callback;
	curId = (curId + 1) % 1024;
	workers[worker].postMessage(data);
}

function decodeFromInput (input, types, repeat, callback) {
	var i = 0, aborted = false;
	function next () {
		if (i >= types.length) {
			if (repeat) {
				i = 0;
			} else {
				callback(false);
				return;
			}
		}
		sendToWorker(getDataForInput(input), types[i], function (result, format) {
			if (aborted) {
				return;
			}
			if (result) {
				callback(result, format);
			} else {
				i++;
				next();
			}
		});
	}
	next();
	return function () {
		aborted = true;
		callback(false, false, true);
	};
}

function getDataForInput (input) {
	var canvas = document.createElement('canvas'), ctx,
		w, h, f, MAX = 250;
	if (input.videoWidth && input.videoHeight) {
		w = input.videoWidth;
		h = input.videoHeight;
	} else if (input.naturalWidth && input.naturalHeight) {
		w = input.naturalWidth;
		h = input.naturalHeight;
	} else {
		w = input.width;
		h = input.height;
	}
	if (w === 0 || h === 0) {
		return;
	}
	if (w > MAX || h > MAX) {
		f = MAX / Math.max(w, h);
		w = Math.round(w * f);
		h = Math.round(h * f);
	}
	canvas.width = w;
	canvas.height = h;
	ctx = canvas.getContext('2d');
	ctx.drawImage(input, 0, 0, w, h);
	return {
		imageData: ctx.getImageData(0, 0, w, h).data,
		width: w,
		height: h
	};
}

initWorker('zbar');
return decodeFromInput;

})();