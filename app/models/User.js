'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let userSchema = new Schema({
    userId: {
        type: String,
        default: '',
        index: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true
    },
    createdOn: {
        type: Date,
        default: Date.now()
    }
})

mongoose.model('User', userSchema);