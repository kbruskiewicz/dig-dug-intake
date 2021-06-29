const adapterUtils = require('./adapterUtils')
const modelUtils = require('./modelUtils')

// Aggregations
// * Register functions before executing all of them, collecting their results.
// * Useful for integrating similar data across disparate datasources.
// * For typical use, assumes that the functions are homogenuous in their interface and return types, 
//   differing only in implementation.

// Aggregations can be interacted with in three ways:
// * `new Aggregation(<predicate>?, {<query>}?, [<functions>]?)` (constructor)
//    * 'Predicate' tests each object in a list, then returns the object if it passes. Used to ensure homogeneity of objects.
//    * 'Query' is an object passable as an argument
//    * 'Functions' is an array of uncalled functions to be stored for collection later. They can be async.
//    * All of these arguments are optional.
// * `<Aggregation>.bind(<Function>)`: Store a function to call later. The functions can be async. `bind` is chainable.
// * `<Aggregation>.collect(<Function>)`: Call all stored functions. A common query parameter.

/* Examples: Aggregating a remote datasource with a local entity:

    // Explaining the constructor:
    // 'checkEntitySchema' ensures the homogeneity of the objects given back
    // 'commonQuery' is passed to each of the functions bound to the Aggregation when it is being collected.
    
    const Entities = new Aggregation(checkEntitySchema, commonQuery)     

    Entities.bind(entityDatabaseQuery)   // register a database query
            .bind(entityApiCall)   // register an API call

    // Collecting the results of an Aggregation with 'collect' method
    // It is asynchronous (working like a Promise.all)

    const allEntities = await Entities.collect()   // run the database query and API call, then collect results into an array.

    // Result: [ [<entities from database>], [<entities from remote resource's API call>] ]
    // NOTE: as of current implementation, order does not matter and information about which function returned what result fails

*/

class Aggregation {

    #schemaCheck
    #functions
    #query

    constructor(schemaCheck = id => id, query = {}, functions = []) {
        this.#schemaCheck = schemaCheck;
        this.#functions = functions;
        this.#query = query;
    }

    // TODO: Do we want to access the individual results of the aggregation, 
    //  to increase predictability?
    // TODO: Do we want to keep track of metadata or registration data
    // Use the "identity" element, make collect push results into entries?
    // Use metadata for filtering the collection?
    bind(callback, identity = this.#functions.length, metadata = {}) {
        this.#functions.push(callback);
        return this;
    }

    // TODO: IO protection
    async collect(query = this.#query) {
        if (this.#functions.length > 0) {
            return Promise.all(
                this.#functions.map(
                    // TODO: liftable?
                    async f => {
                        console.log(f, f(query))
                        return f(query).then(aos => aos.every(this.#schemaCheck) ? aos : []).catch(e => { console.error(e); return [] })
                    }
                )
            )
        } else {
            console.warn('Asked for collection from Aggregator with no functions registered!')
            return [];
        }
    }

}

const DatasetEntryAggregation = new Aggregation(adapterUtils.isDatasetEntry)
DatasetEntryAggregation
    //.bind(adapterUtils.dgaAnnotations)
    .bind(adapterUtils.oldDataAdapter)
    //.bind(modelUtils.allDatasets)

// Test
// DatasetEntryAggregator.collect().then(a => a.flatMap(id=>id)).then(console.log)

module.exports = {
    DatasetEntryAggregation
}
