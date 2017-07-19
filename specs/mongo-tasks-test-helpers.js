const Task = require('data.task');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/mongo_tasks_TESTDB';

let seedDb = (db, done, collection_name, seed) => () => {
	db.collection(collection_name).insertMany(seed)
		.then(() => {
			done();
		})
		.catch(e => {
			console.log(e)
		});
}

let dropAllCollectionsExcept = (db, omited_coll = '', cb) => {
	db.listCollections().toArray()
		.then(collections=> {
			collections.forEach(coll => {
				if(coll.name === omited_coll) return;
				db.dropCollection(coll.name, (err, result) => {
					if (err) {console.log('hubo un error', err);}
					else console.log('coleccion borrada: '+ coll.name);
				});
			});
		})
		.then(() => {if(typeof cb === 'function') cb();})
		.catch(e => console.log(e))
};

//this seems to be a a better version of the function
let dropAllCollectionsExcept2 = (db, omited_coll = '', cb) => {
	db.listCollections().toArray()
		.then(collections=> {
			let collPromises = collections
				.filter(coll => coll.name !== omited_coll)
				.map( coll => db.dropCollection(coll.name) )
			Promise.all(collPromises)
				.then(() => {if(typeof cb === 'function') cb();})	
		})
		.catch(e => console.log(e))
};

// Create MongoDb connection pool and start the application
// after the database connection is ready
// 
let startDb = new Task((reject, resolve) => {
	MongoClient.connect(url, (err, db) => {
	  if (err) { 
	  	reject(err);
	  } else {
		 resolve(db);
	  }
	});
});



module.exports = {
	seedDb : seedDb, 
	dropAllCollectionsExcept: dropAllCollectionsExcept,
	dropAllCollectionsExcept2: dropAllCollectionsExcept2
};