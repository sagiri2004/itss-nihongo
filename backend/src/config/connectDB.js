const { Sequelize } = require("sequelize");

// Option 3: Passing parameters separately (other dialects)
const sequelize = new Sequelize("my_db", "admin", "nguyenhuuthang2004", {
  host: "database-2.cjwyu6a8i9zc.ap-southeast-2.rds.amazonaws.com",
  port: 3306,
  dialect: "mysql",
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = connectDB;
