/*global _, decodeFromInput, parseString */
/*global URL, MozActivity */
(function () {
"use strict";

var buttons = {}, abortCamera;

//NOTE: constraints isn't converted for different versions,
//so only use what's common for all implementations
//(the defaults are better than the mess required to make it work for all versions)
//use old syntax to avoid requiring promises
function getUserMedia (constraints, success, error) {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia(constraints).then(success, error);
	} else if (navigator.getUserMedia) {
		navigator.getUserMedia(constraints, success, error);
	} else if (navigator.mozGetUserMedia) {
		navigator.mozGetUserMedia(constraints, success, error);
	} else if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia(constraints, success, error);
	} else {
		error();
	}
}

function initCamera (video, callback) {
	getUserMedia({video: true}, function (stream) {
		if ('srcObject' in video) {
			video.srcObject = stream;
		} else if ('mozSrcObject' in video) {
			video.mozSrcObject = stream;
		} else if (window.URL) {
			video.src = URL.createObjectURL(stream);
		} else {
			video.src = stream;
		}
		video.onplay = function () {
			callback(true);
		};
		video.onerror = function () {
			callback(false);
		};
		video.play();
	}, function () {
		callback(false);
	});
}

function removeCamera (video) {
	video.pause();
	if ('srcObject' in video) {
		video.srcObject = null;
	} else if ('mozSrcObject' in video) {
		video.mozSrcObject = null;
	} else {
		video.src = '';
	}
	video.parentNode.removeChild(video);
	abortCamera = false;
}

function pickPhoto (callback) {
	var pick;
	if (window.MozActivity) {
		pick = new MozActivity({
			name: 'pick',
			data: {
				type: ['image/png', 'image/jpg', 'image/jpeg']
			}
		});

		pick.onsuccess = function () {
			try {
				callback(URL.createObjectURL(this.result.blob));
			} catch (e) {
				callback();
			}
		};

		pick.onerror = function () {
			callback();
		};
	} else {
		pick = document.createElement('input');
		pick.type = 'file';
		pick.style.display = 'none';
		document.getElementsByTagName('body')[0].appendChild(pick);
		pick.addEventListener('change', function () {
			var file = pick.files[0];
			if (file) {
				try {
					file = URL.createObjectURL(file);
				} catch (e) {
					file = false;
				}
				callback(file);
			} else {
				callback();
			}
			document.getElementsByTagName('body')[0].removeChild(pick);
		}, false);
		pick.click();
	}
}

function getPhoto (img, callback) {
	pickPhoto(function (url) {
		if (url) {
			img.src = url;
			img.onload = function () {
				callback(true);
			};
			img.onerror = function () {
				callback(false);
			};
		} else {
			callback(false);
		}
	});
}

function onVideoClick () {
	buttons.video.style.display = 'none';
	buttons.image.style.display = 'none';
	buttons.about.style.display = 'none';
	buttons.progress.style.display = '';
	runCamera();
}

function onImageClick () {
	buttons.video.style.display = 'none';
	buttons.image.style.display = 'none';
	buttons.about.style.display = 'none';
	buttons.progress.style.display = '';
	runPhoto();
}

function onAboutClick () {
	buttons.video.style.display = 'none';
	buttons.image.style.display = 'none';
	buttons.about.style.display = 'none';
	buttons.done.style.display = '';
	document.getElementById('output').innerHTML = _('about');
}

function onAbortClick () {
	if (abortCamera) {
		abortCamera();
	}
}

function onDoneClick () {
	buttons.video.style.display = '';
	buttons.image.style.display = '';
	buttons.about.style.display = '';
	buttons.done.style.display = 'none';
	document.getElementById('output').innerHTML = '';
}

function showResult (data, format) {
	var html;
	buttons.abort.style.display = 'none';
	buttons.done.style.display = '';
	if (!data) {
		html = _('error');
	} else {
		data = parseString(data, format);
		html = data.html;
	}
	document.getElementById('output').innerHTML = html;
	if (data && data.onclick) {
		document.getElementById('activity').onclick = data.onclick;
	}
}

function runCamera () {
	var video = document.createElement('video');
	initCamera(video, function (success) {
		buttons.progress.style.display = 'none';
		if (!success) {
			showResult(false);
			return;
		}
		document.getElementById('output').appendChild(video);
		buttons.abort.style.display = '';
		abortCamera = decodeFromInput(video, ['zbar'], true, function (data, format, aborted) {
			removeCamera(video);
			if (aborted) {
				buttons.video.style.display = '';
				buttons.image.style.display = '';
				buttons.about.style.display = '';
				buttons.abort.style.display = 'none';
			} else {
				showResult(data, format);
			}
		});
	});
}

function runPhoto () {
	var img = document.createElement('img');
	getPhoto(img, function (success) {
		buttons.progress.style.display = 'none';
		if (!success) {
			showResult(false);
			return;
		}
		//we could use ['zbar', 'datamatrix'] here (that's why I ported the code)
		//but it has a bad recognition, bad performance, and most of the time
		//you just get a cryptic numeric code that doesn't help you anyway
		decodeFromInput(img, ['zbar'], false, function (data, format) {
			showResult(data, format);
		});
	});
}

function init () {
	buttons.video = document.getElementById('button-video');
	buttons.image = document.getElementById('button-image');
	buttons.about = document.getElementById('button-about');
	buttons.abort = document.getElementById('button-abort');
	buttons.done = document.getElementById('button-done');

	buttons.progress = document.getElementById('progress');

	buttons.abort.style.display = 'none';
	buttons.done.style.display = 'none';
	buttons.progress.style.display = 'none';

	buttons.video.onclick = onVideoClick;
	buttons.image.onclick = onImageClick;
	buttons.about.onclick = onAboutClick;
	buttons.abort.onclick = onAbortClick;
	buttons.done.onclick = onDoneClick;

	document.getElementById('buttons').style.display = '';
}

window.addEventListener('localized', function () {
	document.documentElement.lang = document.webL10n.getLanguage();
	document.documentElement.dir = document.webL10n.getDirection();
	init();
}, false);

})();