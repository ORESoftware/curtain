

//new Promise(function(resolve,reject){
//
//    reject('bar')
//
//
//}).then(function resolved(){
//
//    console.log('resolved 1');
//
//}, function rejected(){
//
//    console.log('rejected 1')
//    throw new Error();
//
//}).then(function resolved(val){
//
//    console.log('resolved 2');
//
//}, function rejected(){
//
//    console.log('rejected 2');
//
//}).catch(function(err){
//
//    console.log('catch');
//
//});


new Promise(function(resolve,reject){

    throw new Error(); // this goes to onRejected
    // reject('bar'); // this goes to onRejected


}).catch(function(err){

    console.log('catch');
    throw new Error('foo');

}).then(function onResolved(){

    console.log('resolved');

}, function onRejected(){

    console.log('rejected');

});
