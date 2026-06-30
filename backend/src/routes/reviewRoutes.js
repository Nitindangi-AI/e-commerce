const express = require("express");
const router = express.Router();
const { deleteReview, markHelpful } = require("../controllers/reviewController");
const { protect } = require("../../middleware/auth");

router.delete("/:id", protect, deleteReview);
router.put("/:id/helpful", protect, markHelpful);

module.exports = router;
