const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/SelectParty/:CompID/:GroupID', async (request, response) => {
    const { CompID, GroupID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "select *, ROW_NUMBER() OVER (ORDER BY PartyID) AS row_number from parties where CompID=? and GroupID=?"
        const result = await conn.query(querystring, [CompID, GroupID])
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.get('/SelectGroupParty/:CompID/:GroupType/:IsActive', async (request, response) => {
    const { CompID, GroupType, IsActive } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "SELECT P.* FROM parties P INNER JOIN groups G ON P.CompID=G.CompID and P.GroupID=G.GroupID WHERE P.CompID=? AND GroupType=?  AND IsActive=case  when ?=1 then 1 ELSE IsActive END"
        const result = await conn.query(querystring, [CompID, GroupType, IsActive])
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.post('/SaveParty', async (request, response) => {
    const { PartyData, IsAddNew } = request.body;
    const conn = await PoolConn.getConnection();

    try {
        if (IsAddNew) {
            const maxPartyID = await conn.query("SELECT COALESCE (MAX(PartyID),0) + 1 AS PartyID from parties");
            const insertPartyQuery = "insert into parties values (?,?,?,?,?,?,?,?)";
            await conn.query(insertPartyQuery, [maxPartyID[0][0].PartyID, PartyData.CompID, PartyData.GroupID, PartyData.PartyName, PartyData.PhoneNo, PartyData.Address, PartyData.Email, PartyData.IsActive])
        }
        else {
            const updatePartyQuery = "update parties set GroupID=?, PartyName=?, PhoneNo=? , Address=?, Email=?, IsActive=? where PartyID=? ";
            await conn.query(updatePartyQuery, [PartyData.GroupID, PartyData.PartyName, PartyData.PhoneNo, PartyData.Address, PartyData.Email, PartyData.IsActive, PartyData.PartyID])
        }
        response.status(200).json({ message: "Saved Successfully" })

    }
    catch (error) {
        response.status(500).json({ message: error.message })
    }
    finally {
        conn.release();
    }
})

module.exports = router;