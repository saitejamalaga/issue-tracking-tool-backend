const mongoose = require('mongoose')
const socketio = require('socket.io')
const tokenLib = require('./tokenLib')
const redisLib = require('./redisLib')
const logger = require('./../libs/loggerLib');
const events = require('events');


//called from app.js
//getting http server from there
let setServer = (server) => {
    let io = socketio.listen(server)
    let myIo = io.of('')  //namespace: global instance of io can be used for cross socket communication.
    //main event handler: everything happens here
    myIo.on('connection', (socket) => {

        //event handling on client side to get verified user with an authToken
        socket.emit('verifyUser', '')
        socket.on('set-user', (authToken) => {

            tokenLib.verifyClaimWithoutSecret(authToken, (err, result) => {
                if (err) {
                    socket.emit('authError', { status: 500, error: 'Authentication token expired/incorrect' })
                } else {
                    let currentUser = result.data
                    socket.userId = currentUser.userId
                    socket.userName = (currentUser.firstName + ' ' + currentUser.lastName).trim()

                    // joining our issues which we are following
                    // getting a user's all issues
                    // result variable will give issues array
                    redisLib.getFollowersAndIssueListHash(currentUser.userId, (err, result) => {
                        if (err) {
                            logger.error(err, 'set-user: Redislib getFollowersAndIssueListHash', 10)
                        }
                        else {
                            for (let issue in result) {
                                socket.join(issue)
                                // console.log("Joined issue:" + issue)
                            }
                        }

                    })
                }

                socket.emit('startUserRoom', '')
                socket.on('joinUserRoom', (data) => {
                    socket.room = data.userId
                    // console.log("Joining user room: " + socket.room)
                    socket.join(socket.room)
                })

                socket.on('follow-issue', (data) => {
                    console.log(data)
                    let key1 = data.userId
                    let value1 = data.userName
                    // for setting followers of an issue
                    // result variable will give followers array
                    redisLib.setFollowersAndIssueListHash(data.issueId, key1, value1, (err, result) => {
                        if (err) {
                            console.log('some error occured')
                        }
                        else {
                            // getting 1 issue's all followers
                            // result variable will give followers array
                            redisLib.getFollowersAndIssueListHash(data.issueId, (err, result) => {
                                if (err) {
                                    console.log(err)
                                }
                                else {
                                    // for all issues of a user
                                    // saving each users issue
                                    let key2 = data.issueId
                                    let value2 = data.issueTitle
                                    redisLib.setFollowersAndIssueListHash(data.userId, key2, value2, (err, result2) => {
                                        if (err) {
                                            console.log(err)
                                        }
                                        else {
                                            console.log(result)
                                            socket.join(data.issueId)
                                            console.log("created & joined a new issue, issueId:" + data.issueId)
                                            socket.emit(data.issueId, result)
                                        }
                                    })
                                }
                            })
                        }
                    })
                })

                socket.on('notify-assignee-new-issue', (data) => {
                    console.log("notify-assignee-new-issue called.")
                    // socket.to(socket.room).broadcast.emit('update-issue-list',data)
                    io.sockets.in(data.assigneeId).emit('update-issue-list', data)
                })

                socket.on('unfollow-issue', (data) => {
                    console.log(data)
                    let key1 = data.userId
                    let key2 = data.issueId
                    // remove user from issue hash
                    redisLib.deleteFromHash(data.issueId, key1)
                    // remove issue from user hash
                    redisLib.deleteFromHash(data.userId, key2)
                    redisLib.getFollowersAndIssueListHash(data.issueId, (err, result) => {
                        if (err) {
                            console.log(err)
                        }
                        else {
                            console.log("unfollowed, issueId:" + data.issueId)
                            console.log("updated followers list: " + JSON.stringify(result))
                            socket.leave(data.issueId)

                            socket.emit(data.issueId, result)
                        }
                    })

                })

            })
        })

        socket.on('notify-all-followers', (data) => {
            // all the users who joined the room whose id is data.issueId will get a notification
            socket.to(data.issueId).broadcast.emit('notification', data)
            console.log("Broadcasting to all followers" + data)
        })

        socket.on('get-all-followers', (issueId) => {
            redisLib.getFollowersAndIssueListHash(issueId, (err, result) => {
                if (err) {
                    console.log(err)
                }
                else {
                    console.log("followers list backend" + result)
                    socket.emit(issueId, result)
                }
            })
        })


        socket.on('disconnect', (userId) => {

            redisLib.getFollowersAndIssueListHash(userId, (err, result) => {
                if (err) {
                    console.log(err)
                } else {
                    //update online users list after removing offline user from hash
                    socket.leave(socket.room)
                }
            })
        })

    })

} //setServer end

module.exports = {
    setServer: setServer
}



