import { ObjectId } from "mongodb";

// Enforces that ID follows correct format
export const validateId = (req, res, next, id) => {

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ 
      error: "Invalid ID format",
      message: `The provided ID '${id}' is not a valid 24-character hex string.`
    });
  }

  next();
};