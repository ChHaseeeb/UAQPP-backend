const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/SelectItems/:CompID/:CatID/:IsActive', async (request, response) => {
    const { CompID, CatID, IsActive } = request.params;
    const conn = await PoolConn.getConnection();
    let result;
    try {
        if (CatID == 0) {
            const querystring = "select *,ROW_NUMBER() OVER (ORDER BY ItemID) AS row_number from item where CompID=? AND IsActive=case  when ?=1 then 1 ELSE IsActive END"
            result = await conn.query(querystring, [CompID, IsActive])
        }
        else {
            const querystring = "select *,ROW_NUMBER() OVER (ORDER BY ItemID) AS row_number from item where CompID=? and CatID=?  AND IsActive=case  when ?=1 then 1 ELSE IsActive END"
            result = await conn.query(querystring, [CompID, CatID, IsActive])
        }
        response.status(200).json({ Data: result[0] })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }

})

router.post('/SaveItem', async (request, response) => {
    const { ItemData, IsAddNew } = request.body;
    const conn = await PoolConn.getConnection();
    try {
        if (IsAddNew) {
            const maxItemID = await conn.query("SELECT COALESCE(MAX(ItemID),0)+1 AS ItemID from item ");
            const insertItemQuery = "insert into item values (?,?,?,?,?,?,?)";
            await conn.query(insertItemQuery, [maxItemID[0][0].ItemID, ItemData.CompID, ItemData.CatID, ItemData.ItemName, ItemData.StockQty, ItemData.Rate, ItemData.IsActive])
        }
        else {
            const updateItemQuery = "update item set CatID=?, ItemName=?, StockQty=?, Rate=?, IsActive=? where ItemID=?";
            await conn.query(updateItemQuery, [ItemData.CatID, ItemData.ItemName, ItemData.StockQty, ItemData.Rate, ItemData.IsActive, ItemData.ItemID])
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

router.delete('/DeleteItem/:ItemID', async (request, response) => {
    const { ItemID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "delete from item where ItemID=?"
        await conn.query(querystring, [ItemID]);
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