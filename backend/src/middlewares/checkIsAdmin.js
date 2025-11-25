const db = require("../models");

const checkIsAdmin = (req, res, next) => {
  let classroomId = req.body.classroomId;

  if (!classroomId) {
    classroomId = req.params.classroomId;
  }

  const userId = req.user.id;

  db.UserClassroom.findOne({
    where: {
      userId,
      classroomId,
      isAdmin: true,
    },
  })
    .then((userClassroom) => {
      if (!userClassroom) {
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
