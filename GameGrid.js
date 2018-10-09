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
 * mouse wheel scaling (http://adomas.org/javascript-mouse-wheel/)
 */
 
RESIZING_TIMEOUT = 500; //milliseconds

function divideWithRemainder(remainder, divisor) {
    let quotient = 0;

    if (remainder > 0) {
        while (remainder >= divisor) {
            remainder -= divisor;
            quotient++;
        }
    } else {
        while (remainder <= -divisor) {
            remainder += divisor;
            quotient--;
        }
    }

    return [quotient, remainder];
}

function subtractVectorFromRectangle(rectangle, vector) {
    return [rectangle[0] - vector.x, rectangle[1] - vector.y,
        rectangle[2] - vector.x, rectangle[3] - vector.y];
}

class GridImage {
    constructor(angle) {
        this.angle = angle || 0;
        this.element = undefined;
    }

    keepInGridImages() {
        return true;
    }
}

class RasterImage extends GridImage {
    constructor(url, angle) {
        super(angle);
        this.url = url;
    }

    add(renderer, imageX, imageY, cellSize, imageToRemove) {
        return renderer.addRasterImage(imageX, imageY, cellSize, this, imageToRemove);
    }
}

class SVGImage extends GridImage {
    constructor(url, angle) {
        super(angle);
        this.url = url;
    }

    add(renderer, imageX, imageY, cellSize, imageToRemove) {
        return renderer.addSVGImage(imageX, imageY, cellSize, this, imageToRemove);
    }
}

class CanvasImage extends GridImage {
    constructor(url, angle) {
        super(angle);
        this.canvas = url;
    }

    add(renderer, imageX, imageY, cellSize, imageToRemove) {
        return renderer.addCanvasImage(imageX, imageY, cellSize, this, imageToRemove);
    }
}

class GridElement {
    constructor(element) {
        this.element = element;
    }

    keepInGridImages() {
        return false;
    }
}

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector) {
        return new Vector(this.x - vector.x, this.y - vector.y);
    }

    divideWithRemainder(scalar) {
        const [quotientX, remainderX] = divideWithRemainder(this.x, scalar);
        const [quotientY, remainderY] = divideWithRemainder(this.y, scalar);

        const quotientVector = new Vector(quotientX, quotientY);
        const remainderVector = new Vector(remainderX, remainderY);

        return [quotientVector, remainderVector];
    }
}


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

    var offscreenColumns;
    var offscreenRows;

    var background = {
        color: "#DDDDDD",
        opacity: 0.6,
        url: null
    };
    
    var lineColor = "#000000";
    var lineOpacity = 0.70;
    
    var gridImages = {};

    var initialGridImages = options["gridImages"] || [];

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

    offscreenColumns = 0; //gridColumns;
    offscreenRows = 0; //gridRows;

    var gameOrigin = options["gameOrigin"] || new Vector(-offscreenColumns, -offscreenRows);
    var gridOffset = new Vector(0, 0);
    var rotationAngle = options["rotation"] || 0;
    var offscreenTranslation = new Vector(offscreenColumns * (cellSize + lineWidth), offscreenRows * (cellSize + lineWidth));

    var Renderer = options["renderer"] || CanvasRenderer;

    function getRendererOptions() {
        return {
            width: (offscreenColumns + gridColumns + offscreenColumns) * (cellSize + lineWidth) + lineWidth,
            height: (offscreenRows + gridRows + offscreenRows) * (cellSize + lineWidth) + lineWidth
        }
    }

    var renderer = new Renderer(getRendererOptions());
    div.style.position = "relative";
    div.style.overflow = "hidden";
    div.appendChild(renderer.element);

    var drawBackground = renderer.drawBackgroundColor;


    var repaint = async function() {

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

    var getGridWidthHalf = function() {
        return that.getGridWidth() / 2;
    };

    this.getGridHeight = function() {
        return lineWidth + gridRows * (cellSize + lineWidth);
    };

    var getGridHeightHalf = function() {
        return that.getGridHeight() / 2;
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

    function addGridImage(xCoord, yCoord, zIndex, gridImage) {
        xCoord in gridImages || (gridImages[xCoord] = {});
        yCoord in gridImages[xCoord] || (gridImages[xCoord][yCoord] = []);

        if (zIndex !== undefined)
            gridImages[xCoord][yCoord].splice(zIndex, 0, gridImage);
        else
            gridImages[xCoord][yCoord].push(gridImage);
    }

    function getGridImageCoordinates(xCoord, yCoord) {
        const xShift = that.getXShift();
        const yShift = that.getYShift();

        const imageX = lineWidth + xCoord * (cellSize + lineWidth);
        const imageY = lineWidth + yCoord * (cellSize + lineWidth);

        return [imageX, imageY];
    }

    function removeGridImage(xCoord, yCoord, zIndex) {
        const gridImage = gridImages[xCoord][yCoord].splice(zIndex, 1);

        if (Object.keys(gridImages[xCoord][yCoord]).length === 0)
            delete gridImages[xCoord][yCoord];

        if (Object.keys(gridImages[xCoord]).length === 0)
            delete gridImages[xCoord];

        return gridImage;
    }

    function newGridImage(imageURLOrCanvas, angle = 0) {
        //TODO: imageURLOrCanvas.toString() === "[object OffscreenCanvas]"
        if (imageURLOrCanvas.tagName === "CANVAS") {
            return new CanvasImage(imageURLOrCanvas, angle);
        }

        if (imageURLOrCanvas.endsWith("svg")) {
            return new SVGImage(imageURLOrCanvas, angle);
        }

        return new RasterImage(imageURLOrCanvas, angle);
    }

    this.addGridImage = async function (xCoord, yCoord, imageURLOrCanvas, zIndex, angle = 0) {
        const gridImage = newGridImage(imageURLOrCanvas, angle);
        addGridImage(xCoord, yCoord, zIndex, gridImage);

        [imageX, imageY] = getGridImageCoordinates(xCoord, yCoord);

        return gridImage.add(renderer, imageX, imageY, cellSize).then(img => {
            gridImage.element = img;
        });
    };
    
    this.rotateGridImage = async function (xCoord, yCoord, angle) {
        var gridImage = that.getGridImage(xCoord, yCoord);
        gridImage.angle = angle;

        [imageX, imageY] = getGridImageCoordinates(xCoord, yCoord);
        
        return renderer.rotateGridImage(imageX, imageY, cellSize, gridImage, background);
    };
    
    this.moveGridImage = async function (oldXCoord, oldYCoord, xCoord, yCoord) {
        const gridImage = that.getGridImage(oldXCoord, oldYCoord);

        removeGridImage(oldXCoord, oldYCoord);
        addGridImage(xCoord, yCoord, gridImage);

        [oldImageX, oldImageY] = getGridImageCoordinates(oldXCoord, oldYCoord);
        [imageX, imageY] = getGridImageCoordinates(xCoord, yCoord);

        return renderer.moveGridImage(oldImageX, oldImageY, imageX, imageY, cellSize, gridImage, background);
    };

    this.getGridImage = function (xCoord, yCoord, zIndex) {
        return gridImages[xCoord] && gridImages[xCoord][yCoord] && gridImages[xCoord][yCoord][zIndex];
    };

    this.getGridImageArray = function (xCoord, yCoord) {
        return gridImages[xCoord] && gridImages[xCoord][yCoord];
    };

    this.getGridImages = function(rectangle) {
        const gridImages = [];
        let gridImage;

        for (let y = rectangle[1]; y < rectangle[3]; y++) {
            for (let x = rectangle[0]; x < rectangle[2]; x++) {
                gridImage = that.getGridImageArray(x, y);

                if (gridImage)
                    gridImages.push({
                        position: new Vector(x, y),
                        instances: gridImage
                    });
            }
        }

        return gridImages;
    };

    function getGridImagesToRemove(rectangle, gridImagesToRemove) {
        let gridImageArray, gridImage, gridImageType;

        for (let y = rectangle[1]; y < rectangle[3]; y++) {
            for (let x = rectangle[0]; x < rectangle[2]; x++) {
                gridImageArray = that.getGridImageArray(x, y);

                for (let i = gridImageArray.length - 1; i >= 0; i--) {
                    gridImage = gridImageArray[i];
                    gridImageType = gridImage.element.tagName;
                    gridImagesToRemove[gridImageType].push(gridImage.element);
                    gridImage.element = undefined;

                    if (!gridImage.keepInGridImages())
                        removeGridImage(x, y, i);
                };
            }
        }

        return gridImagesToRemove;
    }
    
    this.removeGridImage = async function (xCoord, yCoord, zIndex) {
        if (gridImages[xCoord] === undefined || gridImages[xCoord][yCoord] === undefined) {
            throw "An image does not exist at this position.";
        }

        const gridImage = removeGridImage(xCoord, yCoord, zIndex);
        
        return renderer.removeGridImage(xCoord, yCoord, cellSize, gridImage, background);
    };


    function getGameRectangle(point) {
        return [point.x + offscreenColumns, point.y + offscreenRows,
                point.x + offscreenColumns + gridColumns, point.y + offscreenRows + gridRows]
    }

    function getOffscreenRectangle(point) {
        return [point.x, point.y,
                point.x + offscreenColumns + gridColumns + offscreenColumns,
                point.y + offscreenRows + gridRows + offscreenRows]
    }

    function addGridElements(gridElements) {

    }

    function initializeView(gridImagesProperties) {
        drawBackground.call(renderer, background);

        gridImagesProperties.forEach(properties => {
            const gridImage = newGridImage(properties.url, properties.angle);
            addGridImage(properties.x, properties.y, 0, gridImage);
        });

        const screen = getGameRectangle(gameOrigin);
        const offscreen = getOffscreenRectangle(gameOrigin);

        //draw screen rectangle first
        addNewRectangle(screen, renderer, gameOrigin, gridImages, {});

        let [intersection, additions, subtractions] = difference2D(screen, offscreen);

        additions.forEach(addition => {
            addNewRectangle(addition, renderer, gameOrigin, gridImages, {});
        });

        that.translateView(0, 0);
    }

    function transformGrid(renderer, x, y) {
        const gridWidthHalf = getGridWidthHalf();
        const gridHeightHalf = getGridHeightHalf();

        renderer.transformGrid(-x, -y, offscreenTranslation.x, offscreenTranslation.y,
                                gridWidthHalf, gridHeightHalf, rotationAngle);
    }

    this.translateView = function(x, y) {
        transformGrid(renderer, gridOffset.x + x, gridOffset.y + y);
    };

    function addNewRectangle(rectangle, newRenderer, newGameOrigin, gridImagesToRemove) {
        const gridImages = that.getGridImages(rectangle);
        const gridElements = newRenderer.drawExtract(rectangle, newGameOrigin, gridImages, gridImagesToRemove,
                                                     cellSize, lineWidth, lineColor, lineOpacity);

        gridElements.forEach(gridElement => {
            addGridImage(gridElement.x, gridElement.y, 0, gridElement.instance);
        });
    }

    function copyOldRectangle(rectangle, newRenderer, newGameOrigin, oldGameOrigin) {
        const extract = renderer.copyExtract(rectangle, oldGameOrigin, cellSize, lineWidth);
        newRenderer.pasteExtract(rectangle, newGameOrigin, extract, cellSize, lineWidth);
    }

    this.updateView = function (x, y) {
        let translationVector = new Vector(x, y);
        translationVector = translationVector.add(gridOffset);

        let [gameOriginOffset, newGridOffset] = translationVector.divideWithRemainder(cellSize + lineWidth);
        newGridOffset = translationVector;

        //const newGameOrigin = gameOrigin.add(gameOriginOffset);
        const newGameOrigin = gameOriginOffset.add(new Vector(-offscreenColumns, -offscreenRows));
        const newScreenRectangle = getGameRectangle(newGameOrigin);

        const offscreenRectangle = getOffscreenRectangle(gameOrigin);
        const newOffscreenRectangle = getOffscreenRectangle(newGameOrigin);

        //render first the screen (in case of teleportation out of offscreen)
        let [offscreensIntersection, offscreensAdditions, offscreensSubtractions] = difference2D(offscreenRectangle, newOffscreenRectangle);

        const gridImagesToRemove = {
            "rect": [],
            "image": []
        };

        offscreensSubtractions.forEach(subtraction => {
            getGridImagesToRemove(subtraction, gridImagesToRemove);
        });

        const newRenderer = renderer;
        //const newRenderer = new Renderer(getRendererOptions());
        //div.insertBefore(newRenderer.element, renderer.element);
        transformGrid(newRenderer, newGridOffset.x, newGridOffset.y);
        drawBackground.call(newRenderer, background);

        const offscreenAdditionsMinusNewGameScreen = [];

        offscreensAdditions.forEach(offsetAddition => {
            const [intersection, shouldBeEmpty, subtractions] = difference2D(offsetAddition, newScreenRectangle);
            offscreenAdditionsMinusNewGameScreen.push(...subtractions);

            if (intersection)
                addNewRectangle(intersection, newRenderer, newGameOrigin, gridImagesToRemove);
        });

        if (offscreensIntersection) {
            let [intersection, shouldBeEmpty, offscreenIntersectionMinusNewGameScreen] = difference2D(offscreensIntersection, newScreenRectangle);

            //as game rectangle is enclosed by offscreen, there is always an intersection
            copyOldRectangle(intersection, newRenderer, newGameOrigin, gameOrigin);
            //screen rendering is finished, now render offscreen

            offscreenIntersectionMinusNewGameScreen.forEach(intersection => {
                copyOldRectangle(intersection, newRenderer, newGameOrigin, gameOrigin);
            });
        }

        offscreenAdditionsMinusNewGameScreen.forEach(addition => {
            addNewRectangle(addition, newRenderer, newGameOrigin, gridImagesToRemove);
        });

        renderer.removeGridImages(gridImagesToRemove);


        //div.removeChild(renderer.element);
        renderer = newRenderer;
        gameOrigin = newGameOrigin;
        gridOffset = newGridOffset;
    };

    /*
        this.updateView = function (x, y) {
        let translationVector = new Vector(x, y);
        translationVector = translationVector.add(gridOffset);

        const [gameOriginOffset, newGridOffset] = translationVector.divideWithRemainder(cellSize + lineWidth);

        const newGameOrigin = gameOrigin.add(gameOriginOffset);
        const newGameRectangle = getGameRectangle(newGameOrigin);

        const offgameRectangle = getOffgameRectangle(gameOrigin);
        const newOffgameRectangle = getOffgameRectangle(newGameOrigin);

        //render first the screen (in case of teleportation out of offscreen)
        let [intersection, additions, subtractions] = difference2D(offgameRectangle, newGameRectangle);

        const newRenderer = new Renderer(getRendererOptions());
        div.insertBefore(newRenderer.element, renderer.element);
        newRenderer.transformGrid(offscreenTranslation.x + newGridOffset.x, offscreenTranslation.y + newGridOffset.y, 0);
        drawBackground.call(newRenderer, background);

        additions.forEach(addition => {
            const gridImages = that.getGridImages(addition);
            const additionNewGameOrigin = subtractVectorFromRectangle(addition, newGameOrigin);

            gridImages.forEach(gridImage => {
                gridImage.position = gridImage.position.subtract(newGameOrigin);
            });

            newRenderer.drawExtract(additionNewGameOrigin, gridImages, cellSize, lineWidth, lineColor, lineOpacity);
        });

        const intersectionOldGameOrigin = subtractVectorFromRectangle(intersection, gameOrigin);
        const offgameExtract = renderer.copyExtract(intersectionOldGameOrigin, cellSize, lineWidth);

        const intersectionNewGameOrigin = subtractVectorFromRectangle(intersection, newGameOrigin);
        newRenderer.pasteExtract(intersectionNewGameOrigin, offgameExtract, cellSize, lineWidth);

        //then update the rest of the offscreen
        [intersection, additions, subtractions] = difference2D(offgameRectangle, newOffgameRectangle);

        let [alreadyDrawn, extractsToDraw, newScreenRemainder] = difference2D(newGameRectangle, intersection);

        extractsToDraw.forEach(addition => {
            const additionGameOrigin = subtractVectorFromRectangle(addition, gameOrigin);
            const offgameExtract = renderer.copyExtract(additionGameOrigin, cellSize, lineWidth);

            const additionNewGameOrigin = subtractVectorFromRectangle(addition, newGameOrigin);
            newRenderer.pasteExtract(additionNewGameOrigin, offgameExtract, cellSize, lineWidth);
        });

        additions.forEach(addition => {
            [alreadyDrawn, extractsToDraw, newScreenRemainder] = difference2D(newGameRectangle, addition);

            extractsToDraw.forEach(addition => {
                const gridImages = that.getGridImages(addition);

                const additionNewGameOrigin = subtractVectorFromRectangle(addition, newGameOrigin);
                gridImages.forEach(gridImage => {
                    gridImage.position = gridImage.position.subtract(newGameOrigin);
                });

                newRenderer.drawExtract(additionNewGameOrigin, gridImages, cellSize, lineWidth, lineColor, lineOpacity);
            });
        });

        div.removeChild(renderer.element);
        renderer = newRenderer;
        gameOrigin = newGameOrigin;
        gridOffset = newGridOffset;
        //subtractions.forEach(renderer.removeExtract);
    };
     */

    
    this.centerGrid = function (X, Y) {
        var dx = X - centerX;
        var dy = Y - centerY;

    };

    /*
        counter-clockwise
     */
    this.rotateGrid = function(angle) {
        rotationAngle += angle;

        const gridWidthHalf = getGridWidthHalf();
        const gridHeightHalf = getGridHeightHalf();

        const cosine_angle = Math.cos(angle * TO_RADIANS);
        const sine_angle = Math.sin(angle * TO_RADIANS);

        //upper left
        const newGridWidthHalf = Math.abs(cosine_angle*-gridWidthHalf - sine_angle*gridHeightHalf);
        //upper right
        const newGridHeightHalf = Math.abs(cosine_angle*gridHeightHalf + sine_angle*gridWidthHalf);

        that.translateView(0, 0);
    }


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
    
    function gridClicked(event) {
        var point = renderer.getClickedPoint(event);
        eventEmitter.emit("canvasClicked", point);
        var gridCoordinate = getGridCoordinate(point);
        eventEmitter.emit("gridCoordinateClicked", gridCoordinate);
        var gameCoordinate = getGameCoordinate(gridCoordinate);
        eventEmitter.emit("gameCoordinateClicked", gameCoordinate);
        var gridImages = that.getGridImageArray(gridCoordinate.x, gridCoordinate.y);
        if (gridImages)
            eventEmitter.emit("gridImagesClicked", gridImages);
    }
        
    renderer.element.addEventListener("mousedown", gridClicked);
    window.onresize = windowResized;

    initializeView(initialGridImages);
}