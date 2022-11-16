const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// DB_USER=doctorsPortal
// DB_PASSWORD=Dw17TuH3Ivt52Rog

//////////// MongoDB connection ///////////
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ueibnfi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function dbConnect() {
  try {
    client.connect();
    console.log("database connected");
  } catch (err) {
    console.log(err);
  }
}
dbConnect();
///////////////////////////////////////

//////////// DB collection //////////////////

const appointmentOptionCollection = client
  .db("doctorsPortal")
  .collection("appointmentOption");
/////////////// ///////////////////////

////////////// appointment option get post ///////////////

app.get("/appointmentOption", async (req, res) => {
  try {
    const query = {};
    const options = await appointmentOptionCollection.find(query).toArray();
    res.send(options);
  } catch (err) {
    console.log(err);
  }
});

app.get("/", (req, res) => {
  res.send("doctors portal server is running");
});

app.listen(port, () => console.log("doctor portal is running on port", port));
