const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/SelectItemCat/:CompID', async (request, response) => {
    const { CompID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "select *, ROW_NUMBER() OVER (ORDER BY CatID) AS row_number from itemcategory where CompID=?"
        const result = await conn.query(querystring, [CompID]);
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.post('/SaveItemCat', async (request, response) => {
    const { ItemCatData, IsAddNew } = request.body;
    const conn = await PoolConn.getConnection();

    try {
        if (IsAddNew) {
            const maxItemCatID = await conn.query("SELECT COALESCE(MAX(CatID),0) + 1 AS CatID from itemcategory");
            const insertItemCatquery = "insert into itemcategory values(?,?,?)";
            await conn.query(insertItemCatquery, [maxItemCatID[0][0].CatID, ItemCatData.CompID, ItemCatData.CatName])
        }
        else {
            const updateItemCatQuery = "update itemcategory set CatName=? where CatID=?";
            await conn.query(updateItemCatQuery, [ItemCatData.CatName, ItemCatData.CatID])
        }
        response.status(200).json({ message: "Save Successfully" })

    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.delete('/DeleteItemCat/:CatID', async (request, response) => {
    const { CatID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "delete from itemcategory where CatID=?"
        await conn.query(querystring, [CatID])
        response.status(200).json({ message: "Deleted Successfully" })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

module.exports = router;