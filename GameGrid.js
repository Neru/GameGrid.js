/**
 * TODO:
 * check changeCanvasHeight cellSizeOnResize & changeCellSize
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

/**
 * (c) by Neru, 2011
 */
function GameGrid(newCanvas) {
	
	if (!(newCanvas instanceof HTMLCanvasElement)) {
		throw "Not an HTML Canvas";
	}
		
	var that = this;
	
	var canvas = newCanvas;
	var context = canvas.getContext('2d');
	var canvasWidth = 480;
	var canvasHeight = 480;

	var gridColumns = 9; //x
	var gridRows = 9; //y
	var cellSize = 50;
	var lineWidth = context.lineWidth = 1;
	
	var lineWidthFunction = function (cellSize) {
		return 1;
	};

	var minCanvasWidth = 1;
	var maxCanvasWidth = 10000;
	var minCanvasHeight = 1;
	var maxCanvasHeight = 10000;
	var minGridColumns = 1;
	var maxGridColumns = 100;
	var minGridRows = 1;
	var maxGridRows = 100;
	var minCellSize = 1;
	var maxCellSize = Number.MAX_VALUE;
	var minLineWidth = 0;
	var maxLineWidth = Number.MAX_VALUE;
	
	var gridCellClicked;
	var cellSizeChanged;
	
	var gridImages = [];
	var matrix = mat4.create();
	mat4.identity(matrix);
	
	var backgroundImage;
	var backgroundColor = "#DDDDDD";
	var lineColor = "#000000"
	
	var ee = new EventEmitter();

	var drawGridImage = function (xCoord, yCoord, imageURL) {
		var img = new Image();
		var dx = that.getXShift() + lineWidth + xCoord * (cellSize + lineWidth);
		var dy = that.getYShift() + lineWidth + yCoord * (cellSize + lineWidth);
		var dw = cellSize;

		img.onload = function() {
			context.drawImage(img, dx, dy, dw, dw);
		};
		img.src = imageURL;
	};
	
	var drawBackgroundColor = function () {
		context.fillStyle = backgroundColor;
		context.fillRect(0, 0, canvasWidth, canvasHeight);
	};
	
	var drawBackgroundImage = function () {
		var img = Image();
		img.onload = function() {
			context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
		};
		img.src = backgroundImage;
	};
		
	var drawBackground = drawBackgroundColor;

	var repaint = function() {
		//alert(that.toString());
			
		//draw either background image or color
		drawBackground(); 
		
		context.strokeStyle = lineColor;
		context.beginPath();
		// vertical lines:
		// | | | |
		// | | | |
		for (var i = 0; i <= gridColumns; i++) {
			context.moveTo(that.getXShift() + (lineWidth / 2) + i * (cellSize + lineWidth), that.getYShift());
			context.lineTo(that.getXShift() + (lineWidth / 2) + i * (cellSize + lineWidth), that.getYShift() + that.getGridHeight());
		}
		// horizontal lines:
		//  _ _ _
		//  _ _ _
		//  _ _ _
		for (var j = 0; j <= gridRows; j++) {
			context.moveTo(that.getXShift(), that.getYShift() + (lineWidth / 2) + j * (cellSize + lineWidth));
			context.lineTo(that.getXShift() + that.getGridWidth(), that.getYShift() + (lineWidth / 2) + j * (cellSize + lineWidth));
		}
		context.stroke();
		
		//draw images for each grid cell
		/*
		for (j = 0; j <= gridRows; j++) {
			for (i = 0; i <= gridColumns; i++) {
				//matrix multiplication
				var imageURL = that.getGridImage(i, j);
				if (imageURL !== null) {
					drawGridImage(i, j, imageURL);
				}
			}
		}
		*/
	};
	
	var minCheck = function (newMin, value, minMin) {
		if (newMin > value) {
			throw "New Minimum too large.";
		} else if (newMin < minMin) {
			throw "New Minimum smaller than the smallest minimum.";
		}
	};
	
	var maxCheck = function (newMax, value, maxMax) {
		if (newMax < value) {
			throw "New Maximum too small.";
		} else if (newMax > maxMax) {
			throw "New Maximum bigger than the biggest Maximum.";
		}
	};
	
	var minMaxCheck = function (min, max, newValue) {
		if (newValue < min) {
			throw "New Value too small.";
		} else if (newValue > max) {
			throw "New Value too large.";			
		}
	};
	
	//from http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
	var getClickedPointOnCanvas = function(e) {
		var x;
		var y;
		if (e.pageX !== undefined && e.pageY !== undefined) {
			x = e.pageX;
			y = e.pageY;
		} else {
			x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		//offset of the canvas
		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;

		return {x: x, y: y};
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
	
	var changeLineWidth = function (newCellSize) {
		var newLineWidth = lineWidthFunction(newCellSize);
		
		minMaxCheck(minLineWidth, maxLineWidth, newLineWidth);
		
		newCellSize = cellSize - (newLineWidth - lineWidth);
		if (newCellSize < minCellSize) {
			newLineWidth = newLineWidth - (newCellSize - minCellSize);
			newCellSize = minCellSize;
		} else if (newCellSize > maxCellSize) {
			newCellSize = maxCellSize;
		}
		
		that.setLineWidth(newLineWidth);		
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
		return canvas.width;
	};
	
	this.getMaxCanvasWidth = function() {
		return maxCanvasWidth;
	};
	
	this.getMinCanvasHeight = function() {
		return minCanvasHeight;
	};
	
	this.getCanvasHeight = function() {
		return canvas.height;
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
	
	this.getBackgroundColor = function() {
		return backgroundColor;
	};
	
	this.setMinCanvasWidth = function (newMinCanvasWidth) {
		minCheck(newMinCanvasWidth, canvasWidth);
		minCanvasWidth = newMinCanvasWidth;
	};
	
	this.setCanvasWidth = function (newCanvasWidth) {
		canvas.width = newCanvasWidth;
		canvasWidth = newCanvasWidth;
		ee.emit("canvasWidthChanged", newCanvasWidth);
	};
	
	this.setMaxCanvasWidth = function (newMaxCanvasWidth) {
		maxCheck(newMaxCanvasWidth, canvasWidth);
		maxCanvasWidth = newMaxCanvasWidth;
	};
	
	this.setMinCanvasHeight = function (newMinCanvasHeight) {
		minCheck(newMinCanvasHeight, canvasHeight);
		minCanvasHeight = newMinCanvasHeight;
	};
		
	this.setCanvasHeight = function (newCanvasHeight) {
		canvas.height = newCanvasHeight;
		canvasHeight = newCanvasHeight;
		ee.emit("canvasHeightChanged", newCanvasHeight);
	};
	
	this.setMaxCanvasHeight = function (newMaxCanvasHeight) {
		maxCheck(newMaxCanvasHeight, canvasHeight);
		maxCanvasHeight = newMaxCanvasHeight;
	};
		
	this.setMinGridColumns = function (newMinGridColumns) {
		minCheck(newMinGridColumns, gridColumns);
		minGridColumns = newMinGridColumns;
	};
	
	this.setGridColumns = function (newGridColumns) {
		gridColumns = newGridColumns;
		ee.emit("gridColumnsChanged", newGridColumns);
	};
	
	this.setMaxGridColumns = function (newMaxGridColumns) {
		maxCheck(newMaxGridColumns, gridColumns);
		maxGridColumns = newMaxGridColumns;
	};
	
	this.setMinGridRows = function (newMinGridRows) {
		minCheck(newMinGridRows, gridRows);
		minGridRows = newMinGridRows;
	};
	
	this.setGridRows = function (newGridRows) {
		gridRows = newGridRows;
		ee.emit("gridRowsChanged", newGridRows);
	};
	
	this.setMaxGridRows = function (newMaxGridRows) {
		maxCheck(newMaxGridRows, gridRows);
		maxGridRows = newMaxGridRows;
	};
	
	this.setMinCellSize = function (newMinCellSize) {
		minCheck(newMinCellSize, cellSize);
		minCellSize = newMinCellSize;
	};
	
	this.setCellSize = function (newCellSize) {
		cellSize = newCellSize;
		ee.emit("cellSizeChanged", newCellSize);
	};
		
	this.setMaxCellSize = function (newMaxCellSize) {
		maxCheck(newMaxCellSize, cellSize);
		maxCellSize = newMaxCellSize;
	}; 
	
	this.setMinLineWidth = function (newMinLineWidth) {
		minCheck(newMinLineWidth, lineWidth);
		minLineWidth = newMinLineWidth;
	};
	
	this.setLineWidth = function (newLineWidth) {
		lineWidth = newLineWidth;
		context.lineWidth = lineWidth;
		ee.emit("lineWidthChanged", newLineWidth);
	};	
	
	this.setMaxLineWidth = function (newMaxLineWidth) {
		maxCheck(newMaxLineWidth, lineWidth);
		maxLineWidth = newMaxLineWidth;
	};
	
	this.setLineColor = function(newLineColor) {
		lineColor = newLineColor;
	};
	
	this.setLineOpacity = function(newLineOpacity) {
		
	};
	
	this.setBackgroundColor = function(newBackgroundColor) {
		backgroundColor = newBackgroundColor;
	};
	
	this.setBackgroundOpacity = function(newBackgroundOpacity) {
		
	};
	
	this.setBackgroundImage = function (imageURL) {
		backgroundImage = imageURL;
		drawBackground = drawBackgroundImage;
	};
	
	this.changeCanvasWidth = function (newCanvasWidth, option) {
		minMaxCheck(minCanvasWidth, maxCanvasWidth, newCanvasWidth);
	
		switch(option) {
		case "gridOnResize":
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellSize + lineWidth));
			
			if(newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellSize + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
			} 
			that.setGridColumns(newGridColumns);
			break;
		case "cellSizeOnResize":
			var newCellSize = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			if(newCellSize < minCellSize) {
				newCellSize = minCellSize;
				newCanvasWidth = gridColumns * (minCellSize + lineWidth) + lineWidth;
			} else if(newCellSize > maxCellSize) {
				newCellSize = maxCellSize;
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
			var newCellSize = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
			if (newCellSize < minCellSize) {
				newCellSize = minCellSize;
				newCanvasHeight = gridRows * (minCellSize + lineWidth) + lineWidth;
			} else if(newCellSize > maxCellSize) {
				newCellSize = maxCellSize;
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
		minMaxCheck(minCanvasWidth, maxCanvasWidth, newCanvasWidth);
		minMaxCheck(minCanvasHeight, maxCanvasHeight, newCanvasHeight);
	
		switch(option) {
		case "gridOnResize":
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellSize + lineWidth));
			
			if(newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellSize + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridColumns) {
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
			var cellSizeForColumns = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			if(cellSizeForColumns < minCellSize) {
				cellSizeForColumns = minCellSize;
				newCanvasWidth = gridColumns * (minCellSize + lineWidth) + lineWidth;
			} else if(cellSizeForColumns > maxCellSize) {
				cellSizeForColumns = maxCellSize;
			} 
			
			var cellSizeForRows = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
			if (cellSizeForRows < minCellSize) {
				cellSizeForRows = minCellSize;
				newCanvasHeight = gridRows * (minCellSize + lineWidth) + lineWidth;
			} else if (cellSizeForRows > maxCellSize) {
				cellSizeForRows = maxCellSize;
			} 
			
			if (cellSizeForColumns < cellSizeForRows) {
				that.setCellSize(cellSizeForColumns);
			} else {
				that.setCellSize(cellSizeForRows);
			}
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
			var newCellSize = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
			
			if (newCellSize < minCellSize) {
				newCellSize = minCellSize;
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellSize + lineWidth));
			} else if (newCellSize > maxCellSize) {
				newCellSize = maxCellSize;
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
			var newCellSize = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
			
			if (newCellSize < minCellSize) {
				newCellSize = minCellSize;
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
			} else if (newCellSize > maxCellSize) {
				newCellSize = maxCellSize;
			}	
			that.setCellSize(newCellSize);
			break;
		default:
			var newGridHeight = newGridRows * (lineWidth + cellSize) + lineWidth;

			if (newGridHeight > canvasHeight) {
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
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
			var cellSizeForColumns = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
			
			if (cellSizeForColumns < minCellSize) {
				cellSizeForColumns = minCellSize;
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellSize + lineWidth));
			} else if (cellSizeForColumns > maxCellSize) {
				cellSizeForColumns = maxCellSize;
			}
			var cellSizeForRows = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
			
			if (cellSizeForRows < minCellSize) {
				cellSizeForRows = minCellSize;
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellSize + lineWidth));
			} else if (cellSizeForRows > maxCellSize) {
				cellSizeForRows = maxCellSize;
			}
			
			if (cellSizeForColumns < cellSizeForRows) {
				that.setCellSize(cellSizeForColumns);
			} else {
				that.setCellSize(cellSizeForRows);
			}
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
	};
	
	this.changeBackgroundColor = function (newColor) {
		that.setBackgroundColor(newColor);
		repaint();
	};
	
	this.changeLineColor = function (newColor) {
		that.setLineColor(newColor);
		repaint();
	};
	
	this.addGridImage = function (xCoord, yCoord, imageURL) {
		if (xCoord < 0 || xCoord > gridColumns || yCoord < 0 || yCoord > gridRows) {
			throw "The image lies outside the grid.";
		}
		gridImages[xCoord][yCoord] = imageURL;
	};
	
	this.getImageOnGrid = function (xCoord, yCoord) {
		return gridImages[xCoord][yCoord];
	};
	
	this.removeGridImage = function (xCoord, yCoord) {
		gridImages[xCoord][yCoord] = null;
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
		ee.addListener(eventName, callback);
	};
	
	this.once = function (eventName, callback) {
		ee.once(eventName, callback);
	};
	
	this.removeEventListener = function (eventName, callback) {
		ee.removeEventListener(eventName, callback);
	};

	var widthFactor = Math.sqrt(canvasWidth / canvas.width);
	var heightFactor = Math.sqrt(canvasHeight / canvas.height);
	
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	
	if (widthFactor > heightFactor) {
		cellSize = Math.floor(cellSize / widthFactor);
	} else {
		cellSize = Math.floor(cellSize / heightFactor);	
	}
	
	gridColumns = Math.floor((canvasWidth - lineWidth) / (cellSize + lineWidth));
	gridRows = Math.floor((canvasHeight - lineWidth) / (cellSize + lineWidth));

	ee.on("cellSizeChanged", changeLineWidth);

	repaint();	
	
	function canvasClicked(e) {
		var point = getClickedPointOnCanvas(e);
		ee.emit("canvasClicked", point);
		var gridCoordinate = getGridCoordinate(point);
		ee.emit("gridCoordinateClicked", gridCoordinate);
		var gameCoordinate = getGameCoordinate(gridCoordinate);
		ee.emit("gameCoordinateClicked", gameCoordinate);
		var url = that.getImageOnGrid(gridCoordinate.x, gridCoordinate.y);
		ee.emit("imageClicked", url);
	}
		
	canvas.addEventListener("mousedown", canvasClicked);
}

/*
	var canvas2 = $('<canvas/>').attr({
		width : 100,
		height : 200,
		id : "bla"
	}).appendTo('body');
	context = canvas2.get(0).getContext("2d");
	context.fillStyle = "#d00";
	context.fillRect(0, 0, 100, 200);
*/

	//http://adomas.org/javascript-mouse-wheel/