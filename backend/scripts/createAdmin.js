const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' }); // Load .env from backend root

const ADMIN_EMAIL = "ruthravenim2006@gmail.com";
const ADMIN_PASSWORD = "AdminPassword123!"; // Change this before running!

async function createOrPromoteAdmin() {
  // If MONGO_URI is missing, fallback to local (matches FastAPI backend behavior)
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/careerpilot_db";
  const dbName = process.env.DB_NAME || "careerpilot_db";
  
  const client = new MongoClient(uri);

  try {
    console.log(`Connecting to MongoDB...`);
    await client.connect();
    console.log(`Connected successfully!`);
    
    const db = client.db(dbName);
    const usersCol = db.collection('users');

    console.log(`Checking for user: ${ADMIN_EMAIL}...`);
    const user = await usersCol.findOne({ email: ADMIN_EMAIL });

    if (user) {
      const currentRole = user.role || "user";
      if (currentRole !== "admin") {
        console.log(`User exists with role '${currentRole}'. Upgrading to 'admin'...`);
        await usersCol.updateOne(
          { email: ADMIN_EMAIL },
          { $set: { role: "admin" } }
        );
        console.log("Successfully promoted user to admin.");
      } else {
        console.log("User is already an admin. No changes made.");
      }
    } else {
      console.log("User does not exist. Creating new admin user...");
      
      // Hash password using bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

      const newAdmin = {
        name: "System Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        created_at: new Date()
      };

      await usersCol.insertOne(newAdmin);
      console.log("Successfully created new admin user!");
    }
  } catch (error) {
    console.error("Error during admin creation:", error);
  } finally {
    await client.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

createOrPromoteAdmin();
