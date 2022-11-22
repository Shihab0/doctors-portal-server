const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const express = require("express");
const cors = require("cors");
const e = require("express");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//////////// MongoDB connection ///////////
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ueibnfi.mongodb.net/?retryWrites=true&w=majority`;

function verifyJWT(req, res, next) {
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send("Unauthorized access");
  }

  const token = authHeaders.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send("forbidden access");
    }
    req.decoded = decoded;
    next();
  });
}

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
const usersCollection = client.db("doctorsPortal").collection("users");
const doctorsCollection = client.db("doctorsPortal").collection("doctors");
const paymentsCollection = client.db("doctorsPortal").collection("payments");

const verifyAdmin = async (req, res, next) => {
  const email = req.params.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  res.send({ isAdmin: user?.role === "admin" });
  next();
};

/////////////// ///////////////////////
//////////////////////JWT//////////////////////
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
      expiresIn: "1d",
    });
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "" });
});
////////////////////////////////////////
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
      const remainingSlots = option.slots.filter(
        (slot) => !bookedSlots.includes(slot)
      );
      option.slots = remainingSlots;
      // console.log(option.name, bookedSlots, "remaining: ", remainingSlots);
    });
    res.send(options);
  } catch (err) {
    console.log(err);
  }
});

app.get("/appointmentSpecialty", async (req, res) => {
  const query = {};
  const result = await appointmentOptionCollection
    .find()
    .project({ name: 1 })
    .toArray();
  res.send(result);
});

////////////////////////////////////////////////////////////////////
////////////// PAYMENT METHOD ////////////////////////////////

app.post("/create-payment-intent", async (req, res) => {
  const booking = req.body;
  const price = booking.price;
  const amount = price * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.post("/payments", async (req, res) => {
  const payment = req.body;
  const result = await paymentsCollection.insertOne(payment);
  const id = payment.bookingId;
  const filter = { _id: ObjectId(id) };
  const updatedDoc = {
    $set: {
      paid: true,
      transactionId: payment.transactionId,
    },
  };
  const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

/////////////////////////////////////////////////////////////////
////////////////// Doctor api ///////////////////////////

app.post("/doctors", verifyJWT, async (req, res) => {
  const doctor = req.body;
  const result = await doctorsCollection.insertOne(doctor);
  res.send(result);
});

app.get("/doctors", verifyJWT, async (req, res) => {
  const query = {};
  const doctors = await doctorsCollection.find(query).toArray();
  res.send(doctors);
});

app.delete("/doctors/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: ObjectId(id) };
  const ok = await doctorsCollection.findOne(query);
  console.log(ok);
  const result = await doctorsCollection.deleteOne(query);
  res.send(result);
});

//////////////////////////////////////////////////////////
//////////////bookings option get post etc///////////////

app.post("/bookings", async (req, res) => {
  try {
    const booking = req.body;
    const query = {
      appointmentDate: booking.appointmentDate,
      email: booking.email,
      treatment: booking.treatment,
    };

    const alreadyBooked = await bookingsCollection.find(query).toArray();
    if (alreadyBooked.length) {
      const message = `You already booked this on ${booking.appointmentDate}`;
      return res.send({ acknowledged: false, message });
    }
    console.log(booking);
    const result = await bookingsCollection.insertOne(booking);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.get("/bookings", verifyJWT, async (req, res) => {
  const email = req.query.email;

  const decodedEmail = req.decoded?.email;
  // console.log(decodedEmail);
  if (email !== decodedEmail) {
    return res.status(403).send({ message: "forbidden access" });
  }
  const query = { email: email };
  const bookings = await bookingsCollection.find(query).toArray();
  res.send(bookings);
});

app.get("/bookings/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const booking = await bookingsCollection.findOne(query);
  res.send(booking);
});

//////////////////////////////////////////////////////
//////////////////User information///////////////////
app.post("/users", async (req, res) => {
  const user = req.body;
  const result = await usersCollection.insertOne(user);
  res.send(result);
});

app.get("/users", async (req, res) => {
  const query = {};
  const users = await usersCollection.find(query).toArray();
  res.send(users);
});

app.get("/users/admin/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  res.send({ isAdmin: user?.role === "admin" });
});

app.put("/users/admin/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);
  if (user?.role !== "admin") {
    res.status(403).send({ message: "forbidden access" });
  }

  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await usersCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

////////////////////////// TEMPORARY UPDATE FIELD //////////////////////

// app.get("/updatePrice", async (req, res) => {
//   const filter = {};
//   const options = { upsert: true };
//   const updatedDoc = {
//     $set: {
//       price: 99,
//     },
//   };
//   const result = await appointmentOptionCollection.updateMany(
//     filter,
//     updatedDoc,
//     options
//   );
//   res.send(result);
// });

///////////////////////////////////////////////
////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("doctors portal server is running");
});

app.listen(port, () => console.log("doctor portal is running on port", port));
