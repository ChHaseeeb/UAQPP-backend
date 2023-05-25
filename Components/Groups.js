
const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');


router.get('/SelectGroups/:CompID', async (request, response) => {
    const { CompID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "select *, ROW_NUMBER() OVER (ORDER BY GroupID) AS row_number from groups where CompID=?"
        const result = await conn.query(querystring, [CompID])
        response.status(200).json({ Data: result[0] })

    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }
})

router.post('/SaveGroup', async (request, response) => {
    const { GroupData, IsAddNew } = request.body;
    const conn = await PoolConn.getConnection();

    try {
        if (IsAddNew) {
            const maxGroupID = await conn.query("SELECT COALESCE(MAX(GroupID),0) + 1 AS GroupID from groups");
            const insertGroupQuery = "insert into groups values(?,?,?,?)";
            await conn.query(insertGroupQuery, [maxGroupID[0][0].GroupID, GroupData.CompID, GroupData.GroupName, GroupData.GroupType])

        }
        else {
            const updateGroupQuery = "update groups  set GroupName=? , GroupType=? where GroupID=?";
            await conn.query(updateGroupQuery, [GroupData.GroupName, GroupData.GroupType, GroupData.GroupID])
        }
        response.status(200).json({ message: "Save Successfully" })
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release()
    }
})

router.delete('/DeleteGroup/:GroupID', async (request, response) => {
    const { GroupID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "delete from groups where GroupID=?"
        await conn.query(querystring, [GroupID])
        response.status(200).json({ message: "Deleted Successfully", status: true })
    }
    catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            response.status(200).json({ message: "This Group is Configured with Party", status: false })
        }
        else
            response.status(500).json({ message: error.message });

    }
    finally {
        conn.release();
    }
})

module.exports = router;