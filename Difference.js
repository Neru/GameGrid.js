function difference(interval1, interval2) {
    const [x1, x2] = interval1;
    const [x1_t, x2_t] = interval2;

    const additions = [undefined, undefined];
    const subtractions = [undefined, undefined];
    let intersection = undefined;

    if (x2_t > x1 && x1_t < x2) {
        let intersectionStart, intersectionEnd;

        if (x1_t < x1) {
            additions[0] = [x1_t, x1];
            intersectionStart = x1;
        } else if (x1_t > x1) {
            subtractions[0] = [x1, x1_t];
            intersectionStart = x1_t;
        } else { //x1 = x1_t
            intersectionStart = x1;
        }

        if (x2_t < x2) {
            subtractions[1] = [x2_t, x2];
            intersectionEnd = x2_t;
        } else if (x2_t > x2) {
            additions[1]  = [x2, x2_t];
            intersectionEnd = x2;
        } else { //x2 = x2_t
            intersectionEnd = x2;
        }
        intersection = [intersectionStart, intersectionEnd];
    } else { //no intersection
        if (x1 < x1_t) {
            additions[1] = interval2;
            subtractions[0] = interval1;
        } else {
            subtractions[1] = interval1;
            additions[0] = interval2;
        }
    }

    return [intersection, additions, subtractions];
}


function difference2D(rectangle1, rectangle2) {
    const xInterval = [rectangle1[0], rectangle1[2]];
    const xInterval_t = [rectangle2[0], rectangle2[2]];
    const yInterval = [rectangle1[1], rectangle1[3]];
    const yInterval_t = [rectangle2[1], rectangle2[3]];

    const additions = [];
    const subtractions = [];
    let intersection;

    [xIntersection, xAdditions, xSubtractions] = difference(xInterval, xInterval_t);
    [yIntersection, yAdditions, ySubtractions] = difference(yInterval, yInterval_t);

    if (xIntersection && yIntersection) {
        intersection = [
            xIntersection[0],
            yIntersection[0],
            xIntersection[1],
            yIntersection[1]
        ];

        xAdditions.forEach(xAddition => {
            if (!xAddition)
                return;

            additions.push([
                xAddition[0],
                rectangle2[1],
                xAddition[1],
                rectangle2[3]
            ])
        });
        xSubtractions.forEach(xSubtraction => {
            if (!xSubtraction)
                return;

            subtractions.push([
                xSubtraction[0],
                rectangle1[1],
                xSubtraction[1],
                rectangle1[3]
            ])
        });

        yAdditions.forEach(yAddition => {
            if (!yAddition)
                return;

            additions.push([
                xAdditions[0] ? rectangle1[0] : rectangle2[0],
                yAddition[0],
                xAdditions[1] ? rectangle1[2] : rectangle2[2],
                yAddition[1]
            ]);
        });
        ySubtractions.forEach(ySubtraction => {
            if (!ySubtraction)
                return;

            subtractions.push([
                xSubtractions[0] ? rectangle2[0] : rectangle1[0],
                ySubtraction[0],
                xSubtractions[1] ? rectangle2[2] : rectangle1[2],
                ySubtraction[1]
            ]);
        });
    } else {
        additions.push(rectangle2);
        subtractions.push(rectangle1);
    }

    return [intersection, additions, subtractions];
}


function test() {
    const tests1D = [
        [[[0, 2], [-1, 1]], [[0, 1], [[-1, 0], undefined], [undefined, [1, 2]]]],
        [[[-1, 1], [0, 2]], [[0, 1], [undefined, [1, 2]], [[-1, 0], undefined]]],
        [[[0, 2], [-3, -1]], [undefined, [[-3, -1], undefined], [undefined, [0, 2]]]],
        [[[-3, -1], [0, 2]], [undefined, [undefined, [0, 2]], [[-3, -1], undefined]]],
        [[[1, 2], [0, 3]], [[1, 2], [[0, 1], [2, 3]], [undefined, undefined]]],
        [[[0, 3], [1, 2]], [[1, 2], [undefined, undefined], [[0, 1], [2, 3]]]],
        [[[0, 1], [0, 1]], [[0, 1], [undefined, undefined], [undefined, undefined]]]
    ];

    const tests2D = [
        [[[0, 0, 2, 2], [-1, -1, 1, 1]], [[0, 0, 1, 1], [[-1, -1, 0, 1], [0, -1, 1, 0]], [[1, 0, 2, 2], [0, 1, 1, 2]]]],
        [[[-1, -1, 1, 1], [0, 0, 2, 2]], [[0, 0, 1, 1], [[1, 0, 2, 2], [0, 1, 1, 2]], [[-1, -1, 0, 1], [0, -1, 1, 0]]]],
        [[[1, 1, 2, 2], [0, 0, 3, 3]], [[1, 1, 2, 2], [[0, 0, 1, 3], [2, 0, 3, 3], [1, 0, 2, 1], [1, 2, 2, 3]], []]],
        [[[0, 0, 3, 3], [1, 1, 2, 2]], [[1, 1, 2, 2], [], [[0, 0, 1, 3], [2, 0, 3, 3], [1, 0, 2, 1], [1, 2, 2, 3]]]],
        [[[1, 1, 3, 3], [0, 0, 4, 2]], [[1, 1, 3, 2], [[0, 0, 1, 2], [3, 0, 4, 2], [1, 0, 3, 1]], [1, 2, 3, 3]]],
        [[[0, 0, 2, 4], [1, 1, 3, 3]], [[1, 1, 2, 3], [[2, 1, 3, 3]], [[0, 0, 1, 4], [1, 0, 2, 1], [1, 3, 2, 4]]]],
        [[[0, 0, 1, 1], [1, 1, 2, 2]], [undefined, [[1, 1, 2, 2]], [[0, 0, 1, 1]]]],
        [[[1, 1, 3, 2], [0, -1, 4, 0]], [undefined, [[0, -1, 4, 0]], [[1, 1, 3, 2]]]],
    ];


    tests1D.forEach(test => {
        const input = test[0];
        const output = test[1];

        console.log(difference(input[0], input[1]));
        console.log(output);
    });

    /*
    tests2D.forEach(test => {
        const input = test[0];
        const output = test[1];

        console.log(difference2D(input[0], input[1]));
        console.log(output);
    });
    */
}