const express = require('express');
const router = express.Router();
const PoolConn = require('./../DBConnection/PoolConnection');

router.get('/GenerateMaxTrNo/:CompID/:TrType', async (request, response) => {
    const { CompID, TrType } = request.params;
    const conn = await PoolConn.getConnection();

    try {
        const querystring = `SELECT LPAD(COALESCE(MAX(CONVERT(TrNo, SIGNED)), 0) + 1, 6, '0') AS TrNo FROM transactionmaster WHERE CompID=${CompID} and TrType='${TrType}'`
        const result = await conn.query(querystring);
        response.status(200).json({ Data: result[0] });
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }

})

router.get('/SelectTrList/:CompID/:TrType/:Month/:DateWise/:FromDate/:ToDate', async (request, response) => {
    const { CompID, TrType, Month, DateWise, FromDate, ToDate } = request.params;
    const conn = await PoolConn.getConnection();

    try {
        let querystring = " SELECT TrID,M.PartyID,TrType,TrNo, " +
            "  DATE_FORMAT(TrDate, '%d-%m-%Y') AS TrDate,Amount ,P.PartyName,P.PhoneNo,M.IsCancel " +
            "    FROM transactionmaster M inner join parties P on M.CompID=P.CompID and M.PartyID=P.PartyID WHERE  " +
            "   M.CompID=" + CompID + " and TrType='" + TrType + "' "
        if (DateWise == 1) {
            querystring += ` and TrDate between '${FromDate}' and '${ToDate}'`
        }
        else {
            querystring += ` and Month(TrDate) =' ${Month}'`
        }

        const result = await conn.query(querystring);
        response.status(200).json({ Data: result[0] });
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }

})

router.get('/SelectTrMaster/:TrID/:CompID', async (request, response) => {
    const { TrID, CompID } = request.params;
    const conn = await PoolConn.getConnection();

    try {
        const querystring = "SELECT TrID,TrNo,DATE_FORMAT(TrDate, '%Y-%m-%d') AS TrDate,CompID,PartyID,TrType,Remarks,UserID,IsCancel," +
            " DATE_FORMAT(EntryDate, '%d-%m-%Y %h:%i:%p') AS EntryDate,Amount " +
            "FROM transactionmaster WHERE CompID=? and TrID=?"

        const result = await conn.query(querystring, [CompID, TrID]);
        response.status(200).json({ Data: result[0] });
    }
    catch (error) {
        response.status(500).json({ message: error.message });
    }
    finally {
        conn.release();
    }

})

router.get('/SelectTrDetail/:TrID', async (request, response) => {
    const { TrID } = request.params;
    const conn = await PoolConn.getConnection();
    try {
        const querystring = "SELECT D.*, ROW_NUMBER() OVER (ORDER BY TrDID) AS SrNo ," +
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

router.post('/SaveTransaction', async (request, response) => {
    const { TransactionMaster, TransactionDetail, IsAddNew } = request.body;
    const conn = await PoolConn.getConnection();
    try {
        await conn.beginTransaction();
        if (IsAddNew) {
            const maxTrID = await conn.query("SELECT COALESCE(MAX(TrID),0)+1 AS TrID from transactionmaster ");
            TransactionMaster.TrID = maxTrID[0][0].TrID
            const insertTrQuery = "insert into transactionmaster values (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP ,?,?)";
            await conn.query(insertTrQuery, [maxTrID[0][0].TrID, TransactionMaster.TrNo, TransactionMaster.TrDate, TransactionMaster.CompID, TransactionMaster.PartyID, TransactionMaster.TrType, TransactionMaster.Remarks, TransactionMaster.UserID, TransactionMaster.Amount, TransactionMaster.IsCancel])
        }
        else {
            const updateTrQuery = "update transactionmaster set TrDate=?, PartyID=?, Remarks=?, Amount=?, IsCancel=? where TrID=?";
            await conn.query(updateTrQuery, [TransactionMaster.TrDate, TransactionMaster.PartyID, TransactionMaster.Remarks, TransactionMaster.Amount, TransactionMaster.IsCancel, TransactionMaster.TrID])
        }
        for (let i = 0; i < TransactionDetail.length; i++) {

            TransactionDetail[i].Qty = TransactionMaster.TrType === "Stock In" ? TransactionDetail[i].Qty : -TransactionDetail[i].Qty
            if (TransactionDetail[i].TrDID === 0) {
                //// Fetch StockQty for the item
                if (TransactionMaster.TrType === "Stock Out") {
                    const stockQtyResult = await conn.query(`SELECT StockQty FROM item WHERE CompID=${TransactionMaster.CompID} AND ItemID=${TransactionDetail[i].ItemID}`);
                    const stockQty = stockQtyResult[0][0].StockQty;
                    if (Math.abs(TransactionDetail[i].Qty) > stockQty) {
                        response.status(200).json({ message: `Quantity (${Math.abs(TransactionDetail[i].Qty)}) exceeds the available stock (${stockQty}) for item ${TransactionDetail[i].ItemName}.`, status: false });
                        await conn.rollback();
                        // conn.release();
                        return;
                    }
                }

                const maxTrDID = await conn.query("SELECT COALESCE(MAX(TrDID),0)+1 AS TrDID from transactiondetail ");
                const insertTrQuery = "insert into transactiondetail values (?,?,?,?,?,?)";
                await conn.query(insertTrQuery, [maxTrDID[0][0].TrDID, TransactionMaster.TrID, TransactionDetail[i].ItemID, TransactionDetail[i].Qty, TransactionDetail[i].Rate, TransactionDetail[i].Amount])
            }
            else {
                const PrevData = await conn.query(`SELECT Qty,ItemID from transactiondetail where TrDID=${TransactionDetail[i].TrDID}`)
                const PrevQty = -PrevData[0][0].Qty;
                const maintainStockQuery = `update item set StockQty=StockQty+${PrevQty} where CompID=${TransactionMaster.CompID} and  ItemID=${PrevData[0][0].ItemID}`
                await conn.query(maintainStockQuery)
                if (TransactionMaster.TrType === "Stock Out") {
                    const stockQtyResult = await conn.query(`SELECT StockQty FROM item WHERE CompID=${TransactionMaster.CompID} AND ItemID=${TransactionDetail[i].ItemID}`);
                    const stockQty = stockQtyResult[0][0].StockQty;
                    if (Math.abs(TransactionDetail[i].Qty) > stockQty) {
                        response.status(200).json({ message: `Quantity (${Math.abs(TransactionDetail[i].Qty)}) exceeds the available stock (${stockQty}) for item ${TransactionDetail[i].ItemName}.`, status: false });
                        await conn.rollback();
                        // conn.release();
                        return;
                    }
                }
                const updateTrQuery = "update transactiondetail set ItemID=?, Qty=?, Rate=?, Amount=? where TrDID=?";
                await conn.query(updateTrQuery, [TransactionDetail[i].ItemID, TransactionDetail[i].Qty, TransactionDetail[i].Rate, TransactionDetail[i].Amount, TransactionDetail[i].TrDID])
            }

            const updateItemStockQuery = `update item set StockQty=StockQty+${TransactionDetail[i].Qty} where CompID=${TransactionMaster.CompID} and  ItemID=${TransactionDetail[i].ItemID}`
            await conn.query(updateItemStockQuery)
        }
        await conn.commit();
        response.status(200).json({ message: "Saved Successfully", status: true })
    }
    catch (error) {
        conn.rollback();
        response.status(500).json({ message: error.message, status: false })
    }
    finally {
        conn.release();
    }
})

module.exports = router;