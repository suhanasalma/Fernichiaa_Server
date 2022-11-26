require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const { query } = require("express");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgzzpjr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});



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

     const wishingCollection = client
       .db("FurnitureShop")
       .collection("Whislist");

       //jwson token

       app.get('/jwt',async(req,res)=>{
        const email = req.query.email
        const query = {email:email}
        const user = await usersCollection.findOne(query)
        
        if (user) {
          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
            expiresIn: "1h",
          });
          return res.send({ accessToken: token });
        }
        res.status(401).send({ accessToken: "" });
       })

     app.get("/categories", async (req, res) => {
       const query = {};
       const result = await categoryCollection.find(query).toArray();
       res.send(result);
     });

     app.get("/categories/:id", async (req, res) => {
       const id = parseInt(req.params.id);
       const query = { categoryId: id };
       const result = await productsCollection.find(query).toArray();
       res.send(result);
     });

     app.get("/productDetails/:id", async (req, res) => {
       const id = req.params.id;
       const query = { _id: ObjectId(id) };
       const result = await productsCollection.findOne(query);
       res.send(result);
     });


     app.post("/allProducts", async (req, res) => {
       const product = req.body;
       const result = await productsCollection.insertOne(product);
       res.send(result);
       // console.log(product)
     });

     app.get("/allProducts", async (req, res) => {
       const filter = {};
       const page = parseInt(req.query.page);
       const limit = parseInt(req.query.limit);
       const result = await productsCollection
         .find(filter)
         .skip(page * limit)
         .limit(limit)
         .toArray();
       const count = await productsCollection.estimatedDocumentCount();
       res.send({ count, result });
     });

     app.get("/products", async (req, res) => {
       const filter = {};
       const result = await productsCollection.find(filter).toArray();
       res.send(result);
     });

     app.delete("/products/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const result = await productsCollection.deleteOne(filter);
       res.send(result);
     });



     app.post("/wishlists", async (req, res) => {
       const list = req.body;
       const result = await wishingCollection.insertOne(list);
       res.send(result);
     });

     app.get("/wishlists", verifyJWT, async (req, res) => {
       const email = req.query.email;
       const decodedEmail = req.decoded.email
       console.log(decodedEmail,email)
       if(email !== decodedEmail){
        return res.send({message:"forbidden access"})
       }
       const filter = { wishingEmail: email };
       console.log(req.headers.authorization);
       const result = await wishingCollection.find(filter).toArray();
       res.send(result);
     });

     app.delete("/wishlists/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const result = await wishingCollection.deleteOne(filter);
       res.send(result);
     });

     app.put("/removeWishlist/:id", async (req, res) => {
       const id = req.params.id;
       console.log(id);
       const filter = { _id: ObjectId(id) };
       console.log(filter);
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
       res.send(result);
     });

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

       console.log(updateInfo);
     });

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

     app.put("/allProducts/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           wishlist: true,
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

     app.get("/allProducts/advertise", async (req, res) => {
       const filter = { advertised: true };
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

     app.post("/orders", async (req, res) => {
       const orders = req.body;
       const result = await ordersCollection.insertOne(orders);
       res.send(result);
     });



     app.put("/users/:email", async (req, res) => {
       const email = req.params.email;
       const filter = { email: email };
       const user = req.body;
       const option = { upsert: true };
       const updateDoc = {
         $set: user,
       };
       const result = await usersCollection.updateOne(
         filter,
         updateDoc,
         option
       );
       res.send(result);
     });

     app.get("/users/:email", async (req, res) => {
       const email = req.params.email;
       const filter = { email: email };
       // console.log(filter);
       const result = await usersCollection.findOne(filter);
       // console.log(result)
       res.send(result);
     });

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

     app.delete("/users/:id", async (req, res) => {
       const id = req.params.id;
       const filter = { _id: ObjectId(id) };
       const result = await usersCollection.deleteOne(filter);
       res.send(result);
     });

     app.put("/verifyuser/:email", async (req, res) => {
       const email = req.params.email;
       const filter = { email: email };
       console.log(filter);
       const options = { upsert: true };
       const updateDoc = {
         $set: {
           isVarified: true,
         },
       };
       const result = await usersCollection.updateOne(
         filter,
         updateDoc,
         options
       );
       res.send(result);
     });

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
