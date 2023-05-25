const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 1330;
const cors = require('cors');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.listen(port, () => {
    console.log(`${port} port is running`)
})

app.use('/api/Groups', require('./Components/Groups'))
app.use('/api/ItemCategory', require('./Components/ItemCategory'))
app.use('/api/Parties', require('./Components/Parties'))
app.use('/api/Items', require('./Components/Items'))
app.use('/api/CompanySetup', require('./Components/CompanySetup'))
app.use('/api/TransactionMaster', require('./Components/TransactionMaster'))
app.use('/api/TransactionDetail', require('./Components/TransactionDetail'))
app.use('/api/User', require('./Components/User'))
