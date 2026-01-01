const express = require("express");
const router = express.Router();
const fileController = require("../controller/file.controller");
const authController = require("../controller/auth.controller");
const meetingController = require("../controller/meeting.controller");

let routes = (app) => {
  router.get("/files/:name", fileController.download);

  // Auth Routes
  router.post("/api/auth/signup", authController.signup);
  router.post("/api/auth/login", authController.login);
  router.post("/api/auth/social", authController.socialAuth);

  // Meeting Routes
  router.post("/api/meetings", meetingController.createMeeting);
  router.get("/api/meetings", meetingController.getMeetings);

  app.use(router);
};

module.exports = routes;