const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/SelectComp/:CompID', async (request, response) => {
    const { CompID } = request.params;
    const conn = await PoolConn.getConnection();

    try {
        const querystring = "select * from CompanySetup where CompID=?"
        const result = conn.query(querystring, [CompID]);
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.post('/UpdateCompSetup', async (request, response) => {
    const { CompData } = request.body;
    const conn = await PoolConn.getConnection();
    try {
        const updateCompSetupQuery = "update CompanySetup set CompName=?, PhoneNo=?, Address=?, Email=?, Logo=? where CompID=?";
        await conn.query(updateCompSetupQuery, [CompData.CompName, CompData.PhoneNo, CompData.Address, CompData.Email, CompData.Logo, CompData.CompID]);
        response.status(200).json({ message: "Updated Successfully" });
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

module.exports = router;