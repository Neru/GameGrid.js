const TO_RADIANS = Math.PI/180; 

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
    context.drawImage(gridImage, -size/2, -size/2, size, size);
    context.restore();
}

function addImage(context, x, y, size, gridImage) {
    return new Promise(function(resolve, reject) {
        const img = new Image();
        img.onload = function() {
            drawImage(context, x, y, size, img);
            resolve(img);
        };

        img.onerror = reject;
        img.src = gridImage.url;
    });
}

class CanvasRenderer {

    constructor(gridProperties) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        canvas.setAttribute("width", gridProperties.width);
        canvas.setAttribute("height", gridProperties.height);
        canvas.style.position = "absolute";
        
        this.canvas = canvas;
        this.context = context;
    }
    
    get element() {
        return this.canvas;
    }

    transformGrid(x, y, offscreenTranslationX, offscreenTranslationY, gridWidthHalf, gridHeightHalf, angle) {
        const canvas = this.canvas;

        canvas.style.transform = `translate(${(x + offscreenTranslationX)}px,${(y + offscreenTranslationY)}px) rotate(${angle}deg)`;
    }

    drawBackgroundColor(background) {
        const canvas = this.canvas;
        const rgba = toRGBA(background.color, background.opacity);

        canvas.style.backgroundColor = rgba;
    };
    
    drawBackgroundImage(canvasWidth, canvasHeight, background) {
        const context = this.context;
        const img = new Image();
        
        img.onload = function() {
            context.globalAlpha = background.opacity;
            context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        };
        img.src = background.url;
    };

    drawExtract(gameRectangle, gameOrigin, gridImages, gridImagesToRemove, cellSize, lineWidth, lineColor, lineOpacity) {
        const context = this.context;

        const rectangle = subtractVectorFromRectangle(gameRectangle, gameOrigin);
        gridImages.forEach(gridImage => {
            gridImage.position = gridImage.position.subtract(gameOrigin)
        });

        context.lineWidth = lineWidth;
        context.strokeStyle = lineColor;
        context.globalAlpha = lineOpacity;
        context.beginPath();

        const cellSizeWithLineWidth = cellSize + lineWidth;
        const lineWidthHalf = lineWidth / 2;

        const startX = cellSizeWithLineWidth * rectangle[0];
        const startY = cellSizeWithLineWidth * rectangle[1];
        const endX = cellSizeWithLineWidth * rectangle[2];
        const endY = cellSizeWithLineWidth * rectangle[3];

        let canvasX, canvasY;
        // vertical lines:
        // | | | |
        // | | | |
        for (let x = rectangle[0]; x <= rectangle[2]; x++) {
            canvasX = lineWidthHalf + x * cellSizeWithLineWidth;
            context.moveTo(canvasX, startY);
            context.lineTo(canvasX, endY);
        }
        // horizontal lines:
        //  _ _ _
        //  _ _ _
        //  _ _ _
        for (let y = rectangle[1]; y <= rectangle[3]; y++) {
            canvasY = lineWidthHalf + y * cellSizeWithLineWidth;
            context.moveTo(startX, canvasY);
            context.lineTo(endX, canvasY);
        }
        context.stroke();

        gridImages.forEach(gridImage => {
            canvasX = lineWidth + gridImage.position.x * cellSizeWithLineWidth;
            canvasY = lineWidth + gridImage.position.y * cellSizeWithLineWidth;

            var topGridImage = gridImage.instances[gridImage.instances.length - 1];
            topGridImage.instance.add(this, canvasX, canvasY, cellSize);
        });

        return [];
    }

    copyExtract(gameRectangle, gameOrigin, cellSize, lineWidth) {
        const context = this.context;

        const rectangle = subtractVectorFromRectangle(gameRectangle, gameOrigin);
        const cellSizeWithLineWidth = cellSize + lineWidth;

        const startX = cellSizeWithLineWidth * rectangle[0];
        const startY = cellSizeWithLineWidth * rectangle[1];
        const endX = cellSizeWithLineWidth * rectangle[2] + lineWidth;
        const endY = cellSizeWithLineWidth * rectangle[3] + lineWidth;

        const image = context.getImageData(startX, startY, endX - startX, endY - startY);
        return image;
    }

    pasteExtract(gameRectangle, gameOrigin, image, cellSize, lineWidth) {
        const context = this.context;

        const rectangle = subtractVectorFromRectangle(gameRectangle, gameOrigin);
        const cellSizeWithLineWidth = cellSize + lineWidth;

        const startX = cellSizeWithLineWidth * rectangle[0];
        const startY = cellSizeWithLineWidth * rectangle[1];

        context.putImageData(image, startX, startY);
    }

    addRasterImage(x, y, size, gridImage) {
        const context = this.context;

        return addImage(context, x, y, size, gridImage);
    }

    addSVGImage(x, y, size, gridImage) {
        const context = this.context;

        return addImage(context, x, y, size, gridImage);
    }

    addCanvasImage(x, y, size, gridImage) {
        const context = this.context;

        drawImage(context, x, y, size, gridImage.canvas);

        return Promise.resolve();
    }

    removeGridImage(x, y, size, gridImage, background) {
        drawRect(this.context, x, y, size, size, background);
    }

    moveGridImage(oldX, oldY, x, y, size, gridImage, background) {
        drawRect(this.context, oldX, oldY, size, size, background);
        drawImage(this.context, x, y, size, gridImage.element);
    }

    rotateGridImage(x, y, size, gridImage, background) {
        drawRect(this.context, x, y, size, size, background);
        drawImage(this.context, x, y, size, gridImage.element);
    }

    getClickedPoint(event) {
        const canvas = this.canvas;
        
        //source: http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
        let x;
        let y;
        
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