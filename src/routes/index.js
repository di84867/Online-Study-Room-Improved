const express = require("express");
const router = express.Router();
const fileController = require("../controller/file.controller");
const authController = require("../controller/auth.controller");
const meetingController = require("../controller/meeting.controller");

let routes = (app) => {
  router.get("/files/:name", fileController.download);

  // Auth Routes
  router.post("/api/auth/register-org", authController.registerOrganization);
  router.post("/api/auth/signup", authController.signup);
  router.post("/api/auth/login", authController.login);
  router.post("/api/auth/social", authController.socialAuth);
  router.post("/api/auth/update-profile", authController.updateProfile);

  // Meeting Routes
  router.post("/api/meetings", meetingController.createMeeting);
  router.get("/api/meetings", meetingController.getMeetings);

  // Organization Resources
  router.post("/api/org/courses", meetingController.createCourse);
  router.get("/api/org/courses", meetingController.getCourses);
  router.post("/api/org/classes", meetingController.createClass);
  router.get("/api/org/classes", meetingController.getClasses);
  router.get("/api/org/users", authController.getOrgUsers);
  router.post("/api/org/users", authController.addOrgUser);

  app.use(router);
};

module.exports = routes;