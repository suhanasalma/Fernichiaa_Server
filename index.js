require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

      const categoryCollection = client.db("FurnitureShop").collection("FurnitureCategory");
      const productsCollection = client.db("FurnitureShop").collection("AllProducts");

      app.get('/categories',async(req,res)=>{
         const query = {}
         const result =await categoryCollection.find(query).toArray()
         res.send(result)
      })

      app.get('/categories/:id',async(req,res)=>{
         const id = parseInt(req.params.id)
         const query = { categoryId: id };
         console.log(query)
         const result = await productsCollection.find(query).toArray()
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
