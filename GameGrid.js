function GameGrid(newCanvas) {
	
	var canvas;
	var context;
	var canvasWidth;
	var canvasHeight;

	var gridColumns = 9; //x
	var gridRows = 9; //y
	var cellWidth = 50;
	var lineWidth;
	
	var lineWidthFunction = function (cellWidth) {
		return 1;
	};

	var minCanvasWidth = 1;
	var maxCanvasWidth = Number.MAX_VALUE;
	var minCanvasHeight = 1;
	var maxCanvasHeight = Number.MAX_VALUE;
	var minGridColumns = 1;
	var maxGridColumns = 100;
	var minGridRows = 1;
	var maxGridRows = 100;
	var minCellWidth = 1;
	var maxCellWidth = 1000;
	var minLineWidth = 0;
	var maxLineWidth = 10;

	var canvasOnResize = false;
	var cellWidthOnResize = true;
	var squareNumberOnResize = false;
	
	var gridCellClicked;
	var cellWidthChanged;
	
	var that = this;

	var repaint = function() {
		alert(canvasWidth + " " + canvasHeight + " " + gridColumns + " " + gridRows);
		alert(cellWidth + " " + lineWidth + " " + that.getGridWidth() + " " + that.getGridHeight());
		alert(that.getXShift() + " " + that.getYShift());
		context.fillStyle = "#c00";
		context.fillRect(0, 0, canvasWidth, canvasHeight);
		//context.clearRect(0, 0, canvasWidth, canvasHeight);
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
	};
	
	var minMaxCheck = function (min, max, value) {
		if (value < min) {
			throw "New Value too small.";
		}
		if (value > max) {
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
	
	var getClickedGridCell = function(clickedPoint) {
		var x = clickedPoint.x - that.getXShift();
		var y = clickedPoint.y - that.getYShift();

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
	
	var canvasClicked = function (e) {
		var point = getClickedPointOnCanvas(e);
		point = getClickedGridCell(point);
		//trigger callback
		gridCellClicked(point);
	};
	
	var changeLineWidth = function (newCellWidth) {
		var newLineWidth = lineWidthFunction(newCellWidth);
		
		positiveIntegerCheck(newLineWidth);
		minMaxCheck(minLineWidth, maxLineWidth, newLineWidth);
		
		newCellWidth = cellWidth - (newLineWidth - lineWidth);
		if (newCellWidth < minCellWidth) {
			newLineWidth = newLineWidth - (newCellWidth - minCellWidth);
			newCellWidth = minCellWidth;
		} else if (newCellWidth > maxCellWidth) {
			newCellWidth = maxCellWidth;
		}
		
		setLineWidth(newLineWidth);		
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
	
	if (!(newCanvas instanceof HTMLCanvasElement)) {
		throw "Not an HTML Canvas";
	}
	
	canvas = newCanvas;
	context = canvas.getContext('2d');
	canvasWidth = 480;
	canvasHeight = 480;
	lineWidth = context.lineWidth = 1;
	
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

	repaint();
	
	//event.on("cellSizeChanged", changeLineWidth);
}
/*

//pattern: http://www.yuiblog.com/blog/2007/06/12/module-pattern/
MapGrid = function() {


	return {	
		
		getMinCanvasWidth: function() {
			return minCanvasWidth;
		},

		getCanvasWidth: function() {
			return canvas.width;
		},
		
		getMaxCanvasWidth: function() {
			return maxCanvasWidth;
		},
		
		getMinCanvasHeight: function() {
			return minCanvasHeight;
		},
		
		getCanvasHeight: function() {
			return canvas.height;
		},
		
		getMaxCanvasHeight: function() {
			return maxCanvasHeight;
		},
		
		getMinGridColumns: function() {
			return minGridColumns;
		},

		getGridColumns: function() {
			return gridColumns;
		},
		
		getMaxGridColumns: function() {
			return maxGridColumns;
		},
		
		getMinGridRows: function() {
			return minGridRows;
		},
		
		getGridRows: function() {
			return gridRows;
		},
		
		getMaxGridRows: function() {
			return maxGridRows;
		},
		
		getMinCellWidth: function() {
			return minCellWidth;
		},
		
		getCellWidth: function() {
			return cellWidth;
		},
		
		getMaxCellWidth: function() {
			return maxCellWidth;
		},
		
		getMinLineWidth: function() {
			return minLineWidth;
		},
		
		getLineWidth: function() {
			return lineWidth;
		},
		
		getMaxLineWidth: function() {
			return maxLineWidth;
		},
				
				
		setCanvasWidth : function(newCanvasWidth) {
			canvas.width = newCanvasWidth;
			canvasWidth = newCanvasWidth;
		},
		
		setCanvasHeight : function(newCanvasHeight) {
			canvas.height = newCanvasHeight;
			canvasHeight = newCanvasHeight;
		},
			
		setGridRows : function(newGridRows) {
			gridRows = newGridRows;
		},
		
		setGridColumns : function(newGridColumns) {
			gridColumns = newGridColumns;
		},
		
		setMinCellWidth: function(newMinCellWidth) {
			minCheck(newMinCellWidth, cellWidth);
			minCellWidth = newMinCellWidth;
		},
		
		setCellWidth: function(newCellWidth) {
			cellWidth = newCellWidth;
			
			event.emit("cellSizeChanged", newCellWidth);
		},
			
		setMaxCellWidth: function(newMaxCellWidth) {
			maxCheck(newMaxCellWidth, cellWidth);
			maxCellWidth = newMaxCellWidth;
		}, 
		
		setLineWidth: function(newLineWidth) {
			lineWidth = newLineWidth;
			context.lineWidth = lineWidth;
		},		
		
		changeCanvasWidth : function(newCanvasWitdh, option) {
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
				MapGrid.setGridColumns(newGridColumns);
				break;
			case "cellWidthOnResize":
				var newCellWidth = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
				if(newCellWidth < minCellWidth) {
					newCellWidth = minCellWidth;
					newCanvasWidth = gridColumns * (minCellWidth + lineWidth) + lineWidth
				} else if(newCellWidth > maxCellWidth) {
					newCellWidth = maxCellWidth;
				} 
				MapGrid.setCellWidth(newCellWidth);
				break;
			default:
				if(newCanvasWidth < getGridWidth())
					newCanvasWidth = getGridWidth();
			}
		
			MapGrid.setCanvasWidth(newCanvasWidth);
			repaint();
		},
		
		changeCanvasHeight : function(newCanvasHeight, option) {
			minMaxCheck(minCanvasHeight, maxCanvasHeight, newCanvasHeight);
		
			switch(option) {
			case "gridOnResize":
				var newGridRows = Math.floor((newCanvasHeight - lineWidth) / (cellWidth + lineWidth));
				
				if(newGridRows < minGridRows) {
					newGridRows = minGridRows;
					newCanvasHeight = minGridRows * (cellWidth + lineWidth) + lineWidth;
				} else if(newGridColumns > maxGridRows) {
					newGridRows = maxGridRows;
				} 
				MapGrid.setGridRows(newGridRows);
				break;
			case "cellWidthOnResize":
				var newCellWidth = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
				if(newCellWidth < minCellWidth) {
					newCellWidth = minCellWidth;
					newCanvasHeight = gridRows * (minCellWidth + lineWidth) + lineWidth
				} else if(newCellWidth > maxCellWidth) {
					newCellWidth = maxCellWidth;
				} 
				MapGrid.setCellWidth(newCellWidth);
				break;
			default:
				if(newCanvasHeight < getGridHeight())
					newCanvasHeight = getGridHeight();
			}
		
			MapGrid.setCanvasHeight(newCanvasHeight);
			repaint();
		},	
		
		changeCanvasSize: function (newCanvasWidth, newCanvasHeight, option) {
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
				
				MapGrid.setGridColumns(newGridColumns);
				MapGrid.setGridRows(newGridRows);
				break;
			case "cellWidthOnResize":
				var cellWidthForColumns = Math.floor(((newCanvasWidth - lineWidth) / gridColumns) - lineWidth);
				if(cellWidthForColumns < minCellWidth) {
					cellWidthForColumns = minCellWidth;
					newCanvasWidth = gridColumns * (minCellWidth + lineWidth) + lineWidth
				} else if(cellWidthForColumns > maxCellWidth) {
					cellWidthForColumns = maxCellWidth;
				} 
				
				var cellWidthForRows = Math.floor(((newCanvasHeight - lineWidth) / gridRows) - lineWidth);
				if(cellWidthForRows < minCellWidth) {
					cellWidthForRows = minCellWidth;
					newCanvasHeight = gridRows * (minCellWidth + lineWidth) + lineWidth
				} else if(newCellWidth > maxCellWidth) {
					cellWidthForRows = maxCellWidth;
				} 
				
				if (cellWidthForColumns < cellWidthForRows)
					MapGrid.setCellWidth(cellWidthForColumns);
				else
					MapGrid.setCellWidth(cellWidthForRows);
				break;
			default:
				if(newCanvasWidth < getGridWidth())
					newCanvasWidth = getGridWidth();
					
				if(newCanvasHeight < getGridHeight())
					newCanvasHeight = getGridHeight();
			}
		
			MapGrid.setCanvasWidth(newCanvasWidth);
			MapGrid.setCanvasHeight(newCanvasHeight);
			repaint();
		},
			
		changeGridColumns : function(newGridColumns, option) {
			minMaxCheck(minGridColumns, maxGridColumns, newGridColumns);
	
			switch(option) {
			case "canvasOnResize":
				var newCanvasWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
				
				if (newCanvasWidth < minCanvasWidth)
					newCanvasWidth = minCanvasWidth;
				else if (newCanvasWidth > maxCanvasWidth) 
					newCanvasWidth = maxCanvasWidth;
					newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellWidth + lineWidth));
			
				MapGrid.setCanvasWidth(newCanvasWidth);
				break;
			case "cellWidthOnResize":		
				var newCellWidth = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
				
				if (newCellWidth < minCellWidth) {
					newCellWidth = minCellWidth;
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellWidth + lineWidth));
				} else if (newCellWidth > maxCellWidth) 
					newCellWidth = maxCellWidth;
					
				MapGrid.setCellWidth(newCellWidth);
				break;
			default:
				var newGridWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
				
				if (newGridWidth > canvasWidth)
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellWidth + lineWidth));
			}
			
			MapGrid.setGridColumns(newGridColumns);
			repaint();
		},	
		
		changeGridRows : function(newGridRows, option) {
			minMaxCheck(minGridColumns, maxGridColumns, newGridColumns);
	
			switch(option) {
			case "canvasOnResize":
				var newCanvasHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
				
				if (newCanvasHeight < minCanvasHeight)
					newCanvasHeight = minCanvasHeight;
				else if (newCanvasHeight > maxCanvasHeight) {
					newCanvasHeight = maxCanvasHeight;
					newGridRows = Math.floor((maxCanvasHeight - lineWidth) / (cellWidth + lineWidth));
				}
					
				MapGrid.setCanvasHeight(newCanvasHeight);
				break;
			case "cellWidthOnResize":		
				var newCellWidth = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
				
				if (newCellWidth < minCellWidth) {
					newCellWidth = minCellWidth;
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
				} else if (newCellWidth > maxCellWidth) 
					newCellWidth = maxCellWidth;
					
				MapGrid.setCellWidth(newCellWidth);
				break;
			default:
				var newGridHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
	
				if (newGridHeight > canvasHeight)
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
			}
			
			MapGrid.setGridRows(newGridRows);
			repaint();
		},
		
		changeGrid : function(newGridColumns, newGridRows, option) {
			minMaxCheck(minGridColumns, maxGridColumns, newGridColumns);
			minMaxCheck(minGridRows, maxGridRows, newGridRows);
	
			switch(option) {
			case "canvasOnResize":
				var newCanvasWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
				
				if (newCanvasWidth < minCanvasWidth)
					newCanvasWidth = minCanvasWidth;
				else if (newCanvasWidth > maxCanvasWidth) {
					newCanvasWidth = maxCanvasWidth;
					newGridColumns = Math.floor((maxCanvasWidth - lineWidth) / (cellWidth + lineWidth));
				}
				
				var newCanvasHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
				
				if (newCanvasHeight < minCanvasHeight)
					newCanvasHeight = minCanvasHeight;
				else if (newCanvasHeight > maxCanvasHeight) {
					newCanvasHeight = maxCanvasHeight;
					newGridColumns = Math.floor((maxCanvasHeight - lineWidth) / (cellWidth + lineWidth));
				}
					
				MapGrid.setCanvasWidth(newCanvasWidth);
				MapGrid.setCanvasHeight(newCanvasHeight);
				break;
			case "cellWidthOnResize":
				var cellWidthForColumns = Math.floor(((canvasWidth - lineWidth) / newGridColumns) - lineWidth);
				
				if (cellWidthForColumns < minCellWidth) {
					cellWidthForColumns = minCellWidth;
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (minCellWidth + lineWidth));
				} else if (cellWidthForColumns > maxCellWidth) 
					cellWidthForColumns = maxCellWidth;
				
				var cellWidthForRows = Math.floor(((canvasHeight - lineWidth) / newGridRows) - lineWidth);
				
				if (cellWidthForRows < minCellWidth) {
					cellWidthForRows = minCellWidth;
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
				} else if (cellWidthForRows > maxCellWidth) 
					cellWidthForRows = maxCellWidth;
				
				if(cellWidthForColumns < cellWidthForRows) 
					MapGrid.setCellWidth(cellWidthForColumns);
				else 
					MapGrid.setCellWidth(cellWidthForRows);
				break;
			default:
				var newGridWidth = newGridColumns * (lineWidth + cellWidth) + lineWidth;
				
				if (newGridWidth > canvasWidth)
					newGridColumns = Math.floor((canvasWidth - lineWidth) / (cellWidth + lineWidth));
					
				var newGridHeight = newGridRows * (lineWidth + cellWidth) + lineWidth;
	
				if (newGridHeight > canvasHeight)
					newGridRows = Math.floor((canvasHeight - lineWidth) / (minCellWidth + lineWidth));
			}
			MapGrid.setGridColumns(newGridColumns);
			MapGrid.setGridRows(newGridRows);
	
			repaint();
		},
		
		changeCellWidth: function(newCellWidth, option) {
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
				} else if (newGridHeight > maxCanvasHeight) {
					newCanvasHeight = maxCanvasHeight;
					cellWidthForRows = Math.floor(((maxCanvasHeight - lineWidth) / gridRows) - lineWidth);
				} else {				
					cellWidthForRows = newCellWidth;
				}
		
				MapGrid.setCanvasWidth(newCanvasWidth);		
				MapGrid.setCanvasHeight(newCanvasHeight);
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
		
				MapGrid.setGridColumns(newGridColumns);		
				MapGrid.setGridRows(newGridRows);
				break;
				
			default:
				var newGridWidth = gridColumns * (lineWidth + newCellWidth) + lineWidth;
				var newGridHeight = gridRows * (lineWidth + newCellWidth) + lineWidth;
				
				if (newGridWidth > canvasWidth)
					cellWidthForColumns = Math.floor(((canvasWidth - lineWidth) / gridColumns) - lineWidth);
				else 
					cellWidthForColumns = newCellWidth;
				
				if (newGridHeight > canvasHeight)
					cellWidthForRows = Math.floor(((canvasHeight - lineWidth) / gridRows) - lineWidth);
				else 
					cellWidthForRows = newCellWidth;
			}
			
			if (cellWidthForColumns < cellWidthForRows)
				newCellWidth = cellWidthForColumns;
			else 
				newCellWidth = cellWidthForRows;
			
			MapGrid.setCellWidth(newCellWidth);
		},
		
		setCanvas : function(ncanvas) {

		},
		
		drawMapObject : function(xCoord, yCoord, imageURL) {
			var img = new Image();
			dx = this.getXShift() + lineWidth + xCoord * (cellWidth + lineWidth);
			dy = this.getYShift() + lineWidth + yCoord * (cellWidth + lineWidth);
			dw = cellWidth;
	
			img.onload = function() {
				context.drawImage(img, dx, dy, dw, dw);
			};
			img.src = imageURL;
		},
		
		/**
		 * Forwards the clicked cell coordinates on the map grid.
		 * When the clicked point lies outside the grid or on a grid line,
		 * -1 -1 will be returned.
		 
		addClickedGridCellListener: function(callback) {
			gridCellClicked = callback;			
			canvas.addEventListener("mousedown", canvasClicked, false);
		}, 
		
		removeClickedGridCellListener: function() {
			gridCellClicked = null;			
			canvas.removeEventListener("mousedown", canvasClicked, false);
		}
	}
}();
*/

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