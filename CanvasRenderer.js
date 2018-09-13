const TO_RADIANS = Math.PI/180; 

//TODO: compare new cell content with existing and redraw when changed

function drawRect(context, x, y, width, height, background) {
    context.fillStyle = "#FFFFFF";
    context.globalAlpha = 1;
    context.fillRect(x, y, width, height);
    context.fillStyle = background.color;
    context.globalAlpha = background.opacity;
    context.fillRect(x, y, width, height);
}

//source: https://gamedev.stackexchange.com/questions/67274/is-it-possible-to-rotate-an-image-on-an-html5-canvas-without-rotating-the-whole
function drawImage(context, x, y, size, gridImage) {
    context.save();
    context.translate(x + size/2, y + size/2);
    context.rotate(gridImage.angle * TO_RADIANS);
    context.globalAlpha = 1;
    context.drawImage(gridImage.element, -size/2, -size/2, size, size);
    context.restore();
}

class CanvasRenderer {

	constructor(gridProperties) {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		
		canvas.setAttribute("width", gridProperties.width);
		canvas.setAttribute("height", gridProperties.height);
		
		this.canvas = canvas;
		this.context = context;
	}
	
	get element() {
		return this.canvas;
	}
	
	drawBackgroundColor(canvasWidth, canvasHeight, background) {
        drawRect(this.context, 0, 0, canvasWidth, canvasHeight, background);
	};
	
	drawBackgroundImage(canvasWidth, canvasHeight, background) {
		const context = this.context;
		const img = Image();
		
		img.onload = function() {
			context.globalAlpha = background.opacity;
			context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
		};
		img.src = background.url;
	};
	
	drawGrid(xShift, yShift, gridWidth, gridHeight, gridColumns, gridRows, cellSize, lineWidth, lineColor, lineOpacity) {
		const context = this.context;
		
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.globalAlpha = lineOpacity;
		context.beginPath();
		// vertical lines:
		// | | | |
		// | | | |
		for (var i = 0; i <= gridColumns; i++) {
			context.moveTo(xShift + (lineWidth / 2) + i * (cellSize + lineWidth), yShift);
			context.lineTo(xShift + (lineWidth / 2) + i * (cellSize + lineWidth), yShift + gridHeight);
		}
		// horizontal lines:
		//  _ _ _
		//  _ _ _
		//  _ _ _
		for (var j = 0; j <= gridRows; j++) {
			context.moveTo(xShift, yShift + (lineWidth / 2) + j * (cellSize + lineWidth));
			context.lineTo(xShift + gridWidth, yShift + (lineWidth / 2) + j * (cellSize + lineWidth));
		}
		context.stroke();
	}

    addGridImage(x, y, size, gridImage) {
		const context = this.context;
		
		return new Promise(function(resolve, reject) {
			var img = new Image();
			img.onload = function() {
                gridImage.element = img;
                drawImage(context, x, y, size, gridImage);

				resolve(img);
			};

			img.onerror = reject;
			img.src = gridImage.url;
		});
	}

    removeGridImage(x, y, size, gridImage, background) {
        drawRect(this.context, x, y, size, size, background);
    }

    moveGridImage(oldX, oldY, x, y, size, gridImage, background) {
        drawRect(this.context, oldX, oldY, size, size, background);
	    drawImage(this.context, x, y, size, gridImage);
    }

    rotateGridImage(x, y, size, gridImage, background) {
        drawRect(this.context, x, y, size, size, background);
        drawImage(this.context, x, y, size, gridImage);
    }

	getClickedPoint(event) {
		const canvas = this.canvas;
		
		//source: http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
		var x;
		var y;
		
		if (event.pageX !== undefined && event.pageY !== undefined) {
			x = event.pageX;
			y = event.pageY;
		} else {
			x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;

		return {x: x, y: y};
	}
}