/**
 * GameGrid.js
 * (c) by Neru, 2011-2018
 *
 * TODO:
 * lineWidth Function?
 * weights (^1/2) for changeCanvasSize
 * image and geo coordinate system
 * coordinate change listener (mouse over or http://www.html5canvastutorials.com/advanced/html5-canvas-path-mouseover/)
 * mark cell
 * 
 * Enhancements:
 * improve getGridCoordinate [which line clicked, where outside grid] --> Regions
 * drag images from one cell to the other?
 * distanceToGridFromBorder(min, max)
 * adjustable alignment of grid in canvas (center, left, right)
 * image (stretched, fitted, side-by-side), like desktop background in Windows
 * SpatialLite Database
 */
 
RESIZING_TIMEOUT = 500; //milliseconds
 
function GameGrid(divID, options = {}) {
	var div = document.getElementById(divID);
	
	if (!div)
		throw "HTML Element with ID '" + divID + "'does not exist."
	
	if (!(div instanceof HTMLDivElement)) {
		throw "Element with ID '" + divID + "' is not an HTML Div.";
	}
	
	var divWidth = div.clientWidth;
	var divHeight = div.clientHeight;
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	
	var windowHasBeenJustResized = false;
	
	function windowResized() {		
		if (windowHasBeenJustResized)
			return;
		
		window.setTimeout(resizingTimeoutOver, RESIZING_TIMEOUT);
	}
	
	function resizingTimeoutOver() {
		windowHasBeenJustResized = false;
		
		var newWindowWidth = window.innerWidth;
		var newWindowHeight = window.innerHeight;
		
		if (newWindowWidth === windowWidth && newWindowHeight === windowHeight)
			return;
		
		windowWidth = newWindowWidth;
		windowHeight = newWindowHeight;
			
		divWidth = div.clientWidth;
		divHeight = div.clientHeight;
		
		that.changeCanvasSize(divWidth, divHeight, "gridOnResize");		
		windowHasBeenJustResized = true;
		
		window.setTimeout(resizingTimeoutOver, RESIZING_TIMEOUT);
	}
	
			
	var that = this;
	
	var Renderer = options["renderer"] || CanvasRenderer;
	
	var renderer = new Renderer({
		width: divWidth,
		height: divHeight
	});
		
	div.appendChild(renderer.element);
		
	var eventEmitter = new EventEmitter();
	
	//http://jsperf.com/object-defineproperty-vs-definegetter-vs-normal
	
	var minCanvasWidth = 100;
	var canvasWidth = 480;
	var maxCanvasWidth = 10000;

	var minCanvasHeight = 100;
	var canvasHeight = 480;
	var maxCanvasHeight = 10000;
	
	var minGridColumns = 1;
	var gridColumns = 9;
	var maxGridColumns = 100;
	
	var minGridRows = 1;
	var gridRows = 9;
	var maxGridRows = 100;
	
	var minCellSize = 1;
	var cellSize = 50;
	var maxCellSize = 1000;
	
	var minLineWidth = 0;
	var lineWidth = 1;
	var maxLineWidth = 10;

	var drawBackground = renderer.drawBackgroundColor;
	var background = {
		color: "#DDDDDD",
		opacity: 0.6,
		url: null
	};
	
	var lineColor = "#000000";
	var lineOpacity = 0.70;

	var gridCellClicked;
	var cellSizeChanged;
	
	var gridImages = {};
	var matrix = mat4.create();
	mat4.identity(matrix);

	
	var repaint = async function() {
		var xShift = that.getXShift();
		var yShift = that.getYShift();
		var gridWidth = that.getGridWidth();
		var gridHeight = that.getGridHeight();
		var gridColums = that.getGridColumns();
		var gridRows = that.getGridRows();
			
		//draw either background image or color
		//use apply (otherwise this is undefined inside the function)
		drawBackground.apply(renderer, [canvasWidth, canvasHeight, background]); 

		if (lineWidth === 0)
		    return;

		renderer.drawGrid(xShift, yShift, gridWidth, gridHeight, gridColums, gridRows, cellSize, lineWidth, lineColor, lineOpacity);
		
		//draw images for each grid cell
		var imagesToDraw = [];
		var gridImage, imageToDraw, imageX, imageY;
		
		for (var yCoord = 0; yCoord <= gridRows; yCoord++) {
			for (var xCoord = 0; xCoord <= gridColumns; xCoord++) {
				//matrix multiplication
				gridImage = that.getGridImage(xCoord, yCoord);
				if (gridImage !== undefined) {
					imageX = xShift + lineWidth + xCoord * (cellSize + lineWidth);
					imageY = yShift + lineWidth + yCoord * (cellSize + lineWidth);

					imageToDraw = renderer.drawGridImage(imageX, imageY, cellSize, gridImage);
					imagesToDraw.push(imageToDraw);
				}
			}
		}
		
		return Promise.all(imagesToDraw);
	};
	
	var minMaxCheck = function (min, max, newValue) {
		if (newValue < min) {
			throw "New Value too small.";
		} else if (newValue > max) {
			throw "New Value too large.";			
		}
	};


	/**
	 * When the point lies outside the grid or on a grid line,
	 * -1 -1 will be returned.
	 */
	var getGridCoordinate = function (pointOnCanvas) {
		var x = pointOnCanvas.x - that.getXShift();
		var y = pointOnCanvas.y - that.getYShift();

		var d = lineWidth + cellSize;

		// clicked point lies outside the grid
		if (x <= 0 || x > gridColumns * d) {
			return {x: -1, y: -1};
		}
		if (y <= 0 || y > gridRows * d) {
			return {x: -1, y: -1};
		}

		var i = -1;
		var j = -1;

		while (x >= lineWidth) {
			x -= d;
			i++;
		}
		while (y >= lineWidth) {
			y -= d;
			j++;
		}

		//clicked point lies on grid line
		if (x >= 0 || y >= 0) {
			return {x: -1, y: -1};
		}

		return {x: i, y: j};
	};
	
	var getGameCoordinate = function (gridCoordinate) {
		//TODO
		return gridCoordinate;
	};
	
	this.getGridWidth = function() {
		return lineWidth + gridColumns * (cellSize + lineWidth);
	};

	this.getGridHeight = function() {
		return lineWidth + gridRows * (cellSize + lineWidth);
	};

	this.getXShift = function() {
		return Math.floor((canvasWidth - that.getGridWidth()) / 2);
	};

	this.getYShift = function() {
		return Math.floor((canvasHeight - that.getGridHeight()) / 2);
	};
	
	this.getMinCanvasWidth = function () {
		return minCanvasWidth;
	};

	this.getCanvasWidth = function() {
		return canvasWidth;
	};
	
	this.getMaxCanvasWidth = function() {
		return maxCanvasWidth;
	};
	
	this.getMinCanvasHeight = function() {
		return minCanvasHeight;
	};
	
	this.getCanvasHeight = function() {
		return canvasHeight;
	};
	
	this.getMaxCanvasHeight = function() {
		return maxCanvasHeight;
	};
	
	this.getMinGridColumns = function() {
		return minGridColumns;
	};

	this.getGridColumns = function() {
		return gridColumns;
	};
	
	this.getMaxGridColumns = function() {
		return maxGridColumns;
	};
	
	this.getMinGridRows = function() {
		return minGridRows;
	};
	
	this.getGridRows = function() {
		return gridRows;
	};
	
	this.getMaxGridRows = function() {
		return maxGridRows;
	};
	
	this.getMinCellSize = function() {
		return minCellSize;
	};
	
	this.getCellSize = function() {
		return cellSize;
	};
	
	this.getMaxCellSize = function() {
		return maxCellSize;
	};
	
	this.getMinLineWidth = function() {
		return minLineWidth;
	};
	
	this.getLineWidth = function() {
		return lineWidth;
	};
	
	this.getMaxLineWidth = function() {
		return maxLineWidth;
	};
	
	this.getLineColor = function() {
		return lineColor;
	};
	
	this.getLineOpacity = function() {
		return lineOpacity;
	};
	
	this.getBackgroundColor = function() {
		return background.color;
	};
	
	this.getBackgroundOpacity = function() {
		return background.opacity;
	};
	
	this.getBackgroundUrl = function() {
		return background.url;
	};
	
	var Parameter = function (name, getMin, getValue, getMax) {
		
		this.checkNewValue = function (newValue) {
			if (newValue < getMin()) {
				throw name + ": New value falls below the minimal allowed value.";
			}
			if (newValue > getMax()) {
				throw name + ": New value exceeds the maximal allowed value.";
			}	
			eventEmitter.emit(name + "Changed", newValue);
		};
		
		this.checkNewMin = function (newMin) {
			if (newMin < 0) {
				throw name + ": New Minimum falls below the smallest minimum.";
			}
			if (newMin > getValue()) {
				throw name + ": New Minimum exceeds the current value.";
			}
			eventEmitter.emit("min" + name + "Changed", newMin);
		};
		
		this.checkNewMax = function (newMax) {
			if (newMax > Number.MAX_VALUE) {
				throw name + ": New Maximum exceeds the biggest maximum.";
			}
			if (newMax < getValue()) {
				throw name + ": New Maximum falls below the current value.";
			}
			eventEmitter.emit("max" + name + "Changed", newMax);
		};
	};
	
	var canvasWidthObject = new Parameter("canvasWidth", this.getMinCanvasWidth, this.getCanvasWidth, this.getMaxCanvasWidth);
	var canvasHeightObject = new Parameter("canvasHeight", this.getMinCanvasHeight, this.getCanvasHeight, this.getMaxCanvasHeight);	
	var gridColumnsObject = new Parameter("gridColumns", this.getMinGridColumns, this.getGridColumns, this.getMaxGridColumns); //x
	var gridRowsObject = new Parameter("gridRows", this.getMinGridRows, this.getGridRows, this.getMaxGridRows); //y
	var cellSizeObject = new Parameter("cellSize", this.getMinCellSize, this.getCellSize, this.getMaxCellSize);
	var lineWidthObject = new Parameter("lineWidth", this.getMinLineWidth, this.getLineWidth, this.getMaxLineWidth);
	
	
	this.setMinCanvasWidth = function (newMinCanvasWidth) {
        newMinCanvasWidth = Number(newMinCanvasWidth);
		canvasWidthObject.checkNewMin(newMinCanvasWidth);
		minCanvasWidth = newMinCanvasWidth;
	};
	
	this.setCanvasWidth = function (newCanvasWidth) {
		canvasWidthObject.checkNewValue(newCanvasWidth);
		canvasWidth = newCanvasWidth;
		renderer.element.setAttribute("width", newCanvasWidth);
	};
	
	this.setMaxCanvasWidth = function (newMaxCanvasWidth) {
        newMaxCanvasWidth = Number(newMaxCanvasWidth);
		canvasWidthObject.checkNewMax(newMaxCanvasWidth);
		maxCanvasWidth = newMaxCanvasWidth;
	};
	
	this.setMinCanvasHeight = function (newMinCanvasHeight) {
        newMinCanvasHeight = Number(newMinCanvasHeight);
		canvasHeightObject.checkNewMin(newMinCanvasHeight);
		minCanvasHeight = newMinCanvasHeight;
	};
		
	this.setCanvasHeight = function (newCanvasHeight) {
		canvasHeightObject.checkNewValue(newCanvasHeight);
		canvasHeight = newCanvasHeight;
		renderer.element.setAttribute("height", newCanvasHeight);
	};
	
	this.setMaxCanvasHeight = function (newMaxCanvasHeight) {
        newMaxCanvasHeight = Number(newMaxCanvasHeight);
		canvasHeightObject.checkNewMax(newMaxCanvasHeight);
		maxCanvasHeight = newMaxCanvasHeight;
	};
		
	this.setMinGridColumns = function (newMinGridColumns) {
        newMinGridColumns = Number(newMinGridColumns);
		gridColumnsObject.checkNewMin(newMinGridColumns);
		minGridColumns = newMinGridColumns;
	};
	
	this.setGridColumns = function (newGridColumns) {
		gridColumnsObject.checkNewValue(newGridColumns);
		gridColumns = newGridColumns;
	};
	
	this.setMaxGridColumns = function (newMaxGridColumns) {
        newMaxGridColumns = Number(newMaxGridColumns);
		gridColumnsObject.checkNewMin(newMaxGridColumns);
		maxGridColumns = newMaxGridColumns;
	};
	
	this.setMinGridRows = function (newMinGridRows) {
        newMinGridRows = Number(newMinGridRows);
		gridRowsObject.checkNewMin(newMinGridRows);
		minGridRows = newMinGridRows;
	};
	
	this.setGridRows = function (newGridRows) {
		gridRowsObject.checkNewValue(newGridRows);
		gridRows = newGridRows;
	};
	
	this.setMaxGridRows = function (newMaxGridRows) {
        newMaxGridRows = Number(newMaxGridRows);
		gridRowsObject.checkNewMax(newMaxGridRows);
		maxGridRows = newMaxGridRows;
	};
	
	this.setMinCellSize = function (newMinCellSize) {
        newMinCellSize = Number(newMinCellSize);
		cellSizeObject.checkNewMin(newMinCellSize);
		minCellSize = newMinCellSize;
	};
	
	this.setCellSize = function (newCellSize) {
		cellSizeObject.checkNewValue(newCellSize);
		cellSize = newCellSize;
	};
		
	this.setMaxCellSize = function (newMaxCellSize) {
        newMaxCellSize = Number(newMaxCellSize);
		cellSizeObject.checkNewMax(newMaxCellSize);
		maxCellSize = newMaxCellSize;
	}; 
	
	this.setMinLineWidth = function (newMinLineWidth) {
        newMinLineWidth = Number(newMinLineWidth);
		lineWidthObject.checkNewMin(newMinLineWidth);
		minLineWidth = minLineWidth;
	};
	
	this.setLineWidth = function (newLineWidth) {
		lineWidthObject.checkNewValue(newLineWidth);
		lineWidth = newLineWidth;
	};	
	
	this.setMaxLineWidth = function (newMaxLineWidth) {
        newMaxLineWidth = Number(newMaxLineWidth);
		lineWidthObject.checkNewMax(newMaxLineWidth);
		maxLineWidth = newMaxLineWidth;
	};
	
	this.setLineColor = function (newLineColor) {
		lineColor = newLineColor;
	};
	
	this.setLineOpacity = function (newLineOpacity) {
		lineOpacity = newLineOpacity;
	};
	
	this.setBackgroundColor = function (newBackgroundColor) {
		background.color = newBackgroundColor;
		drawBackground = renderer.drawBackgroundColor;
	};
	
	this.setBackgroundOpacity = function (newBackgroundOpacity) {
		background.opacity = newBackgroundOpacity;
	};
	
	this.setBackgroundImage = function (imageURL) {
		background.url = imageURL;
		drawBackground = renderer.drawBackgroundImage;
	};
	
	this.changeCanvasWidth = function (newCanvasWidth, option) {
        newCanvasWidth = Number(newCanvasWidth);
		minMaxCheck(minCanvasWidth, maxCanvasWidth, newCanvasWidth);
	
		switch(option) {
		case "gridOnResize":
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellSize + lineWidth));
			
			if (newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellSize + lineWidth) + lineWidth;
			} else if (newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
			} 
			that.setGridColumns(newGridColumns);
			break;
		case "cellSizeOnResize":	
			var normalizedCanvasWidth = (newCanvasWidth - lineWidth) / gridColumns;
			var normalizedCanvasHeight = (canvasHeight - lineWidth) / gridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newCanvasWidth = gridColumns * (minCellSize + lineWidth) + lineWidth;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			if (newCanvasWidth < that.getGridWidth()) {
				newCanvasWidth = that.getGridWidth();				
			}
		}
	
		that.setCanvasWidth(newCanvasWidth);
		repaint();
	};
		
	this.changeCanvasHeight = function (newCanvasHeight, option) {
        newCanvasHeight = Number(newCanvasHeight);
		minMaxCheck(minCanvasHeight, maxCanvasHeight, newCanvasHeight);
	
		switch(option) {
		case "gridOnResize":
			var newGridRows = Math.floor((newCanvasHeight - lineWidth) / (cellSize + lineWidth));
			
			if (newGridRows < minGridRows) {
				newGridRows = minGridRows;
				newCanvasHeight = minGridRows * (cellSize + lineWidth) + lineWidth;
			} else if (newGridRows > maxGridRows) {
				newGridRows = maxGridRows;
			} 
			that.setGridRows(newGridRows);
			break;
		case "cellSizeOnResize":
			var normalizedCanvasWidth = (canvasWidth - lineWidth) / gridColumns;
			var normalizedCanvasHeight = (newCanvasHeight - lineWidth) / gridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newCanvasHeight = gridRows * (minCellSize + lineWidth) + lineWidth;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			if (newCanvasHeight < that.getGridHeight()) {
				newCanvasHeight = that.getGridHeight();
			}
		}
		that.setCanvasHeight(newCanvasHeight);
		repaint();
	};	
		
	this.changeCanvasSize = function (newCanvasWidth, newCanvasHeight, option) {
        newCanvasWidth = Number(newCanvasWidth);
        newCanvasHeight = Number(newCanvasHeight);

		minMaxCheck(minCanvasWidth, maxCanvasWidth, newCanvasWidth);
		minMaxCheck(minCanvasHeight, maxCanvasHeight, newCanvasHeight);
	
		switch(option) {
		case "gridOnResize":
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellSize + lineWidth));
			
			if (newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellSize + lineWidth) + lineWidth;
			} else if (newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
			} 
			
			var newGridRows = Math.floor((newCanvasHeight - lineWidth) / (cellSize + lineWidth));
			
			if(newGridRows < minGridRows) {
				newGridRows = minGridRows;
				newCanvasHeight = minGridRows * (cellSize + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridRows) {
				newGridRows = maxGridRows;
			} 
			
			that.setGridColumns(newGridColumns);
			that.setGridRows(newGridRows);
			break;
		case "cellSizeOnResize":
			var normalizedCanvasWidth = (newCanvasWidth - lineWidth) / gridColumns;
			var normalizedCanvasHeight = (newCanvasHeight - lineWidth) / gridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newCanvasWidth = gridColumns * (minCellSize + lineWidth) + lineWidth;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newCanvasHeight = gridRows * (minCellSize + lineWidth) + lineWidth;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			if (newCanvasWidth < that.getGridWidth()) {
				newCanvasWidth = that.getGridWidth();				
			}
			if (newCanvasHeight < that.getGridHeight()) {
				newCanvasHeight = that.getGridHeight();
			}
		}
	
		that.setCanvasWidth(newCanvasWidth);
		that.setCanvasHeight(newCanvasHeight);
		repaint();
	};
	
	this.changeGridColumns = function (newGridColumns, option) {
	    newGridColumns = Number(newGridColumns);
		minMaxCheck(minGridColumns, maxGridColumns, newGridColumns);

		switch(option) {
		case "canvasOnResize":
			var newCanvasWidth = newGridColumns * (lineWidth + cellSize) + lineWidth;
			
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellSize + lineWidth));
			}
			that.setCanvasWidth(newCanvasWidth);
			break;
		case "cellSizeOnResize":		
			var normalizedCanvasWidth = (canvasWidth - lineWidth) / newGridColumns;
			var normalizedCanvasHeight = (canvasHeight - lineWidth) / gridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellSize + lineWidth));
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			var newGridWidth = newGridColumns * (lineWidth + cellSize) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellSize + lineWidth));
			}
		}
		
		that.setGridColumns(newGridColumns);
		repaint();
	};	
	
	this.changeGridRows = function (newGridRows, option) {
	    newGridRows = Number(newGridRows);
		minMaxCheck(minGridRows, newGridRows, newGridRows);

		switch(option) {
		case "canvasOnResize":
			var newCanvasHeight = newGridRows * (lineWidth + cellSize) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				newGridRows = Math.floor((maxCanvasHeight - lineWidth) / (cellSize + lineWidth));
			}
				
			that.setCanvasHeight(newCanvasHeight);
			break;
		case "cellSizeOnResize":		
			var normalizedCanvasWidth = (canvasWidth - lineWidth) / gridColumns;
			var normalizedCanvasHeight = (canvasHeight - lineWidth) / newGridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			var newGridHeight = newGridRows * (lineWidth + cellSize) + lineWidth;

			if (newGridHeight > canvasHeight) {
				newGridRows = Math.floor((canvasHeight - lineWidth) / (cellSize + lineWidth));
			}
		}
		
		that.setGridRows(newGridRows);
		repaint();
	};
	
	this.changeGrid = function (newGridColumns, newGridRows, option) {
		minMaxCheck(minGridColumns, maxGridColumns, newGridColumns);
		minMaxCheck(minGridRows, maxGridRows, newGridRows);

		switch(option) {
		case "canvasOnResize":
			var newCanvasWidth = newGridColumns * (lineWidth + cellSize) + lineWidth;
			
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellSize + lineWidth));
			}
			
			var newCanvasHeight = newGridRows * (lineWidth + cellSize) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				newGridColumns = Math.floor((maxCanvasHeight - lineWidth) / (cellSize + lineWidth));
			}
				
			that.setCanvasWidth(newCanvasWidth);
			that.setCanvasHeight(newCanvasHeight);
			break;
		case "cellSizeOnResize":
			var normalizedCanvasWidth = (canvasWidth - lineWidth) / newGridColumns;
			var normalizedCanvasHeight = (canvasHeight - lineWidth) / newGridRows;
		
			if (normalizedCanvasWidth < normalizedCanvasHeight) {
				var newCellSize = Math.floor(normalizedCanvasWidth - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellSize + lineWidth));
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 
			} else {
				var newCellSize = Math.floor(normalizedCanvasHeight - lineWidth);
				
				if (newCellSize < minCellSize) {
					newCellSize = minCellSize;
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
				} else if (newCellSize > maxCellSize) {
					newCellSize = maxCellSize;
				} 	
			}
			that.setCellSize(newCellSize);
			break;
		default:
			var newGridWidth = newGridColumns * (lineWidth + cellSize) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellSize + lineWidth));
			}	
			var newGridHeight = newGridRows * (lineWidth + cellSize) + lineWidth;

			if (newGridHeight > canvasHeight) {
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
			}
		}
		that.setGridColumns(newGridColumns);
		that.setGridRows(newGridRows);

		repaint();
	};
	
	this.changeCellSize = function (newCellSize, option) {
        newCellSize = Number(newCellSize);
		minMaxCheck(minCellSize, maxCellSize, newCellSize);
		
		var cellSizeForColumns;
		var cellSizeForRows;
		switch (option) {
		case "canvasOnResize":
			var newCanvasWidth = gridColumns * (lineWidth + newCellSize) + lineWidth;	
				
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
				cellSizeForColumns = newCellSize;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				cellSizeForColumns = Math.floor(((maxCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			} else {
				cellSizeForColumns = newCellSize;
			}
		
			var newCanvasHeight = gridRows * (lineWidth + newCellSize) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
				cellSizeForRows = newCellSize;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				cellSizeForRows = Math.floor(((maxCanvasHeight - lineWidth) / gridRows) - lineWidth);
			} else {				
				cellSizeForRows = newCellSize;
			}
	
			that.setCanvasWidth(newCanvasWidth);		
			that.setCanvasHeight(newCanvasHeight);
			break;
			
		case "gridOnResize":
			var newGridColumns = Math.floor((canvasWidth - lineWidth) / (lineWidth + newCellSize));
			
			if (newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				cellSizeForColumns = Math.floor(((canvasWidth - lineWidth) / minGridColumns) - lineWidth);
			} else if (newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
				cellSizeForColumns = newCellSize;
			} else {
				cellSizeForColumns = newCellSize;
			}
			
			var newGridRows = Math.floor((canvasHeight - lineWidth) / (lineWidth + newCellSize));
			
			if (newGridRows < minGridRows) {
				newGridRows = minGridRows;
				cellSizeForRows = Math.floor(((canvasHeight - lineWidth) / minGridRows) - lineWidth);
			} else if (newGridRows > maxGridRows) {
				newGridRows = maxGridRows;
				cellSizeForRows = newCellSize;
			} else {
				cellSizeForRows = newCellSize;
			}
	
			that.setGridColumns(newGridColumns);		
			that.setGridRows(newGridRows);
			break;
			
		default:
			var newGridWidth = gridColumns * (lineWidth + newCellSize) + lineWidth;
			var newGridHeight = gridRows * (lineWidth + newCellSize) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				cellSizeForColumns = Math.floor(((canvasWidth - lineWidth) / gridColumns) - lineWidth);
			} else {
				cellSizeForColumns = newCellSize;
			}
			
			if (newGridHeight > canvasHeight) {
				cellSizeForRows = Math.floor(((canvasHeight - lineWidth) / gridRows) - lineWidth);
			} else {
				cellSizeForRows = newCellSize;
			}
		}
		
		if (cellSizeForColumns < cellSizeForRows) {
			newCellSize = cellSizeForColumns;
		} else {
			newCellSize = cellSizeForRows;
		}
		
		that.setCellSize(newCellSize);
        repaint();
	};

    this.changeLineWidth = function (newLineWidth, option) {
        newLineWidth = Number(newLineWidth);
        minMaxCheck(minLineWidth, maxLineWidth, newLineWidth);

        var lineWidthForColumns;
        var lineWidthForRows;

        switch (option) {
            case "canvasOnResize":
                var newCanvasWidth = gridColumns * (newLineWidth + cellSize) + newLineWidth;

                if (newCanvasWidth < minCanvasWidth) {
                    newCanvasWidth = minCanvasWidth;
                    lineWidthForColumns = newLineWidth;
                } else if (newCanvasWidth > maxCanvasWidth) {
                    newCanvasWidth = maxCanvasWidth;
                    lineWidthForColumns = Math.floor((maxCanvasWidth - gridColumns * cellSize) / (gridColumns + 1));
                } else {
                    lineWidthForColumns = newLineWidth;
                }

                var newCanvasHeight = gridRows * (newLineWidth + cellSize) + newLineWidth;

                if (newCanvasHeight < minCanvasHeight) {
                    newCanvasHeight = minCanvasHeight;
                    lineWidthForRows = newLineWidth;
                } else if (newCanvasHeight > maxCanvasHeight) {
                    newCanvasHeight = maxCanvasHeight;
                    lineWidthForRows = Math.floor((maxCanvasHeight - gridRows * cellSize) / (gridRows + 1));
                } else {
                    lineWidthForRows = newLineWidth;
                }

                that.setCanvasWidth(newCanvasWidth);
                that.setCanvasHeight(newCanvasHeight);
                break;

            case "gridOnResize":
                var newGridColumns = Math.floor((canvasWidth - newLineWidth) / (newLineWidth + cellSize));

                if (newGridColumns < minGridColumns) {
                    newGridColumns = minGridColumns;
                    lineWidthForColumns = Math.floor((canvasWidth - minGridColumns * cellSize) / (minGridColumns + 1));
                } else if (newGridColumns > maxGridColumns) {
                    newGridColumns = maxGridColumns;
                    lineWidthForColumns = newLineWidth;
                } else {
                    lineWidthForColumns = newLineWidth;
                }

                var newGridRows = Math.floor((canvasHeight - newLineWidth) / (newLineWidth + cellSize));

                if (newGridRows < minGridRows) {
                    newGridRows = minGridRows;
                    lineWidthForRows = Math.floor((canvasHeight - minGridRows * cellSize) / (minGridRows + 1));
                } else if (newGridRows > maxGridRows) {
                    newGridRows = maxGridRows;
                    lineWidthForRows = newLineWidth;
                } else {
                    lineWidthForRows = newLineWidth;
                }

                that.setGridColumns(newGridColumns);
                that.setGridRows(newGridRows);
                break;

            case "cellSizeOnResize":
                var cellSizeForColumns = Math.floor(((canvasWidth - newLineWidth) / gridColumns) - newLineWidth);

                if (cellSizeForColumns < minCellSize) {
                    cellSizeForColumns = minCellSize;
                    lineWidthForColumns = Math.floor((canvasWidth - gridColumns * minCellSize) / (gridColumns + 1));
                } else if (cellSizeForColumns > maxCellSize) {
                    cellSizeForColumns = maxCellSize;
                    lineWidthForColumns = newLineWidth;
                } else {
                    lineWidthForColumns = newLineWidth;
                }

                var cellSizeForRows = Math.floor(((canvasHeight - newLineWidth) / gridRows) - newLineWidth);

                if (cellSizeForRows < minCellSize) {
                    cellSizeForRows = minCellSize;
                    lineWidthForRows = Math.floor((canvasHeight - gridRows * minCellSize) / (gridRows + 1));
                } else if (cellSizeForRows > maxCellSize) {
                    cellSizeForRows = maxCellSize;
                    lineWidthForRows = newLineWidth;
                } else {
                    lineWidthForRows = newLineWidth;
                }

                if (cellSizeForColumns < cellSizeForRows) {
                    that.setCellSize(cellSizeForColumns);
                } else {
                    that.setCellSize(cellSizeForRows);
                }
                break;

            default:
                var newCanvasWidth = gridColumns * (newLineWidth + cellSize) + lineWidth;
                var newGridHeight = gridRows * (newLineWidth + cellSize) + lineWidth;

                if (newCanvasWidth > canvasWidth) {
                    lineWidthForColumns = Math.floor((canvasWidth - gridColumns * cellSize) / (gridColumns + 1));
                } else {
                    lineWidthForColumns = newLineWidth;
                }

                if (newGridHeight > canvasHeight) {
                    lineWidthForRows = Math.floor((canvasHeight - gridRows * cellSize) / (gridRows + 1));
                } else {
                    lineWidthForRows = newLineWidth;
                }
        }

        if (lineWidthForColumns < lineWidthForRows) {
            newLineWidth = lineWidthForColumns;
        } else {
            newLineWidth = lineWidthForRows;
        }

        that.setLineWidth(newLineWidth);
        repaint();
    };
	
	this.changeBackgroundColor = function (newColor) {
		that.setBackgroundColor(newColor);
		repaint();
	};
	
	this.changeBackgroundOpacity = function(newBackgroundOpacity) {
		that.setBackgroundOpacity(newBackgroundOpacity);
		repaint();
	};
	
	this.changeLineColor = function (newColor) {
		that.setLineColor(newColor);
		repaint();
	};
	
	this.changeLineOpacity = function(newLineOpacity) {
		that.setLineOpacity(newLineOpacity);
		repaint();
	};
	
	this.addGridImage = async function (xCoord, yCoord, imageURL, angle = 0) {
		gridImages[xCoord] = gridImages[xCoord] ? gridImages[xCoord] : {};
		gridImages[xCoord][yCoord] = {
			"url": imageURL,
			"angle": angle
		};
		
		return repaint();
	};
	
	this.rotateGridImage = async function (xCoord, yCoord, angle) {
		var gridImage = that.getGridImage(xCoord, yCoord);
		gridImage["angle"] = angle;
		
		return repaint();
	};
	
	this.moveGridImage = async function (oldXCoord, oldYCoord, xCoord, yCoord) {
		var gridImage = that.getGridImage(oldXCoord, oldYCoord);
		that.removeGridImage(oldXCoord, oldYCoord);
		that.addGridImage(xCoord, yCoord, gridImage.url, gridImage.angle);
		
		return repaint();
	};
	
	this.getGridImage = function (xCoord, yCoord) {
		return gridImages[xCoord] && gridImages[xCoord][yCoord];
	};
	
	this.removeGridImage = async function (xCoord, yCoord) {
		if (gridImages[xCoord] === undefined || gridImages[xCoord][yCoord] === undefined) {
			throw "An image does not exist at this position.";
		}
		
		delete gridImages[xCoord][yCoord];
		
		if (Object.keys(gridImages[xCoord]).length === 0)
			delete gridImages[xCoord];
		
		return repaint();
	};
	
	this.moveGrid = function (x, y) {
		var vector = vec3.create([x, y, 0]);
		mat4.translate(matrix, vector);
	};
	
	this.centerGrid = function (X, Y) {
		var dx = X - centerX;
		var dy = Y - centerY;
		
		var vector = vec3.create([dy, dy, 0]);
		mat4.translate(matrix, vector);
	};
	
	this.rotateGrid90DegreesClockWise = function () {
		//TODO swap changeGridColumns and Rows and canvasWidth and Height
		//canvasOnResize, gridOnResize, cellSizeOnResize
		var vector = vec3.create([-centerX, -centerY, 0]);
		mat4.translate(matrix, vector);
		mat4.rotateZ(matrix, Math.PI/2);
		vec3.negate(vector);
		mat4.translate(matrix, vector);
		repaint();
	};
	
	this.rotateGrid90DegreesAntiClockWise = function () {
		//TODO swap changeGridColumns and Rows and canvasWidth and Height
		//canvasOnResize, gridOnResize, cellSizeOnResize
		var vector = vec3.create([-centerX, -centerY, 0]);
		mat4.translate(matrix, vector);
		mat4.rotateZ(matrix, -Math.PI/2);
		vec3.negate(vector);
		mat4.translate(matrix, vector);
		repaint();
	};
	
	this.rotateGrid180Degrees = function () {
		var vector = vec3.create([-centerX, -centerY, 0]);
		mat4.translate(matrix, vector);
		mat4.rotateZ(matrix, Math.PI/2);
		vec3.negate(vector);
		mat4.translate(matrix, vector);
		repaint();
	};
	
	this.toString = function() {
		var s = "";
		s += "Canvas width: " + canvasWidth + "\n"; //(" + minCanvasWidth + " - " + maxCanvasWidth + ")
		s += "Canvas height: " + canvasHeight + "\n"; //(" + minCanvasHeight + " - " + maxCanvasHeight + ")
		s += "Grid columns: " + gridColumns + "\n"; //(" + minGridColumns + " - " + maxGridColumns + ")
		s += "Grid rows: " + gridRows + "\n"; //(" + minGridRows + " - " + maxGridRows + ")
		s += "Cell size: " + cellSize + "\n"; //(" + minCellSize + " - " + maxCellSize + ")
		s += "Line width: " + lineWidth + "\n"; //(" + minLineWidth + " - " + maxLineWidth + ")
		s += "X-Shift: " + that.getXShift() + "\n";
		s += "Y-Shift: " + that.getYShift() + "\n";
		return s;
	};
	
	this.on = function (eventName, callback) {
		eventEmitter.addListener(eventName, callback);
	};
	
	this.once = function (eventName, callback) {
		eventEmitter.once(eventName, callback);
	};
	
	this.removeEventListener = function (eventName, callback) {
		eventEmitter.removeEventListener(eventName, callback);
	};

	var widthFactor = Math.sqrt(canvasWidth / divWidth);
	var heightFactor = Math.sqrt(canvasHeight / divHeight);
	
	if (widthFactor > heightFactor) {
		cellSize = Math.floor(cellSize / widthFactor);
	} else {
		cellSize = Math.floor(cellSize / heightFactor);	
	}
	
	canvasWidth = divWidth;
	canvasHeight = divHeight;
	
	gridColumns = Math.floor((canvasWidth - lineWidth) / (cellSize + lineWidth));
	gridRows = Math.floor((canvasHeight - lineWidth) / (cellSize + lineWidth));

	repaint();	
	
	function gridClicked(event) {
		var point = renderer.getClickedPoint(event);
		eventEmitter.emit("canvasClicked", point);
		var gridCoordinate = getGridCoordinate(point);
		eventEmitter.emit("gridCoordinateClicked", gridCoordinate);
		var gameCoordinate = getGameCoordinate(gridCoordinate);
		eventEmitter.emit("gameCoordinateClicked", gameCoordinate);
		var gridImage = that.getGridImage(gridCoordinate.x, gridCoordinate.y);
		if (gridImage)
			eventEmitter.emit("gridImageClicked", gridImage);
	}
		
	renderer.element.addEventListener("mousedown", gridClicked);
	window.onresize = windowResized;
}


	//http://adomas.org/javascript-mouse-wheel/