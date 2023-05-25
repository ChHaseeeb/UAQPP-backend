const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/SelectTrDetail/:TrID', async (request, response) => {
    const { TrID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "SELECT D.TrDID,D.TrID,D.ItemID,D.Quantity,D.Rate,D.Amount," +
            " I.ItemName FROM transactiondetail D INNER JOIN item I ON D.ItemID = I.ItemID" +
            " WHERE TrID=?"
        const result = await conn.query(querystring, [TrID]);
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

module.exports = router;