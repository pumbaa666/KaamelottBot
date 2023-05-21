function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

function findArraysIntersection(arr1: any[], arrs: any[]){
    // IF there are no arrays to compare to, return everything (it inteserect with itself).
    if(arrs == null || arrs.length == 0) {
        return arr1;
    }

    // If even one array is empty, return nothing, because it doesn't intersect with anything. (it was an empty set)
    arrs.forEach(arr => {
        if(arr == null || arr.length == 0) {
            return [];
        }
    });

    let intersection = [];
    
    first: for (let i = 0; i < arr1.length; i++) {
        let currentObj = arr1[i];

        let nbIntersection = 0;
        second: for (let j = 0; j < arrs.length; j++) {
            if(!arrs[j].includes(currentObj)) { // This episode is not in the current array                
                continue first; // Don't bother checking the other arrays
            } else {
                nbIntersection++; // Found in one array. Check the next one
            }
        }
        if(nbIntersection == arrs.length) {
            intersection.push(currentObj);
        }        
    }
    return intersection;
}

module.exports = {
    getRandomInt,
    findArraysIntersection
};