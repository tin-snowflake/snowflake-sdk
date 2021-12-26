import BN = require("bn.js");

let test = Int8Array.of(...new BN(-290680500).toArray("le", 8), -5, 0);
console.log('Test 1: ', test);

let uArray = Uint8Array.of(...test);
console.log('uArray: ', uArray);

let iArray = Int8Array.of(...uArray);
console.log('iArray: ', iArray);


// let test2 = Uint8Array.of(...new BN(-290680500).toArray("le", 8), -5, 0)
// console.log('Test 2: ', test2);


// let a = new BN(test2.slice(0,8));
// console.log(a);
// let a = new BN(290680500);
// let aa = a.toArray("le", 8);
// let aan = new BN(aa.reverse());
// console.log('a: ', a)
// console.log('aa: ', aa);
// console.log('aan: ', aan.toNumber());







