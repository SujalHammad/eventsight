// const express = require("express");
// const { verifyAdmin } = require("../middleware/admin.middleware");
// const {
//     adminLogin,
//     adminLogout,
//     createEventCategory,
//     getEventCategories,
//     deleteEventCategory,
//     createBrandType,
//     getBrandTypes,
//     deleteBrandType,
//     createCity,
//     getCities,
//     deleteCity,
//     getAllUsers,
//     deleteUser,
//     getAllEventsAdmin,
//     deleteEventAdmin,
//     getPlatformStats
// } = require("../controllers/admin");

// const adminRoute = express.Router();


// adminRoute.post("/login", adminLogin);
// adminRoute.post("/logout", verifyAdmin, adminLogout);


// adminRoute.get("/stats", verifyAdmin, getPlatformStats);


// adminRoute.post("/createCategory", verifyAdmin, createEventCategory);
// adminRoute.get("/categories", getEventCategories); // public — needed for forms
// adminRoute.delete("/categories/:id", verifyAdmin, deleteEventCategory);

// // brand types
// adminRoute.post("/createBrandType", verifyAdmin, createBrandType);
// adminRoute.get("/brandTypes", getBrandTypes); // public — needed for forms
// adminRoute.delete("/brandTypes/:id", verifyAdmin, deleteBrandType);

// // cities
// adminRoute.post("/createCity", verifyAdmin, createCity);
// adminRoute.get("/cities", getCities); // public — needed for forms
// adminRoute.delete("/cities/:id", verifyAdmin, deleteCity);

// // users
// adminRoute.get("/users", verifyAdmin, getAllUsers);
// adminRoute.delete("/users/:id", verifyAdmin, deleteUser);

// // events
// adminRoute.get("/events", verifyAdmin, getAllEventsAdmin);
// adminRoute.delete("/events/:id", verifyAdmin, deleteEventAdmin);

// module.exports = { adminRoute };