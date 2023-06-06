"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findArraysIntersection = exports.getRandomInt = void 0;
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
exports.getRandomInt = getRandomInt;
function findArraysIntersection(arr1, arrs) {
    if (arrs == null || arrs.length == 0) {
        return arr1;
    }
    arrs.forEach(function (arr) {
        if (arr == null || arr.length == 0) {
            return [];
        }
    });
    var intersection = [];
    first: for (var i = 0; i < arr1.length; i++) {
        var currentObj = arr1[i];
        var nbIntersection = 0;
        second: for (var j = 0; j < arrs.length; j++) {
            if (!arrs[j].includes(currentObj)) {
                continue first;
            }
            else {
                nbIntersection++;
            }
        }
        if (nbIntersection == arrs.length) {
            intersection.push(currentObj);
        }
    }
    return intersection;
}
exports.findArraysIntersection = findArraysIntersection;
