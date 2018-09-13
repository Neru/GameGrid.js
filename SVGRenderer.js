class SVGRenderer {
	
	constructor(gridProperties) {
		let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", gridProperties.width);
		svg.setAttribute("height", gridProperties.height);
		
		this.svg = svg;
	}
	
	get element() {
		return this.svg;
	}
	
	drawBackgroundColor(canvasWidth, canvasHeight, background) {
		const svg = this.svg;
		
		svg.setAttribute("fill", background.color);
		svg.setAttribute("fill-opacity", background.opacity);
	}
	
	drawGrid(xShift, yShift, gridWidth, gridHeight, gridColumns, gridRows, cellSize, lineWidth, lineColor, lineOpacity) {
		const svg = this.svg;
		
		//TODO: optimize
		const rects = svg.querySelectorAll("rect");
		
		for (var i = 0; i < rects.length; i++) {
			svg.removeChild(rects[i]);
		}
		
		const images = svg.querySelectorAll("image");
		
		for (var i = 0; i < images.length; i++) {
			svg.removeChild(images[i]);
		}
		
		for (var yCoord = 0; yCoord < gridRows; yCoord++) {
			for (var xCoord = 0; xCoord < gridColumns; xCoord++) {
				var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				
				rect.setAttribute("x", xShift + xCoord*(cellSize + 1) + 0.5);
				rect.setAttribute("y", yShift + yCoord*(cellSize + 1) + 0.5);
				rect.setAttribute("height", cellSize + 1);
				rect.setAttribute("width", cellSize + 1);
				
				rect.setAttribute("stroke", lineColor);
				rect.setAttribute("stroke-width", 1);
				//rects overlap each other
				rect.setAttribute("stroke-opacity", lineOpacity / 2);

				svg.appendChild(rect);
			}
		}
	}

    addGridImage(x, y, size, gridImage) {
        const svg = this.svg;

        return new Promise(function(resolve, reject) {
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            gridImage.element = image;

            image.onload = function() {
                svg.appendChild(image);
                resolve(image);
            };
            image.onerror = reject;

            image.setAttribute("x", -size/2);
            image.setAttribute("y", -size/2);
            image.setAttribute("height", size);
            image.setAttribute("width", size);

            const translateX = x + size/2;
            const translateY = y + size/2;
            image.setAttribute("transform", `translate(${translateX},${translateY}) rotate(${gridImage.angle})`);

            image.setAttribute("href", gridImage.url);
        });
    }

    removeGridImage(x, y, size, gridImage) {
        const svg = this.svg;
        const image = gridImage.element;
        svg.removeChild(image);
    }

    moveGridImage(oldX, oldY, x, y, cellSize, gridImage) {
        const image = gridImage.element;
        const transform = image.getAttribute("transform");
        const rotateString = transform.split(" ")[1];

        const translateX = x + cellSize/2;
        const translateY = y + cellSize/2;

        image.setAttribute("transform", `translate(${translateX},${translateY}) ${rotateString}`);
    }

    rotateGridImage(x, y, size, gridImage) {
        const image = gridImage.element;
        const transform = image.getAttribute("transform");
        const translateString = transform.split(" ")[0];

        image.setAttribute("transform", `${translateString} rotate(${gridImage.angle})`);
    }
	
	getClickedPoint(event) {
		const svg = this.svg;
		
		//source: https://stackoverflow.com/questions/29261304/how-to-get-the-click-coordinates-relative-to-svg-element-holding-the-onclick-lis
		var point = svg.createSVGPoint();

		point.x = event.clientX;
		point.y = event.clientY;

		// The cursor point, translated into svg coordinates
		var matrix = svg.getScreenCTM().inverse();
		var clickedPoint = point.matrixTransform(matrix);
		
		return {x: clickedPoint.x, y: clickedPoint.y};
	}
}