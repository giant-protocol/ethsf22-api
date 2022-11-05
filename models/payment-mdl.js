/**
 * Created by ethsf on 05/11/22.
 */
var mongoose = require('mongoose');
var SchemaTypes = mongoose.Schema.Types;
// Define the payment Schema
var PaymentsSchema = new mongoose.Schema({
    amount:  {type :Number,default :0},
    tokenId:  {type :String},
    transactionHash:  {type :String},
    walletAddress:  {type :String},
    metadata: {type : Object},
    createdOn: {type : Date, default: Date.now()},
    updatedOn: {type : Date, default: Date.now()},
},{ versionKey: false });
module.exports = mongoose.model('payments', PaymentsSchema, 'payments');

