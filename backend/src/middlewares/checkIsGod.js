const db = require("../models");

// Middleware to check if the user is a admin
const checkIsAdmin = (req, res, next) => {
  const userId = req.user.id;

  db.User.findOne({
    where: {
      id: userId,
      roleId: 1,
    },
  })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ message: "User is not an admin" });
      }
      next();
    })
    .catch((error) => {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Internal server error" });
    });
};

module.exports = checkIsAdmin;
