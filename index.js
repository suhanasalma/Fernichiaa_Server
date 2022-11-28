require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const { query } = require("express");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SK);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgzzpjr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// console.log(uri)


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorize access");
  }
  const token = authHeader.split(" ")[1];
  // console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send("forbidden access");
    }
    req.decoded = decoded;
    next();
  });
}


async function run(){
   try{
     const categoryCollection = client
       .db("FurnitureShop")
       .collection("FurnitureCategory");

     const productsCollection = client
       .db("FurnitureShop")
       .collection("AllProducts");

     const usersCollection = client.db("FurnitureShop").collection("Users");

     const ordersCollection = client.db("FurnitureShop").collection("Orders");

     const wishingCollection = client.db("FurnitureShop").collection("Whislist");


     const paymentsCollection = client.db("FurnitureShop").collection("payments");

     //jwson token

     app.get("/jwt", async (req, res) => {
       const email = req.query.email;
       const query = { email: email };
       const user = await usersCollection.findOne(query);

       if (user) {
         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
           expiresIn: "10h",
         });
         return res.send({ accessToken: token });
       }
       res.status(401).send({ accessToken: "" });
     });

     app.get("/categories", async (req, res) => {
       const query = {};
       const result = await categoryCollection.find(query).toArray();
       res.send(result);
     });

     //getting products according to category

     app.get("/categories/products/:id", async (req, res) => {
       const id = parseInt(req.params.id);
       const query = {
         categoryId: id,
         paid: false,
       };
       const result = await productsCollection.find(query).toArray();
       res.send(result);
     });

     //getting all product according to true false value

     app.get("/allProducts", async (req, res) => {
       const filter = {
         paid: false,
       };
       const page = parseInt(req.query.page);
       const limit = parseInt(req.query.limit);
       const trueCount = await productsCollection.find(filter).toArray();

       const result = await productsCollection
         .find(filter)
         .skip(page * limit)
         .limit(limit)
         .toArray();
       const count = trueCount.length;
       // await productsCollection.estimatedDocumentCount();
       res.send({ count, result });
     });

     //getting products details

     app.get("/productDetails/:id", async (req, res) => {
       const id = req.params.id;
       const query = { _id: ObjectId(id) };
       const result = await productsCollection.findOne(query);
       res.send(result);
     });

     //adding seller single products

     app.post("/allProducts", async (req, res) => {
       const product = req.body;
       const result = await productsCollection.insertOne(product);
       res.send(result);
     });

     //getting all products

     app.get("/products", async (req, res) => {
       const filter = {};
       const result = await productsCollection.find(filter).toArray();
       res.send(result);
     });

     //getting products according orderId

     app.get('/products',async(req,res)=>{

     })

     //delete my adding products

     app.delete("/products/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const result = await productsCollection.deleteOne(filter);
       res.send(result);
     });

     //add to wishlist

     app.post("/addwishlists", async (req, res) => {
       const list = req.body;
       const result = await wishingCollection.insertOne(list);

       const wishId = list.productCode;
       const filterProduct = { _id: ObjectId(wishId) };
       //  console.log(filterProduct);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           wishlist: true,
         },
       };
       const update = await productsCollection.updateOne(
         filterProduct,
         updateDoc,
         options
       );
       res.send(result);
     });

     //getting wishlist

     app.get("/wishlists", verifyJWT, async (req, res) => {
       const email = req.query.email;
       const decodedEmail = req.decoded.email;
       //  console.log(decodedEmail, email);
       if (email !== decodedEmail) {
         return res.send({ message: "forbidden access" });
       }
       const filter = { wishingEmail: email };
       //  console.log(req.headers.authorization);
       const result = await wishingCollection.find(filter).toArray();
       res.send(result);
     });

     //moving wish to book now

     app.post("/transferOrder", async (req, res) => {
       // const wishId =

       //saving in order collextion
       const orders = req.body;
       const result = await ordersCollection.insertOne(orders);

       // //editing order in all products collection
       const id = orders.productCode;
       const filter = { _id: ObjectId(id) };
      //  console.log(filter);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           wishlist: false,
           booked: true,
         },
       };
       const Editresult = await productsCollection.updateOne(
         filter,
         updateDoc,
         options
       );

       // //deleting from wishlist
       const wishIdFilter = orders.wishingId;
       const wishFilter = { _id: ObjectId(wishIdFilter) };
       console.log(wishFilter);
       const deleteWish = await wishingCollection.deleteOne(wishFilter);

       res.send(result);
     });

     //remove my wishlist

     app.put("/removeWishlist/:id", async (req, res) => {
       const id = req.params.id;
      //  console.log(id);
       const filter = { _id: ObjectId(id) };
      //  console.log(filter);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           wishlist: false,
         },
       };
       const result = await productsCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       const productFilter = { productCode: id };
       const wishResult = await wishingCollection.deleteOne(productFilter);
       res.send(result);
     });



     //for seller editing modal

     app.post("/products/edit/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const info = req.body;
       const updateInfo = {
         $set: {
           title: info.title,
           newPrice: info.newPrice,
           details: info.details,
         },
       };
       const updateResult = productsCollection.updateOne(filter, updateInfo);
       res.send(updateResult);

       //  console.log(updateInfo);
     });

     //getting [products]

     app.put("/products/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           wishlist: false,
           booked: true,
         },
       };
       const result = await productsCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       res.send(result);
     });

     app.get("/sellProducts/:email", async (req, res) => {
       const email = req.params.email;
       const query = { sellerEmail: email };

       const result = await productsCollection.find(query).toArray();
       res.send(result);
     });

     app.get("/allProducts/wishlists", async (req, res) => {
       const email = req.query.email;
       const filter = {
         wishlist: true,
       };
       const result = await productsCollection.find(filter).toArray();
       res.send(result);
     });

     //geting advertise product

     app.get("/allProducts/advertise", async (req, res) => {
       const filter = { advertised: true,
       paid: false, };
       const page = parseInt(req.query.page);
       const limit = parseInt(req.query.limit);
       const result = await productsCollection
         .find(filter)
         .skip(page * limit)
         .limit(limit)
         .toArray();
       const count = result.length;
       res.send({ count, result });
     });

     //all orders list and deleting wishlist and updeting all products

     app.post("/orders", async (req, res) => {
       const orders = req.body;
       const result = await ordersCollection.insertOne(orders);

       //getting all products list to false wishlist
       const wishId = orders.productCode;
       const productFilter = { _id: ObjectId(wishId) };
       const options = { upsert: true };
       const updateFalse = {
         $set: {
           wishlist: false,
           booked: true,
         },
       };
       const product = await productsCollection.updateOne(
         productFilter,
         updateFalse,
         options
       );

       //deleting from wishlist collection

       const bookId = orders.productCode;
       const wishFilter = { productCode: bookId };
       const wish = await wishingCollection.deleteOne(wishFilter);
       //final outcome
       res.send(result);
     });

     //getting order

     app.get("/orders/myorder", async (req, res) => {
       const email = req.query.email;
       const filter = { buyerEmail: email };
       //  console.log(filter);
       const result = await ordersCollection.find(filter).toArray();
       res.send(result);
     });

     //getting specific order

     app.get('/orders/:id',async(req,res)=>{
      const id = req.params.id
      // console.log(id)
      const query = {_id:ObjectId(id)}
      const result = await ordersCollection.findOne(query)
      res.send(result)
     })

     //getting buyer
     app.get("/orders/mybuyers", async (req, res) => {
       const email = req.query.email;
       const filter = { sellerEmail: email };
       //  console.log(filter);
       const result = await ordersCollection.find(filter).toArray();
       res.send(result);
     });

     //delinting from order

     app.delete("/orders/myorder/delete/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const resultCode = await ordersCollection.findOne(filter);
       const productFilter = { _id: ObjectId(resultCode.productCode) };
      //  console.log(productFilter);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           booked: false,
         },
       };
       const updateInfo = await productsCollection.updateOne(
         productFilter,
         updateDoc,
         options
       );
       const result = await ordersCollection.deleteOne(filter);

       res.send(result);
     });

     //advertising products

     app.put("/products/boost/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           advertised: true,
         },
       };
       const result = await productsCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       res.send(result);
     });

     //creating user

     app.put("/users/:email", async (req, res) => {
       const email = req.params.email;
       const filter = { email: email };
       const user = req.body;
       const options = { upsert: true };
       const updateDoc = {
         $set: user,
       };
       const result = await usersCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       console.log("saved")
       res.send(result);

     });

     //getting user

     app.get("/users/:email", async (req, res) => {
       const email = req.params.email;
       const filter = { email: email };
       // console.log(filter);
       const result = await usersCollection.findOne(filter);
       // console.log(result)
       res.send(result);
     });

     //get admin

     app.get("/users/admin/:email", async (req, res) => {
       const email = req.params.email;
       const query = { email };
       const user = await usersCollection.findOne(query);
       res.send({ isAdmin: user?.role === "admin" });
     });

     //getting user with role

     app.get("/users", async (req, res) => {
       //  const role = req.query.role
       let query = {};
       if (req.query.role) {
         query = { role: req.query.role };
       } else {
         query = { email: req.query.email };
       }
       //  const query = {role:role};
       const result = await usersCollection.find(query).toArray();
       // console.log(query)
       res.send(result);
     });

     //deleting user

     app.delete("/users/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const result = await usersCollection.deleteOne(filter);
       res.send(result);
     });

     //verifying seller

     app.put("/verifyuser/:email", async (req, res) => {
       const email = req.params.email;
       const productFilter = { sellerEmail: email};
       const filter = { email: email };
       //  console.log(filter);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           isVarified: true,
         },
       };
       const product = await productsCollection.updateMany(
         productFilter,
         updateDoc,
         options
       );
       const result = await usersCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       res.send(result);
     });

     //payment
     app.post('/create-payment-intent',async(req,res)=>{
      const confirmOrder = req.body
      // console.log(confirmOrder)
      const price = confirmOrder.price*100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
     });

     //collecting payment collection

     app.post('/payments',async(req,res)=>{
      const payment = req.body
     
      const result = await paymentsCollection.insertOne(payment)
      const productCode = payment.productCode;
      const productFilter = {_id:ObjectId(productCode)}


      const orderCode = payment.productCode;
      const orderFilter = { productCode: productCode };

      //  console.log(productCode, orderCode);
      const options = {upsert:true}
      const updateDoc = {
        $set:{
          paid:true
        }
      }

      const allProductsUpdate = await productsCollection.updateOne(
        productFilter,
        updateDoc,
        options
      );
      // console.log(allProductsUpdate)
      const allOrderUpdate = await ordersCollection.updateMany(
        orderFilter,
        updateDoc,
        options
      );
      res.send(result)

     })


     

   }
   finally{

   }

}

run().catch(error=>console.log(error))


app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`furniture port is running one ${port}`);
});
