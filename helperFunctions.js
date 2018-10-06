function toRGBA(color, opacity) {
    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

//source: https://stackoverflow.com/questions/12274748/setting-multiple-attributes-for-an-element-at-once-with-javascript
function setAttributes(el, attrs) {
    for(var key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}