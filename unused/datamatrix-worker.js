//NOTE: This port is probably broken, but I currently don't want to spend more time to fix it.
/*
 * Copyright 2008 ZXing authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//Ported to JavaScript by Schnark
(function () {
"use strict";

function newArray (size, defaultValue) {
	var i, array = new Array(size);
	if (defaultValue !== undefined) {
		if (array.fill) {
			array.fill(defaultValue);
		} else {
			for (i = 0; i < array.length; i++) {
				array[i] = defaultValue;
			}
		}
	}
	return array;
}

//from common/detector/MathUtils.java
function distance (aX, aY, bX, bY) {
	var xDiff = aX - bX, yDiff = aY - bY;
	return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

//BinaryBitmap.java (only partial);
function BinaryBitmap (binarizer) {
	if (!binarizer) {
		throw new Error('Binarizer must be non-null.');
	}
	this.binarizer = binarizer;
}

BinaryBitmap.prototype.getWidth = function () {
	return this.binarizer.getWidth();
};

BinaryBitmap.prototype.getHeight = function () {
	return this.binarizer.getHeight();
};

BinaryBitmap.prototype.getBlackMatrix = function () {
	if (!this.matrix) {
		this.matrix = this.binarizer.getBlackMatrix();
	}
	return this.matrix;
};

//based RGBLuminanceSource.java (only partial)
function ImageDataLuminanceSource (width, height, pixels) {
	var size, offset, r, g2, b;
	this.dataWidth = width;
	this.dataHeight = height;
	this.left = 0;
	this.top = 0;
	size = width * height;
	this.luminances = newArray(size);
	for (offset = 0; offset < size; offset++) {
		r = pixels[offset * 4];
		g2 = 2 * pixels[offset * 4 + 1];
		b = pixels[offset * 4 + 2];
		this.luminances[offset] = Math.round((r + g2 + b) / 4);
	}
}

ImageDataLuminanceSource.prototype.getWidth = function () {
	return this.dataWidth;
};

ImageDataLuminanceSource.prototype.getHeight = function () {
	return this.dataHeight;
};

ImageDataLuminanceSource.prototype.getMatrix = function () {
	return this.luminances;
};

//ResultPoint.java
function ResultPoint (x, y) {
	this.x = x;
	this.y = y;
}

ResultPoint.prototype.getX = function () {
	return this.x;
};

ResultPoint.prototype.getY = function () {
	return this.y;
};

ResultPoint.prototype.equals = function (other) {
	if (other instanceof ResultPoint) {
		return this.x === other.x && this.y === other.y;
	}
	return false;
};

ResultPoint.prototype.toString = function () {
	return '(' + this.x + ',' + this.y + ')';
};

ResultPoint.orderBestPatterns = function (patterns) {
	var zeroOneDistance, oneTwoDistance, zeroTwoDistance,
		pointA, pointB, pointC, temp;

	zeroOneDistance = ResultPoint.distance(patterns[0], patterns[1]);
	oneTwoDistance = ResultPoint.distance(patterns[1], patterns[2]);
	zeroTwoDistance = ResultPoint.distance(patterns[0], patterns[2]);

	if (oneTwoDistance >= zeroOneDistance && oneTwoDistance >= zeroTwoDistance) {
		pointB = patterns[0];
		pointA = patterns[1];
		pointC = patterns[2];
	} else if (zeroTwoDistance >= oneTwoDistance && zeroTwoDistance >= zeroOneDistance) {
		pointB = patterns[1];
		pointA = patterns[0];
		pointC = patterns[2];
	} else {
		pointB = patterns[2];
		pointA = patterns[0];
		pointC = patterns[1];
	}

	if (ResultPoint.crossProductZ(pointA, pointB, pointC) < 0) {
		temp = pointA;
		pointA = pointC;
		pointC = temp;
	}

	patterns[0] = pointA;
	patterns[1] = pointB;
	patterns[2] = pointC;
};

ResultPoint.distance = function (pattern1, pattern2) {
	return distance(pattern1.x, pattern1.y, pattern2.x, pattern2.y);
};

ResultPoint.crossProductZ = function (pointA, pointB, pointC) {
	var bX = pointB.x, bY = pointB.y;
	return ((pointC.x - bX) * (pointA.y - bY)) - ((pointC.y - bY) * (pointA.x - bX));
};

//common/BitMatrix.java (only partial)
function BitMatrix (width, height, rowSize, bits) {
	var i;
	if (height === undefined) {
		height = width;
	}
	if (rowSize === undefined) {
		rowSize = Math.floor((width + 31) / 32);
	}
	if (bits === undefined) {
		bits = [];
		for (i = 0; i < rowSize * height; i++) {
			bits.push(0);
		}
	}
	this.width = width;
	this.height = height;
	this.rowSize = rowSize;
	this.bits = bits;
}

BitMatrix.prototype.parse = function () {
	throw new Error('Unimplemented');
};

BitMatrix.prototype.get = function (x, y) {
	var offset = y * this.rowSize + Math.floor(x / 32);
	return ((this.bits[offset] >>> (x & 0x1f)) & 1) !== 0;
};

BitMatrix.prototype.set = function (x, y) {
	var offset = y * this.rowSize + Math.floor(x / 32);
	this.bits[offset] |= 1 << (x & 0x1f);
};

BitMatrix.prototype.getWidth = function () {
	return this.width;
};

BitMatrix.prototype.getHeight = function () {
	return this.height;
};

//common/BitSource.java
function BitSource (bytes) {
	this.bytes = bytes;
	this.byteOffset = 0;
	this.bitOffset = 0;
}

BitSource.prototype.getBitOffset = function () {
	return this.bitOffset;
};

BitSource.prototype.getByteOffset = function () {
	return this.byteOffset;
};

BitSource.prototype.readBits = function (numBits) {
	var result, bitsLeft, toRead, bitsToNotRead, mask;
	if (numBits < 1 || numBits > 32 || numBits > this.available()) {
		throw new Error('IllegalArgumentException');
	}
	result = 0;
	if (this.bitOffset > 0) {
		bitsLeft = 8 - this.bitOffset;
		toRead = numBits < bitsLeft ? numBits : bitsLeft;
		bitsToNotRead = bitsLeft - toRead;
		mask = (0xFF >> (8 - toRead)) << bitsToNotRead;
		result = (this.bytes[this.byteOffset] & mask) >> bitsToNotRead;
		numBits -= toRead;
		this.bitOffset += toRead;
		if (this.bitOffset === 8) {
			this.bitOffset = 0;
			this.byteOffset++;
		}
	}
	if (numBits > 0) {
		while (numBits >= 8) {
			result = (result << 8) | (this.bytes[this.byteOffset] & 0xFF);
			this.byteOffset++;
			numBits -= 8;
		}
		if (numBits > 0) {
			bitsToNotRead = 8 - numBits;
			mask = (0xFF >> bitsToNotRead) << bitsToNotRead;
			result = (result << numBits) | ((this.bytes[this.byteOffset] & mask) >> bitsToNotRead);
			this.bitOffset += numBits;
		}
	}
	return result;
};

BitSource.prototype.available = function () {
	return 8 * (this.bytes.length - this.byteOffset) - this.bitOffset;
};

//common/HybridBinarizer.java, Binarizer.java (only partial)
function HybridBinarizer (source) {
	this.source = source;
}

HybridBinarizer.prototype.getLuminanceSource = function () {
	return this.source;
};

HybridBinarizer.prototype.getBlackMatrix = function () {
	var source, width, height, luminances, subWidth, subHeight, blackPoints, newMatrix;
	if (this.matrix) {
		return this.matrix;
	}
	source = this.getLuminanceSource();
	width = source.getWidth();
	height = source.getHeight();
	if (width < 40 || height < 40) {
		throw new Error('Too small');
	}
	luminances = source.getMatrix();
	subWidth = Math.floor(width / 8);
	if (width % 8 !== 0) {
		subWidth++;
	}
	subHeight = Math.floor(height / 8);
	if (height % 8 !== 0) {
		subHeight++;
	}
	blackPoints = HybridBinarizer.calculateBlackPoints(luminances, subWidth, subHeight, width, height);
	newMatrix = new BitMatrix(width, height);
	HybridBinarizer.calculateThresholdForBlock(luminances, subWidth, subHeight, width, height, blackPoints, newMatrix);
	this.matrix = newMatrix;
	return this.matrix;
};

HybridBinarizer.prototype.getWidth = function () {
	return this.source.getWidth();
};

HybridBinarizer.prototype.getHeight = function () {
	return this.source.getHeight();
};

HybridBinarizer.calculateThresholdForBlock = function (luminances, subWidth, subHeight, width, height, blackPoints, matrix) {
	var maxYOffset, maxXOffset, y, yoffset, top, x, xoffset, left, sum, z, blackRow, average;
	maxYOffset = height - 8;
	maxXOffset = width - 8;
	for (y = 0; y < subHeight; y++) {
		yoffset = y * 8;
		if (yoffset > maxYOffset) {
			yoffset = maxYOffset;
		}
		top = HybridBinarizer.cap(y, 2, subHeight - 3);
		for (x = 0; x < subWidth; x++) {
			xoffset = x * 8;
			if (xoffset > maxXOffset) {
				xoffset = maxXOffset;
			}
			left = HybridBinarizer.cap(x, 2, subWidth - 3);
			sum = 0;
			for (z = -2; z <= 2; z++) {
				blackRow = blackPoints[top + z];
				sum += blackRow[left - 2] + blackRow[left - 1] + blackRow[left] + blackRow[left + 1] + blackRow[left + 2];
			}
			average = sum / 25;
			HybridBinarizer.thresholdBlock(luminances, xoffset, yoffset, average, width, matrix);
		}
	}
};

HybridBinarizer.cap = function (value, min, max) {
	return value < min ? min : value > max ? max : value;
};

HybridBinarizer.thresholdBlock = function (luminances, xoffset, yoffset, threshold, stride, matrix) {
	var y, offset, x;
	for (y = 0, offset = yoffset * stride + xoffset; y < 8; y++, offset += stride) {
		for (x = 0; x < 8; x++) {
			if ((luminances[offset + x] & 0xFF) <= threshold) {
				matrix.set(xoffset + x, yoffset + y);
			}
		}
	}
};

HybridBinarizer.calculateBlackPoints = function (luminances, subWidth, subHeight, width, height) {
	var maxYOffset, maxXOffset, blackPoints, i, y, yoffset, x, xoffset,
		sum, min, max, yy, offset, xx, pixel, average, averageNeighborBlackPoint;
	maxYOffset = height - 8;
	maxXOffset = width - 8;
	blackPoints = newArray(subHeight);
	for (i = 0; i < subHeight; i++) {
		blackPoints[i] = newArray(subWidth, 0);
	}
	for (y = 0; y < subHeight; y++) {
		yoffset = y * 8;
		if (yoffset > maxYOffset) {
			yoffset = maxYOffset;
		}
		for (x = 0; x < subWidth; x++) {
			xoffset = x * 8;
			if (xoffset > maxXOffset) {
				xoffset = maxXOffset;
			}
			sum = 0;
			min = 0xFF;
			max = 0;
			for (yy = 0, offset = yoffset * width + xoffset; yy < 8; yy++, offset += width) {
				for (xx = 0; xx < 8; xx++) {
					pixel = luminances[offset + xx] & 0xFF;
					sum += pixel;
					if (pixel < min) {
						min = pixel;
					}
					if (pixel > max) {
						max = pixel;
					}
				}
				if (max - min > 24) {
					for (yy++, offset += width; yy < 8; yy++, offset += width) {
						for (xx = 0; xx < 8; xx++) {
							sum += luminances[offset + xx] & 0xFF;
						}
					}
				}
			}
			average = sum * 64;
			if (max - min <= 24) {
				average = min / 2;
				if (y > 0 && x > 0) {
					averageNeighborBlackPoint =
						(blackPoints[y - 1][x] + (2 * blackPoints[y][x - 1]) + blackPoints[y - 1][x - 1]) / 4;
					if (min < averageNeighborBlackPoint) {
						average = averageNeighborBlackPoint;
					}
				}
			}
			blackPoints[y][x] = average;
		}
	}
	return blackPoints;
};

//common/PerspectiveTransform.java
function PerspectiveTransform (a11, a21, a31, a12, a22, a32, a13, a23, a33) {
	this.a11 = a11;
	this.a12 = a12;
	this.a13 = a13;
	this.a21 = a21;
	this.a22 = a22;
	this.a23 = a23;
	this.a31 = a31;
	this.a32 = a32;
	this.a33 = a33;
}

PerspectiveTransform.quadrilateralToQuadrilateral = function (
	x0, y0, x1, y1, x2, y2, x3, y3,
	x0p, y0p, x1p, y1p, x2p, y2p, x3p, y3p
) {
	var qToS = PerspectiveTransform.quadrilateralToSquare(x0, y0, x1, y1, x2, y2, x3, y3),
		sToQ = PerspectiveTransform.squareToQuadrilateral(x0p, y0p, x1p, y1p, x2p, y2p, x3p, y3p);
	return sToQ.times(qToS);
};

PerspectiveTransform.prototype.transformPoints = function (points) {
	var max = points.length, i, x, y, denominator;
	for (i = 0; i < max; i += 2) {
		x = points[i];
		y = points[i + 1];
		denominator = this.a13 * x + this.a23 * y + this.a33;
		points[i] = (this.a11 * x + this.a21 * y + this.a31) / denominator;
		points[i + 1] = (this.a12 * x + this.a22 * y + this.a32) / denominator;
	}
};

//no support for the version with xValues, yValues

PerspectiveTransform.squareToQuadrilateral = function (
	x0, y0, x1, y1, x2, y2, x3, y3
) {
	var dx1, dx2, dx3, dy1, dy2, dy3, denominator, a13, a23;
	dx3 = x0 - x1 + x2 - x3;
	dy3 = y0 - y1 + y2 - y3;
	if (dx3 === 0 && dy3 === 0) {
		return new PerspectiveTransform(
			x1 - x0, x2 - x1, x0,
			y1 - y0, y2 - y1, y0,
			0, 0, 1
		);
	} else {
		dx1 = x1 - x2;
		dx2 = x3 - x2;
		dy1 = y1 - y2;
		dy2 = y3 - y2;
		denominator = dx1 * dy2 - dx2 * dy1;
		a13 = (dx3 * dy2 - dx2 * dy3) / denominator;
		a23 = (dx1 * dy3 - dx3 * dy1) / denominator;
		return new PerspectiveTransform(
			x1 - x0 + a13 * x1, x3 - x0 + a23 * x3, x0,
			y1 - y0 + a13 * y1, y3 - y0 + a23 * y3, y0,
			a13, a23, 1
		);
	}
};

PerspectiveTransform.quadrilateralToSquare = function (
	x0, y0, x1, y1, x2, y2, x3, y3
) {
	return PerspectiveTransform.squareToQuadrilateral(x0, y0, x1, y1, x2, y2, x3, y3).buildAdjoint();
};

PerspectiveTransform.prototype.buildAdjoint = function () {
	return new PerspectiveTransform(
		this.a22 * this.a33 - this.a23 * this.a32,
		this.a23 * this.a31 - this.a21 * this.a33,
		this.a21 * this.a32 - this.a22 * this.a31,
		this.a13 * this.a32 - this.a12 * this.a33,
		this.a11 * this.a33 - this.a13 * this.a31,
		this.a12 * this.a31 - this.a11 * this.a32,
		this.a12 * this.a23 - this.a13 * this.a22,
		this.a13 * this.a21 - this.a11 * this.a23,
		this.a11 * this.a22 - this.a12 * this.a21
	);
};

PerspectiveTransform.prototype.times = function (other) {
	return new PerspectiveTransform(
		this.a11 * other.a11 + this.a21 * other.a12 + this.a31 * other.a13,
		this.a11 * other.a21 + this.a21 * other.a22 + this.a31 * other.a23,
		this.a11 * other.a31 + this.a21 * other.a32 + this.a31 * other.a33,
		this.a12 * other.a11 + this.a22 * other.a12 + this.a32 * other.a13,
		this.a12 * other.a21 + this.a22 * other.a22 + this.a32 * other.a23,
		this.a12 * other.a31 + this.a22 * other.a32 + this.a32 * other.a33,
		this.a13 * other.a11 + this.a23 * other.a12 + this.a33 * other.a13,
		this.a13 * other.a21 + this.a23 * other.a22 + this.a33 * other.a23,
		this.a13 * other.a31 + this.a23 * other.a32 + this.a33 * other.a33
	);
};

//common/DefaultGridSampler.java, common/GridSampler.java
function DefaultGridSampler () {
}

DefaultGridSampler.prototype.sampleGrid = function (
	image, dimensionX, dimensionY,
	p1ToX, p1ToY, p2ToX, p2ToY, p3ToX, p3ToY, p4ToX, p4ToY,
	p1FromX, p1FromY, p2FromX, p2FromY, p3FromX, p3FromY, p4FromX, p4FromY
) {
	var transform, bits, points, y, max, iValue, x;
	transform = PerspectiveTransform.quadrilateralToQuadrilateral(
		p1ToX, p1ToY, p2ToX, p2ToY, p3ToX, p3ToY, p4ToX, p4ToY,
		p1FromX, p1FromY, p2FromX, p2FromY, p3FromX, p3FromY, p4FromX, p4FromY);
	if (dimensionX <= 0 || dimensionY <= 0) {
		throw new Error('NotFoundException');
	}
	bits = new BitMatrix(dimensionX, dimensionY);
	points = newArray(2 * dimensionX);
	for (y = 0; y < dimensionY; y++) {
		max = points.length;
		iValue = y + 0.5;
		for (x = 0; x < max; x += 2) {
			points[x] = x / 2 + 0.5;
			points[x + 1] = iValue;
		}
		transform.transformPoints(points);
		this.checkAndNudgePoints(image, points);
		try {
			for (x = 0; x < max; x += 2) {
				if (image.get(Math.floor(points[x]), Math.floor(points[x + 1]))) {
					bits.set(x / 2, y);
				}
			}
		} catch (e) {
			throw new Error('NotFoundException');
		}
	}
	return bits;
};

DefaultGridSampler.prototype.checkAndNudgePoints = function (image, points) {
	var width, height, nudged, offset, x, y;
	width = image.getWidth();
	height = image.getHeight();
	nudged = true;
	for (offset = 0; offset < points.length && nudged; offset += 2) {
		x = Math.floor(points[offset]);
		y = Math.floor(points[offset + 1]);
		if (x < -1 || x > width || y < -1 || y > height) {
			throw new Error('NotFoundException');
		}
		nudged = false;
		if (x === -1) {
			points[offset] = 0;
			nudged = true;
		} else if (x === width) {
			points[offset] = width - 1;
			nudged = true;
		}
		if (y === -1) {
			points[offset + 1] = 0;
			nudged = true;
		} else if (y === height) {
			points[offset + 1] = height - 1;
			nudged = true;
		}
	}
	nudged = true;
	for (offset = points.length - 2; offset >= 0 && nudged; offset -= 2) {
		x = Math.floor(points[offset]);
		y = Math.floor(points[offset + 1]);
		if (x < -1 || x > width || y < -1 || y > height) {
			throw new Error('NotFoundException');
		}
		nudged = false;
		if (x === -1) {
			points[offset] = 0;
			nudged = true;
		} else if (x === width) {
			points[offset] = width - 1;
			nudged = true;
		}
		if (y === -1) {
			points[offset + 1] = 0;
			nudged = true;
		} else if (y === height) {
			points[offset + 1] = height - 1;
			nudged = true;
		}
	}
};

//common/detector/WhiteRectangleDetector.java
function WhiteRectangleDetector (image) {
	this.init(image, WhiteRectangleDetector.INIT_SIZE, image.getWidth() / 2, image.getHeight() / 2);
}

WhiteRectangleDetector.INIT_SIZE = 10;
WhiteRectangleDetector.CORR = 1;

WhiteRectangleDetector.prototype.init = function (image, initSize, x, y) {
	var halfsize;
	this.image = image;
	this.height = image.getHeight();
	this.width = image.getWidth();
	halfsize = initSize / 2;
	this.leftInit = x - halfsize;
	this.rightInit = x + halfsize;
	this.upInit = y - halfsize;
	this.downInit = y + halfsize;
	if (this.upInit < 0 || this.leftInit < 0 || this.downInit >= this.height || this.rightInit >= this.width) {
		throw new Error('NotFoundException');
	}
};

WhiteRectangleDetector.prototype.detect = function () {
	var left, right, up, down, sizeExceeded,
		aBlackPointFoundOnBorder, atLeastOneBlackPointFoundOnBorder,
		atLeastOneBlackPointFoundOnRight, atLeastOneBlackPointFoundOnBottom,
		atLeastOneBlackPointFoundOnLeft, atLeastOneBlackPointFoundOnTop,
		rightBorderNotWhite, bottomBorderNotWhite, leftBorderNotWhite, topBorderNotWhite,
		maxSize, z, i, t, x, y;
	left = this.leftInit;
	right = this.rightInit;
	up = this.upInit;
	down = this.downInit;
	sizeExceeded = false;
	aBlackPointFoundOnBorder = true;
	atLeastOneBlackPointFoundOnBorder = false;
	atLeastOneBlackPointFoundOnRight = false;
	atLeastOneBlackPointFoundOnBottom = false;
	atLeastOneBlackPointFoundOnLeft = false;
	atLeastOneBlackPointFoundOnTop = false;
	while (aBlackPointFoundOnBorder) {
		aBlackPointFoundOnBorder = false;
		rightBorderNotWhite = true;
		while ((rightBorderNotWhite || !atLeastOneBlackPointFoundOnRight) && right < this.width) {
			rightBorderNotWhite = this.containsBlackPoint(up, down, right, false);
			if (rightBorderNotWhite) {
				right++;
				aBlackPointFoundOnBorder = true;
				atLeastOneBlackPointFoundOnRight = true;
			} else if (!atLeastOneBlackPointFoundOnRight) {
				right++;
			}
		}
		if (right >= this.width) {
			sizeExceeded = true;
			break;
		}
		bottomBorderNotWhite = true;
		while ((bottomBorderNotWhite || !atLeastOneBlackPointFoundOnBottom) && down < this.height) {
			bottomBorderNotWhite = this.containsBlackPoint(left, right, down, true);
			if (bottomBorderNotWhite) {
				down++;
				aBlackPointFoundOnBorder = true;
				atLeastOneBlackPointFoundOnBottom = true;
			} else if (!atLeastOneBlackPointFoundOnBottom) {
				down++;
			}
		}
		if (down >= this.height) {
			sizeExceeded = true;
			break;
		}
		leftBorderNotWhite = true;
		while ((leftBorderNotWhite || !atLeastOneBlackPointFoundOnLeft) && left >= 0) {
			leftBorderNotWhite = this.containsBlackPoint(up, down, left, false);
			if (leftBorderNotWhite) {
				left--;
				aBlackPointFoundOnBorder = true;
				atLeastOneBlackPointFoundOnLeft = true;
			} else if (!atLeastOneBlackPointFoundOnLeft) {
				left--;
			}
		}
		if (left < 0) {
			sizeExceeded = true;
			break;
		}
		topBorderNotWhite = true;
		while ((topBorderNotWhite || !atLeastOneBlackPointFoundOnTop) && up >= 0) {
			topBorderNotWhite = this.containsBlackPoint(left, right, up, true);
			if (topBorderNotWhite) {
				up--;
				aBlackPointFoundOnBorder = true;
				atLeastOneBlackPointFoundOnTop = true;
			} else if (!atLeastOneBlackPointFoundOnTop) {
				up--;
			}
		}
		if (up < 0) {
			sizeExceeded = true;
			break;
		}
		if (aBlackPointFoundOnBorder) {
			atLeastOneBlackPointFoundOnBorder = true;
		}
	}
	if (!sizeExceeded && atLeastOneBlackPointFoundOnBorder) {
		maxSize = right - left;
		for (i = 1; !z && i < maxSize; i++) {
			z = this.getBlackPointOnSegment(left, down - i, left + i, down);
		}
		if (!z) {
			throw new Error('NotFoundException');
		}
		for (i = 1; !t && i < maxSize; i++) {
			t = this.getBlackPointOnSegment(left, up + i, left + i, up);
		}
		if (!t) {
			throw new Error('NotFoundException');
		}
		for (i = 1; !x && i < maxSize; i++) {
			x = this.getBlackPointOnSegment(right, up + i, right - i, up);
		}
		if (!x) {
			throw new Error('NotFoundException');
		}
		for (i = 1; !y && i < maxSize; i++) {
			y = this.getBlackPointOnSegment(right, down - i, right - i, down);
		}
		if (!y) {
			throw new Error('NotFoundException');
		}
		return this.centerEdges(y, z, x, t);
	} else {
		throw new Error('NotFoundException');
	}
};

WhiteRectangleDetector.prototype.getBlackPointOnSegment = function (aX, aY, bX, bY) {
	var dist, xStep, yStep, i, x, y;
	dist = Math.round(distance(aX, aY, bX, bY));
	xStep = (bX - aX) / dist;
	yStep = (bY - aY) / dist;
	for (i = 0; i < dist; i++) {
		x = Math.round(aX + i * xStep);
		y = Math.round(aY + i * yStep);
		if (this.image.get(x, y)) {
			return new ResultPoint(x, y);
		}
	}
};

WhiteRectangleDetector.prototype.centerEdges = function (y, z, x, t) {
	var yi = y.getX(), yj = y.getY(),
		zi = z.getX(), zj = z.getY(),
		xi = x.getX(), xj = x.getY(),
		ti = t.getX(), tj = t.getY();
	if (yi < this.width / 2) {
		return [
			new ResultPoint(ti - WhiteRectangleDetector.CORR, tj + WhiteRectangleDetector.CORR),
			new ResultPoint(zi + WhiteRectangleDetector.CORR, zj + WhiteRectangleDetector.CORR),
			new ResultPoint(xi - WhiteRectangleDetector.CORR, xj - WhiteRectangleDetector.CORR),
			new ResultPoint(yi + WhiteRectangleDetector.CORR, yj - WhiteRectangleDetector.CORR)
		];
	} else {
		return [
			new ResultPoint(ti + WhiteRectangleDetector.CORR, tj + WhiteRectangleDetector.CORR),
			new ResultPoint(zi + WhiteRectangleDetector.CORR, zj - WhiteRectangleDetector.CORR),
			new ResultPoint(xi - WhiteRectangleDetector.CORR, xj + WhiteRectangleDetector.CORR),
			new ResultPoint(yi - WhiteRectangleDetector.CORR, yj - WhiteRectangleDetector.CORR)
		];
	}
};

WhiteRectangleDetector.prototype.containsBlackPoint = function (a, b, fixed, horizontal) {
	var x, y;
	if (horizontal) {
		for (x = a; x <= b; x++) {
			if (this.image.get(x, fixed)) {
				return true;
			}
		}
	} else {
		for (y = a; y <= b; y++) {
			if (this.image.get(fixed, y)) {
				return true;
			}
		}
	}
	return false;
};

//common/reedsolomon/GenericGF.java (only partial)
function GenericGF (primitive, size, b) {
	var x, i;
	this.primitive = primitive;
	this.size = size;
	this.generatorBase = b;
	this.expTable = newArray(size);
	this.logTable = newArray(size);
	x = 1;
	for (i = 0; i < size; i++) {
		this.expTable[i] = x;
		x *= 2;
		if (x >= size) {
			x ^= primitive;
			x &= size - 1;
		}
	}
	for (i = 0; i < size - 1; i++) {
		this.logTable[this.expTable[i]] = i;
	}
	this.zero = new GenericGFPoly(this, [0]);
	this.one = new GenericGFPoly(this, [1]);
}

GenericGF.DATA_MATRIX_FIELD_256 = new GenericGF(0x012D, 256, 1);

GenericGF.prototype.getZero = function () {
	return this.zero;
};

GenericGF.prototype.getOne = function () {
	return this.one;
};

GenericGF.prototype.buildMonomial = function (degree, coefficient) {
	var coefficients;
	if (degree < 0) {
		throw new Error('IllegalArgumentException');
	}
	if (coefficient === 0) {
		return this.zero;
	}
	coefficients = newArray(degree + 1, 0);
	coefficients[0] = coefficient;
	return new GenericGFPoly(this, coefficients);
};

GenericGF.addOrSubtract = function (a, b) {
	return a ^ b;
};

GenericGF.prototype.exp = function (a) {
	return this.expTable[a];
};

GenericGF.prototype.log = function (a) {
	if (a === 0) {
		throw new Error('IllegalArgumentException');
	}
	return this.logTable[a];
};

GenericGF.prototype.inverse = function (a) {
	if (a === 0) {
		throw new Error('IllegalArgumentException');
	}
	return this.expTable[this.size - this.logTable[a] - 1];
};

GenericGF.prototype.multiply = function (a, b) {
	if (a === 0 || b === 0) {
		return 0;
	}
	return this.expTable[(this.logTable[a] + this.logTable[b]) % (this.size - 1)];
};

GenericGF.prototype.getSize = function () {
	return this.size;
};

GenericGF.prototype.getGeneratorBase = function () {
	return this.generatorBase;
};

GenericGF.prototype.toString = function () {
	return 'GF(0x' + this.primitive.toString(16) + ',' + this.size + ')';
};

//common/reedsolomon/GenericGFPoly.java
function GenericGFPoly (field, coefficients) {
	var coefficientsLength, firstNonZero, i;
	if (coefficients.length === 0) {
		throw new Error('IllegalArgumentException');
	}
	this.field = field;
	coefficientsLength = coefficients.length;
	if (coefficientsLength > 1 && coefficients[0] === 0) {
		firstNonZero = 1;
		while (firstNonZero < coefficientsLength && coefficients[firstNonZero] === 0) {
			firstNonZero++;
		}
		if (firstNonZero === coefficientsLength) {
			this.coefficients = [0];
		} else {
			this.coefficients = newArray(coefficientsLength - firstNonZero, 0);
			for (i = 0; i < this.coefficients.length; i++) {
				this.coefficients[i] = coefficients[firstNonZero + i];
			}
		}
	} else {
		this.coefficients = coefficients;
	}
}

GenericGFPoly.prototype.getCoefficients = function () {
	return this.coefficients;
};

GenericGFPoly.prototype.getDegree = function () {
	return this.coefficients.length - 1;
};

GenericGFPoly.prototype.isZero = function () {
	return this.coefficients[0] === 0;
};

GenericGFPoly.prototype.getCoefficient = function (degree) {
	return this.coefficients[this.coefficients.length - 1 - degree];
};

GenericGFPoly.prototype.evaluateAt = function (a) {
	var result, coefficient, i, size;
	if (a === 0) {
		return this.getCoefficient(0);
	}
	if (a === 1) {
		result = 0;
		for (i = 0; i < this.coefficients.length; i++) {
			coefficient = this.coefficients[i];
			result = GenericGF.addOrSubtract(result, coefficient);
		}
		return result;
	}
	result = this.coefficients[0];
	size = this.coefficients.length;
	for (i = 0; i < size; i++) {
		result = GenericGF.addOrSubtract(this.field.multiply(a, result), this.coefficients[i]);
	}
	return result;
};

GenericGFPoly.prototype.addOrSubtract = function (other) {
	var smallerCoefficients, largerCoefficients, temp, sumDiff, lengthDiff, i;
	if (this.field !== other.field) {
		throw new Error('GenericGFPolys do not have same GenericGF field');
	}
	if (this.isZero()) {
		return other;
	}
	if (other.isZero()) {
		return this;
	}
	smallerCoefficients = this.coefficients;
	largerCoefficients = other.coefficients;
	if (smallerCoefficients.length > largerCoefficients.length) {
		temp = smallerCoefficients;
		smallerCoefficients = largerCoefficients;
		largerCoefficients = temp;
	}
	sumDiff = newArray(largerCoefficients.length);
	lengthDiff = largerCoefficients.length - smallerCoefficients.length;
	for (i = 0; i < lengthDiff; i++) {
		sumDiff[i] = largerCoefficients[i];
	}
	for (i = lengthDiff; i < largerCoefficients.length; i++) {
		sumDiff[i] = GenericGF.addOrSubtract(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
	}
	return new GenericGFPoly(this.field, sumDiff);
};

GenericGFPoly.prototype.multiply = function (factor) {
	if (factor instanceof GenericGFPoly) {
		return this.multiplyGenericGFPoly(factor);
	} else {
		return this.multiplyInt(factor);
	}
};

GenericGFPoly.prototype.multiplyGenericGFPoly = function (other) {
	var aCoefficients, aLength, bCoefficients, bLength, product, i, aCoeff, j;
	if (this.field !== other.field) {
		throw new Error('GenericGFPolys do not have same GenericGF field');
	}
	if (this.isZero() || other.isZero()) {
		return this.field.getZero();
	}
	aCoefficients = this.coefficients;
	aLength = aCoefficients.length;
	bCoefficients = other.coefficients;
	bLength = bCoefficients.length;
	product = newArray(aLength + bLength - 1, 0);
	for (i = 0; i < aLength; i++) {
		aCoeff = aCoefficients[i];
		for (j = 0; j < bLength; j++) {
			product[i + j] = GenericGF.addOrSubtract(
				product[i + j],
				this.field.multiply(aCoeff, bCoefficients[j])
			);
		}
	}
	return new GenericGFPoly(this.field, product);
};

GenericGFPoly.prototype.multiplyInt = function (scalar) {
	var size, product, i;
	if (scalar === 0) {
		return this.field.getZero();
	}
	if (scalar === 1) {
		return this;
	}
	size = this.coefficients.length;
	product = newArray(size);
	for (i = 0; i < size; i++) {
		product[i] = this.field.multiply(this.coefficients[i], scalar);
	}
	return new GenericGFPoly(this.field, product);
};

GenericGFPoly.prototype.multiplyByMonomial = function (degree, coefficient) {
	var size, product, i;
	if (degree < 0) {
		throw new Error('IllegalArgumentException');
	}
	if (coefficient === 0) {
		return this.field.getZero();
	}
	size = this.coefficients.length;
	product = newArray(size + degree, 0);
	for (i = 0; i < size; i++) {
		product[i] = this.field.multiply(this.coefficients[i], coefficient);
	}
	return new GenericGFPoly(this.field, product);
};

GenericGFPoly.prototype.divide = function (other) {
	var quotient, remainder, denominatorLeadingTerm, inverseDenominatorLeadingTerm,
		degreeDifference, scale, term, iterationQuotient;
	if (this.field !== other.field) {
		throw new Error('GenericGFPolys do not have same GenericGF field');
	}
	if (other.isZero()) {
		throw new Error('Divide by 0');
	}
	quotient = this.field.getZero();
	remainder = this;
	denominatorLeadingTerm = other.getCoefficient(other.getDegree());
	inverseDenominatorLeadingTerm = this.field.inverse(denominatorLeadingTerm);
	while (remainder.getDegree() >= other.getDegree() && !remainder.isZero()) {
		degreeDifference = remainder.getDegree() - other.getDegree();
		scale = this.field.multiply(remainder.getCoefficient(remainder.getDegree()), inverseDenominatorLeadingTerm);
		term = other.multiplyByMonomial(degreeDifference, scale);
		iterationQuotient = this.field.buildMonomial(degreeDifference, scale);
		quotient = quotient.addOrSubtract(iterationQuotient);
		remainder = remainder.addOrSubtract(term);
	}
	return [quotient, remainder];
};

//common/reedsolomon/ReedSolomonDecoder.java
function ReedSolomonDecoder (field) {
	this.field = field;
}

ReedSolomonDecoder.prototype.decode = function (received, twoS) {
	var poly, syndromeCoefficients, noError, i, evaluated,
		syndrome, sigmaOmega, sigma, omega,
		errorLocations, errorMagnitudes, position;
	poly = new GenericGFPoly(this.field, received);
	syndromeCoefficients = newArray(twoS);
	noError = true;
	for (i = 0; i < twoS; i++) {
		evaluated = poly.evaluateAt(this.field.exp(i + this.field.getGeneratorBase()));
		syndromeCoefficients[syndromeCoefficients.length - 1 - i] = evaluated;
		if (evaluated !== 0) {
			noError = false;
		}
	}
	if (noError) {
		return;
	}
	syndrome = new GenericGFPoly(this.field, syndromeCoefficients);
	sigmaOmega = this.runEuclideanAlgorithm(
		this.field.buildMonomial(twoS, 1), syndrome, twoS);
	sigma = sigmaOmega[0];
	omega = sigmaOmega[1];
	errorLocations = this.findErrorLocations(sigma);
	errorMagnitudes = this.findErrorMagnitudes(omega, errorLocations);
	for (i = 0; i < errorLocations.length; i++) {
		position = received.length - 1 - this.field.log(errorLocations[i]);
		if (position < 0) {
			throw new Error('Bad error location');
		}
		received[position] = GenericGF.addOrSubtract(received[position], errorMagnitudes[i]);
	}
};

ReedSolomonDecoder.prototype.runEuclideanAlgorithm = function (a, b, R) {
	var temp, rLast, r, tLast, t, rLastLast, tLastLast, q,
		denominatorLeadingTerm, dltInverse, degreeDiff, scale,
		sigmaTildeAtZero, inverse, sigma, omega;
	if (a.getDegree() < b.getDegree()) {
		temp = a;
		a = b;
		b = temp;
	}
	rLast = a;
	r = b;
	tLast = this.field.getZero();
	t = this.field.getOne();
	while (r.getDegree() >= R / 2) {
		rLastLast = rLast;
		tLastLast = tLast;
		rLast = r;
		tLast = t;
		if (rLast.isZero()) {
			throw new Error('r_{i-1} was zero');
		}
		r = rLastLast;
		q = this.field.getZero();
		denominatorLeadingTerm = rLast.getCoefficient(rLast.getDegree());
		dltInverse = this.field.inverse(denominatorLeadingTerm);
		while (r.getDegree() >= rLast.getDegree() && !r.isZero()) {
			degreeDiff = r.getDegree() - rLast.getDegree();
			scale = this.field.multiply(r.getCoefficient(r.getDegree()), dltInverse);
			q = q.addOrSubtract(this.field.buildMonomial(degreeDiff, scale));
			r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale));
		}
		t = q.multiply(tLast).addOrSubtract(tLastLast);
		if (r.getDegree() >= rLast.getDegree()) {
			throw new Error('Division algorithm failed to reduce polynomial?');
		}
	}
	sigmaTildeAtZero = t.getCoefficient(0);
	if (sigmaTildeAtZero === 0) {
		throw new Error('sigmaTilde(0) was zero');
	}
	inverse = this.field.inverse(sigmaTildeAtZero);
	sigma = t.multiply(inverse);
	omega = r.multiply(inverse);
	return [sigma, omega];
};

ReedSolomonDecoder.prototype.findErrorLocations = function (errorLocator) {
	var numErrors, result, e, i;
	numErrors = errorLocator.getDegree();
	if (numErrors === 1) {
		return [errorLocator.getCoefficient(1)];
	}
	result = newArray(numErrors);
	e = 0;
	for (i = 1; i < this.field.getSize() && e < numErrors; i++) {
		if (errorLocator.evaluateAt(i) === 0) {
			result[e] = this.field.inverse(i);
			e++;
		}
	}
	if (e !== numErrors) {
		throw new Error('Error locator degree does not match number of roots');
	}
	return result;
};

ReedSolomonDecoder.prototype.findErrorMagnitudes = function (errorEvaluator, errorLocations) {
	var s, result, i, xiInverse, denominator, j;
	s = errorLocations.length;
	result = newArray(s);
	for (i = 0; i < s; i++) {
		xiInverse = this.field.inverse(errorLocations[i]);
		denominator = 1;
		for (j = 0; j < s; j++) {
			if (i !== j) {
				denominator = this.field.multiply(
					denominator,
					GenericGF.addOrSubtract(1, this.field.multiply(errorLocations[j], xiInverse))
				);
			}
		}
		result[i] = this.field.multiply(errorEvaluator.evaluateAt(xiInverse),
			this.field.inverse(denominator));
		if (this.field.getGeneratorBase() !== 0) {
			result[i] = this.field.multiply(result[i], xiInverse);
		}
	}
	return result;
};

//datamatrix/detector/Detector.java
function Detector (image) {
	this.image = image;
	this.rectangleDetector = new WhiteRectangleDetector(image);
}

Detector.prototype.detect = function () {
	var cornerPoints, pointA, pointB, pointC, pointD, transitions,
		lSideOne, lSideTwo, pointCount, pair, point, value, maybeTopLeft,
		bottomLeft, maybeBottomRight, corners, bottomRight, topLeft,
		topRight, dimensionTop, dimensionRight, bits, correctedTopRight,
		dimension, dimensionCorrected;

	cornerPoints = this.rectangleDetector.detect();
	pointA = cornerPoints[0];
	pointB = cornerPoints[1];
	pointC = cornerPoints[2];
	pointD = cornerPoints[3];
	transitions = [
		this.transitionsBetween(pointA, pointB),
		this.transitionsBetween(pointA, pointC),
		this.transitionsBetween(pointB, pointD),
		this.transitionsBetween(pointC, pointD)
	];
	transitions.sort(Detector.ResultPointsAndTransitions.comparator);
	lSideOne = transitions[0];
	lSideTwo = transitions[1];
	pointCount = new Map();
	this.increment(pointCount, lSideOne.getFrom());
	this.increment(pointCount, lSideOne.getTo());
	this.increment(pointCount, lSideTwo.getFrom());
	this.increment(pointCount, lSideTwo.getTo());
	for (pair of pointCount) {
		point = pair[0];
		value = pair[1];
		if (value === 2) {
			bottomLeft = point;
		} else {
			if (!maybeTopLeft) {
				maybeTopLeft = point;
			} else {
				maybeBottomRight = point;
			}
		}
	}
	if (!maybeTopLeft || !bottomLeft || !maybeBottomRight) {
		throw new Error('NotFoundException');
	}
	corners = [maybeTopLeft, bottomLeft, maybeBottomRight];
	ResultPoint.orderBestPatterns(corners);
	bottomRight = corners[0];
	bottomLeft = corners[1];
	topLeft = corners[2];
	if (!pointCount.has(pointA)) {
		topRight = pointA;
	} else if (!pointCount.has(pointB)) {
		topRight = pointB;
	} else if (!pointCount.has(pointC)) {
		topRight = pointC;
	} else {
		topRight = pointD;
	}
	dimensionTop = this.transitionsBetween(topLeft, topRight).getTransitions();
	dimensionRight = this.transitionsBetween(bottomRight, topRight).getTransitions();
	if (dimensionTop % 2 === 1) {
		dimensionTop++;
	}
	dimensionTop += 2;
	if (dimensionRight % 2 === 1) {
		dimensionRight++;
	}
	dimensionRight += 2;
	if (4 * dimensionTop >= 7 * dimensionRight || 4 * dimensionRight >= 7 * dimensionTop) {
		correctedTopRight = this.correctTopRightRectangular(
			bottomLeft, bottomRight,
			topLeft, topRight,
			dimensionTop, dimensionRight
		);
		if (!correctedTopRight) {
			correctedTopRight = topRight;
		}
		dimensionTop = this.transitionsBetween(topLeft, correctedTopRight).getTransitions();
		dimensionRight = this.transitionsBetween(bottomRight, correctedTopRight).getTransitions();
		if (dimensionTop % 2 === 1) {
			dimensionTop++;
		}
		if (dimensionRight % 2 === 1) {
			dimensionRight++;
		}
		bits = this.sampleGrid(this.image, topLeft, bottomLeft, bottomRight, correctedTopRight, dimensionTop, dimensionRight);
	} else {
		dimension = Math.min(dimensionRight, dimensionTop);
		correctedTopRight = this.correctTopRight(bottomLeft, bottomRight, topLeft, topRight, dimension);
		if (!correctedTopRight) {
			correctedTopRight = topRight;
		}
		dimensionCorrected = Math.max(
			this.transitionsBetween(topLeft, correctedTopRight).getTransitions(),
			this.transitionsBetween(bottomRight, correctedTopRight).getTransitions()
		);
		dimensionCorrected++;
		if (dimensionCorrected % 2 === 1) {
			dimensionCorrected++;
		}
		bits = this.sampleGrid(
			this.image,
			topLeft, bottomLeft, bottomRight, correctedTopRight,
			dimensionCorrected, dimensionCorrected
		);
	}
	//return new DetectorResult(bits, [topLeft, bottomLeft, bottomRight, correctedTopRight]);
	return bits; //we care only for the bits, not for the position
};

Detector.correctTopRightRectangular = function (bottomLeft, bottomRight, topLeft, topRight, dimensionTop, dimensionRight) {
	var corr, norm, cos, sin, c1, c2, l1, l2;
	corr = this.distance(bottomLeft, bottomRight) / dimensionTop;
	norm = this.distance(topLeft, topRight);
	cos = (topRight.getX() - topLeft.getX()) / norm;
	sin = (topRight.getY() - topLeft.getY()) / norm;
	c1 = new ResultPoint(topRight.getX() + corr * cos, topRight.getY() + corr * sin);
	corr = this.distance(bottomLeft, topLeft) / dimensionRight;
	norm = this.distance(bottomRight, topRight);
	cos = (topRight.getX() - bottomRight.getX()) / norm;
	sin = (topRight.getY() - bottomRight.getY()) / norm;
	c2 = new ResultPoint(topRight.getX() + corr * cos, topRight.getY() + corr * sin);
	if (!this.isValid(c1)) {
		if (this.isValid(c2)) {
			return c2;
		}
		return;
	}
	if (!this.isValid(c2)) {
		return c1;
	}
	l1 = Math.abs(dimensionTop - this.transitionsBetween(topLeft, c1).getTransitions()) +
		Math.abs(dimensionRight - this.transitionsBetween(bottomRight, c1).getTransitions());
	l2 = Math.abs(dimensionTop - this.transitionsBetween(topLeft, c2).getTransitions()) +
		Math.abs(dimensionRight - this.transitionsBetween(bottomRight, c2).getTransitions());
	if (l1 <= l2) {
		return c1;
	}
	return c2;
};

Detector.prototype.correctTopRight = function (bottomLeft, bottomRight, topLeft, topRight, dimension) {
	var corr, norm, cos, sin, c1, c2, l1, l2;
	corr = this.distance(bottomLeft, bottomRight) / dimension;
	norm = this.distance(topLeft, topRight);
	cos = (topRight.getX() - topLeft.getX()) / norm;
	sin = (topRight.getY() - topLeft.getY()) / norm;
	c1 = new ResultPoint(topRight.getX() + corr * cos, topRight.getY() + corr * sin);
	corr = this.distance(bottomLeft, topLeft) / dimension;
	norm = this.distance(bottomRight, topRight);
	cos = (topRight.getX() - bottomRight.getX()) / norm;
	sin = (topRight.getY() - bottomRight.getY()) / norm;
	c2 = new ResultPoint(topRight.getX() + corr * cos, topRight.getY() + corr * sin);
	if (!this.isValid(c1)) {
		if (this.isValid(c2)) {
			return c2;
		}
		return;
	}
	if (!this.isValid(c2)) {
		return c1;
	}
	l1 = Math.abs(this.transitionsBetween(topLeft, c1).getTransitions()) -
		Math.abs(this.transitionsBetween(bottomRight, c1).getTransitions());
	l2 = Math.abs(this.transitionsBetween(topLeft, c2).getTransitions()) -
		Math.abs(this.transitionsBetween(bottomRight, c2).getTransitions());
	return (l1 <= l2) ? c1 : c2;
};

Detector.prototype.isValid = function (p) {
	return p.getX() >= 0 && p.getY() < this.image.getWidth() && p.getY() > 0 && p.getY() < this.image.getHeight();
};

Detector.prototype.distance = function (a, b) {
	return Math.round(ResultPoint.distance(a, b));
};

Detector.prototype.increment = function (table, key) {
	var value = table.get(key);
	table.set(key, value ? 1 : value + 1);
};

Detector.prototype.sampleGrid = function (image, topLeft, bottomLeft, bottomRight, topRight, dimensionX, dimensionY) {
	var sampler = new DefaultGridSampler(); //we only have the default, so no .getInstance()
	return sampler.sampleGrid(
		image,
		dimensionX, dimensionY, 0.5, 0.5, dimensionX - 0.5,
		0.5, dimensionX - 0.5, dimensionY - 0.5, 0.5, dimensionY - 0.5,
		topLeft.getX(), topLeft.getY(), topRight.getX(), topRight.getY(),
		bottomRight.getX(), bottomRight.getY(), bottomLeft.getX(), bottomLeft.getY()
	);
};

Detector.prototype.transitionsBetween = function (from, to) {
	var fromX, fromY, toX, toY, steep, temp, dx, dy, error, ystep, xstep, transitions, inBlack, x, y, isBlack;
	fromX = from.getX();
	fromY = from.getY();
	toX = to.getX();
	toY = to.getY();
	steep = Math.abs(toY - fromX) > Math.abs(toX - fromX);
	if (steep) {
		temp = fromX;
		fromX = fromY;
		fromY = temp;
		temp = toX;
		toX = toY;
		toY = temp;
	}
	dx = Math.abs(toX - fromX);
	dy = Math.abs(toY - fromY);
	error = -dx / 2;
	ystep = fromY < toY ? 1 : -1;
	xstep = fromX < toX ? 1 : -1;
	transitions = 0;
	inBlack = this.image.get(steep ? fromY : fromX, steep ? fromX : fromY);
	for (x = fromX, y = fromY; x !== toX; x += xstep) {
		isBlack = this.image.get(steep ? y : x, steep ? x : y);
		if (isBlack !== inBlack) {
			transitions++;
			inBlack = isBlack;
		}
		error += dy;
		if (error > 0) {
			if (y === toY) {
				break;
			}
			y += ystep;
			error -= dx;
		}
	}
	return new Detector.ResultPointsAndTransitions(from, to, transitions);
};

Detector.ResultPointsAndTransitions = function (from, to, transitions) {
	this.from = from;
	this.to = to;
	this.transitions = transitions;
};

Detector.ResultPointsAndTransitions.prototype.getFrom = function () {
	return this.from;
};

Detector.ResultPointsAndTransitions.prototype.getTo = function () {
	return this.to;
};

Detector.ResultPointsAndTransitions.prototype.getTransitions = function () {
	return this.transitions;
};

Detector.ResultPointsAndTransitions.prototype.toString = function () {
	return this.from + '/' + this.to + '/' + this.transitions;
};

Detector.ResultPointsAndTransitions.comparator = function (o1, o2) {
	return o1.getTransitions() - o2.getTransitions();
};

//datamatrix/decoder/BitMatrixParser.java
function BitMatrixParser (bitMatrix) {
	var dimension = bitMatrix.getHeight();
	if (dimension < 8 || dimension > 144 || dimension % 2 !== 0) {
		throw new Error('FormatException');
	}
	this.version = this.readVersion(bitMatrix);
	this.mappingBitMatrix = this.extractDataRegion(bitMatrix);
	this.readMappingMatrix = new BitMatrix(this.mappingBitMatrix.getWidth(), this.mappingBitMatrix.getHeight());
}

BitMatrixParser.prototype.getVersion = function () {
	return this.version;
};

BitMatrixParser.prototype.readVersion = function (bitMatrix) {
	var numRows = bitMatrix.getHeight(), numColumns = bitMatrix.getWidth();
	return Version.getVersionForDimension(numRows, numColumns);
};

BitMatrixParser.prototype.readCodewords = function () {
	var result, resultOffset, row, column, numRows, numColumns,
		corner1Read, corner2Read, corner3Read, corner4Read;
	result = newArray(this.version.getTotalCodewords());
	resultOffset = 0;
	row = 4;
	column = 0;
	numRows = this.mappingBitMatrix.getHeight();
	numColumns = this.mappingBitMatrix.getWidth();
	corner1Read = false;
	corner2Read = false;
	corner3Read = false;
	corner4Read = false;
	do {
		if ((row === numRows) && (column === 0) && !corner1Read) {
			result[resultOffset++] = this.readCorner1(numRows, numColumns);
			row -= 2;
			column += 2;
			corner1Read = true;
		} else if ((row === numRows - 2) && (column === 0) && ((numColumns & 0x03) !== 0) && !corner2Read) {
			result[resultOffset++] = this.readCorner2(numRows, numColumns);
			row -= 2;
			column += 2;
			corner2Read = true;
		} else if ((row === numRows + 4) && (column === 2) && ((numColumns & 0x07) === 0) && !corner3Read) {
			result[resultOffset++] = this.readCorner3(numRows, numColumns);
			row -= 2;
			column += 2;
			corner3Read = true;
		} else if ((row === numRows - 2) && (column === 0) && ((numColumns & 0x07) === 4) && !corner4Read) {
			result[resultOffset++] = this.readCorner4(numRows, numColumns);
			row -= 2;
			column += 2;
			corner4Read = true;
		} else {
			do {
				if ((row < numRows) && (column >= 0) && !this.readMappingMatrix.get(column, row)) {
					result[resultOffset++] = this.readUtah(row, column, numRows, numColumns);
				}
				row -= 2;
				column += 2;
			} while ((row >= 0) && (column < numColumns));
			row += 1;
			column += 3;
			do {
				if ((row >= 0) && (column < numColumns) && !this.readMappingMatrix.get(column, row)) {
					result[resultOffset++] = this.readUtah(row, column, numRows, numColumns);
				}
				row += 2;
				column -= 2;
			} while ((row < numRows) && (column >= 0));
			row += 3;
			column += 1;
		}
	} while ((row < numRows) || (column < numColumns));
	if (resultOffset !== this.version.getTotalCodewords()) {
		throw new Error('FormatException');
	}
	return result;
};

BitMatrixParser.prototype.readModule = function (row, column, numRows, numColumns) {
	if (row < 0) {
		row += numRows;
		column += 4 - ((numRows + 4) & 0x07);
	}
	if (column < 0) {
		column += numColumns;
		row += 4 - ((numColumns + 4) & 0x07);
	}
	this.readMappingMatrix.set(column, row);
	return this.mappingBitMatrix.get(column, row);
};

BitMatrixParser.prototype.readUtah = function (row, column, numRows, numColumns) {
	var currentByte = 0;
	if (this.readModule(row - 2, column - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row - 2, column - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row - 1, column - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row - 1, column - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row - 1, column, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row, column - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row, column - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(row, column, numRows, numColumns)) {
		currentByte |= 1;
	}
	return currentByte;
};

BitMatrixParser.prototype.readCorner1 = function (numRows, numColumns) {
	var currentByte = 0;
	if (this.readModule(numRows - 1, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 1, 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 1, 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(2, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(3, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	return currentByte;
};

BitMatrixParser.prototype.readCorner2 = function (numRows, numColumns) {
	var currentByte = 0;
	if (this.readModule(numRows - 3, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 2, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 1, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 4, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 3, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	return currentByte;
};

BitMatrixParser.prototype.readCorner3 = function (numRows, numColumns) {
	var currentByte = 0;
	if (this.readModule(numRows - 1, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 1, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 3, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 3, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	return currentByte;
};

BitMatrixParser.prototype.readCorner4 = function (numRows, numColumns) {
	var currentByte = 0;
	if (this.readModule(numRows - 3, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 2, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(numRows - 1, 0, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 2, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(0, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(1, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(2, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	currentByte <<= 1;
	if (this.readModule(3, numColumns - 1, numRows, numColumns)) {
		currentByte |= 1;
	}
	return currentByte;
};

BitMatrixParser.prototype.extractDataRegion = function (bitMatrix) {
	var symbolSizeRows, symbolSizeColumns, dataRegionSizeRows, dataRegionSizeColumns,
		numDataRegionsRow, numDataRegionsColumn, sizeDataRegionRow, sizeDataRegionColumn,
		dataRegionRow, dataRegionRowOffset, dataRegionColumn, dataRegionColumnOffset,
		i, j, readRowOffset, writeRowOffset, readColumnOffset, writeColumnOffset,
		bitMatrixWithoutAlignment;
	symbolSizeRows = this.version.getSymbolSizeRows();
	symbolSizeColumns = this.version.getSymbolSizeColumns();

	if (bitMatrix.getHeight() !== symbolSizeRows) {
		throw new Error('Dimension of bitMatrix must match the version size');
	}

	dataRegionSizeRows = this.version.getDataRegionSizeRows();
	dataRegionSizeColumns = this.version.getDataRegionSizeColumns();

	numDataRegionsRow = symbolSizeRows / dataRegionSizeRows;
	numDataRegionsColumn = symbolSizeColumns / dataRegionSizeColumns;

	sizeDataRegionRow = numDataRegionsRow * dataRegionSizeRows;
	sizeDataRegionColumn = numDataRegionsColumn * dataRegionSizeColumns;

	bitMatrixWithoutAlignment = new BitMatrix(sizeDataRegionColumn, sizeDataRegionRow);
	for (dataRegionRow = 0; dataRegionRow < numDataRegionsRow; ++dataRegionRow) {
		dataRegionRowOffset = dataRegionRow * dataRegionSizeRows;
		for (dataRegionColumn = 0; dataRegionColumn < numDataRegionsColumn; ++dataRegionColumn) {
			dataRegionColumnOffset = dataRegionColumn * dataRegionSizeColumns;
			for (i = 0; i < dataRegionSizeRows; ++i) {
				readRowOffset = dataRegionRow * (dataRegionSizeRows + 2) + 1 + i;
				writeRowOffset = dataRegionRowOffset + i;
				for (j = 0; j < dataRegionSizeColumns; ++j) {
					readColumnOffset = dataRegionColumn * (dataRegionSizeColumns + 2) + 1 + j;
					if (bitMatrix.get(readColumnOffset, readRowOffset)) {
						writeColumnOffset = dataRegionColumnOffset + j;
						bitMatrixWithoutAlignment.set(writeColumnOffset, writeRowOffset);
					}
				}
			}
		}
	}
	return bitMatrixWithoutAlignment;
};

//datamatrix/decoder/DataBlock.java
function DataBlock (numDataCodewords, codewords) {
	this.numDataCodewords = numDataCodewords;
	this.codewords = codewords;
}

DataBlock.getDataBlocks = function (rawCodewords, version) {
	var ecBlocks, totalBlocks, ecBlockArray, i, j, ecBlock, result,
		numResultBlocks, numDataCodewords, numBlockCodewords,
		longerBlocksTotalCodewords, longerBlocksNumDataCodewords,
		shorterBlocksNumDataCodewords, rawCodewordsOffset,
		specialVersion, numLongerBlocks, max, jOffset, iOffset;
	ecBlocks = version.getECBlocks();
	totalBlocks = 0;
	ecBlockArray = ecBlocks.getECBlocks();
	for (j = 0; j < ecBlockArray.length; j++) {
		ecBlock = ecBlockArray[j];
		totalBlocks += ecBlock.getCount();
	}
	result = newArray(totalBlocks);
	numResultBlocks = 0;
	for (j = 0; j < ecBlockArray.length; j++) {
		ecBlock = ecBlockArray[j];
		for (i = 0; i < ecBlock.getCount(); i++) {
			numDataCodewords = ecBlock.getDataCodewords();
			numBlockCodewords = ecBlocks.getECCodewords() + numDataCodewords;
			result[numResultBlocks++] = new DataBlock(numDataCodewords, newArray(numBlockCodewords, 0));
		}
	}
	longerBlocksTotalCodewords = result[0].codewords.length;
	longerBlocksNumDataCodewords = longerBlocksTotalCodewords - ecBlocks.getECCodewords();
	shorterBlocksNumDataCodewords = longerBlocksNumDataCodewords - 1;
	rawCodewordsOffset = 0;
	for (i = 0; i < shorterBlocksNumDataCodewords; i++) {
		for (j = 0; j < numResultBlocks; j++) {
			result[j].codewords[i] = rawCodewords[rawCodewordsOffset++];
		}
	}
	specialVersion = this.version.getVersionNumber() === 24;
	numLongerBlocks = specialVersion ? 8 : numResultBlocks;
	for (j = 0; j < numLongerBlocks; j++) {
		result[j].codewords[longerBlocksNumDataCodewords - 1] = rawCodewords[rawCodewordsOffset++];
	}
	max = result[0].codewords.length;
	for (i = longerBlocksNumDataCodewords; i < max; i++) {
		for (j = 0; j < numResultBlocks; j++) {
			jOffset = specialVersion ? (j + 8) % numResultBlocks : j;
			iOffset = specialVersion && jOffset > 7 ? i - 1 : i;
			result[jOffset].codewords[iOffset] = rawCodewords[rawCodewordsOffset++];
		}
	}
	if (rawCodewordsOffset !== rawCodewords.length) {
		throw new Error('IllegalArgumentException');
	}
	return result;
};

DataBlock.prototype.getNumDataCodewords = function () {
	return this.numDataCodewords;
};

DataBlock.prototype.getCodewords = function () {
	return this.codewords;
};

//datamatrix/decoder/DecodedBitStreamParser.java
function DecodedBitStreamParser () {
}

DecodedBitStreamParser.PAD_ENCODE = 0;
DecodedBitStreamParser.ASCII_ENCODE = 1;
DecodedBitStreamParser.C40_ENCODE = 2;
DecodedBitStreamParser.TEXT_ENCODE = 3;
DecodedBitStreamParser.ANSIX12_ENCODE = 4;
DecodedBitStreamParser.EDIFACT_ENCODE = 5;
DecodedBitStreamParser.BASE256_ENCODE = 6;

DecodedBitStreamParser.C40_BASIC_SET_CHARS = [
	'*', '*', '*', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
	'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

DecodedBitStreamParser.C40_SHIFT2_SET_CHARS = [
	'!', '"', '#', '$', '%', '&', '\'', '(', ')', '*',  '+', ',', '-', '.',
	'/', ':', ';', '<', '=', '>', '?',  '@', '[', '\\', ']', '^', '_'
];

DecodedBitStreamParser.TEXT_BASIC_SET_CHARS = [
	'*', '*', '*', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
	'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

DecodedBitStreamParser.TEXT_SHIFT2_SET_CHARS = DecodedBitStreamParser.C40_SHIFT2_SET_CHARS;

DecodedBitStreamParser.TEXT_SHIFT3_SET_CHARS = [
	'`', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
	'O',  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '{', '|', '}', '~', '\u0127'
];

DecodedBitStreamParser.decode = function (bytes) {
	var bits, result, resultTrailer, mode;
	bits = new BitSource(bytes);
	result = [];
	resultTrailer = [];
	mode = DecodedBitStreamParser.ASCII_ENCODE;
	do {
		if (mode === DecodedBitStreamParser.ASCII_ENCODE) {
			mode = DecodedBitStreamParser.decodeAsciiSegment(bits, result, resultTrailer);
		} else {
			switch (mode) {
			case DecodedBitStreamParser.C40_ENCODE:
				DecodedBitStreamParser.decodeC40Segment(bits, result);
				break;
			case DecodedBitStreamParser.TEXT_ENCODE:
				DecodedBitStreamParser.decodeTextSegment(bits, result);
				break;
			case DecodedBitStreamParser.ANSIX12_ENCODE:
				DecodedBitStreamParser.decodeAnsiX12Segment(bits, result);
				break;
			case DecodedBitStreamParser.EDIFACT_ENCODE:
				DecodedBitStreamParser.decodeEdifactSegment(bits, result);
				break;
			case DecodedBitStreamParser.BASE256_ENCODE:
				DecodedBitStreamParser.decodeBase256Segment(bits, result); //byteSegments
				break;
			default:
				throw new Error('FormatException');
			}
			mode = DecodedBitStreamParser.ASCII_ENCODE;
		}
	} while (mode !== DecodedBitStreamParser.PAD_ENCODE && bits.available() > 0);
	if (resultTrailer.length > 0) {
		result = result.concat(resultTrailer);
	}
	//return new DecoderResult(bytes, result.join(''), byteSegments.isEmpty() ? null : byteSegments, null);
	return result.join(''); //we only care for the text
};

DecodedBitStreamParser.decodeAsciiSegment = function (bits, result, resultTrailer) {
	var upperShift, oneByte, value;
	upperShift = false;
	do {
		oneByte = bits.readBits(8);
		if (oneByte === 0) {
			throw new Error('FormatException');
		} else if (oneByte <= 128) {
			if (upperShift) {
				oneByte += 128;
			}
			result.push(String.fromCharCode(oneByte - 1));
			return DecodedBitStreamParser.ASCII_ENCODE;
		} else if (oneByte === 129) {
			return DecodedBitStreamParser.PAD_ENCODE;
		} else if (oneByte <= 229) {
			value = oneByte - 130;
			if (value < 10) {
				result.push('0');
			}
			result.push(value);
		} else {
			switch (oneByte) {
			case 230:
				return DecodedBitStreamParser.C40_ENCODE;
			case 231:
				return DecodedBitStreamParser.BASE256_ENCODE;
			case 232:
				result.push('\u001D');
				break;
			case 233:
			case 234:
				break;
			case 235:
				upperShift = true;
				break;
			case 236:
				result.push('[)>\u001E05\u001D');
				resultTrailer.unshift('\u001E\u0004');
				break;
			case 237:
				result.push('[)>\u001E06\u001D');
				resultTrailer.unshift('\u001E\u0004');
				break;
			case 238:
				return DecodedBitStreamParser.ANSIX12_ENCODE;
			case 239:
				return DecodedBitStreamParser.TEXT_ENCODE;
			case 240:
				return DecodedBitStreamParser.EDIFACT_ENCODE;
			case 241:
				break;
			default:
				if (oneByte >= 242 && (oneByte !== 254 || bits.available() !== 0)) {
					throw new Error('FormatException');
				}
				break;
			}
		}
	} while (bits.available() > 0);
	return DecodedBitStreamParser.ASCII_ENCODE;
};

DecodedBitStreamParser.decodeC40Segment = function (bits, result) {
	var upperShift, cValues, shift, firstByte, i, cValue, c40Char;
	upperShift = false;
	cValues = newArray(3, 0);
	shift = 0;
	do {
		if (bits.available() === 8) {
			return;
		}
		firstByte = bits.readBits(8);
		if (firstByte === 254) {
			return;
		}
		DecodedBitStreamParser.parseTwoBytes(firstByte, bits.readBits(8), cValues);
		for (i = 0; i < 3; i++) {
			cValue = cValues[i];
			switch (shift) {
			case 0:
				if (cValue < 3) {
					shift = cValue + 1;
				} else if (cValue < DecodedBitStreamParser.C40_BASIC_SET_CHARS.length) {
					c40Char = DecodedBitStreamParser.C40_BASIC_SET_CHARS[cValue];
					if (upperShift) {
						result.push(String.fromCharCode(c40Char.charCodeAt(0)));
						upperShift = false;
					} else {
						result.push(c40Char);
					}
				} else {
					throw new Error('FormatException');
				}
				break;
			case 1:
				if (upperShift) {
					result.push(String.fromCharCode(cValue + 128));
					upperShift = false;
				} else {
					result.push(String.fromCharCode(cValue));
				}
				shift = 0;
				break;
			case 2:
				if (cValue < DecodedBitStreamParser.C40_SHIFT2_SET_CHARS.length) {
					c40Char = DecodedBitStreamParser.C40_SHIFT2_SET_CHARS[cValue];
					if (upperShift) {
						result.push(String.fromCharCode(c40Char.charCodeAt(0)));
						upperShift = false;
					} else {
						result.push(c40Char);
					}
				} else {
					switch (cValue) {
					case 27:
						result.push('\u001D');
						break;
					case 30:
						upperShift = true;
						break;
					default:
						throw new Error('FormatException');
					}
				}
				shift = 0;
				break;
			case 3:
				if (upperShift) {
					result.push(String.fromCharCode(cValue + 224));
					upperShift = false;
				} else {
					result.push(String.fromCharCode(cValue + 96));
				}
				shift = 0;
				break;
			default:
				throw new Error('FormatException');
			}
		}
	} while (bits.available() > 0);
};

DecodedBitStreamParser.decodeTextSegment = function (bits, result) {
	var upperShift, cValues, shift, firstByte, i, cValue, textChar;
	upperShift = false;
	cValues = newArray(3, 0);
	shift = 0;
	do {
		if (bits.available() === 8) {
			return;
		}
		firstByte = bits.readBits(8);
		if (firstByte === 254) {
			return;
		}
		DecodedBitStreamParser.parseTwoBytes(firstByte, bits.readBits(8), cValues);
		for (i = 0; i < 3; i++) {
			cValue = cValues[i];
			switch (shift) {
			case 0:
				if (cValue < 3) {
					shift = cValue + 1;
				} else if (cValue < DecodedBitStreamParser.TEXT_BASIC_SET_CHARS.length) {
					textChar = DecodedBitStreamParser.TEXT_BASIC_SET_CHARS[cValue];
					if (upperShift) {
						result.push(String.fromCharCode(textChar.charCodeAt(0)));
						upperShift = false;
					} else {
						result.push(textChar);
					}
				} else {
					throw new Error('FormatException');
				}
				break;
			case 1:
				if (upperShift) {
					result.push(String.fromCharCode(cValue + 128));
					upperShift = false;
				} else {
					result.push(String.fromCharCode(cValue));
				}
				shift = 0;
				break;
			case 2:
				if (cValue < DecodedBitStreamParser.TEXT_SHIFT2_SET_CHARS.length) {
					textChar = DecodedBitStreamParser.TEXT_SHIFT2_SET_CHARS[cValue];
					if (upperShift) {
						result.push(String.fromCharCode(textChar.charCodeAt(0)));
						upperShift = false;
					} else {
						result.push(textChar);
					}
				} else {
					switch (cValue) {
					case 27:
						result.push('\u001D');
						break;
					case 30:
						upperShift = true;
						break;
					default:
						throw new Error('FormatException');
					}
				}
				shift = 0;
				break;
			case 3:
				if (cValue < DecodedBitStreamParser.TEXT_SHIFT3_SET_CHARS.length) {
					textChar = DecodedBitStreamParser.TEXT_SHIFT3_SET_CHARS[cValue];
					if (upperShift) {
						result.push(String.fromCharCode(textChar.charCodeAt(0)));
						upperShift = false;
					} else {
						result.push(textChar);
					}
					shift = 0;
				} else {
					throw new Error('FormatException');
				}
				break;
			default:
				throw new Error('FormatException');
			}
		}
	} while (bits.available() > 0);
};

DecodedBitStreamParser.decodeAnsiX12Segment = function (bits, result) {
	var cValues, firstByte, i, cValue;
	cValues = newArray(3, 0);
	do {
		if (bits.available() === 8) {
			return;
		}
		firstByte = bits.readBits(8);
		if (firstByte === 254) {
			return;
		}
		DecodedBitStreamParser.parseTwoBytes(firstByte, bits.readBits(8), cValues);
		for (i = 0; i < 3; i++) {
			cValue = cValues[i];
			switch (cValue) {
			case 0:
				result.push('\r');
				break;
			case 1:
				result.push('*');
				break;
			case 2:
				result.push('>');
				break;
			case 3:
				result.push(' ');
				break;
			default:
				if (cValue < 14) {
					result.push(String.fromCharCode(cValue + 44));
				} else if (cValue < 40) {
					result.push(String.fromCharCode(cValue + 51));
				} else {
					throw new Error('FormatException');
				}
				break;
			}
		}
	} while (bits.available() > 0);
};

DecodedBitStreamParser.parseTwoBytes = function (firstByte, secondByte, result) {
	var fullBitValue, temp;
	fullBitValue = (firstByte << 8) + secondByte - 1;
	temp = Math.floor(fullBitValue / 1600);
	result[0] = temp;
	fullBitValue -= temp * 1600;
	temp = Math.floor(fullBitValue / 40);
	result[1] = temp;
	result[2] = fullBitValue - temp * 40;
};

DecodedBitStreamParser.decodeEdifactSegment = function (bits, result) {
	var i, edifactValue, bitsLeft;
	do {
		if (bits.available() <= 16) {
			return;
		}
		for (i = 0; i < 4; i++) {
			edifactValue = bits.readBits(6);
			if (edifactValue === 0x1F) {
				bitsLeft = 8 - bits.getBitOffset();
				if (bitsLeft !== 8) {
					bits.readBits(bitsLeft);
				}
				return;
			}
			if ((edifactValue & 0x20) === 0) {
				edifactValue |= 0x40;
			}
			result.push(String.fromCharCode(edifactValue));
		}
	} while (bits.available() > 0);
};

DecodedBitStreamParser.decodeBase256Segment = function (bits, result) {
	var codewordPosition, d1, count, bytes, i;
	codewordPosition = 1 + bits.getByteOffset();
	d1 = DecodedBitStreamParser.unrandomize255State(bits.readBits(8), codewordPosition++);
	if (d1 === 0) {
		count = Math.floor(bits.available() / 8);
	} else if (d1 < 250) {
		count = d1;
	} else {
		count = 250 * (d1 - 249) + DecodedBitStreamParser.unrandomize255State(bits.readBits(8), codewordPosition++);
	}
	if (count < 0) {
		throw new Error('FormatException');
	}
	bytes = newArray(count);
	for (i = 0; i < count; i++) {
		if (bits.available() < 8) {
			throw new Error('FormatException');
		}
		bytes[i] = DecodedBitStreamParser.unrandomize255State(bits.readBits(8), codewordPosition++);
	}
	//byteSegments.add(bytes);
	try {
		result.push((new TextDecoder('iso8859-1')).decode(new Uint8Array(bytes)));
	} catch (e) {
		throw new Error('Platform does not support required encoding');
	}
};

DecodedBitStreamParser.unrandomize255State = function (randomizedBase256Codeword, base256CodewordPosition) {
	var pseudoRandomNumber = ((149 * base256CodewordPosition) % 255) + 1,
		tempVariable = randomizedBase256Codeword - pseudoRandomNumber;
	return tempVariable >= 0 ? tempVariable : tempVariable + 256;
};

//datamatrix/decoder/Version.java
function Version (
	versionNumber, symbolSizeRows, symbolSizeColumns, dataRegionSizeRows, dataRegionSizeColumns, ecBlocks
) {
	var total, ecCodewords, ecbArray, ecBlock, i;
	this.versionNumber = versionNumber;
	this.symbolSizeRows = symbolSizeRows;
	this.symbolSizeColumns = symbolSizeColumns;
	this.dataRegionSizeRows = dataRegionSizeRows;
	this.dataRegionSizeColumns = dataRegionSizeColumns;
	this.ecBlocks = ecBlocks;
	total = 0;
	ecCodewords = ecBlocks.getECCodewords();
	ecbArray = ecBlocks.getECBlocks();
	for (i = 0; i < ecbArray.length; i++) {
		ecBlock = ecbArray[i];
		total += ecBlock.getCount() * (ecBlock.getDataCodewords() + ecCodewords);
	}
	this.totalCodewords = total;
}

Version.prototype.getVersionNumber = function () {
	return this.versionNumber;
};

Version.prototype.getSymbolSizeRows = function () {
	return this.symbolSizeRows;
};

Version.prototype.getSymbolSizeColumns = function () {
	return this.symbolSizeColumns;
};

Version.prototype.getDataRegionSizeRows = function () {
	return this.dataRegionSizeRows;
};

Version.prototype.getDataRegionSizeColumns = function () {
	return this.dataRegionSizeColumns;
};

Version.prototype.getTotalCodewords = function () {
	return this.totalCodewords;
};

Version.prototype.getECBlocks = function () {
	return this.ecBlocks;
};

Version.getVersionForDimension = function (numRows, numColumns) {
	var i, version;
	if (numRows % 2 !== 0 || numColumns % 2 !== 0) {
		throw new Error('FormatException');
	}
	for (i = 0; i < Version.VERSIONS.length; i++) {
		version = Version.VERSIONS[i];
		if (version.symbolSizeRows === numRows && version.symbolSizeColumns === numColumns) {
			return version;
		}
	}
	throw new Error('FormatException');
};

Version.ECBlocks = function (ecCodewords, ecBlocks1, ecBlocks2) {
	this.ecCodewords = ecCodewords;
	this.ecBlocks = ecBlocks2 ? [ecBlocks1, ecBlocks2] : [ecBlocks1];
};

Version.ECBlocks.prototype.getECCodewords = function () {
	return this.ecCodewords;
};

Version.ECBlocks.prototype.getECBlocks = function () {
	return this.ecBlocks;
};

Version.ECB = function (count, dataCodewords) {
	this.count = count;
	this.dataCodewords = dataCodewords;
};

Version.ECB.prototype.getCount = function () {
	return this.count;
};

Version.ECB.prototype.getDataCodewords = function () {
	return this.dataCodewords;
};

Version.prototype.toString = function () {
	return String(this.versionNumber);
};

Version.buildVersions = function () {
	return [
		new Version(1, 10, 10, 8, 8,
			new Version.ECBlocks(5, new Version.ECB(1, 3))),
		new Version(2, 12, 12, 10, 10,
			new Version.ECBlocks(7, new Version.ECB(1, 5))),
		new Version(3, 14, 14, 12, 12,
			new Version.ECBlocks(10, new Version.ECB(1, 8))),
		new Version(4, 16, 16, 14, 14,
			new Version.ECBlocks(12, new Version.ECB(1, 12))),
		new Version(5, 18, 18, 16, 16,
			new Version.ECBlocks(14, new Version.ECB(1, 18))),
		new Version(6, 20, 20, 18, 18,
			new Version.ECBlocks(18, new Version.ECB(1, 22))),
		new Version(7, 22, 22, 20, 20,
			new Version.ECBlocks(20, new Version.ECB(1, 30))),
		new Version(8, 24, 24, 22, 22,
			new Version.ECBlocks(24, new Version.ECB(1, 36))),
		new Version(9, 26, 26, 24, 24,
			new Version.ECBlocks(28, new Version.ECB(1, 44))),
		new Version(10, 32, 32, 14, 14,
			new Version.ECBlocks(36, new Version.ECB(1, 62))),
		new Version(11, 36, 36, 16, 16,
			new Version.ECBlocks(42, new Version.ECB(1, 86))),
		new Version(12, 40, 40, 18, 18,
			new Version.ECBlocks(48, new Version.ECB(1, 114))),
		new Version(13, 44, 44, 20, 20,
			new Version.ECBlocks(56, new Version.ECB(1, 144))),
		new Version(14, 48, 48, 22, 22,
			new Version.ECBlocks(68, new Version.ECB(1, 174))),
		new Version(15, 52, 52, 24, 24,
			new Version.ECBlocks(42, new Version.ECB(2, 102))),
		new Version(16, 64, 64, 14, 14,
			new Version.ECBlocks(56, new Version.ECB(2, 140))),
		new Version(17, 72, 72, 16, 16,
			new Version.ECBlocks(36, new Version.ECB(4, 92))),
		new Version(18, 80, 80, 18, 18,
			new Version.ECBlocks(48, new Version.ECB(4, 114))),
		new Version(19, 88, 88, 20, 20,
			new Version.ECBlocks(56, new Version.ECB(4, 144))),
		new Version(20, 96, 96, 22, 22,
			new Version.ECBlocks(68, new Version.ECB(4, 174))),
		new Version(21, 104, 104, 24, 24,
			new Version.ECBlocks(56, new Version.ECB(6, 136))),
		new Version(22, 120, 120, 18, 18,
			new Version.ECBlocks(68, new Version.ECB(6, 175))),
		new Version(23, 132, 132, 20, 20,
			new Version.ECBlocks(62, new Version.ECB(8, 163))),
		new Version(24, 144, 144, 22, 22,
			new Version.ECBlocks(62, new Version.ECB(8, 156), new Version.ECB(2, 155))),
		new Version(25, 8, 18, 6, 16,
			new Version.ECBlocks(7, new Version.ECB(1, 5))),
		new Version(26, 8, 32, 6, 14,
			new Version.ECBlocks(11, new Version.ECB(1, 10))),
		new Version(27, 12, 26, 10, 24,
			new Version.ECBlocks(14, new Version.ECB(1, 16))),
		new Version(28, 12, 36, 10, 16,
			new Version.ECBlocks(18, new Version.ECB(1, 22))),
		new Version(29, 16, 36, 14, 16,
			new Version.ECBlocks(24, new Version.ECB(1, 32))),
		new Version(30, 16, 48, 14, 22,
			new Version.ECBlocks(28, new Version.ECB(1, 49)))
	];
};

Version.VERSIONS = Version.buildVersions();

//datamatrix/decoder/Decoder.java
function Decoder () {
	this.rsDecoder = new ReedSolomonDecoder(GenericGF.DATA_MATRIX_FIELD_256);
}

Decoder.prototype.decode = function (bits) {
	var parser, version, codewords, dataBlocks, totalBytes, i, db,
		resultBytes, dataBlocksCount, j, dataBlock, codewordBytes, numDataCodewords;
	parser = new BitMatrixParser(bits);
	version = parser.getVersion();
	codewords = parser.readCodewords();
	dataBlocks = DataBlock.getDataBlocks(codewords, version);
	totalBytes = 0;
	for (i = 0; i < dataBlocks.length; i++) {
		db = dataBlocks[i];
		totalBytes += db.getNumDataCodewords();
	}
	resultBytes = newArray(totalBytes, 0);
	dataBlocksCount = dataBlocks.length;
	for (j = 0; j < dataBlocksCount; j++) {
		dataBlock = dataBlocks[j];
		codewordBytes = dataBlock.getCodewords();
		numDataCodewords = dataBlock.getNumDataCodewords();
		this.correctErrors(codewordBytes, numDataCodewords);
		for (i = 0; i < numDataCodewords; i++) {
			resultBytes[i * dataBlocksCount + j] = codewordBytes[i];
		}
	}
	return DecodedBitStreamParser.decode(resultBytes);
};

Decoder.prototype.correctErrors = function (codewordBytes, numDataCodewords) {
	var numCodewords, codewordInts, i;
	numCodewords = codewordBytes.length;
	codewordInts = newArray(numCodewords);
	for (i = 0; i < numCodewords; i++) {
		codewordInts[i] = codewordBytes[i] & 0xFF;
	}
	try {
		this.rsDecoder.decode(codewordInts, codewordBytes.length - numDataCodewords);
	} catch (e) {
		throw new Error('ChecksumException');
	}
	for (i = 0; i < numDataCodewords; i++) {
		codewordBytes[i] = codewordInts[i];
	}
};

//based on datamatrix/DataMatrixReader.java
function DataMatrixReader () {
	this.decoder = new Decoder();
}

DataMatrixReader.prototype.decode = function (image) {
	return this.decoder.decode(new Detector(image.getBlackMatrix()).detect());
};

var dataMatrixReader = new DataMatrixReader();
self.onmessage = function (e) {
	var result;
	try {
		result = dataMatrixReader.decode(
			new BinaryBitmap(
				new HybridBinarizer(
					new ImageDataLuminanceSource(e.data.width, e.data.height, e.data.imageData)
				)
			)
		);
	} catch (e) {
	}
	if (result) {
		postMessage({
			data: result,
			format: 'Datamatrix',
			id: e.data.id
		});
	} else {
		postMessage({
			data: undefined,
			id: e.data.id
		});
	}
};
})();
