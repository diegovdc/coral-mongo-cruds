const expect = require("chai").expect;
const R = require('ramda');
const Task = require('data.task')
const database_name = 'models_library_TESTDB';
const url = `mongodb://localhost:27017/${database_name}`;
const seeded = [{user: 'number 1'}, {user: 'number 2'}, {user: 'number 3'}];
const {connectDb, findIn, insertOne, updateOne, deleteInOne} = require('coral-mongo-tasks');
const h = require('./mongo-tasks-test-helpers');

const {simpleCreate, createWithAttachments, simpleUpdate, updateWithAttachments, simpleDelete} = require('../mongo-cruds');
const {processor} = require('coral-mongo-attachments')


//TODO cambiar todo para usar sólo una conexión
describe('Models Library Tasks: High level functions for very easy to do CRUDS', function() {
	this.timeout(5000);

	describe('After Connection', () => {
		let db;

		before((done) => { 
			connectDb(url).fork(console.log, database => {
				db = database;
				let omited_coll = '';
				h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'defaultCollection', seeded))
			});
		});

		after(done => {
			db.close();
			done();
		})

		describe('simpleCreate :: {Task find, Task insertOne} -> ["field"] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind', ()  => {
			it('creates a post or something', (done) => {
				let find = findIn(db, 'simpleCreate')
				let insert = insertOne(db, 'simpleCreate')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				simpleCreate({find, insertOne: insert}, ['name'], validator, {name: 'Diego'}).fork(
					done,
					s => {
						expect(s[0].name).to.eql('Diego')
						done()
					}
				)
			});
		});

		describe('createWithAttachments :: {Task find, Task insertOne} -> ["field"] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind', ()  => {
			it('creates a post or something with an attachments object', (done) => {
				let find = findIn(db, 'createWithAttachments')
				let update = updateOne(db, 'createWithAttachments')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				let result = {
					name: 'Dieguis',
					attachments: {
						mis_images:[ 
							{
								image_id: '000perro.jpg',
								order: 0,
								url: 'http://localhost:1231/public/uploads/000perro.jpg',
								thumbnail_url: 'http://localhost:1231/public/uploads/thumbnails/000perro.jpg',
								description: 'es un perro' },
							{ 
								image_id: '000gato.jpg',
								order: 1,
								url: 'http://localhost:1231/public/uploads/000gato.jpg',
								thumbnail_url: 'http://localhost:1231/public/uploads/thumbnails/000gato.jpg',
								description: 'es un gato' 
							} 
						]
					}
				}
				createWithAttachments(
					{find, updateOne: update}, 
					['name', 'images', 'description'], 
					Task.of, 
					'http://localhost:1231/public/uploads',
					{},
					{images: ['images'], description: ['description']},
					{mis_images: ['images', 'description']},
					{
						name: 'Dieguis',
						images: ['000perro.jpg', '000gato.jpg'],
						description: ['es un perro', 'es un gato']
					}
				)
				.fork(
					done,
					s => {
						expect( R.omit('_id', s[0]) ).to.eql(result)
						done()
					}
				)
			});
		});

		describe('simpleUpdate :: {Task find, Task insertOne} -> ["field"] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind', ()  => {
			let query_results
			before(done => {
				let find = findIn(db, 'simpleUpdate')
				let insert = insertOne(db, 'simpleUpdate')
				simpleCreate({find, insertOne: insert}, ['name'], Task.of, {name: 'Diego'}).fork(
					done,
					s => {
						query_results = s
						done()
					}
				)
			})

			it('updates a post or something', (done) => {
				let _id = query_results[0]._id
				let find = findIn(db, 'simpleUpdate')
				let update = updateOne(db, 'simpleUpdate')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				simpleUpdate({find, updateOne: update}, ['name'], validator, {name: 'Pedro', params: {_id}}).fork(
					done,
					s => {
						expect(s[0].name).to.eql('Pedro')
						done()
					}
				)
			});
		});

		describe('updateWithAttachments :: {Task find, Task insertOne} -> ["field"] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind', ()  => {
			let query_results
			before(done => {
				let find = findIn(db, 'updateWithAttachments')
				let update = updateOne(db, 'updateWithAttachments')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				createWithAttachments(
					{find, updateOne: update}, 
					['name', 'images', 'description'], 
					Task.of, 
					'http://localhost:1231/public/uploads',
					{},
					{images: ['images'], description: ['description']},
					{mis_images: ['images', 'description']},
					{
						name: 'Dieguis',
						images: ['000perro.jpg', '000gato.jpg'],
						description: ['es un perro', 'es un gato']
					}
				)
				.fork(
					done,
					s => {
						query_results = s
						done()
					}
				)
			})

			it('updates a post or something', (done) => {
				let _id = query_results[0]._id
				let find = findIn(db, 'updateWithAttachments')
				let update = updateOne(db, 'updateWithAttachments')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				updateWithAttachments(
					{find, updateOne: update}, 
					['name', 'images', 'description'], 
					validator,
					'http://localhost:1231/public/uploads',
					{},
					{images: ['images'], description: ['description']},
					{mis_images: ['images', 'description']},
					{
						name: 'Pedro',
						images: ['000perro2.jpg', '000gato2.jpg'],
						description: ['es otro perro', 'es otro gato'],
						params: {_id}
					}
				)
				.fork(
					done,
					s => {
						let result = {
							name: 'Pedro',
							attachments: {
								mis_images:[ 
									{
										image_id: '000perro2.jpg',
										order: 0,
										url: 'http://localhost:1231/public/uploads/000perro2.jpg',
										thumbnail_url: 'http://localhost:1231/public/uploads/thumbnails/000perro2.jpg',
										description: 'es otro perro' },
									{ 
										image_id: '000gato2.jpg',
										order: 1,
										url: 'http://localhost:1231/public/uploads/000gato2.jpg',
										thumbnail_url: 'http://localhost:1231/public/uploads/thumbnails/000gato2.jpg',
										description: 'es otro gato' 
									} 
								]
							}
						}
						expect( R.omit('_id', s[0]) ).to.eql(result)
						done()
					}
				)
			});
		});

		describe('simpleDelete :: {Task find, Task insertOne} -> ["field"] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind', ()  => {
			let query_results
			before(done => {
				let find = findIn(db, 'simpleDelete')
				let insert = insertOne(db, 'simpleDelete')
				simpleCreate({find, insertOne: insert}, ['name'], Task.of, {name: 'Diego'}).fork(
					done,
					s => {
						query_results = s
						done()
					}
				)
			})

			it('updates a post or something', (done) => {
				let _id = query_results[0]._id
				let find = findIn(db, 'simpleDelete')
				let _delete = deleteInOne(db, 'simpleDelete')
				let validator = Task.of//no validamos, simplemente regresamos el objeto dentro de un Task para que composeK funcione
				simpleDelete({deleteInOne: _delete},  {params: {_id}}).fork(
					done,
					s => {
						expect(s.result).to.eql({ ok: 1, n: 1 });
						done()
					}
				)
			});
		});


	});
});
