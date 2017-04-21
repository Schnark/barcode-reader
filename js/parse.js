/*global _, vCard, parseString: true */
/*global URL, Blob, MozActivity */
parseString =
(function () {
"use strict";

function escape (raw) {
	return String(raw).replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function makeLink (href, label) {
	return '<a target="_blank" href="' + escape(href) + '">' + escape(label || href) + '</a>';
}

function vcard (data) {
	var result = {};

	data = vCard.parse(data);

	function getByKey (key, forceString) {
		var val = ((data[key] || [])[0] || {value: ''}).value;
		if (forceString && Array.isArray(val)) {
			val = val[0];
		}
		return val;
	}

	result.title = getByKey('title', true);
	result.givenName = getByKey('n') || getByKey('fn');
	if (Array.isArray(result.givenName)) {
		result.lastName = result.givenName[0];
		result.givenName = result.givenName[1];
	}
	result.bday = getByKey('bday', true);
	result.tel = getByKey('tel', true).replace(/^tel:/, '');
	result.email = getByKey('email', true);
	result.url = getByKey('url', true);
	result.address = getByKey('adr');
	if (Array.isArray(result.address)) {
		result.address = result.address.filter(function (line) {
			return !!line;
		}).join('\n');
	}
	result.company = getByKey('org');
	if (Array.isArray(result.company)) {
		result.company = result.company.join('; ');
	}
	result.note = getByKey('note');
	if (Array.isArray(result.note)) {
		result.note = result.note.join('; ');
	}
	return result;
}

function mecard (data) {
	//the vcard parser handles mecards quite well
	return vcard(data.replace(/^MECARD:/i, '').replace(/;/g, '\n').replace(/¥(.)/g, '$1'));
}

function vevent (data) {
	var result = {};

	//the vcard parser handles events quite well
	data = vCard.parse(data);

	function getByKey (key, forceString) {
		var val = ((data[key] || [])[0] || {value: ''}).value;
		if (forceString && Array.isArray(val)) {
			val = val[0];
		}
		return val;
	}

	function getDate (str) {
		if (!str) {
			return '';
		}
		var date = new Date(str
			.replace(/(\d\d)(\d\d)(T|$)/, '-$1-$2$3')
			.replace(/T(\d\d)(\d\d)/, 'T$1:$2:')
		);
		if (isNaN(date)) {
			return str;
		}
		return String(date);
	}

	result.summary = getByKey('summary', true);
	result.location = getByKey('location', true);
	result.start = getDate(getByKey('dtstart', true));
	result.end = getDate(getByKey('dtend', true));
	return result;
}

function validateEAN (nr) {
	var i, l = nr.length, sum = 0;
	for (i = 0; i < l; i++) {
		sum += Number(nr[l - i - 1]) * (i % 2 ? 3 : 1);
	}
	return sum % 10 === 0;
}

function getGS1Region (region) {
	var single = {
		//TODO add missing: 478-488, 528-531, 535, 594, 599,
		//600, 601, 603, 604, 608, 609, 611, 613, 615, 616, 618-629,
		//740-746, 750, 754, 755, 759, 770, 771, 773, 775, 777-780, 784,
		//786, 789, 790, 850, 858-860, 865, 867-869, 880, 884, 885, 888,
		//890, 893, 896, 899, 950, 951, 955, 958, 960-969, 980-984
		380: 'bulgaria',
		383: 'slovenia',
		385: 'croatia',
		387: 'bosnia',
		389: 'montenegro',
		390: 'kosovo',
		414: 'germany-19',
		419: 'germany-7',
		434: 'germany-19-adult',
		439: 'germany-7-adult',
		440: 'germany',
		470: 'kyrgyzstan',
		471: 'taiwan',
		474: 'estonia',
		475: 'latvia',
		476: 'azerbaijan',
		477: 'lithuania',
		489: 'hongkong',
		520: 'greece',
		521: 'greece',
		539: 'ireland',
		560: 'portugal',
		569: 'iceland',
		590: 'poland',
		729: 'israel',
		977: 'issn'
		//978: 'isbn', 979: 'isbn'
	}, double = {
		10: 'us',
		11: 'us',
		12: 'us',
		13: 'us',
		30: 'france',
		31: 'france',
		32: 'france',
		33: 'france',
		34: 'france',
		35: 'france',
		36: 'france',
		37: 'france',
		40: 'germany',
		41: 'germany',
		42: 'germany',
		43: 'germany',
		45: 'japan',
		46: 'russia',
		49: 'japan',
		50: 'uk',
		54: 'belgium',
		57: 'denmark',
		64: 'finland',
		69: 'china',
		70: 'norway',
		73: 'sweden',
		76: 'switzerland',
		80: 'italy',
		81: 'italy',
		82: 'italy',
		83: 'italy',
		84: 'spain',
		87: 'netherlands',
		90: 'austria',
		91: 'austria',
		93: 'australia',
		94: 'newzealand',
		99: 'coupons'
	}, triple = {
		0: 'us', //TODO split
		2: 'internal'
	};
	region = Number(region);
	if (single[region]) {
		return single[region];
	}
	if (double[Math.floor(region / 10)]) {
		return double[Math.floor(region / 10)];
	}
	if (triple[Math.floor(region / 100)]) {
		return triple[Math.floor(region / 100)];
	}
	return '';
}

//some tests: http://qr-practices.pbworks.com/w/page/4506607/tests
var parsers = [
{
	re: /^https?:\/\/\S+/i,
	parse: function (data) {
		return {
			html: _('url', {url: makeLink(data)}),
			activity: {
				name: 'view',
				data: {
					type: 'url',
					url: data
				}
			},
			activityLabel: _('url-button'),
			raw: false
		};
	}
}, {
	re: /^(?:URLTO:|MEBKM:TITLE:.*?;URL:)(https?:\/\/\S+[^\s;]);*$/i,
	parse: function (data, link) {
		link = link.replace(/¥(.)/g, '$1');
		return {
			html: _('url', {url: makeLink(link)}),
			activity: {
				name: 'view',
				data: {
					type: 'url',
					url: link
				}
			},
			activityLabel: _('url-button'),
			raw: true
		};
	}
}, {
	re: /^(.*?)\b(https?:\/\/\S+)(.*)$/,
	parse: function (data, pre, link, post) {
		return {
			html: escape(pre) + makeLink(link) + escape(post),
			activity: {
				name: 'view',
				data: {
					type: 'url',
					url: link
				}
			},
			activityLabel: _('url-button'),
			raw: false
		};
	}
}, {
	re: /^www\.\S+$/,
	parse: function (data) {
		return {
			html: _('url', {url: makeLink('http://' + data, data)}),
			activity: {
				name: 'view',
				data: {
					type: 'url',
					url: 'http://' + data
				}
			},
			activityLabel: _('url-button'),
			raw: false
		};
	}
}, {
	re: /^mailto:([^?]*)/i,
	parse: function (data, email) {
		return {
			html: _('email', {email: makeLink(data, email)}),
			activity: {
				name: 'new',
				data: {
					type: 'mail',
					url: data
				}
			},
			activityLabel: _('email-button'),
			raw: true
		};
	}
}, {
	re: /^[a-z0-9_.\-]+@[a-z0-9_\-]+(?:\.[a-z0-9_\-]+)+$/i,
	parse: function (data) {
		return {
			html: _('email', {email: makeLink('mailto:' + data, data)}),
			activity: {
				name: 'new',
				data: {
					type: 'mail',
					url: 'mailto:' + data
				}
			},
			activityLabel: _('email-button'),
			raw: false
		};
	}
}, {
	re: /^tel:(\+?[0-9]+)$/i,
	parse: function (data, tel) {
		return {
			html: _('phone', {tel: makeLink(data, tel)}),
			activity: {
				name: 'dial',
				data: {
					number: tel
				}
			},
			activityLabel: _('phone-button'),
			raw: true
		};
	}
}, {
	re: /^(?:sms|mms)(?:to)?:(\+?[0-9]+)(?::(.*))?$/i,
	parse: function (data, tel, sms) {
		return {
			html: sms ? _('sms-text', {tel: makeLink(data, tel), sms: escape(sms)}) :
				_('sms', {tel: makeLink(data, tel)}),
			activity: {
				name: 'new',
				data: {
					type: 'websms/sms',
					number: tel,
					body: sms || ''
				}
			},
			activityLabel: _('sms-button'),
			raw: true
		};
	}
}, {
	re: /^geo:([\-+]?\d+\.?\d*),([\-+]?\d+\.?\d*)(?:;|$)/i,
	parse: function (data, lat, lon) {
		return {
			html: _('geo', {lat: lat, lon: lon}),
			raw: true
		};
	}
}, {
	re: /^wifi:/i,
	parse: function () {
		return {
			html: _('wifi'),
			raw: true
		};
	}
}, {
	re: /^otpauth:/i,
	parse: function () {
		return {
			html: _('otpauth'),
			raw: true
		};
	}
}, {
	re: /^BEGIN:VCARD/i,
	parse: function (data) {
		var table = [], contact = vcard(data);
		if (contact.title) {
			table.push('<tr><th>' + _('contact-title') + '</th><td>' + escape(contact.title) + '</td></tr>');
		}
		if (contact.givenName) {
			table.push('<tr><th>' + _('contact-givenName') + '</th><td>' + escape(contact.givenName) + '</td></tr>');
		}
		if (contact.lastName) {
			table.push('<tr><th>' + _('contact-lastName') + '</th><td>' + escape(contact.lastName) + '</td></tr>');
		}
		if (contact.bday) {
			table.push('<tr><th>' + _('contact-bday') + '</th><td>' + escape(contact.bday) + '</td></tr>');
		}
		if (contact.tel) {
			table.push('<tr><th>' + _('contact-tel') + '</th><td>' +
				makeLink('tel:' + contact.tel, contact.tel) + '</td></tr>');
		}
		if (contact.email) {
			table.push('<tr><th>' + _('contact-email') + '</th><td>' +
				makeLink('mailto:' + contact.email, contact.email) + '</td></tr>');
		}
		if (contact.url) {
			table.push('<tr><th>' + _('contact-url') + '</th><td>' + makeLink(contact.url) + '</td></tr>');
		}
		if (contact.address) {
			table.push('<tr><th>' + _('contact-address') + '</th><td>' +
				escape(contact.address).replace(/\n/g, '<br>') + '</td></tr>');
		}
		if (contact.company) {
			table.push('<tr><th>' + _('contact-company') + '</th><td>' + escape(contact.company) + '</td></tr>');
		}
		if (contact.note) {
			table.push('<tr><th>' + _('contact-note') + '</th><td>' + escape(contact.note) + '</td></tr>');
		}
		table = '<table><tbody>' + table.join('') + '</tbody></table>';
		return {
			html: _('vcard', {data: table}),
			activity: {
				name: 'new',
				data: {
					type: 'webcontacts/contact',
					params: {
						//other parameters either don't exist or are completely broken
						//the QR function of camera app does work with these, though
						givenName: contact.givenName || '',
						lastName: contact.lastName || '',
						tel: contact.tel || '',
						email: contact.email || '',
						company: contact.company || ''
					}
				}
			},
			activityLabel: _('contact-button'),
			file: 'vcard.vcf',
			mime: 'text/vcard',
			raw: true
		};
	}
}, {
	re: /^MECARD:/i,
	parse: function (data) {
		var table = [], contact = mecard(data);
		if (contact.title) {
			table.push('<tr><th>' + _('contact-title') + '</th><td>' + escape(contact.title) + '</td></tr>');
		}
		if (contact.givenName) {
			table.push('<tr><th>' + _('contact-givenName') + '</th><td>' + escape(contact.givenName) + '</td></tr>');
		}
		if (contact.lastName) {
			table.push('<tr><th>' + _('contact-lastName') + '</th><td>' + escape(contact.lastName) + '</td></tr>');
		}
		if (contact.bday) {
			table.push('<tr><th>' + _('contact-bday') + '</th><td>' + escape(contact.bday) + '</td></tr>');
		}
		if (contact.tel) {
			table.push('<tr><th>' + _('contact-tel') + '</th><td>' +
				makeLink('tel:' + contact.tel, contact.tel) + '</td></tr>');
		}
		if (contact.email) {
			table.push('<tr><th>' + _('contact-email') + '</th><td>' +
				makeLink('mailto:' + contact.email, contact.email) + '</td></tr>');
		}
		if (contact.url) {
			table.push('<tr><th>' + _('contact-url') + '</th><td>' + makeLink(contact.url) + '</td></tr>');
		}
		if (contact.address) {
			table.push('<tr><th>' + _('contact-address') + '</th><td>' +
				escape(contact.address).replace(/\n/g, '<br>') + '</td></tr>');
		}
		if (contact.company) {
			table.push('<tr><th>' + _('contact-company') + '</th><td>' + escape(contact.company) + '</td></tr>');
		}
		if (contact.note) {
			table.push('<tr><th>' + _('contact-note') + '</th><td>' + escape(contact.note) + '</td></tr>');
		}
		table = '<table><tbody>' + table.join('') + '</tbody></table>';
		return {
			html: _('mecard', {data: table}),
			activity: {
				name: 'new',
				data: {
					type: 'webcontacts/contact',
					params: {
						givenName: contact.givenName || '',
						lastName: contact.lastName || '',
						tel: contact.tel || '',
						email: contact.email || '',
						company: contact.company || ''
					}
				}
			},
			activityLabel: _('contact-button'),
			raw: true
		};
	}
}, {
	re: /^BEGIN:(?:VEVENT|VCALENDAR)/i,
	parse: function (data) {
		var table = [], event = vevent(data);
		if (event.summary) {
			table.push('<tr><th>' + _('event-summary') + '</th><td>' + escape(event.summary) + '</td></tr>');
		}
		if (event.location) {
			table.push('<tr><th>' + _('event-location') + '</th><td>' + escape(event.location) + '</td></tr>');
		}
		if (event.start) {
			table.push('<tr><th>' + _('event-start') + '</th><td>' + escape(event.start) + '</td></tr>');
		}
		if (event.end) {
			table.push('<tr><th>' + _('event-end') + '</th><td>' + escape(event.end) + '</td></tr>');
		}
		table = '<table><tbody>' + table.join('') + '</tbody></table>';
		return {
			html: _('event', {data: table}),
			raw: true
		};
	}
}, {
	re: /^97(?:8\d|9[1-9])\d{9}$/,
	val: validateEAN,
	parse: function (data) {
		var isbn = makeLink(_('url-isbn', {isbn: data}), data);
		return {
			html: _('isbn', {isbn: isbn}),
			raw: false
		};
	}
}, {
	re: /^(?:\d{4,6})?\d{8}$/,
	val: validateEAN,
	parse: function (data) {
		var regionStart = data.length === 14 ? 1 : 0,
			regionLength = data.length === 12 ? 2 : 3,
			region = getGS1Region(data.slice(regionStart, regionStart + regionLength)),
			ean = makeLink(_('url-ean', {ean: data}), data);
		return {
			html: region ? _('ean-region', {region: _('ean-region-' + region), ean: ean}) :
				_('ean', {ean: ean}),
			raw: false
		};
	}
}, {
	re: /^\d+$/,
	parse: function (data) {
		return {
			html: _('numeric', {n: data}),
			raw: false
		};
	}
}, {
	re: /.{20,}/,
	parse: function () {
		return {
			file: 'data.txt',
			mime: 'text/plain',
			raw: true
		};
	}
}, {
	re: /(?:)/,
	parse: function () {
		return {
			raw: true
		};
	}
}];

function getActivityFunction (activity) {
	/*jshint nonew: false*/
	return activity ? function () {
		new MozActivity(activity);
	} : false;
}

function parse (data, format) {
	var i, result, html;
	for (i = 0; i < parsers.length; i++) {
		result = parsers[i].re.exec(data);
		if (result) {
			result = Array.prototype.slice.apply(result);
			result[0] = data;
			if (parsers[i].val && !parsers[i].val.apply(null, result)) {
				result = false;
			}
		}
		if (result) {
			result = parsers[i].parse.apply(null, result);
			html = result.html ? '<p>' + result.html + '</p>' : '';
			if (result.activityLabel && window.MozActivity) {
				html += '<button id="activity">' + result.activityLabel + '</button>';
			} else {
				result.activity = false;
			}
			if (result.file) {
				//download will fail for unknown MIME in Firefox OS,
				//so we use 'image/png' instead of result.mime, even if it's wrong
				html += '<a class="button" download="' + result.file + '" href="' +
					URL.createObjectURL(new Blob([data], {type: 'image/png'})) + '">' +
					_('download') + '</a>';
			}
			if (result.raw) {
				html += '<p>' + _('raw') + '<pre>' + escape(data) + '</pre></p>';
			}
			html += '<p>' + _('format', {format: format}) + '</p>';
			return {
				html: html,
				onclick: getActivityFunction(result.activity)
			};
		}
	}
}

return parse;

})();