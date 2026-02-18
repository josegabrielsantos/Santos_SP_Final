// import Organization from "../models/organization_model.js";
// import User from "../models/user_model.js";
// import jwt from 'jsonwebtoken';

// export const protectRouteUser = async (req, res, next) => {
//     try {
//         const token = req.cookies.jwt;
//         if(!token){
//             return res.status(401).json({error: "Unauthorized: No Token Provided."});
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         if(!decoded){
//             return res.status(401).json({error: "Unauthorized: Invalid Token."});
//         }

//         const user = await User.findById(decoded.userId).select("-password");

//         if(!user){
//             return res.status(404).json({error: "Usdadawder not found."});
//         }

//         req.user = user;
//         next();
//     } catch (error) {
//         console.log("Error in protect route", error.message);
//         res.status(500).json({ error: "Internal Server Error."});
//     }
// }

// export const protectRouteOrganization = async (req, res, next) => {
//     try {
//         const token = req.cookies.jwt;
//         if(!token){
//             return res.status(401).json({error: "Unauthorized: No Token Provided."});
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         if(!decoded){
//             return res.status(401).json({error: "Unauthorized: Invalid Token."});
//         }

//         const organization = await Organization.findById(decoded.userId).select("-password");

//         if(!organization){
//             return res.status(404).json({error: "Organization not found."});

//         }

//         req.organization = organization;
//         next();
//     } catch (error) {
//         console.log("Error in protect route", error.message);
//         res.status(500).json({ error: "Internal Server Error."});
//     }
// }

// import jwt from 'jsonwebtoken';
// import User from '../models/user_model.js';
// import Organization from '../models/organization_model.js';

// export const protectRoute = async (req, res, next) => {
//     try {
//         const token = req.cookies.jwt;
//         if (!token) {
//             return res.status(401).json({ error: "Unauthorized: No Token Provided." });
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         if (!decoded) {
//             return res.status(401).json({ error: "Unauthorized: Invalid Token." });
//         }

//         // First, try to find the user
//         let entity = await User.findById(decoded.userId).select("-password");
//         if (entity) {
//             req.user = entity;
//             return next();
//         }

//         // If not a user, try to find the organization
//         entity = await Organization.findById(decoded.userId).select("-password");
//         if (entity) {
//             console.log("yahoo");
//             req.organization = entity;
//             return next();
//         }

//         // If neither, return not found
//         return res.status(404).json({ error: "Entity not found." });

//     } catch (error) {
//         console.log("Error in protectRoute", error.message);
//         res.status(500).json({ error: "Internal Server Error." });
//     }
// };
import jwt from 'jsonwebtoken';
import User from '../models/user_model.js';
import Organization from '../models/organization_model.js';

export const protectRouteUser = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No Token Provided." });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized: Invalid Token." });
        }
        
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protectRouteUser", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

export const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== "superAdmin") {
        return res.status(403).json({ error: "Access denied. Super admin required." });
    }
    next();
};

export const requireOrganizationOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Super admin can access anything
        if (userRole === "superAdmin") {
            const organization = await Organization.findById(id);
            if (!organization) {
                return res.status(404).json({ error: "Organization not found." });
            }
            req.organization = organization;
            return next();
        }

        // Otherwise check if user is owner
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        if (organization.owner.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Access denied. Organization owner or super admin required." });
        }

        req.organization = organization;
        next();
    } catch (error) {
        console.log("Error in requireOrganizationOwnerOrSuperAdmin", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

export const requireOrganizationAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Super admin can access anything
        if (userRole === "superAdmin") {
            const organization = await Organization.findById(id);
            if (!organization) {
                return res.status(404).json({ error: "Organization not found." });
            }
            req.organization = organization;
            return next();
        }

        // Otherwise check if user is owner
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        const isOwner = organization.owner.toString() === userId.toString();
        const isAdmin = organization.admins.includes(userId);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "Access denied. Organization admin required." });
        }

        req.organization = organization;
        next();

    } catch (error) {
        console.log("Error in requireOrganizationOwnerOrSuperAdmin", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

export const requireOrganizationMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({ error: "Organization not found." });
        }

        const isOwner = organization.owner.toString() === userId.toString();
        const isAdmin = organization.admins.includes(userId);
        const isMember = organization.members.includes(userId);

        if (!isOwner && !isAdmin && !isMember) {
            return res.status(403).json({ error: "Access denied. Organization membership required." });
        }

        req.organization = organization;
        next();
    } catch (error) {
        console.log("Error in requireOrganizationMember", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};