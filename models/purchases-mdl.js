//Require Mongoose
var mongoose = require('mongoose');

// Define the purchases Schema
var purchasesSchema = new mongoose.Schema({
    customerId: String,
    destination: String,
    metadata :Object,
    isActive: {type: Boolean, default : true},
    isExpired: {type: Boolean, default : false},
    transactionHash:  {type :String},
    startTime: Number,
    endTime: Number,
    purchaseId: String,
    iccid: String,
    eSimStatus: {type :String, default:'RELEASED'},
    activationCode: String,
    dataUsageRemainingInBytes: {type: Number, default : 0},
    walletAddress: String,
    createdOn: {type : Date,default :new Date()},
    updatedOn: {type : Date,default :new Date()},
},{ versionKey: false });
module.exports = mongoose.model('purchases', purchasesSchema);

