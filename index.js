require("dotenv").config();
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


async function run(){
   try{
     const categoryCollection = client
       .db("FurnitureShop")
       .collection("FurnitureCategory");
     const productsCollection = client
       .db("FurnitureShop")
       .collection("AllProducts");
     const usersCollection = client.db("FurnitureShop").collection("Users");

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

     //time added

    //  app.get('/allProducts',async(req,res)=>{
    //     const filter ={}
    //     const option = {upsert:true}
    //     const updateDoc = {
    //       $set: {
    //         postedTime: new Date(),
    //       },
    //     };
    //     const result = await productsCollection.updateMany(filter,updateDoc,option)
    //     res.send(result)
    //  })

    app.post("/allProducts", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product)
      res.send(result)
      // console.log(product)
    })

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

    //  app.post("/users", async (req, res) => {
    //    const user = req.body;
    //    console.log(user);
    //    const result = await usersCollection.insertOne(user);
    //    res.send(result);
    //  });

      app.put("/users/:email", async (req, res)=>{
        const email = req.params.email
         const filter ={email:email}
         const user = req.body
         const option = {upsert:true}
         const updateDoc = {
            $set: user

         }
         const result = await usersCollection.updateOne(filter,updateDoc,option)
         res.send(result)
      })

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
