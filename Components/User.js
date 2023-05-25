
const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');


router.post('/Login', async (request, response) => {
    const { UserLogin, Password } = request.body;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "select * from users where UserLogin=? and Password=?"
        const result = await conn.query(querystring, [UserLogin, Password])
        if (result[0].length > 0)
            response.status(200).json({ message: "Login Sucessfully", status: true, user: result[0] })

        else {
            response.status(200).json({ message: "Incorrect Username/Password", status: false, user: [] })
        }
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

module.exports = router;