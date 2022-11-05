/**
 * Created by ethsf on 05/11/22.
 */var mongoose = require('mongoose');

// Define the purchases Schema
var purchasesSchema = new mongoose.Schema({
    customerId: String,
    destination: String,
    external_data :Object,
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

