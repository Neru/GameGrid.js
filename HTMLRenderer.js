function addImage(div, x, y, size, gridImage, gridImageToRemove, getSrc) {
    return new Promise((resolve, reject) => {
        let image = gridImageToRemove;
        const src = getSrc();

        const translateX = x + size/2;
        const translateY = y + size/2;

        if (!image) {
            image = document.createElement("img");
            div.appendChild(image);
        }

        image.onload = resolve;
        image.onerror = reject;

        setAttributes(image, {
            "position": "absolute",
            "top": -size/2,
            "left": -size/2,
            "width": size,
            "height": size,
            "transform": `translate(${translateX},${translateY}) rotate(${gridImage.angle})`,
            "src": src
        });
    });
}


class HTMLRenderer {

    constructor(gridProperties) {
        let div = document.createElement("div");
        div.setAttribute("width", gridProperties.width);
        div.setAttribute("height", gridProperties.height);

        this.div = div;
    }

    get element() {
        return this.div;
    }

    drawBackgroundColor(background) {
        const div = this.div;
        const rgba = toRGBA(background.color, background.opacity);

        div.setAttribute("backgroundColor", rgba);
    }

    transformGrid(x, y, offscreenTranslationX, offscreenTranslationY, gridWidthHalf, gridHeightHalf, angle) {
        const div = this.div;

        div.setAttribute("transform", `translate(${x + gridWidthHalf},${y + gridHeightHalf}) rotate(${angle}) 
                                       translate(${-gridWidthHalf}, ${-gridHeightHalf})`);
    }

    drawExtract(rectangle, gameOrigin, gridImages, gridImagesToRemove, cellSize, lineWidth, lineColor, lineOpacity) {
        const gridElements = [];
        const div = this.div;

        //var frag = document.createDocumentFragment();

        //border opacity: https://stackoverflow.com/questions/4062001/css3-border-opacity
        const lineRGBA = toRGBA(lineColor, lineOpacity);

        const divsToRemove = gridImagesToRemove["div"] || [];
        const imgsToRemove = gridImagesToRemove["img"] || [];
        let rectDiv, rectReused;

        for (let yCoord = rectangle[1]; yCoord < rectangle[3]; yCoord++) {
            for (let xCoord = rectangle[0]; xCoord < rectangle[2]; xCoord++) {
                rectDiv = divsToRemove.pop();

                if (rectDiv)
                    rectReused = true;
                else {
                    rectReused = false;
                    rectDiv = document.createElement("div");
                }

                setAttributes(rectDiv, {
                    "position": "absolute",
                    "top": xCoord*(cellSize + 1) + 0.75,
                    "left": yCoord*(cellSize + 1) + 0.75,
                    "width": cellSize + 0.5,
                    "height": cellSize + 0.5,
                    "border": `{$lineWidth/2}px solid {$lineRGBA}`
                });

                if (!rectReused)
                    div.appendChild(rectDiv);

                gridElements.push({"x": xCoord, "y": yCoord, "instance": new GridElement(rectDiv)});
            }
        }

        const cellSizeWithLineWidth = cellSize + lineWidth;
        let divX, divY, topGridImage;

        gridImages.forEach(gridImage => {
            divX = lineWidth + gridImage.position.x * cellSizeWithLineWidth;
            divY = lineWidth + gridImage.position.y * cellSizeWithLineWidth;

            //TODO
            topGridImage = gridImage.instances[gridImage.instances.length - 1];
            topGridImage.add(this, divX, divY, cellSize, imgsToRemove.pop());
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
        const div = this.div;

        const divsToRemove = gridImagesToRemove["div"] || [];
        const imgsToRemove = gridImagesToRemove["img"] || [];

        divsToRemove.forEach(rectDiv => {
            div.removeChild(rectDiv);
        });

        imgsToRemove.forEach(img => {
            div.removeChild(img);
        });
    }

    addRasterImage(x, y, size, gridImage, gridImageToRemove) {
        const div = this.div;

        const getSrc = (gridImage) => {
            return gridImage.url;
        };

        return addImage(div, x, y, size, gridImage, gridImageToRemove, getSrc);
    }

    addSVGImage(x, y, size, gridImage, gridImageToRemove) {
        const div = this.div;

        return new Promise((resolve, reject) => {
            fetch(gridImage.url).then(response => {
                return response.text();
            }).then(svgText => {
                div.insertAdjacentHTML("beforeend", "<g>" + svgText + "</g>");
                const svgElem = div.lastChild;

                const translateX = x + size/2;
                const translateY = y + size/2;

                setAttributes(svgElem, {
                    "position": "absolute",
                    "top": -size/2,
                    "left": -size/2,
                    "width": size,
                    "height": size,
                    "transform": `translate(${translateX},${translateY}) rotate(${gridImage.angle})`
                });

                resolve(svgElem);
            }).catch(reject);
        });
    }

    addCanvasImage(x, y, size, gridImage, gridImageToRemove) {
        //check if this works with Offscreen Canvas
        if (gridImageToRemove)
            gridImageToRemove.drawImage(gridImage, 0, 0);
        else {
            const div = this.div;
            div.appendChild(gridImage);
        }
    }

    removeGridImage(x, y, size, gridImage) {
        const div = this.div;

        const element = gridImage.element;
        div.removeChild(element);
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
        const svg = this.div;

        //TODO: clientRect? pageX

        return {x: event.clientX, y: event.clientY};
    }
}