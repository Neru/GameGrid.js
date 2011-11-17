/**
 * TODO:
 * check changeCanvasHeight cellSizeOnResize
 * weights (^1/2) for changeCanvasSize
 * image and geo coordinate system
 * coordinate change listener (mouse over or http://www.html5canvastutorials.com/advanced/html5-canvas-path-mouseover/)
 * mark cell
 * 
 * Enhancements:
 * improve getGridCoordinate [which line clicked, where outside grid]
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
	var cellWidth = 50;
	var lineWidth = context.lineWidth = 1;
	
	var lineWidthFunction = function (cellWidth) {
		return 1;
	};

	var minCanvasWidth = 1;
	var maxCanvasWidth = Number.MAX_VALUE;
	var minCanvasHeight = 1;
	var maxCanvasHeight = Number.MAX_VALUE;
	var minGridColumns = 1;
	var maxGridColumns = Number.MAX_VALUE;
	var minGridRows = 1;
	var maxGridRows = Number.MAX_VALUE;
	var minCellWidth = 1;
	var maxCellWidth = Number.MAX_VALUE;
	var minLineWidth = 0;
	var maxLineWidth = Number.MAX_VALUE;
	
	var gridCellClicked;
	var cellWidthChanged;
	
	var gridImages = [];
	var matrix = mat4.create();
	mat4.identity(matrix);
	
	var backgroundImage;
	var backgroundColor = "#EEEEEE";
	var lineColor = "#000000"
	
	var ee = new EventEmitter();

	var drawGridImage = function (xCoord, yCoord, imageURL) {
		var img = new Image();
		var dx = that.getXShift() + lineWidth + xCoord * (cellWidth + lineWidth);
		var dy = that.getYShift() + lineWidth + yCoord * (cellWidth + lineWidth);
		var dw = cellWidth;

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
		alert(that.toString());
			
		//draw either background image or color
		drawBackground(); 
		
		context.fillStyle = lineColor;
		context.beginPath();
		// vertical lines:
		// | | | |
		// | | | |
		for (var i = 0; i <= gridColumns; i++) {
			context.moveTo(that.getXShift() + (lineWidth / 2) + i * (cellWidth + lineWidth), that.getYShift());
			context.lineTo(that.getXShift() + (lineWidth / 2) + i * (cellWidth + lineWidth), that.getYShift() + that.getGridHeight());
		}
		// horizontal lines:
		//  _ _ _
		//  _ _ _
		//  _ _ _
		for (var j = 0; j <= gridRows; j++) {
			context.moveTo(that.getXShift(), that.getYShift() + (lineWidth / 2) + j * (cellWidth + lineWidth));
			context.lineTo(that.getXShift() + that.getGridWidth(), that.getYShift() + (lineWidth / 2) + j * (cellWidth + lineWidth));
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

		var d = lineWidth + cellWidth;

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
	
	var changeLineWidth = function (newCellWidth) {
		var newLineWidth = lineWidthFunction(newCellWidth);
		
		minMaxCheck(minLineWidth, maxLineWidth, newLineWidth);
		
		newCellWidth = cellWidth - (newLineWidth - lineWidth);
		if (newCellWidth < minCellWidth) {
			newLineWidth = newLineWidth - (newCellWidth - minCellWidth);
			newCellWidth = minCellWidth;
		} else if (newCellWidth > maxCellWidth) {
			newCellWidth = maxCellWidth;
		}
		
		that.setLineWidth(newLineWidth);		
	};
	
	this.getGridWidth = function() {
		return lineWidth + gridColumns * (cellWidth + lineWidth);
	};

	this.getGridHeight = function() {
		return lineWidth + gridRows * (cellWidth + lineWidth);
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
	
	this.getMinCellWidth = function() {
		return minCellWidth;
	};
	
	this.getCellWidth = function() {
		return cellWidth;
	};
	
	this.getMaxCellWidth = function() {
		return maxCellWidth;
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
	
	this.setMinCanvasWidth = function (newMinCanvasWidth) {
		minCheck(newMinCanvasWidth, canvasWidth);
		minCanvasWidth = newMinCanvasWidth;
	};
	
	this.setCanvasWidth = function (newCanvasWidth) {
		canvas.width = newCanvasWidth;
		canvasWidth = newCanvasWidth;
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
	};
	
	this.setMaxGridRows = function (newMaxGridRows) {
		maxCheck(newMaxGridRows, gridRows);
		maxGridRows = newMaxGridRows;
	};
	
	this.setMinCellWidth = function (newMinCellWidth) {
		minCheck(newMinCellWidth, cellWidth);
		minCellWidth = newMinCellWidth;
	};
	
	this.setCellWidth = function (newCellWidth) {
		cellWidth = newCellWidth;
		ee.emit("cellSizeChanged", newCellWidth);
	};
		
	this.setMaxCellWidth = function (newMaxCellWidth) {
		maxCheck(newMaxCellWidth, cellWidth);
		maxCellWidth = newMaxCellWidth;
	}; 
	
	this.setMinLineWidth = function (newMinLineWidth) {
		minCheck(newMinLineWidth, lineWidth);
		minLineWidth = newMinLineWidth;
	};
	
	this.setLineWidth = function (newLineWidth) {
		lineWidth = newLineWidth;
		context.lineWidth = lineWidth;
	};	
	
	this.setMaxLineWidth = function (newMaxLineWidth) {
		maxCheck(newMaxLineWidth, lineWidth);
		maxLineWidth = newMaxLineWidth;
	};
	
	this.setLineColor = function(newLineColor) {
		lineColor = newLineColor;
	};
	
	this.setBackgroundColor = function(newBackgroundColor) {
		backgroundColor = newBackgroundColor;
	};
	
	this.changeCanvasWidth = function (newCanvasWidth, option) {
		minMaxCheck(minCanvasWidth, maxCanvasWidth, newCanvasWidth);
	
		switch(option) {
		case "gridOnResize":
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellWidth + lineWidth));
			
			if(newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellWidth + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
			} 
			that.setGridColumns(newGridColumns);
			break;
		case "cellWidthOnResize":
			var newCellWidth = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			if(newCellWidth < minCellWidth) {
				newCellWidth = minCellWidth;
				newCanvasWidth = gridColumns * (minCellWidth + lineWidth) + lineWidth;
			} else if(newCellWidth > maxCellWidth) {
				newCellWidth = maxCellWidth;
			} 
			that.setCellWidth(newCellWidth);
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
			var newGridRows = Math.floor((newCanvasHeight - lineWidth) / (cellWidth + lineWidth));
			
			if (newGridRows < minGridRows) {
				newGridRows = minGridRows;
				newCanvasHeight = minGridRows * (cellWidth + lineWidth) + lineWidth;
			} else if (newGridRows > maxGridRows) {
				newGridRows = maxGridRows;
			} 
			that.setGridRows(newGridRows);
			break;
		case "cellWidthOnResize":
			var newCellWidth = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
			if (newCellWidth < minCellWidth) {
				newCellWidth = minCellWidth;
				newCanvasHeight = gridRows * (minCellWidth + lineWidth) + lineWidth;
			} else if(newCellWidth > maxCellWidth) {
				newCellWidth = maxCellWidth;
			} 
			that.setCellWidth(newCellWidth);
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
			var newGridColumns = Math.floor((newCanvasWidth - lineWidth) / (cellWidth + lineWidth));
			
			if(newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				newCanvasWidth = minGridColumns * (cellWidth + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
			} 
			
			var newGridRows = Math.floor((newCanvasHeight - lineWidth) / (cellWidth + lineWidth));
			
			if(newGridRows < minGridRows) {
				newGridRows = minGridRows;
				newCanvasHeight = minGridRows * (cellWidth + lineWidth) + lineWidth;
			} else if(newGridColumns > maxGridRows) {
				newGridRows = maxGridRows;
			} 
			
			that.setGridColumns(newGridColumns);
			that.setGridRows(newGridRows);
			break;
		case "cellWidthOnResize":
			var cellWidthForColumns = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			if(cellWidthForColumns < minCellWidth) {
				cellWidthForColumns = minCellWidth;
				newCanvasWidth = gridColumns * (minCellWidth + lineWidth) + lineWidth;
			} else if(cellWidthForColumns > maxCellWidth) {
				cellWidthForColumns = maxCellWidth;
			} 
			
			var cellWidthForRows = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
			if (cellWidthForRows < minCellWidth) {
				cellWidthForRows = minCellWidth;
				newCanvasHeight = gridRows * (minCellWidth + lineWidth) + lineWidth;
			} else if (cellWidthForRows > maxCellWidth) {
				cellWidthForRows = maxCellWidth;
			} 
			
			if (cellWidthForColumns < cellWidthForRows) {
				that.setCellWidth(cellWidthForColumns);
			} else {
				that.setCellWidth(cellWidthForRows);
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
			var newCanvasWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
			
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellWidth + lineWidth));
			}
			that.setCanvasWidth(newCanvasWidth);
			break;
		case "cellWidthOnResize":		
			var newCellWidth = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
			
			if (newCellWidth < minCellWidth) {
				newCellWidth = minCellWidth;
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellWidth + lineWidth));
			} else if (newCellWidth > maxCellWidth) {
				newCellWidth = maxCellWidth;
			}	
			that.setCellWidth(newCellWidth);
			break;
		default:
			var newGridWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellWidth + lineWidth));
			}
		}
		
		that.setGridColumns(newGridColumns);
		repaint();
	};	
	
	this.changeGridRows = function (newGridRows, option) {
		minMaxCheck(minGridRows, newGridRows, newGridRows);

		switch(option) {
		case "canvasOnResize":
			var newCanvasHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				newGridRows = Math.floor((maxCanvasHeight - lineWidth) / (cellWidth + lineWidth));
			}
				
			that.setCanvasHeight(newCanvasHeight);
			break;
		case "cellWidthOnResize":		
			var newCellWidth = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
			
			if (newCellWidth < minCellWidth) {
				newCellWidth = minCellWidth;
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
			} else if (newCellWidth > maxCellWidth) {
				newCellWidth = maxCellWidth;
			}	
			that.setCellWidth(newCellWidth);
			break;
		default:
			var newGridHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;

			if (newGridHeight > canvasHeight) {
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
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
			var newCanvasWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
			
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellWidth + lineWidth));
			}
			
			var newCanvasHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				newGridColumns = Math.floor((maxCanvasHeight - lineWidth) / (cellWidth + lineWidth));
			}
				
			that.setCanvasWidth(newCanvasWidth);
			that.setCanvasHeight(newCanvasHeight);
			break;
		case "cellWidthOnResize":
			var cellWidthForColumns = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
			
			if (cellWidthForColumns < minCellWidth) {
				cellWidthForColumns = minCellWidth;
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellWidth + lineWidth));
			} else if (cellWidthForColumns > maxCellWidth) {
				cellWidthForColumns = maxCellWidth;
			}
			var cellWidthForRows = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
			
			if (cellWidthForRows < minCellWidth) {
				cellWidthForRows = minCellWidth;
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
			} else if (cellWidthForRows > maxCellWidth) {
				cellWidthForRows = maxCellWidth;
			}
			
			if (cellWidthForColumns < cellWidthForRows) {
				that.setCellWidth(cellWidthForColumns);
			} else {
				that.setCellWidth(cellWidthForRows);
			}
			break;
		default:
			var newGridWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellWidth + lineWidth));
			}	
			var newGridHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;

			if (newGridHeight > canvasHeight) {
				newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
			}
		}
		that.setGridColumns(newGridColumns);
		that.setGridRows(newGridRows);

		repaint();
	};
	
	this.changeCellWidth = function (newCellWidth, option) {
		minMaxCheck(minCellWidth, maxCellWidth, newCellWidth);
		
		var cellWidthForColumns;
		var cellWidthForRows;
		switch (option) {
		case "canvasOnResize":
			var newCanvasWidth = gridColumns * (lineWidth + newCellWidth) + lineWidth;	
				
			if (newCanvasWidth < minCanvasWidth) {
				newCanvasWidth = minCanvasWidth;
				cellWidthForColumns = newCellWidth;
			} else if (newCanvasWidth > maxCanvasWidth) {
				newCanvasWidth = maxCanvasWidth;
				cellWidthForColumns = Math.floor(((maxCanvasWidth - lineWidth) / gridColumns) - lineWidth);
			} else {
				cellWidthForColumns = newCellWidth;
			}
		
			var newCanvasHeight = gridRows * (lineWidth + newCellWidth) + lineWidth;
			
			if (newCanvasHeight < minCanvasHeight) {
				newCanvasHeight = minCanvasHeight;
				cellWidthForRows = newCellWidth;
			} else if (newCanvasHeight > maxCanvasHeight) {
				newCanvasHeight = maxCanvasHeight;
				cellWidthForRows = Math.floor(((maxCanvasHeight - lineWidth) / gridRows) - lineWidth);
			} else {				
				cellWidthForRows = newCellWidth;
			}
	
			that.setCanvasWidth(newCanvasWidth);		
			that.setCanvasHeight(newCanvasHeight);
			break;
			
		case "gridOnResize":
			var newGridColumns = Math.floor((canvasWidth - lineWidth) / (lineWidth + newCellWidth));
			
			if (newGridColumns < minGridColumns) {
				newGridColumns = minGridColumns;
				cellWidthForColumns = Math.floor(((canvasWidth - lineWidth) / minGridColumns) - lineWidth);
			} else if (newGridColumns > maxGridColumns) {
				newGridColumns = maxGridColumns;
				cellWidthForColumns = newCellWidth;
			} else {
				cellWidthForColumns = newCellWidth;
			}
			
			var newGridRows = Math.floor((canvasHeight - lineWidth) / (lineWidth + newCellWidth));
			
			if (newGridRows < minGridRows) {
				newGridRows = minGridRows;
				cellWidthForRows = Math.floor(((canvasHeight - lineWidth) / minGridRows) - lineWidth);
			} else if (newGridRows > maxGridRows) {
				newGridRows = maxGridRows;
				cellWidthForRows = newCellWidth;
			} else {
				cellWidthForRows = newCellWidth;
			}
	
			that.setGridColumns(newGridColumns);		
			that.setGridRows(newGridRows);
			break;
			
		default:
			var newGridWidth = gridColumns * (lineWidth + newCellWidth) + lineWidth;
			var newGridHeight = gridRows * (lineWidth + newCellWidth) + lineWidth;
			
			if (newGridWidth > canvasWidth) {
				cellWidthForColumns = Math.floor(((canvasWidth - lineWidth) / gridColumns) - lineWidth);
			} else {
				cellWidthForColumns = newCellWidth;
			}
			
			if (newGridHeight > canvasHeight) {
				cellWidthForRows = Math.floor(((canvasHeight - lineWidth) / gridRows) - lineWidth);
			} else {
				cellWidthForRows = newCellWidth;
			}
		}
		
		if (cellWidthForColumns < cellWidthForRows) {
			newCellWidth = cellWidthForColumns;
		} else {
			newCellWidth = cellWidthForRows;
		}
		
		that.setCellWidth(newCellWidth);
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
	
	this.setBackgroundColor = function (color) {
		backgroundColor = color;
		drawBackground = drawBackgroundColor;
	};
	
	this.setBackgroundImage = function (imageURL) {
		backgroundImage = imageURL;
		drawBackground = drawBackgroundImage;
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
		//canvasOnResize, gridOnResize, cellWidthOnResize
		var vector = vec3.create([-centerX, -centerY, 0]);
		mat4.translate(matrix, vector);
		mat4.rotateZ(matrix, Math.PI/2);
		vec3.negate(vector);
		mat4.translate(matrix, vector);
		repaint();
	};
	
	this.rotateGrid90DegreesAntiClockWise = function () {
		//TODO swap changeGridColumns and Rows and canvasWidth and Height
		//canvasOnResize, gridOnResize, cellWidthOnResize
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
		s += "Cell width: " + cellWidth + "\n"; //(" + minCellWidth + " - " + maxCellWidth + ")
		s += "Line width: " + lineWidth + "\n"; //(" + minLineWidth + " - " + maxLineWidth + ")
		s += "X-Shift: " + that.getXShift() + "\n";
		s += "Y-Shift: " + that.getYShift() + "\n";
		return s;
	};
	
	this.addEventListener = function (eventName, callback) {
		ee.addEventListener(eventName, callback);
	};
	
	this.on = addEventListener;
	
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
		cellWidth = Math.floor(cellWidth / widthFactor);
	} else {
		cellWidth = Math.floor(cellWidth / heightFactor);	
	}
	
	gridColumns = Math.floor((canvasWidth - lineWidth) / (cellWidth + lineWidth));
	gridRows = Math.floor((canvasHeight - lineWidth) / (cellWidth + lineWidth));

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