const mongoose = require("mongoose");

const queryReplySchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    senderType: {
      type: String,
      enum: ["visitor", "user", "staff"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isInternal: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const querySchema = new mongoose.Schema(
  {
    /*
     * Query Number
     * Example:
     * QUERY-2026-000001
     * QUERY-2026-000002
     */
    queryNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    /*
     * Logged-in user who created the query.
     * Null for public visitors.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Parent linked to this query.
     */
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Optional student related to the query.
     */
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Query subject/title.
     */
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Initial query message.
     */
    message: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Query category.
     */
    category: {
      type: String,
      enum: [
        "admission",
        "attendance",
        "progress",
        "class",
        "schedule",
        "membership",
        "renewal",
        "payment",
        "trial",
        "technical",
        "general",
        "other",
      ],
      default: "general",
    },

    /*
     * Query priority.
     */
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    /*
     * Query lifecycle.
     */
    status: {
      type: String,
      enum: [
        "open",
        "assigned",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "open",
    },

    /*
     * Staff member assigned to handle the query.
     */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Private staff/admin notes.
     */
    internalNotes: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Complete conversation/history.
     */
    replies: {
      type: [queryReplySchema],
      default: [],
    },

    /*
     * Visitor details.
     * Used when query is created without an account.
     */
    visitorName: {
      type: String,
      trim: true,
      default: "",
    },

    visitorPhone: {
      type: String,
      trim: true,
      default: "",
    },

    visitorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    /*
     * Resolution tracking.
     */
    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Closure tracking.
     */
    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
|
| queryNumber already has:
| unique: true
| sparse: true
|
| Therefore we DO NOT define queryNumber again using schema.index().
|--------------------------------------------------------------------------
*/

querySchema.index({
  status: 1,
  priority: 1,
});

querySchema.index({
  assignedTo: 1,
  status: 1,
});

querySchema.index({
  createdBy: 1,
  createdAt: -1,
});

querySchema.index({
  parent: 1,
  createdAt: -1,
});

querySchema.index({
  student: 1,
  createdAt: -1,
});

querySchema.index({
  category: 1,
  status: 1,
});

querySchema.index({
  createdAt: -1,
});

module.exports = mongoose.model("Query", querySchema);