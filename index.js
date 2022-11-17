const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

const bookingsCollection = client.db("doctorsPortal").collection("bookings");

/////////////// ///////////////////////
////////////// appointment option get post ///////////////

app.get("/appointmentOption", async (req, res) => {
  try {
    const date = req.query.date;
    const query = {};
    const options = await appointmentOptionCollection.find(query).toArray();
    const bookingQuery = { appointmentDate: date };
    const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

    options.forEach((option) => {
      const optionBooked = alreadyBooked.filter(
        (book) => book.treatment === option.name
      );
      const bookedSlots = optionBooked.map((book) => book.slot);
      // console.log(option.name, bookedSlots);
    });
    res.send(options);
  } catch (err) {
    console.log(err);
  }
});

//////////////////////////////////////////
//////////////bookings option get post etc ///////////////

app.post("/bookings", async (req, res) => {
  try {
    const booking = req.body;
    const result = await bookingsCollection.insertOne(booking);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

///////////////////////////

app.get("/", (req, res) => {
  res.send("doctors portal server is running");
});

app.listen(port, () => console.log("doctor portal is running on port", port));
