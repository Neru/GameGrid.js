function addImage(group, x, y, size, gridImage, gridImageToRemove, getHref) {
    return new Promise((resolve, reject) => {
        let image = gridImageToRemove;

        if (!image) {
            image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            group.appendChild(image);
        }

        image.onload = resolve;
        image.onerror = reject;

        image.setAttribute("x", -size/2);
        image.setAttribute("y", -size/2);
        image.setAttribute("height", size);
        image.setAttribute("width", size);

        const translateX = x + size/2;
        const translateY = y + size/2;
        image.setAttribute("transform", `translate(${translateX},${translateY}) rotate(${gridImage.angle})`);

        let href = getHref();
        image.setAttribute("href", href);
    });
}


class SVGRenderer {
    
    constructor(gridProperties) {
        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", gridProperties.width);
        svg.setAttribute("height", gridProperties.height);

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(group);

        this.svg = svg;
        this.group = group;
    }
    
    get element() {
        return this.svg;
    }
    
    drawBackgroundColor(background) {
        const group = this.group;

        group.setAttribute("fill", background.color);
        group.setAttribute("fill-opacity", background.opacity);
    }

    transformGrid(x, y, offscreenTranslationX, offscreenTranslationY, gridWidthHalf, gridHeightHalf, angle) {
        const group = this.group;

        group.setAttribute("transform", `translate(${x + gridWidthHalf},${y + gridHeightHalf}) rotate(${angle}) 
                                         translate(${-gridWidthHalf}, ${-gridHeightHalf})`);
    }

    drawExtract(rectangle, gameOrigin, gridImages, gridImagesToRemove, cellSize, lineWidth, lineColor, lineOpacity) {
        const gridElements = [];
        const group = this.group;

        //var frag = document.createDocumentFragment();
        const rectsToRemove = gridImagesToRemove["rect"] || [];
        const imagesToRemove = gridImagesToRemove["image"] || [];
        let rect, rectReused;

        for (let yCoord = rectangle[1]; yCoord < rectangle[3]; yCoord++) {
            for (let xCoord = rectangle[0]; xCoord < rectangle[2]; xCoord++) {
                rect = rectsToRemove.pop();

                if (rect)
                    rectReused = true;
                else {
                    rectReused = false;
                    rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                }
                rect.setAttribute("x", xCoord*(cellSize + 1) + 0.75);
                rect.setAttribute("y", yCoord*(cellSize + 1) + 0.75);
                rect.setAttribute("width", cellSize + 0.5);
                rect.setAttribute("height", cellSize + 0.5);

                rect.setAttribute("stroke", lineColor);
                rect.setAttribute("stroke-width", lineWidth/2);
                //rects overlap each other
                rect.setAttribute("stroke-opacity", lineOpacity);

                if (!rectReused)
                    group.appendChild(rect);
                gridElements.push({"x": xCoord, "y": yCoord, "instance": new GridElement(rect)});
            }
        }

        const cellSizeWithLineWidth = cellSize + lineWidth;
        let canvasX, canvasY;

        gridImages.forEach(gridImage => {
            canvasX = lineWidth + gridImage.position.x * cellSizeWithLineWidth;
            canvasY = lineWidth + gridImage.position.y * cellSizeWithLineWidth;

            //TODO
            var topGridImage = gridImage.instances[gridImage.instances.length - 1];
            topGridImage.add(this, canvasX, canvasY, cellSize, imagesToRemove.pop());
        });

        return gridElements;
    }

    /*
    drawBoundingRectangle(rectangle, gridImages, cellSize, lineWidth, lineColor, lineOpacity) {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        rect.setAttribute("x", x + 0.25);
        rect.setAttribute("y", y + 0.25);
        rect.setAttribute("width", gridColumns*(cellSize + 1) + 0.5);
        rect.setAttribute("height", gridRows*(cellSize + 1) + 0.5);

        rect.setAttribute("stroke", lineColor);
        rect.setAttribute("stroke-width", lineWidth/2);
        //rects overlap each other
        rect.setAttribute("stroke-opacity", lineOpacity);

        group.appendChild(rect);
    } */

    copyExtract(rectangle, gameOrigin, cellSize, lineWidth) {
        //do nothing
    }

    pasteExtract(rectangle, gameOrigin, image, cellSize, lineWidth) {
        //do nothing
    }

    removeGridImages(gridImagesToRemove) {
        const group = this.group;

        const rectsToRemove = gridImagesToRemove["rect"] || [];
        const imagesToRemove = gridImagesToRemove["image"] || [];

        rectsToRemove.forEach(rect => {
            group.removeChild(rect);
        });

        imagesToRemove.forEach(image => {
            group.removeChild(image);
        });
    }

    addRasterImage(x, y, size, gridImage, gridImageToRemove) {
        const group = this.group;

        const getHref = (gridImage) => {
            return gridImage.url;
        };

        return addImage(group, x, y, size, gridImage, gridImageToRemove, getHref);
    }

    addSVGImage(x, y, size, gridImage, gridImageToRemove) {
        const group = this.group;

        return new Promise((resolve, reject) => {
            fetch(gridImage.url).then(response => {
                return response.text();
            }).then(svgText => {
                group.insertAdjacentHTML("beforeend", "<g>" + svgText + "</g>");
                const svgElem = group.lastChild;

                svgElem.setAttribute("x", -size/2);
                svgElem.setAttribute("y", -size/2);
                svgElem.setAttribute("height", size);
                svgElem.setAttribute("width", size);

                //use use :)

                const translateX = x + size/2;
                const translateY = y + size/2;
                svgElem.setAttribute("transform", `translate(${translateX},${translateY}) rotate(${gridImage.angle})`);

                resolve(svgElem);
            }).catch(reject);
        });
    }

    addCanvasImage(x, y, size, gridImage, gridImageToRemove) {
        const group = this.group;

        var getHref = (gridImage) => {
            return gridImage.canvas.toDataURL();
        };

        return addImage(group, x, y, size, gridImage, gridImageToRemove, getHref);
    }

    removeGridImage(x, y, size, gridImage) {
        const group = this.group;

        const element = gridImage.element;
        group.removeChild(element);
    }

    moveGridImage(oldX, oldY, x, y, cellSize, gridImage) {
        const element = gridImage.element;
        const transform = element.getAttribute("transform");
        const rotateString = transform.split(" ")[1];

        const translateX = x + cellSize/2;
        const translateY = y + cellSize/2;

        element.setAttribute("transform", `translate(${translateX},${translateY}) ${rotateString}`);
    }

    rotateGridImage(x, y, size, gridImage) {
        const element = gridImage.element;
        const transform = element.getAttribute("transform");
        const translateString = transform.split(" ")[0];

        element.setAttribute("transform", `${translateString} rotate(${gridImage.angle})`);
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