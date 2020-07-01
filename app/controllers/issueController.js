const mongoose = require('mongoose');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const check = require('../libs/checkLib');

const IssueModel = mongoose.model('Issue');
const UserModel = mongoose.model('User')

/**
 * .select() - select or deselect certain columns from the result mongoose object returned
 * .exec() - execute the query
 * .lean() - return a plain JS Object instead of mongoose object,
 *  but then .save() or other mongoose methods won't be available.
 */

let getAllUsersFunction = (req, res) => {
    UserModel.find({})
        .select('-_id -__v -password')
        .exec((err, result) => {
            if (err) {
                logger.error(err.message, 'Issue Controller: getAllUsersFunction', 10)
                let apiResponse = response.generate(true, 'Internal Error occured', 500, null);
                res.send(apiResponse);
            }
            else if (check.isEmpty(result)) {
                logger.info('No Users found!', 'Issue Controller: getAllUsersFunction');
                let apiResponse = response.generate(true, 'No Users found!', 400, null);
                res.send(apiResponse);
            }
            else {
                delete result.password
                logger.info('Users found successfully', 'Issue Controller: getAllUsersFunction', 1);
                let apiResponse = response.generate(false, 'Users found successfully', 200, result);
                res.send(apiResponse);
            }
        })
}


let getAllIssuesFunction = (req, res) => {

    let validateParams = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.params.userId)) {
                logger.info('Parameters missing', 'getAllIssuesFunction handler', 9)
                let apiResponse = response.generate(true, 'parameters missing.', 403, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    } 


    let findIssues = () => {
        return new Promise((resolve, reject) => {
            
            let findQuery = {
                $or: [{ assigneeId: req.params.userId }, { reporterId: req.params.userId }]
            }

            IssueModel.find(findQuery)
                .select('-_id -__v')
                .sort('-createdOn')
                .lean()
                .exec((err, result) => {
                    if (err) {
                        logger.error(err.message, 'Issue Controller: findIssues', 10)
                        let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('No Issues Found', 'Issue Controller: findIssues', 404)
                        let apiResponse = response.generate(true, 'No Issues Found', 404, null)
                        reject(apiResponse)
                    } else {
                        logger.info('Issues found and listed!', 'Issue Controller: findIssues()', 200)
                        resolve(result)
                    }
                })
        })
    }

    
    validateParams()
        .then(findIssues)
        .then((result) => {
            let apiResponse = response.generate(false, 'All Issues Listed', 200, result)
            // console.log(apiResponse);
            res.send(apiResponse)
        })
        .catch((error) => {
            res.send(error)
        })
} 

 
let createNewIssueFunction = (req, res) => {

    let validateInputs = () => {
        return new Promise((resolve, reject) => {
            if (req.body.title && req.body.description && req.body.reporter && req.body.assignee && req.body.status) {
                resolve(req)
            }
            else {
                let apiResponse = response.generate(true, "Body parameters are missing", 400, null)
                reject(apiResponse)
            }
        })
    } // end of validateInputs


    let createIssue = () => {
        return new Promise((resolve, reject) => {

            let newIssue = new IssueModel({
                issueId: shortid.generate(),
                title: req.body.title,
                description: req.body.description,
                reporter: req.body.reporter,
                reporterId: req.body.reporterId,
                assignee: req.body.assignee,
                assigneeId: req.body.assigneeId,
                status: req.body.status,
                createdOn: time.now()
            })

            newIssue.save((err, data) => {
                if (err) {
                    logger.error(err.message, "issueController: createIssue()->save", 5)
                    let apiResponse = response.generate(true, "Failed to save new issue", 500, null)
                    reject(apiResponse)
                }
                else {
                    let newIssueObj = data.toObject()
                    resolve(newIssueObj)
                }
            })
        })
    }

    validateInputs(req, res)
        .then(createIssue)
        .then((newIssueData) => {
            delete newIssueData._id;
            delete newIssueData.__v;

            let apiResponse = response.generate(false, "New issue created successfully!", 200, newIssueData);
            res.send(apiResponse);
        }).catch((err) => {
            // console.log(err);
            res.send(err);
        });

} 


let getSelectedIssueByIdFunction = (req, res) => {
    // function to validate params.
    let validateParams = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.params.issueId)) {
                logger.info('parameters missing', 'getSelectedIssueByIdFunction handler', 7)
                let apiResponse = response.generate(true, 'parameters missing.', 403, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    } // end of the validateParams function.

    let findIssues = () => {
        return new Promise((resolve, reject) => {
            // creating find query.
            let findQuery = {
                issueId: req.params.issueId
            }

            IssueModel.findOne(findQuery)
                .select('-_id -__v')
                .lean()
                .exec((err, result) => {
                    if (err) {
                        logger.error(err.message, 'Issue Controller: findIssues', 10)
                        let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('Issue not found', 'Issue Controller: findIssues')
                        let apiResponse = response.generate(true, 'Issue not found', 404, null)
                        reject(apiResponse)
                    } else {
                        logger.info('Selected issue found!', 'Issue Controller: findIssues()')
                        resolve(result)
                    }
                })
        })
    }

    validateParams()
        .then(findIssues)
        .then((result) => {
            let apiResponse = response.generate(false, 'Selected Issue found', 200, result)
            res.send(apiResponse)
        })
        .catch((error) => {
            res.send(error)
        })
}

let editIssueFunction = (req, res) => {

    let options = req.body;

    IssueModel.findOneAndUpdate({ 'issueId': req.params.issueId }, options, { new: true })
        .select('-_id -__v')
        .exec((err, result) => {
            if (err) {
                logger.error(err.message, 'Issue Controller: editIssueFunction', 10)
                let apiResponse = response.generate(true, 'Error occured', 500, null);
                res.send(apiResponse);
            }
            else if (check.isEmpty(result)) {
                logger.info('No Issue found!', 'Issue Controller: editIssueFunction');
                let apiResponse = response.generate(true, 'No Issue found!', 400, null);
                res.send(apiResponse);
            }
            else {
                logger.info('Issue edited successfully', 'Issue Controller: editIssueFunction', 1);
                let apiResponse = response.generate(false, 'Issue edited successfully', 200, result);
                res.send(apiResponse);
            }
        })
}

let addNewCommentFunction = (req, res) => {

    let findQuery = {
        issueId: req.params.issueId
    }
    
    let updateQuery = {
        $push: {
            comments: {
                commenterId: req.body.commenterId,
                commenterName: req.body.commenterName,
                commentText: req.body.commentText
            }
        }
    }
    IssueModel.findOneAndUpdate(findQuery, updateQuery, { new: true })
        .select('-_id -__v')
        .exec((err, result) => {
            if (err) {
                logger.error(err.message, 'Issue Controller: addNewCommentFunction', 10)
                let apiResponse = response.generate(true, 'Error occured', 500, null);
                res.send(apiResponse);
            }
            else if (check.isEmpty(result)) {
                logger.info('No Issue found!', 'Issue Controller: addNewCommentFunction');
                let apiResponse = response.generate(true, 'No Issue found!', 400, null);
                res.send(apiResponse);
            }
            else {
                logger.info('Issue edited successfully', 'Issue Controller: addNewCommentFunction', 1);
                let apiResponse = response.generate(false, 'Issue edited successfully', 200, result);
                res.send(apiResponse);
            }
        })
}

module.exports = {
    getAllUsers: getAllUsersFunction,
    createNewIssue: createNewIssueFunction,
    getAllIssues: getAllIssuesFunction,
    getSelectedIssueById: getSelectedIssueByIdFunction,
    editIssue: editIssueFunction,
    addNewComment: addNewCommentFunction
}