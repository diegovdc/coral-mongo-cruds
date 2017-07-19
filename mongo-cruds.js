const R = require('ramda')
const Task = require('data.task')
const ObjectId = require('mongodb').ObjectId
const {processor, processAttachmentsAndBody, processZippedAttachmentsAndBody} = require('coral-mongo-attachments')

/**
 * Creates
 */

/*======================simpleCreate======================*/

//simpleCreate :: {Task find, Task insertOne} -> ['field'] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, ...} -> Task dbInsertion && dbFind
const simpleCreate = R.curry(({find, insertOne}, selected_fields, validation, req) => 
	R.composeK(
		_ => find({}),
	 	insertOne,
	 	req_body =>  Task.of(R.pick(selected_fields, req_body)) ,
	 	validation)
	 		(req)
)

/*======================createWithAttachments======================*/
const createWithAttachments = R.curry((
	{find, updateOne}, 
	selected_fields, 
	validation, 
	uploads_folder,
	processes_obj,  
	attachments_keys_array, 
	to_zip_obj, 
	req
) => 
	R.composeK(
		_ => find({}),
	 	updateOne(
	 		{upsert: true}, 
			{_id: new ObjectId()}
		),
		req => Task.of(
			processZippedAttachmentsAndBody(
				processor(uploads_folder, processes_obj), //generate standard processes
				attachments_keys_array,
				to_zip_obj, 
				req
			)
		),
	 	req_body =>  Task.of({body: R.pick(selected_fields, req_body)}) ,
	 	validation
	 	)
	 		(req)	
)


/**
 * Updates
 */

/*======================simpleUpdate======================*/

//simpleUpdate ::  {Task find, Task updateOne} -> ['field'] -> Validator ( {validation} ->  Req {body} -> Task {body}) -> Req {body, params {_id}, ...} -> Task dbInsertion && dbFind
const simpleUpdate = R.curry(({find, updateOne}, selected_fields, validation, req) => 
	R.composeK(
	 	onUpdateSuccesOrError(find),
	 	updateOne({upsert: false}, {_id: objectIdOrElse(req.params._id)}),
	 	req_body =>  Task.of(R.pick(selected_fields, req_body)) ,
	 	validation)
	 		(req)
)


//makeUpdateError = Error {} -> CoralError {code: 'simpleUpdate._idNotFound'}
const makeUpdateError = error => 
	({
		error,
		fn: 'simpleUpdate',
		code: 'simpleUpdate._idNotFound',
	})


//mongoNotFound :: Mongo UpdateResponse {result} -> Bool
const mongoNotFound = R.equals({"ok":1,"nModified":0,"n":0})


//onUpdateSuccesOrError :: Task dbFind -> Mongo UpdateResponse {result} -> Task CoralError {error, fn, code} || dbFind
const onUpdateSuccesOrError = find => updateRes => 
	mongoNotFound(updateRes.result) 
		? Task.rejected(makeUpdateError(updateRes)) 
 		: find({})



/*======================updateWithAttachments======================*/
const updateWithAttachments = R.curry((
	{find, updateOne}, 
	selected_fields, 
	validation,
	uploads_folder,  
	processes_obj,  
	attachments_keys_array, 
	to_zip_obj, 
	req
) => 
	R.composeK(
		onUpdateSuccesOrError(find),
	 	updateOne(
	 		{upsert: false}, 
			{_id: objectIdOrElse(req.params._id) }
		),
		req => Task.of(
			processZippedAttachmentsAndBody(
				processor(uploads_folder, processes_obj), //generate standard processes
				attachments_keys_array,
				to_zip_obj, 
				req
			)
		),
	 	req_body =>  Task.of({body: R.pick(selected_fields, req_body)}) ,
	 	validation
	)(req)	
)




/**
 * Delete
 */

/*======================simpleDelete======================*/

//simpleDelete :: {deleteInOne} -> Req { params {_id} } -> Task dbDelete
const simpleDelete = R.curry(({deleteInOne}, req) => 
	deleteInOne( { _id: objectIdOrElse(req.params._id) } )
)




/**
 * Success  Handling
 */

//deleteSuccessMsgs ::  String 'inexistent _id' -> String 'deleted _id' -> MongoDeleteResponse {ok, n} -> [{msg: String}]
const deleteSuccessMsgs = R.curry((did_not_exist_msg, used_to_exist_msg, mongo_res) => 
	R.pathOr(
		[], 
		[mongo_res.result.ok+''+mongo_res.result.n], //we convert both values of the mongo_res.result object into a string which is the path to the corresponding message
		{
			['10'] :{errors: [{msg: did_not_exist_msg}]},
			['11'] : {msgs: [{msg: used_to_exist_msg}]}
		}
	)
)




/**
 * Error Handling
 */

//processErrors :: CoralError {error, code, fn} -> {code:[{msg}]} -> [{msg}]
//Has a case that defaults to  failedValidation error code
const processErrors = R.curry((e, cases) =>
	({errors: R.pathOr(
		['Hubo un error procesando la solicitud'], 
		[e.code], 
		R.merge({failedValidation: e.error}, cases)//this object contains by default the failedValidation error code that is used by '/Validation/validators.js'
	)})
)




/**
 * Utilities
 */

// objectIdOrElse :: MongoObjectId -> MongoObjectId || ''
const objectIdOrElse = _id => ObjectId.isValid(_id) ? new ObjectId(_id) : ''


//justSelectedFields :: ['selected_fields'] -> Req.body{fields} -> Task {selected_fields}
const justSelectedFields = selected_fields_arr => req_body =>  Task.of(R.pick(selected_fields_arr, req_body))




module.exports = {
	processErrors,
	deleteSuccessMsgs,
	simpleCreate,
	createWithAttachments,
	simpleUpdate,
	updateWithAttachments,
	simpleDelete
}