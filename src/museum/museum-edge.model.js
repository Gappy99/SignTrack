import mongoose from "mongoose";

const museumEdgeSchema = mongoose.Schema(
  {
    fromKey: {
      type: String,
      required: [true, "fromKey es requerido"],
      trim: true,
      lowercase: true,
      index: true,
    },
    toKey: {
      type: String,
      required: [true, "toKey es requerido"],
      trim: true,
      lowercase: true,
      index: true,
    },
    direction: {
      type: String,
      required: [true, "direction es requerido"],
      enum: ["derecha", "izquierda", "frente", "atras"],
    },
    distance: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "distance debe ser mayor o igual a 1"],
    },
    bidirectional: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

museumEdgeSchema.index({ fromKey: 1, toKey: 1, direction: 1 }, { unique: true });

export default mongoose.model("MuseumEdge", museumEdgeSchema);