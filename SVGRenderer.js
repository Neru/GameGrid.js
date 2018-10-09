function svgElement(name) {
    return document.createElementNS("http://www.w3.org/2000/svg", name)
}

function createUseElement(existingUseElement, href, x, y, size, angle) {
    const use = existingUseElement || svgElement("use");

    const translateX = x + size/2;
    const translateY = y + size/2;

    use.setAttribute("href", "#" + href);

    use.setAttribute("x", -size/2);
    use.setAttribute("y", -size/2);
    use.setAttribute("preserveAspectRatio", "none");

    use.setAttribute("transform", `translate(${translateX},${translateY}) rotate(${angle})`);

    return use;
}

function addGridImage(defs, group, id, loadImagePromise, x, y, size, angle, gridImageToRemove) {
    const elem = defs.querySelector("[id='" + id + "']") ;
    let promise;

    if (elem)
        promise = Promise.resolve();
    else
        promise = loadImagePromise.then(svgElem => {
            svgElem.id = id;
            svgElem.setAttribute("height", size);
            svgElem.setAttribute("width", size);

            return Promise.resolve();
        });

    return promise.then(() => {
        const useElem = createUseElement(gridImageToRemove, id, x, y, size, angle);
        group.appendChild(useElem);

        return Promise.resolve(useElem);
    })
}

function loadSVGImage(defs, svgURL) {
    return new Promise((resolve, reject) => {
        fetch(svgURL).then(response => {
            return response.text();
        }).then(svgText => {
            defs.insertAdjacentHTML("beforeend", svgText);
            const svgElem = defs.lastChild;

            resolve(svgElem);
        }).catch(reject);
    });
}

function loadImage(defs, href) {
    return new Promise((resolve, reject) => {
        let image = svgElement("image");

        image.onload = () => {
            resolve(image);
        };
        image.onerror = reject;

        image.setAttribute("href", href);
        defs.appendChild(image);
    });
}


class SVGRenderer {
    
    constructor(gridProperties) {
        let svg = svgElement("svg");
        svg.setAttribute("width", gridProperties.width);
        svg.setAttribute("height", gridProperties.height);

        const defs = svgElement("defs");
        svg.appendChild(defs);

        const group = svgElement("g");
        svg.appendChild(group);

        this.svg = svg;
        this.defs = defs;
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
                    rect = svgElement("rect");
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
        const defs = this.defs;
        const group = this.group;

        const loadImagePromise = loadImage(defs, gridImage.url);

        return addGridImage(defs, group, gridImage.url, loadImagePromise, x, y, size, gridImage.angle, gridImageToRemove);
    }

    addCanvasImage(x, y, size, gridImage, gridImageToRemove) {
        const defs = this.defs;
        const group = this.group;

        const href = gridImage.canvas.toDataURL();

        const loadImagePromise = loadImage(defs, href);

        return addGridImage(defs, group, gridImage.url, loadImagePromise, x, y, size, gridImage.angle, gridImageToRemove);
    }

    addSVGImage(x, y, size, gridImage, gridImageToRemove) {
        const defs = this.defs;
        const group = this.group;

        const loadImagePromise = loadSVGImage(defs, gridImage.url);

        return addGridImage(defs, group, gridImage.url, loadImagePromise, x, y, size, gridImage.angle, gridImageToRemove);
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